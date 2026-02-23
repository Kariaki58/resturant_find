'use client';

import { useEffect, useState, useRef, Suspense, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShoppingBag, Filter, Search, CreditCard, Clock, Plus, Download, Phone } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Pagination } from '@/components/ui/pagination';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { useDebounce } from '@/hooks/use-debounce';
import { useOptimisticUpdate } from '@/hooks/use-optimistic-update';
import { requestCache } from '@/lib/utils/request-cache';
import { useToast } from '@/hooks/use-toast';

interface Order {
  id: string;
  order_type: string;
  status: string;
  total_amount: number;
  table_id: string | null;
  created_at: string;
  delivery_method: 'delivery' | 'pickup' | 'dine_in';
  note: string | null;
  payment_reference: string | null;
  buyer_transfer_name: string | null;
  buyer_email: string | null;
  buyer_phone: string | null;
  table?: { table_number: number } | null;
  customer?: { full_name: string; email: string } | null;
}

const ITEMS_PER_PAGE = 10;

function OrdersContent() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasRestaurant, setHasRestaurant] = useState<boolean | null>(null);
  const [updatingOrders, setUpdatingOrders] = useState<Set<string>>(new Set());
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const restaurantIdRef = useRef<string | null>(null);
  const { toast } = useToast();
  
  // Debounce search query
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const fetchOrders = useCallback(async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
          console.error('Auth error:', authError);
          router.push('/auth/login');
          return;
        }

        // Retry logic for fetching user data (in case of timing issues)
        let userData = null;
        let userError = null;
        let retries = 0;
        const maxRetries = 3;

        while (retries < maxRetries && !userData) {
          const result = await supabase
            .from('users')
            .select('restaurant_id')
            .eq('id', user.id)
            .maybeSingle();
          
          userData = result.data;
          userError = result.error;

          if (userData?.restaurant_id) {
            break;
          }

          if (retries < maxRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
          retries++;
        }

        if (userError) {
          console.error('Error fetching user data after retries:', userError);
          setLoading(false);
          return;
        }

        if (!userData?.restaurant_id) {
          console.log('No restaurant_id found');
          setHasRestaurant(false);
          setTimeout(() => {
            if (!userData?.restaurant_id) {
              router.push('/restaurants');
            }
          }, 1000);
          return;
        }

        restaurantIdRef.current = userData.restaurant_id;
        setHasRestaurant(true);

        // Calculate pagination range
        const from = (currentPage - 1) * ITEMS_PER_PAGE;
        const to = from + ITEMS_PER_PAGE - 1;

        // Build base query for count
        let countQuery = supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('restaurant_id', restaurantIdRef.current);

        if (statusFilter !== 'all') {
          countQuery = countQuery.eq('status', statusFilter);
        }

        if (typeFilter !== 'all') {
          countQuery = countQuery.eq('order_type', typeFilter);
        }

        // Apply search filter to count
        if (debouncedSearchQuery) {
          // For search, we need to get all matching IDs first, then count
          // This is a limitation of Supabase - we'll handle search client-side for count
        }

        // Get total count
        const { count, error: countError } = await countQuery;
        
        if (countError) {
          console.error('Error fetching count:', countError);
        } else {
          setTotalCount(count || 0);
          setTotalPages(Math.ceil((count || 0) / ITEMS_PER_PAGE));
        }

        // Build query for paginated data
        let query = supabase
          .from('orders')
          .select(`
            *,
            customer:users!orders_customer_id_fkey(full_name, email)
          `)
          .eq('restaurant_id', restaurantIdRef.current)
          .order('created_at', { ascending: false })
          .range(from, to);

        if (statusFilter !== 'all') {
          query = query.eq('status', statusFilter);
        }

        if (typeFilter !== 'all') {
          query = query.eq('order_type', typeFilter);
        }

        const { data: ordersData, error: ordersError } = await query;

        if (ordersError) {
          console.error('Error fetching orders:', ordersError);
          setOrders([]);
        } else if (ordersData) {
          // Fetch tables separately for orders that have table_id
          const ordersDataTyped = ordersData as any[];
          const tableIds = ordersDataTyped
            .map(order => order.table_id)
            .filter((id): id is string => id !== null && id !== undefined);
          
          let tablesMap: Record<string, { table_number: number }> = {};
          if (tableIds.length > 0) {
            const { data: tablesData } = await supabase
              .from('tables')
              .select('id, table_number')
              .in('id', tableIds);
            
            if (tablesData) {
              const tablesDataTyped = tablesData as any[];
              tablesMap = tablesDataTyped.reduce((acc, table: any) => {
                acc[table.id] = { table_number: table.table_number };
                return acc;
              }, {} as Record<string, { table_number: number }>);
            }
          }

          // Combine orders with table data
          let ordersWithTables = ordersDataTyped.map(order => ({
            ...order,
            table: order.table_id ? tablesMap[order.table_id] || null : null,
          })) as Order[];

          // Apply client-side search filter (since Supabase doesn't support full-text search easily)
          if (debouncedSearchQuery) {
            ordersWithTables = ordersWithTables.filter(order => 
              order.id.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
              order.customer?.full_name?.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
              order.customer?.email?.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
              order.buyer_transfer_name?.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
            );
          }
          
          setOrders(ordersWithTables);
        } else {
          setOrders([]);
        }
      } catch (error) {
        console.error('Error fetching orders:', error);
        setOrders([]);
      } finally {
        setLoading(false);
      }
  }, [statusFilter, typeFilter, currentPage, debouncedSearchQuery, supabase, router]);

  useEffect(() => {
    // Check if we need to refresh (coming from create page)
    const refresh = searchParams.get('refresh');
    if (refresh === 'true') {
      // Remove the refresh parameter from URL
      router.replace('/dashboard/orders', { scroll: false });
    }

    let channel: any = null;

    fetchOrders().then(() => {
      // Set up real-time subscription after initial fetch
      if (restaurantIdRef.current) {
        const restaurantId = restaurantIdRef.current;
        channel = supabase
          .channel(`orders-updates-${restaurantId}`)
          .on('postgres_changes', 
            { 
              event: '*', 
              schema: 'public', 
              table: 'orders'
            },
            (payload) => {
              // Only process changes for this restaurant
              if (payload.new && (payload.new as any).restaurant_id === restaurantId) {
                // Optimistically update the order in the list
                setOrders(prev => {
                  const existingIndex = prev.findIndex(o => o.id === (payload.new as any).id);
                  if (existingIndex >= 0) {
                    // Update existing order
                    return prev.map((o, i) => i === existingIndex ? { ...o, ...(payload.new as any) } : o);
                  } else {
                    // If it's a new order and matches current filters, add it
                    const newOrder = payload.new as any;
                    const matchesFilter = 
                      (statusFilter === 'all' || newOrder.status === statusFilter) &&
                      (typeFilter === 'all' || newOrder.order_type === typeFilter);
                    
                    if (matchesFilter && prev.length < ITEMS_PER_PAGE) {
                      return [newOrder, ...prev].slice(0, ITEMS_PER_PAGE);
                    }
                    return prev;
                  }
                });
                // Refetch to get accurate count and pagination
                fetchOrders();
              } else if (payload.old && (payload.old as any).restaurant_id === restaurantId) {
                // Handle deletes
                setOrders(prev => prev.filter(o => o.id !== (payload.old as any).id));
                fetchOrders();
              }
        }
      )
      .subscribe();
      }
    });

    // Listen for focus event to refresh when returning to page
    const handleFocus = () => {
      fetchOrders();
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      if (channel) {
      supabase.removeChannel(channel);
      }
      window.removeEventListener('focus', handleFocus);
    };
  }, [router, supabase, searchParams, fetchOrders]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, typeFilter, debouncedSearchQuery]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending_payment':
        return 'bg-gray-500';
      case 'awaiting_confirmation':
        return 'bg-orange-500';
      case 'confirmed':
        return 'bg-blue-500';
      case 'preparing':
        return 'bg-purple-500';
      case 'ready':
        return 'bg-green-500';
      case 'completed':
        return 'bg-green-600';
      case 'cancelled':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  // Optimistic update hook
  const { execute: updateOrderStatusOptimistic } = useOptimisticUpdate(
    async (data: { orderId: string; newStatus: string }) => {
      const { error } = await supabase
        .from('orders')
        .update({ status: data.newStatus })
        .eq('id', data.orderId);

      if (error) throw error;

      // Update stock when order is confirmed
      if (data.newStatus === 'confirmed') {
        try {
          const stockResponse = await fetch('/api/orders/update-stock', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ orderId: data.orderId }),
          });

          if (!stockResponse.ok) {
            console.error('Failed to update stock, but order was confirmed');
          }
        } catch (stockError) {
          console.error('Error updating stock:', stockError);
        }
      }

      // Refetch orders after status update
      if (restaurantIdRef.current) {
        // Trigger refetch by updating a dependency or calling fetchOrders
        window.dispatchEvent(new CustomEvent('refresh-orders'));
      }

      return data;
    },
    {
      successMessage: 'Order status updated successfully',
      errorMessage: 'Failed to update order status',
      rollbackOnError: true,
    }
  );

  const updateOrderStatus = useCallback(async (orderId: string, newStatus: string) => {
    // Optimistically update UI immediately
    setOrders(prev => prev.map(order => 
      order.id === orderId ? { ...order, status: newStatus } : order
    ));
    setUpdatingOrders(prev => new Set(prev).add(orderId));

    try {
      await updateOrderStatusOptimistic({ orderId, newStatus });
      // Refetch to ensure data is in sync
      fetchOrders();
    } catch (error) {
      // Error handling is done in the hook
      // Revert optimistic update on error
      fetchOrders();
    } finally {
      setUpdatingOrders(prev => {
        const next = new Set(prev);
        next.delete(orderId);
        return next;
      });
    }
  }, [updateOrderStatusOptimistic]);

  // Show error state if no restaurant (but don't redirect immediately)
  if (hasRestaurant === false) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 w-full">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold font-headline">Orders</h1>
            <p className="text-muted-foreground">Manage and track all your orders</p>
          </div>
        </div>
        <Card className="border-none shadow-sm">
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">No restaurant found. Please set up your restaurant first.</p>
              <Button asChild>
                <Link href="/restaurants">Go to Restaurants</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline">Orders</h1>
          <p className="text-muted-foreground">Manage and track all your orders</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/orders/create">
            <Plus className="mr-2 h-4 w-4" />
            Create Order
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <Card className="border-none shadow-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
                <Input
                  placeholder="Search by order ID, customer name, or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 transition-all"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending_payment">Pending Payment</SelectItem>
                <SelectItem value="awaiting_confirmation">Awaiting Confirmation</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="preparing">Preparing</SelectItem>
                <SelectItem value="ready">Ready</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="preorder">Pre-order</SelectItem>
                <SelectItem value="dine_in">Dine-in</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Orders List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <Card className="border-none shadow-sm">
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <ShoppingBag className="mx-auto h-12 w-12 mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No orders found</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-4">
            {orders.map((order) => (
            <Card key={order.id} className="border-none shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className={`p-3 rounded-full ${order.status === 'awaiting_confirmation' ? 'bg-orange-100' : 'bg-primary/10'}`}>
                      <CreditCard className={order.status === 'awaiting_confirmation' ? 'text-orange-600' : 'text-primary'} size={24} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-bold">Order {order.id.slice(0, 8).toUpperCase()}</h3>
                        <Badge variant="outline" className="text-xs uppercase">
                          {order.order_type.replace('_', '-')}
                        </Badge>
                        <Badge className={`${getStatusColor(order.status)} text-white`}>
                          {order.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        {order.table && (
                          <p className="font-medium text-primary">from Table {order.table.table_number}</p>
                        )}
                        {order.customer ? (
                          <div>
                            <p className="font-medium">{order.customer.full_name}</p>
                            {order.buyer_phone && (
                              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                <Phone className="h-3 w-3" />
                                {order.buyer_phone}
                              </p>
                            )}
                            {order.buyer_email && (
                              <p className="text-sm text-muted-foreground">{order.buyer_email}</p>
                            )}
                          </div>
                        ) : order.buyer_transfer_name ? (
                          <div>
                            <p className="font-medium">{order.buyer_transfer_name} (Walk-in)</p>
                            {order.buyer_phone && (
                              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                <Phone className="h-3 w-3" />
                                {order.buyer_phone}
                              </p>
                            )}
                            {order.buyer_email && (
                              <p className="text-sm text-muted-foreground">{order.buyer_email}</p>
                            )}
                          </div>
                        ) : null}
                        <p className="capitalize">
                          {order.delivery_method?.replace('_', ' ') || 'Pickup'}
                        </p>
                        <p className="flex items-center gap-1">
                          <Clock size={14} />
                          {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                    <div className="text-right">
                      <p className="text-2xl font-bold">{formatCurrency(order.total_amount)}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/dashboard/orders/${order.id}`}>View Details</Link>
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        asChild
                        title="Download Receipt"
                      >
                        <Link href={`/dashboard/orders/${order.id}`}>
                          <Download className="h-4 w-4" />
                        </Link>
                      </Button>
                      {order.status === 'awaiting_confirmation' && (
                        <>
                          <Button 
                            size="sm" 
                            onClick={() => updateOrderStatus(order.id, 'confirmed')}
                            className="bg-green-600 hover:bg-green-700 transition-all"
                            disabled={updatingOrders.has(order.id)}
                          >
                            {updatingOrders.has(order.id) ? '...' : 'Confirm'}
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => updateOrderStatus(order.id, 'cancelled')}
                            disabled={updatingOrders.has(order.id)}
                            className="transition-all"
                          >
                            {updatingOrders.has(order.id) ? '...' : 'Cancel'}
                          </Button>
                        </>
                      )}
                      {order.status === 'confirmed' && (
                        <Button 
                          size="sm" 
                          onClick={() => updateOrderStatus(order.id, 'preparing')}
                          disabled={updatingOrders.has(order.id)}
                          className="transition-all"
                        >
                          {updatingOrders.has(order.id) ? '...' : 'Start Preparing'}
                        </Button>
                      )}
                      {order.status === 'preparing' && (
                        <Button 
                          size="sm" 
                          onClick={() => updateOrderStatus(order.id, 'ready')}
                          className="bg-green-600 hover:bg-green-700 transition-all"
                          disabled={updatingOrders.has(order.id)}
                        >
                          {updatingOrders.has(order.id) ? '...' : 'Mark Ready'}
                        </Button>
                      )}
                      {order.status === 'ready' && (
                        <Button 
                          size="sm" 
                          onClick={() => updateOrderStatus(order.id, 'completed')}
                          className="bg-green-600 hover:bg-green-700 transition-all"
                          disabled={updatingOrders.has(order.id)}
                        >
                          {updatingOrders.has(order.id) ? '...' : 'Complete'}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            ))}
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex justify-center">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 w-full">
        <Skeleton className="h-12 w-64" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    }>
      <OrdersContent />
    </Suspense>
  );
}

