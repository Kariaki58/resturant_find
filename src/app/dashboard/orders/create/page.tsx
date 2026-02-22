'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Minus, ShoppingCart, X, Utensils, Save, FileText, Trash2, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  available: boolean;
  category_id: string;
  category?: { name: string };
}

interface Category {
  id: string;
  name: string;
}

interface Table {
  id: string;
  table_number: number;
  status: 'available' | 'occupied';
}

interface CartItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
}

interface OrderDraft {
  id: string;
  customerName: string;
  tableNumber: string;
  note: string;
  cart: CartItem[];
  createdAt: number;
  updatedAt: number;
}

const DRAFTS_STORAGE_KEY = 'restaurant_order_drafts';

export default function CreateOrderPage() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [tableNumber, setTableNumber] = useState<string>('');
  const [note, setNote] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [drafts, setDrafts] = useState<OrderDraft[]>([]);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  const [draftsDialogOpen, setDraftsDialogOpen] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();

  useEffect(() => {
    fetchData();
    loadDrafts();
  }, []);

  const loadDrafts = () => {
    try {
      const stored = localStorage.getItem(DRAFTS_STORAGE_KEY);
      if (stored) {
        const parsedDrafts = JSON.parse(stored) as OrderDraft[];
        // Sort by updatedAt descending (most recent first)
        const sorted = parsedDrafts.sort((a, b) => b.updatedAt - a.updatedAt);
        setDrafts(sorted);
      }
    } catch (error) {
      console.error('Error loading drafts:', error);
    }
  };

  const saveDraft = useCallback((isAutoSave = false) => {
    // Don't save empty drafts (unless it's an update to an existing draft)
    if (!currentDraftId && !customerName.trim() && cart.length === 0) {
      return;
    }

    if (isAutoSave) {
      setIsAutoSaving(true);
    }

    try {
      // Get current drafts from localStorage to avoid stale state
      const stored = localStorage.getItem(DRAFTS_STORAGE_KEY);
      const currentDrafts = stored ? (JSON.parse(stored) as OrderDraft[]) : [];

      const draft: OrderDraft = {
        id: currentDraftId || `draft-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        customerName: customerName.trim(),
        tableNumber: tableNumber || '',
        note: note.trim(),
        cart: [...cart],
        createdAt: currentDraftId ? currentDrafts.find(d => d.id === currentDraftId)?.createdAt || Date.now() : Date.now(),
        updatedAt: Date.now(),
      };

      const existingDrafts = currentDrafts.filter(d => d.id !== draft.id);
      const updatedDrafts = [draft, ...existingDrafts].sort((a, b) => b.updatedAt - a.updatedAt);
      
      // Save all drafts (no limit)
      localStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(updatedDrafts));
      setDrafts(updatedDrafts);
      
      if (!currentDraftId) {
        setCurrentDraftId(draft.id);
      }

      if (!isAutoSave) {
        toast({
          title: 'Draft saved',
          description: 'Your order has been saved as a draft',
        });
      }
    } catch (error) {
      console.error('Error saving draft:', error);
      if (!isAutoSave) {
        toast({
          title: 'Error',
          description: 'Failed to save draft',
          variant: 'destructive',
        });
      }
    } finally {
      if (isAutoSave) {
        setIsAutoSaving(false);
      }
    }
  }, [customerName, tableNumber, note, cart, currentDraftId, toast]);

  // Auto-save draft when form changes (debounced)
  // This will update the draft whenever the user makes changes to a loaded draft
  useEffect(() => {
    // Only auto-save if there's a current draft ID (meaning a draft is loaded)
    // or if there's meaningful content (customer name or cart items)
    if (currentDraftId && (customerName.trim() || cart.length > 0)) {
      const timeoutId = setTimeout(() => {
        saveDraft(true);
      }, 1000); // Auto-save after 1 second of inactivity
      return () => clearTimeout(timeoutId);
    }
  }, [customerName, tableNumber, note, cart, currentDraftId, saveDraft]);

  const loadDraft = (draft: OrderDraft) => {
    setCustomerName(draft.customerName);
    setTableNumber(draft.tableNumber);
    setNote(draft.note);
    setCart(draft.cart);
    setCurrentDraftId(draft.id);
    setDraftsDialogOpen(false);
    toast({
      title: 'Draft loaded',
      description: `Loaded draft for ${draft.customerName || 'customer'}`,
    });
  };

  const deleteDraft = (draftId: string) => {
    try {
      const updatedDrafts = drafts.filter(d => d.id !== draftId);
      localStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(updatedDrafts));
      setDrafts(updatedDrafts);
      
      if (currentDraftId === draftId) {
        setCurrentDraftId(null);
        // Clear form if deleting current draft
        setCustomerName('');
        setTableNumber('');
        setNote('');
        setCart([]);
      }
      
      toast({
        title: 'Draft deleted',
        description: 'Draft has been removed',
      });
    } catch (error) {
      console.error('Error deleting draft:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete draft',
        variant: 'destructive',
      });
    }
  };

  const clearCurrentDraft = () => {
    setCurrentDraftId(null);
    toast({
      title: 'Draft cleared',
      description: 'You can now create a new draft or start fresh',
    });
  };

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/login');
        return;
      }

      const { data: userData } = await supabase
        .from('users')
        .select('restaurant_id')
        .eq('id', user.id)
        .maybeSingle();

      if (!userData?.restaurant_id) {
        router.push('/restaurants');
        return;
      }

      const restaurantId = userData.restaurant_id;

      // Fetch categories
      const { data: categoriesData } = await supabase
        .from('menu_categories')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('name');

      if (categoriesData) {
        setCategories(categoriesData);
      }

      // Fetch menu items
      const { data: itemsData } = await supabase
        .from('menu_items')
        .select(`
          *,
          category:menu_categories(name)
        `)
        .eq('restaurant_id', restaurantId)
        .order('name');

      if (itemsData) {
        setMenuItems(itemsData as MenuItem[]);
      }

      // Fetch tables
      const { data: tablesData } = await supabase
        .from('tables')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('table_number');

      if (tablesData) {
        setTables(tablesData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load menu items',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (item: MenuItem) => {
    if (!item.available) {
      toast({
        title: 'Item unavailable',
        description: 'This item is currently unavailable',
        variant: 'destructive',
      });
      return;
    }

    const existingItem = cart.find(c => c.menuItemId === item.id);
    if (existingItem) {
      setCart(cart.map(c =>
        c.menuItemId === item.id
          ? { ...c, quantity: c.quantity + 1 }
          : c
      ));
    } else {
      setCart([...cart, {
        menuItemId: item.id,
        name: item.name,
        price: item.price,
        quantity: 1,
      }]);
    }
  };

  const removeFromCart = (menuItemId: string) => {
    setCart(cart.filter(item => item.menuItemId !== menuItemId));
  };

  const updateQuantity = (menuItemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(menuItemId);
      return;
    }
    setCart(cart.map(item =>
      item.menuItemId === menuItemId
        ? { ...item, quantity }
        : item
    ));
  };

  const getTotal = () => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const filteredItems = selectedCategory === 'all'
    ? menuItems
    : menuItems.filter(item => item.category_id === selectedCategory);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerName.trim()) {
      toast({
        title: 'Customer name required',
        description: 'Please enter the customer name',
        variant: 'destructive',
      });
      return;
    }

    if (cart.length === 0) {
      toast({
        title: 'Cart is empty',
        description: 'Please add items to the cart',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/orders/create-restaurant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerName: customerName.trim(),
          tableNumber: tableNumber && tableNumber !== 'none' ? parseInt(tableNumber) : null,
          cart: cart.map(item => ({
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            price: item.price,
          })),
          note: note.trim() || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create order');
      }

      toast({
        title: 'Order created',
        description: 'Order has been created successfully',
      });

      // Delete draft if it was loaded from one
      if (currentDraftId) {
        deleteDraft(currentDraftId);
      }

      // Reset form
      setCustomerName('');
      setTableNumber('');
      setNote('');
      setCart([]);
      setSelectedCategory('all');
      setCurrentDraftId(null);

      // Redirect to orders page with refresh trigger
      router.push('/dashboard/orders?refresh=true');
      router.refresh();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create order',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 w-full">
        <Skeleton className="h-12 w-64" />
        <div className="grid md:grid-cols-3 gap-6">
          <Skeleton className="h-96 md:col-span-2" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-headline">Create Order</h1>
          <p className="text-muted-foreground">Create an order on behalf of a customer</p>
        </div>
        <Dialog open={draftsDialogOpen} onOpenChange={setDraftsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="gap-2">
              <FileText className="h-4 w-4" />
              Drafts {drafts.length > 0 && `(${drafts.length})`}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Saved Drafts</DialogTitle>
              <DialogDescription>
                Load a draft to continue working on an order, or delete drafts you no longer need.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 mt-4">
              {drafts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No saved drafts</p>
                  <p className="text-sm">Save your current order as a draft to continue later</p>
                </div>
              ) : (
                drafts.map((draft) => (
                  <Card key={draft.id} className={currentDraftId === draft.id ? 'border-primary' : ''}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold truncate">
                              {draft.customerName || 'Unnamed Customer'}
                            </h4>
                            {currentDraftId === draft.id && (
                              <Badge variant="secondary" className="text-xs">Current</Badge>
                            )}
                          </div>
                          <div className="space-y-1 text-sm text-muted-foreground">
                            {draft.tableNumber && (
                              <p className="flex items-center gap-1">
                                <Utensils className="h-3 w-3" />
                                Table {draft.tableNumber}
                              </p>
                            )}
                            <p className="flex items-center gap-1">
                              <ShoppingCart className="h-3 w-3" />
                              {draft.cart.length} item{draft.cart.length !== 1 ? 's' : ''} • {formatCurrency(draft.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0))}
                            </p>
                            <p className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDate(draft.updatedAt)}
                            </p>
                            {draft.note && (
                              <p className="text-xs line-clamp-1 mt-2">{draft.note}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => loadDraft(draft)}
                            disabled={currentDraftId === draft.id}
                          >
                            Load
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteDraft(draft.id)}
                            className="text-red-500 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <form onSubmit={handleSubmit} className="grid md:grid-cols-3 gap-6">
        {/* Left Column - Menu Items */}
        <div className="md:col-span-2 space-y-6">
          {/* Category Filter */}
          <Card>
            <CardContent className="pt-6">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Menu Items Grid */}
          <div className="grid sm:grid-cols-2 gap-4">
            {filteredItems.map(item => (
              <Card key={item.id} className={!item.available ? 'opacity-60' : ''}>
                <div className="relative aspect-video w-full overflow-hidden rounded-t-lg">
                  <img
                    src={item.image_url || '/placeholder-food.jpg'}
                    alt={item.name}
                    className="h-full w-full object-cover"
                  />
                  {!item.available && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <Badge variant="destructive">Unavailable</Badge>
                    </div>
                  )}
                </div>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h3 className="font-bold text-lg">{item.name}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    <span className="text-lg font-bold">{formatCurrency(item.price)}</span>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => addToCart(item)}
                      disabled={!item.available}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredItems.length === 0 && (
            <Card>
              <CardContent className="pt-6 text-center py-12">
                <Utensils className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No menu items found</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Order Details & Cart */}
        <div className="space-y-6">
          {/* Customer Info */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Customer Information</CardTitle>
                {currentDraftId && (
                  <div className="flex items-center gap-2">
                    {isAutoSaving ? (
                      <Badge variant="secondary" className="text-xs">
                        <Clock className="h-3 w-3 mr-1 animate-spin" />
                        Saving...
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">
                        Draft Active
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="customerName">Customer Name *</Label>
                <Input
                  id="customerName"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Enter customer name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tableNumber">Table Number</Label>
                <Select value={tableNumber || undefined} onValueChange={(value) => setTableNumber(value === 'none' ? '' : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select table (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No table</SelectItem>
                    {tables.map(table => (
                      <SelectItem key={table.id} value={table.table_number.toString()}>
                        Table {table.table_number} {table.status === 'occupied' && '(Occupied)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="note">Order Note (Optional)</Label>
                <Textarea
                  id="note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Special instructions..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Cart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Cart ({cart.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {cart.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Cart is empty. Add items from the menu.
                </p>
              ) : (
                <div className="space-y-4">
                  {cart.map(item => (
                    <div key={item.menuItemId} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{item.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatCurrency(item.price)} × {item.quantity}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateQuantity(item.menuItemId, item.quantity - 1)}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="w-8 text-center font-medium">{item.quantity}</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateQuantity(item.menuItemId, item.quantity + 1)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500"
                          onClick={() => removeFromCart(item.menuItemId)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center text-lg font-bold">
                      <span>Total:</span>
                      <span>{formatCurrency(getTotal())}</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="space-y-2">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              size="lg"
              onClick={() => saveDraft(false)}
              disabled={(!customerName.trim() && cart.length === 0)}
            >
              <Save className="h-4 w-4 mr-2" />
              {currentDraftId ? 'Update Draft' : 'Save as Draft'}
            </Button>
            {currentDraftId && (
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                size="sm"
                onClick={clearCurrentDraft}
              >
                Clear Draft
              </Button>
            )}
            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={submitting || cart.length === 0 || !customerName.trim()}
            >
              {submitting ? 'Creating Order...' : 'Create Order'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

