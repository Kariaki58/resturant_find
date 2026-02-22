'use client';

import { useEffect, useState } from 'react';
import { use } from 'react';
import { Info, Clock, MapPin, Search, ChevronRight, ShoppingBag, Image as ImageIcon, Plus, Minus, X } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/components/logo';

interface Restaurant {
  id: string;
  name: string;
  slug: string;
  banner_url: string | null;
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
}

export default function RestaurantMenuPage({ params }: { params: Promise<{ slug: string }> }) {
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
  const [showCart, setShowCart] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();

  useEffect(() => {
    fetchRestaurantData();
  }, [slug]);

  useEffect(() => {
    filterMenuItems();
  }, [menuItems, selectedCategory, searchQuery]);

  const fetchRestaurantData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch restaurant by slug
      const { data: restaurantData, error: restaurantError } = await supabase
        .from('restaurants')
        .select('id, name, slug, banner_url')
        .eq('slug', slug)
        .maybeSingle();

      if (restaurantError) throw restaurantError;
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

    // Filter by category
    if (selectedCategory) {
      filtered = filtered.filter(item => item.category_id === selectedCategory);
    }

    // Filter by search query
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

  const addToCart = (item: MenuItem) => {
    // Check if item has quantity limit
    if (item.quantity !== null && item.quantity <= 0) {
      toast({
        title: 'Out of stock',
        description: `${item.name} is currently out of stock.`,
        variant: 'destructive',
      });
      return;
    }

    setCart((prevCart) => {
      const existingItem = prevCart.find((cartItem) => cartItem.menuItem.id === item.id);
      const currentQuantity = existingItem ? existingItem.quantity : 0;
      const newQuantity = currentQuantity + 1;

      // Check if adding would exceed available quantity
      if (item.quantity !== null && newQuantity > item.quantity) {
        toast({
          title: 'Quantity limit reached',
          description: `Only ${item.quantity} ${item.name} available.`,
          variant: 'destructive',
        });
        return prevCart; // Don't update cart
      }

      if (existingItem) {
        return prevCart.map((cartItem) =>
          cartItem.menuItem.id === item.id
            ? { ...cartItem, quantity: newQuantity }
            : cartItem
        );
      }
      return [...prevCart, { menuItem: item, quantity: 1 }];
    });
    toast({
      title: 'Added to cart',
      description: `${item.name} has been added to your cart.`,
    });
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(itemId);
      return;
    }

    // Check quantity limit
    const cartItem = cart.find((item) => item.menuItem.id === itemId);
    if (cartItem && cartItem.menuItem.quantity !== null && quantity > cartItem.menuItem.quantity) {
      toast({
        title: 'Quantity limit reached',
        description: `Only ${cartItem.menuItem.quantity} ${cartItem.menuItem.name} available.`,
        variant: 'destructive',
      });
      return;
    }

    setCart((prevCart) =>
      prevCart.map((cartItem) =>
        cartItem.menuItem.id === itemId
          ? { ...cartItem, quantity }
          : cartItem
      )
    );
  };

  const removeFromCart = (itemId: string) => {
    setCart((prevCart) => prevCart.filter((cartItem) => cartItem.menuItem.id !== itemId));
  };

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + item.menuItem.price * item.quantity, 0);
  };

  const getCartItemCount = () => {
    return cart.reduce((count, item) => count + item.quantity, 0);
  };

  const handleCheckout = () => {
    if (cart.length === 0) {
      toast({
        title: 'Cart is empty',
        description: 'Please add items to your cart before checkout.',
        variant: 'destructive',
      });
      return;
    }
    // Store cart in localStorage for checkout page
    localStorage.setItem('cart', JSON.stringify(cart));
    router.push(`/menu/${slug}/checkout`);
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-white">
        <div className="h-64 relative overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5">
          <div className="absolute inset-0 bg-black/20" />
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

  if (error || !restaurant) {
    return (
      <div className="flex flex-col min-h-screen bg-white items-center justify-center p-4">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Restaurant Not Found</h1>
          <p className="text-muted-foreground">{error || 'The restaurant you are looking for does not exist.'}</p>
          <Button asChild>
            <Link href="/">Go Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Hero Header with Banner */}
      <div className="h-64 relative overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5">
        {restaurant.banner_url ? (
          <>
            <img
              src={restaurant.banner_url}
              alt={`${restaurant.name} banner`}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/30" />
          </>
        ) : (
          <div className="absolute inset-0 bg-black/20" />
        )}
        <div className="absolute top-6 left-6 z-10">
          <Logo size="md" variant="white" />
        </div>
      </div>

      <div className="max-w-4xl mx-auto w-full -mt-20 relative z-10 px-4">
        <div className="bg-white rounded-3xl p-8 shadow-xl border mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-2">
              <h1 className="text-4xl font-bold font-headline">{restaurant.name}</h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1 font-medium"><Clock size={14} /> 20-30 mins</span>
                <span className="flex items-center gap-1 font-medium"><MapPin size={14} /> Online Ordering</span>
              </div>
            </div>
            <Button variant="outline" size="icon" className="rounded-full">
              <Info size={20} />
            </Button>
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
          <div className="grid md:grid-cols-2 gap-6 mb-24">
            {filteredItems.map((item) => (
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
                      const cartItem = cart.find((i) => i.menuItem.id === item.id);
                      if (cartItem) {
                        return (
                          <div className="flex items-center gap-3 bg-primary/5 rounded-full p-1 border border-primary/20" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 rounded-full hover:bg-primary hover:text-white transition-colors"
                              onClick={() => updateQuantity(item.id, cartItem.quantity - 1)}
                            >
                              <Minus size={14} />
                            </Button>
                            <span className="font-bold text-sm min-w-[1.2rem] text-center">{cartItem.quantity}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 rounded-full hover:bg-primary hover:text-white transition-colors"
                              onClick={() => addToCart(item)}
                              disabled={item.quantity !== null && cartItem.quantity >= item.quantity}
                            >
                              <Plus size={14} />
                            </Button>
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
                          disabled={item.quantity !== null && item.quantity <= 0}
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
            ))}
          </div>
        )}
      </div>

      {/* Floating Cart Button */}
      {cart.length > 0 && (
        <div className="fixed bottom-8 inset-x-0 px-4 z-50 pointer-events-none">
          <div className="max-w-4xl mx-auto w-full pointer-events-auto">
            <Button
              size="lg"
              className="w-full rounded-full h-16 shadow-2xl bg-primary hover:bg-primary/90 text-lg font-bold group"
              onClick={handleCheckout}
            >
              <ShoppingBag className="mr-3 w-6 h-6 group-hover:scale-110 transition-transform" />
              View Cart ({getCartItemCount()} items) • {formatCurrency(getCartTotal())}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
