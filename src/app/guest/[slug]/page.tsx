'use client';

import { useEffect, useState } from 'react';
import { use } from 'react';
import { Search, ShoppingBag, Image as ImageIcon, Plus, Minus, X, Phone, Clock, CreditCard, Building2, CheckCircle2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/components/logo';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Restaurant {
  id: string;
  name: string;
  slug: string;
  banner_url: string | null;
  phone: string | null;
  bank_name: string;
  account_number: string;
  account_name: string;
}

interface Category {
  id: string;
  name: string;
}

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  available: boolean;
  category_id: string;
  quantity: number | null;
  category?: Category;
}

interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  orderId: string; // ID of guest_order
  created_at: string; // When this order was placed
  status?: string; // Order status (pending, pending_removal, etc.)
}

interface GuestSession {
  id: string;
  status: 'OPEN' | 'READY_FOR_PAYMENT' | 'AWAITING_CONFIRMATION' | 'PAID' | 'CLOSED';
  total_amount: number;
}

export default function GuestMenuPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<MenuItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [guestTableId, setGuestTableId] = useState<string | null>(null);
  const [guestSession, setGuestSession] = useState<GuestSession | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();
  const searchParams = useSearchParams();
  const tableIdFromUrl = searchParams.get('table');

  useEffect(() => {
    if (tableIdFromUrl) {
      setGuestTableId(tableIdFromUrl);
      initializeSession(tableIdFromUrl);
    } else {
      setError('Guest table not specified');
      setLoading(false);
    }
  }, [tableIdFromUrl]);

  useEffect(() => {
    if (guestTableId) {
      fetchRestaurantData();
    }
  }, [slug, guestTableId]);

  useEffect(() => {
    filterMenuItems();
  }, [menuItems, selectedCategory, searchQuery]);

  useEffect(() => {
    if (guestSession) {
      loadSessionOrders();
    }
  }, [guestSession]);

  const initializeSession = async (tableId: string) => {
    try {
      setSessionLoading(true);
      
      // Check if there's an active session for this table
      const { data: existingSession } = await supabase
        .from('guest_sessions')
        .select('*')
        .eq('guest_table_id', tableId)
        .in('status', ['OPEN', 'READY_FOR_PAYMENT', 'AWAITING_CONFIRMATION'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingSession) {
        setGuestSession(existingSession);
      } else {
        // Create new session
        const { data: newSession, error: sessionError } = await supabase
          .from('guest_sessions')
          .insert({
            guest_table_id: tableId,
            status: 'OPEN',
            total_amount: 0,
          })
          .select()
          .single();

        if (sessionError) throw sessionError;
        setGuestSession(newSession);
      }
    } catch (error: any) {
      console.error('Error initializing session:', error);
      toast({
        title: 'Error',
        description: 'Failed to initialize guest session',
        variant: 'destructive',
      });
    } finally {
      setSessionLoading(false);
    }
  };

  const loadSessionOrders = async () => {
    if (!guestSession) return;

    try {
      const { data: orders, error } = await supabase
        .from('guest_orders')
        .select(`
          *,
          menu_item:menu_items(*)
        `)
        .eq('guest_session_id', guestSession.id)
        .in('status', ['pending', 'pending_removal'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (orders) {
        const cartItems: CartItem[] = orders.map((order: any) => ({
          menuItem: {
            ...order.menu_item,
            category_id: order.menu_item.category_id,
          } as MenuItem,
          quantity: order.quantity,
          orderId: order.id,
          created_at: order.created_at,
          status: order.status, // Include status to track pending_removal
        }));
        setCart(cartItems);
      }
    } catch (error: any) {
      console.error('Error loading session orders:', error);
    }
  };

  const fetchRestaurantData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch restaurant by slug
      const { data: restaurantData, error: restaurantError } = await supabase
        .from('restaurants')
        .select('id, name, slug, banner_url, phone, bank_name, account_number, account_name')
        .eq('slug', slug)
        .maybeSingle();

      if (restaurantError) {
        console.error('Error fetching restaurant:', restaurantError);
        throw restaurantError;
      }
      
      if (!restaurantData) {
        setError('Restaurant not found');
        setLoading(false);
        return;
      }

      setRestaurant(restaurantData);

      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('menu_categories')
        .select('id, name')
        .eq('restaurant_id', restaurantData.id)
        .order('name');

      if (categoriesError) throw categoriesError;
      setCategories(categoriesData || []);

      // Fetch menu items (only available ones)
      const { data: itemsData, error: itemsError } = await supabase
        .from('menu_items')
        .select(`
          *,
          category:menu_categories(id, name)
        `)
        .eq('restaurant_id', restaurantData.id)
        .eq('available', true)
        .order('name');

      if (itemsError) throw itemsError;
      setMenuItems((itemsData as MenuItem[]) || []);
    } catch (err: any) {
      console.error('Error fetching restaurant data:', err);
      setError(err.message || 'Failed to load restaurant menu');
    } finally {
      setLoading(false);
    }
  };

  const filterMenuItems = () => {
    let filtered = [...menuItems];

    if (selectedCategory) {
      filtered = filtered.filter(item => item.category_id === selectedCategory);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query)
      );
    }

    setFilteredItems(filtered);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const addToCart = async (item: MenuItem) => {
    if (!guestSession || guestSession.status !== 'OPEN') {
      toast({
        title: 'Session closed',
        description: 'This session is no longer accepting orders.',
        variant: 'destructive',
      });
      return;
    }

    if (item.quantity !== null && item.quantity <= 0) {
      toast({
        title: 'Out of stock',
        description: `${item.name} is currently out of stock.`,
        variant: 'destructive',
      });
      return;
    }

    // Always create a new order entry (quantity = 1)
    try {
      const { data: newOrder, error } = await supabase
        .from('guest_orders')
        .insert({
          guest_session_id: guestSession.id,
          menu_item_id: item.id,
          quantity: 1, // Always add 1 at a time
          price: item.price,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      // Add to cart as a new entry
      setCart((prevCart) => [
        { 
          menuItem: item, 
          quantity: 1, 
          orderId: newOrder.id,
          created_at: newOrder.created_at,
        },
        ...prevCart
      ]);

      toast({
        title: 'Added to cart',
        description: `${item.name} has been added to your cart.`,
      });
    } catch (error: any) {
      console.error('Error adding to cart:', error);
      toast({
        title: 'Error',
        description: 'Failed to add item to cart',
        variant: 'destructive',
      });
    }
  };

  const updateQuantity = async (orderId: string, change: number) => {
    const cartItem = cart.find((item) => item.orderId === orderId);
    if (!cartItem) return;

    // Instead of updating, we'll add or remove orders
    if (change > 0) {
      // Add another order entry
      try {
        const { data: newOrder, error } = await supabase
          .from('guest_orders')
          .insert({
            guest_session_id: guestSession!.id,
            menu_item_id: cartItem.menuItem.id,
            quantity: 1,
            price: cartItem.menuItem.price,
            status: 'pending',
          })
          .select()
          .single();

        if (error) throw error;

        // Add new entry to cart
        setCart((prevCart) => [
          { 
            menuItem: cartItem.menuItem, 
            quantity: 1, 
            orderId: newOrder.id,
            created_at: newOrder.created_at,
          },
          ...prevCart
        ]);

        toast({
          title: 'Added',
          description: `${cartItem.menuItem.name} added.`,
        });
      } catch (error: any) {
        console.error('Error adding item:', error);
        toast({
          title: 'Error',
          description: 'Failed to add item',
          variant: 'destructive',
        });
      }
    } else {
      // Remove this order entry
      removeFromCart(orderId);
    }
  };

  const removeFromCart = async (orderId: string) => {
    const cartItem = cart.find((item) => item.orderId === orderId);
    
    if (!cartItem) return;

    // Check if already pending removal
    if (cartItem.status === 'pending_removal') {
      toast({
        title: 'Already pending removal',
        description: 'This item is already awaiting removal confirmation.',
        variant: 'default',
      });
      return;
    }

    try {
      // Mark as pending_removal instead of deleting
      const { error } = await supabase
        .from('guest_orders')
        .update({ status: 'pending_removal' })
        .eq('id', cartItem.orderId);

      if (error) throw error;

      // Update cart item status
      setCart((prevCart) =>
        prevCart.map((item) =>
          item.orderId === orderId
            ? { ...item, status: 'pending_removal' }
            : item
        )
      );

      toast({
        title: 'Awaiting removal confirmation',
        description: 'The restaurant will confirm the removal of this item.',
        variant: 'default',
      });
    } catch (error: any) {
      console.error('Error marking for removal:', error);
      toast({
        title: 'Error',
        description: 'Failed to mark item for removal',
        variant: 'destructive',
      });
    }
  };

  const getCartTotal = () => {
    // Include all items (even pending_removal) until restaurant confirms
    return cart.reduce((total, item) => total + item.menuItem.price * item.quantity, 0);
  };

  const getCartItemCount = () => {
    // Count all items including pending_removal
    return cart.reduce((count, item) => count + item.quantity, 0);
  };

  const handleReadyForPayment = async () => {
    if (cart.length === 0) {
      toast({
        title: 'Cart is empty',
        description: 'Please add items to your cart first.',
        variant: 'destructive',
      });
      return;
    }

    if (!guestSession) return;

    try {
      // Update session status to READY_FOR_PAYMENT
      const { error } = await supabase
        .from('guest_sessions')
        .update({ status: 'READY_FOR_PAYMENT' })
        .eq('id', guestSession.id);

      if (error) throw error;

      setGuestSession({ ...guestSession, status: 'READY_FOR_PAYMENT' });
      setShowPaymentDialog(true);
    } catch (error: any) {
      console.error('Error updating session:', error);
      toast({
        title: 'Error',
        description: 'Failed to update session status',
        variant: 'destructive',
      });
    }
  };

  if (loading || sessionLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-white">
        <div className="h-64 relative overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5">
          <div className="absolute top-6 left-6 z-10">
            <Logo size="md" variant="white" />
          </div>
        </div>
        <div className="max-w-4xl mx-auto w-full -mt-20 relative z-10 px-4">
          <div className="bg-white rounded-3xl p-8 shadow-xl border mb-8">
            <Skeleton className="h-8 w-64 mb-4" />
            <Skeleton className="h-4 w-96" />
          </div>
          <div className="grid md:grid-cols-2 gap-6 mb-24">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !restaurant || !guestSession) {
    return (
      <div className="flex flex-col min-h-screen bg-white items-center justify-center p-4">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Error</h1>
          <p className="text-muted-foreground">{error || 'Failed to load guest menu'}</p>
          <Button asChild>
            <Link href="/">Go Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  // Check if session is closed
  if (guestSession.status === 'CLOSED' || guestSession.status === 'PAID') {
    return (
      <div className="flex flex-col min-h-screen bg-white items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <CheckCircle2 className="mx-auto h-16 w-16 text-green-500" />
          <h1 className="text-2xl font-bold">Session Closed</h1>
          <p className="text-muted-foreground">
            This guest table session has been closed. Please scan the QR code again to start a new session.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Hero Header with Banner Background */}
      <div className="h-64 relative overflow-hidden">
        {restaurant.banner_url ? (
          <>
            <img
              src={restaurant.banner_url}
              alt={`${restaurant.name} banner`}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/10" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5" />
        )}
        <div className="absolute top-6 left-6 z-10">
          <h2 className="text-2xl font-bold italic text-white drop-shadow-lg">
            {restaurant.name}
          </h2>
        </div>
      </div>

      <div className="max-w-4xl mx-auto w-full -mt-20 relative z-10 px-4">
        <div className="bg-white rounded-3xl p-8 shadow-xl border mb-8">
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="space-y-2">
                <h1 className="text-4xl font-bold font-headline">{restaurant.name}</h1>
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1 font-medium"><Clock size={14} /> Guest Ordering</span>
                  {guestSession.status !== 'OPEN' && (
                    <Badge className="bg-orange-500">
                      {guestSession.status.replace('_', ' ')}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Menu Search & Filter */}
        <div className="sticky top-4 z-30 bg-white/80 backdrop-blur-md p-2 rounded-full border shadow-sm flex items-center gap-2 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              className="border-none bg-transparent pl-10 focus-visible:ring-0 shadow-none text-base"
              placeholder="Search menu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Categories Scroller */}
        {categories.length > 0 && (
          <div className="flex gap-4 overflow-x-auto pb-6 scrollbar-hide no-scrollbar">
            <Badge
              variant={selectedCategory === null ? "default" : "secondary"}
              className="px-6 py-2.5 rounded-full text-sm font-bold whitespace-nowrap cursor-pointer hover:bg-primary hover:text-white transition-colors"
              onClick={() => setSelectedCategory(null)}
            >
              All
            </Badge>
            {categories.map((cat) => (
              <Badge
                key={cat.id}
                variant={selectedCategory === cat.id ? "default" : "secondary"}
                className="px-6 py-2.5 rounded-full text-sm font-bold whitespace-nowrap cursor-pointer hover:bg-primary hover:text-white transition-colors"
                onClick={() => setSelectedCategory(cat.id)}
              >
                {cat.name}
              </Badge>
            ))}
          </div>
        )}

        {/* Menu Grid */}
        {filteredItems.length === 0 ? (
          <div className="text-center py-12 mb-24">
            <ImageIcon className="mx-auto h-12 w-12 mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">
              {searchQuery || selectedCategory ? 'No items found matching your search.' : 'No menu items available at the moment.'}
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6 mb-32">
            {filteredItems.map((item) => {
              const cartItem = cart.find((i) => i.menuItem.id === item.id);
              return (
                <div
                  key={item.id}
                  className="group p-4 rounded-2xl border bg-white hover:shadow-lg hover:border-primary/20 transition-all flex gap-4 cursor-pointer"
                >
                  <div className="flex-1 space-y-2">
                    <h3 className="font-bold text-lg group-hover:text-primary transition-colors">{item.name}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {item.description || 'No description available'}
                    </p>
                    <div className="flex items-center justify-between pt-2">
                      <div>
                        <span className="text-xl font-bold">{formatCurrency(item.price)}</span>
                        {item.quantity !== null && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {item.quantity > 0 ? `${item.quantity} available` : 'Out of stock'}
                          </p>
                        )}
                      </div>
                      {(() => {
                        // Count how many times this item appears in cart (excluding pending_removal)
                        const activeItems = cart.filter((i) => i.menuItem.id === item.id && i.status !== 'pending_removal');
                        const pendingRemovalItems = cart.filter((i) => i.menuItem.id === item.id && i.status === 'pending_removal');
                        const itemCount = activeItems.length;
                        const latestOrder = activeItems[0] || cart.find((i) => i.menuItem.id === item.id);
                        
                        if ((itemCount > 0 || pendingRemovalItems.length > 0) && latestOrder) {
                          return (
                            <div className="flex flex-col items-end gap-1">
                              <div className="flex items-center gap-3 bg-primary/5 rounded-full p-1 border border-primary/20" onClick={(e) => e.stopPropagation()}>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 rounded-full hover:bg-primary hover:text-white transition-colors"
                                  onClick={() => {
                                    // Remove the most recent active order for this item
                                    if (latestOrder && latestOrder.status !== 'pending_removal') {
                                      removeFromCart(latestOrder.orderId);
                                    }
                                  }}
                                  disabled={latestOrder?.status === 'pending_removal' || itemCount === 0}
                                >
                                  <Minus size={14} />
                                </Button>
                                <span className="font-bold text-sm min-w-[1.2rem] text-center">{itemCount}</span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 rounded-full hover:bg-primary hover:text-white transition-colors"
                                  onClick={() => addToCart(item)}
                                  disabled={item.quantity !== null && itemCount >= item.quantity || guestSession.status !== 'OPEN'}
                                >
                                  <Plus size={14} />
                                </Button>
                              </div>
                              {pendingRemovalItems.length > 0 && (
                                <span className="text-xs text-orange-600 font-medium">
                                  {pendingRemovalItems.length} awaiting removal
                                </span>
                              )}
                            </div>
                          );
                        }
                        return (
                          <Button
                            size="sm"
                            className="rounded-full h-9 px-4"
                            onClick={(e) => {
                              e.stopPropagation();
                              addToCart(item);
                            }}
                            disabled={item.quantity !== null && item.quantity <= 0 || guestSession.status !== 'OPEN'}
                          >
                            <Plus size={16} className="mr-1" />
                            Add
                          </Button>
                        );
                      })()}
                    </div>
                  </div>
                  <div className="w-24 h-24 rounded-xl overflow-hidden shrink-0 border bg-muted">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="h-8 w-8 text-muted-foreground opacity-50" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Persistent Ready for Payment Button */}
      {guestSession.status === 'OPEN' && (
        <div className="fixed bottom-8 inset-x-0 px-4 z-50 pointer-events-none">
          <div className="max-w-4xl mx-auto w-full pointer-events-auto">
            <Button
              size="lg"
              className="w-full rounded-full h-16 shadow-2xl bg-primary hover:bg-primary/90 text-lg font-bold group"
              onClick={handleReadyForPayment}
              disabled={cart.length === 0}
            >
              <CreditCard className="mr-3 w-6 h-6 group-hover:scale-110 transition-transform" />
              Ready for Payment {cart.length > 0 && `(${getCartItemCount()} items • ${formatCurrency(getCartTotal())})`}
            </Button>
          </div>
        </div>
      )}

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Payment Instructions</DialogTitle>
            <DialogDescription>
              Make a bank transfer to the account below
            </DialogDescription>
          </DialogHeader>
          <Card className="border-none shadow-sm">
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-widest opacity-70">Bank Name</p>
                <p className="text-xl font-bold">{restaurant.bank_name}</p>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-widest opacity-70">Account Number</p>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-2xl font-black font-mono tracking-tight break-all">{restaurant.account_number}</p>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="rounded-full shrink-0"
                    onClick={() => {
                      navigator.clipboard.writeText(restaurant.account_number);
                      toast({ title: 'Copied!', description: 'Account number copied to clipboard' });
                    }}
                  >
                    Copy
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-widest opacity-70">Account Name</p>
                <p className="text-xl font-bold">{restaurant.account_name}</p>
              </div>
              <div className="pt-4 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-muted-foreground">Total Amount</span>
                  <span className="text-2xl font-black text-primary">{formatCurrency(getCartTotal())}</span>
                </div>
              </div>
              <div className="pt-4">
                <p className="text-sm text-muted-foreground text-center">
                  After making the transfer, please inform the restaurant staff. They will confirm your payment.
                </p>
              </div>
            </CardContent>
          </Card>
        </DialogContent>
      </Dialog>
    </div>
  );
}

