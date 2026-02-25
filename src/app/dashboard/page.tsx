'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Utensils, ShoppingBag, CreditCard, TrendingUp, Bell, Clock, ShieldCheck, Smartphone, Link2, Copy, Check, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface Restaurant {
  id: string;
  name: string;
  slug: string;
  subscription_status: string;
  subscription_expires_at: string;
}

interface Order {
  id: string;
  order_type: string;
  status: string;
  total_amount: number;
  table_id: string | null;
  created_at: string;
  table?: { table_number: number } | null;
}

export default function DashboardPage() {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    ordersToday: 0,
    activeTables: 0,
    awaitingConfirmation: 0,
  });
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);
  const router = useRouter();
  const supabase = createClient();
  const { toast } = useToast();

  const menuUrl = restaurant?.slug 
    ? `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/menu/${restaurant.slug}`
    : '';

  const copyMenuLink = async () => {
    if (!menuUrl) return;
    
    try {
      await navigator.clipboard.writeText(menuUrl);
      setCopied(true);
      toast({
        title: 'Link copied!',
        description: 'Your menu link has been copied to clipboard.',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: 'Failed to copy',
        description: 'Please copy the link manually.',
        variant: 'destructive',
      });
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      // Re-fetch all data
      const authData = await getAuthenticatedUser();
      
      if (!authData || !authData.user) {
        router.push('/auth/login');
        return;
      }

      let finalAuthData = authData;

      if (!authData.userData?.restaurant_id || !authData.restaurant) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        const retryAuthData = await getAuthenticatedUser();
        
        if (!retryAuthData?.userData?.restaurant_id || !retryAuthData?.restaurant) {
          router.push('/restaurants');
          return;
        }
        
        finalAuthData = retryAuthData;
      }

      if (finalAuthData.restaurant) {
        setRestaurant(finalAuthData.restaurant);
      }

      const userData = finalAuthData.userData!;
      const restaurantId = finalAuthData.restaurant!.id;

      // Calculate stats
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Total revenue
      const { data: revenueData } = await supabase
        .from('orders')
        .select('total_amount')
        .eq('restaurant_id', userData.restaurant_id)
        .eq('status', 'completed');

      const ordersRevenue = revenueData?.reduce((sum, order) => sum + Number(order.total_amount), 0) || 0;

      // Guest sessions revenue
      const { data: guestTables } = await supabase
        .from('guest_tables')
        .select('id')
        .eq('restaurant_id', userData.restaurant_id);

      let guestSessionsRevenue = 0;
      if (guestTables && guestTables.length > 0) {
        const tableIds = guestTables.map(t => t.id);
        const { data: guestSessionsData } = await supabase
          .from('guest_sessions')
          .select(`
            id,
            guest_orders(
              quantity,
              price,
              status
            )
          `)
          .in('guest_table_id', tableIds)
          .in('status', ['PAID', 'CLOSED']);

        guestSessionsData?.forEach((session: any) => {
          session.guest_orders?.forEach((order: any) => {
            if (order.status !== 'pending_removal') {
              guestSessionsRevenue += Number(order.quantity) * Number(order.price);
            }
          });
        });
      }

      const totalRevenue = ordersRevenue + guestSessionsRevenue;

      // Orders today
      const { data: ordersTodayData } = await supabase
        .from('orders')
        .select('id')
        .eq('restaurant_id', userData.restaurant_id)
        .gte('created_at', today.toISOString());

      // Active tables
      const { data: tablesData } = await supabase
        .from('tables')
        .select('id, status')
        .eq('restaurant_id', userData.restaurant_id);

      const activeTables = tablesData?.filter(t => t.status === 'occupied').length || 0;
      const totalTables = tablesData?.length || 0;

      // Awaiting confirmation
      const { data: awaitingData } = await supabase
        .from('orders')
        .select('id')
        .eq('restaurant_id', userData.restaurant_id)
        .eq('status', 'awaiting_confirmation');

      setStats({
        totalRevenue,
        ordersToday: ordersTodayData?.length || 0,
        activeTables: `${activeTables} / ${totalTables}`,
        awaitingConfirmation: awaitingData?.length || 0,
      });

      // Fetch recent orders (excluding completed and cancelled)
      const { data: ordersData } = await supabase
        .from('orders')
        .select('*')
        .eq('restaurant_id', userData.restaurant_id)
        .neq('status', 'completed')
        .neq('status', 'cancelled')
        .order('created_at', { ascending: false })
        .limit(5);

      if (ordersData) {
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

        const ordersWithTables = ordersDataTyped.map(order => ({
          ...order,
          table: order.table_id ? tablesMap[order.table_id] || null : null,
        })) as Order[];
        
        setRecentOrders(ordersWithTables);
      }

      toast({
        title: 'Refreshed',
        description: 'Dashboard data has been updated.',
      });
    } catch (error) {
      console.error('Error refreshing dashboard:', error);
      toast({
        title: 'Refresh failed',
        description: 'Could not refresh dashboard data.',
        variant: 'destructive',
      });
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Use production-ready auth helper
        const authData = await getAuthenticatedUser();
        
        if (!authData || !authData.user) {
          router.push('/auth/login');
          return;
        }

        let finalAuthData = authData;

        if (!authData.userData?.restaurant_id || !authData.restaurant) {
          // Wait a bit and retry once more (webhook might still be processing)
          await new Promise(resolve => setTimeout(resolve, 2000));
          const retryAuthData = await getAuthenticatedUser();
          
          if (!retryAuthData?.userData?.restaurant_id || !retryAuthData?.restaurant) {
            console.log('No restaurant found. Redirecting to restaurants page.');
            router.push('/restaurants');
            return;
          }
          
          finalAuthData = retryAuthData;
        }

        if (finalAuthData.restaurant) {
          setRestaurant(finalAuthData.restaurant);
        }

        const userData = finalAuthData.userData!;
        const restaurantId = finalAuthData.restaurant!.id;

        // Calculate stats
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Total revenue (completed orders + closed guest sessions)
        const { data: revenueData } = await supabase
          .from('orders')
          .select('total_amount')
          .eq('restaurant_id', userData.restaurant_id)
          .eq('status', 'completed');

        const ordersRevenue = revenueData?.reduce((sum, order) => sum + Number(order.total_amount), 0) || 0;

        // Get guest sessions revenue (closed/paid sessions)
        const { data: guestTables } = await supabase
          .from('guest_tables')
          .select('id')
          .eq('restaurant_id', userData.restaurant_id);

        let guestSessionsRevenue = 0;
        if (guestTables && guestTables.length > 0) {
          const tableIds = guestTables.map(t => t.id);
          const { data: guestSessionsData } = await supabase
            .from('guest_sessions')
            .select(`
              id,
              guest_orders(
                quantity,
                price,
                status
              )
            `)
            .in('guest_table_id', tableIds)
            .in('status', ['PAID', 'CLOSED']);

          // Calculate revenue excluding pending_removal items
          guestSessionsData?.forEach((session: any) => {
            session.guest_orders?.forEach((order: any) => {
              if (order.status !== 'pending_removal') {
                guestSessionsRevenue += Number(order.quantity) * Number(order.price);
              }
            });
          });
        }

        const totalRevenue = ordersRevenue + guestSessionsRevenue;

        // Orders today
        const { data: ordersTodayData } = await supabase
          .from('orders')
          .select('id')
          .eq('restaurant_id', userData.restaurant_id)
          .gte('created_at', today.toISOString());

        // Active tables
        const { data: tablesData } = await supabase
          .from('tables')
          .select('id, status')
          .eq('restaurant_id', userData.restaurant_id);

        const activeTables = tablesData?.filter(t => t.status === 'occupied').length || 0;
        const totalTables = tablesData?.length || 0;

        // Awaiting confirmation
        const { data: awaitingData } = await supabase
          .from('orders')
          .select('id')
          .eq('restaurant_id', userData.restaurant_id)
          .eq('status', 'awaiting_confirmation');

        setStats({
          totalRevenue,
          ordersToday: ordersTodayData?.length || 0,
          activeTables: `${activeTables} / ${totalTables}`,
          awaitingConfirmation: awaitingData?.length || 0,
        });

        // Fetch recent orders (excluding completed and cancelled)
        const { data: ordersData } = await supabase
          .from('orders')
          .select('*')
          .eq('restaurant_id', userData.restaurant_id)
          .neq('status', 'completed')
          .neq('status', 'cancelled')
          .order('created_at', { ascending: false })
          .limit(5);

        if (ordersData) {
          const ordersDataTyped = ordersData as any[];
          // Fetch tables separately for orders that have table_id
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
          const ordersWithTables = ordersDataTyped.map(order => ({
            ...order,
            table: order.table_id ? tablesMap[order.table_id] || null : null,
          })) as Order[];
          
          setRecentOrders(ordersWithTables);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Set up real-time subscription
    const channel = supabase
      .channel('dashboard-updates')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router, supabase]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'awaiting_confirmation':
        return 'bg-orange-500 hover:bg-orange-600';
      case 'preparing':
        return 'bg-blue-500 hover:bg-blue-600';
      case 'confirmed':
        return 'bg-green-500 hover:bg-green-600';
      default:
        return 'bg-gray-500 hover:bg-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 w-full">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 w-full max-w-full overflow-x-hidden">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold font-headline truncate">
            Welcome back, {restaurant?.name || 'Restaurant'}!
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">Here's what's happening in your restaurant today.</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <Button variant="outline" className="rounded-full bg-white flex-1 md:flex-initial text-sm" asChild>
            <Link href="/dashboard/orders">
              <Clock className="mr-2 h-4 w-4" /> <span className="hidden sm:inline">View </span>Orders
            </Link>
          </Button>
          <Button className="rounded-full flex-1 md:flex-initial text-sm" asChild>
            <Link href="/dashboard/menu">
              <Utensils className="mr-2 h-4 w-4" /> <span className="hidden sm:inline">Manage </span>Menu
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card className="overflow-hidden border-none shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs sm:text-sm font-medium">Total Revenue</CardTitle>
            <TrendingUp className="text-primary w-4 h-4 sm:w-5 sm:h-5" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold break-words">{formatCurrency(stats.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground mt-1">All time</p>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-none shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs sm:text-sm font-medium">Orders Today</CardTitle>
            <ShoppingBag className="text-primary w-4 h-4 sm:w-5 sm:h-5" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{stats.ordersToday}</div>
            <p className="text-xs text-muted-foreground mt-1">New orders</p>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-none shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs sm:text-sm font-medium">Active Tables</CardTitle>
            <Utensils className="text-primary w-4 h-4 sm:w-5 sm:h-5" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{stats.activeTables}</div>
            <p className="text-xs text-muted-foreground mt-1">Currently occupied</p>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-none shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs sm:text-sm font-medium">Awaiting Confirmation</CardTitle>
            <Bell className={`w-4 h-4 sm:w-5 sm:h-5 ${stats.awaitingConfirmation > 0 ? 'text-orange-600 animate-bounce' : 'text-primary'}`} />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{stats.awaitingConfirmation}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.awaitingConfirmation > 0 ? 'Action needed' : 'All clear'}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 lg:gap-8">
        {/* Recent Orders */}
        <Card className="lg:col-span-2 border-none shadow-sm">
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <CardTitle className="text-lg sm:text-xl">Live Orders</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Monitor your kitchen and incoming transfers</CardDescription>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
                className="text-primary hover:text-primary"
                title="Refresh orders"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
              <Button variant="ghost" className="text-primary text-xs sm:text-sm font-bold" asChild>
                <Link href="/dashboard/orders">View All</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentOrders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ShoppingBag className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>No orders yet</p>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {recentOrders.map((order) => (
                  <Link key={order.id} href={`/dashboard/orders/${order.id}`}>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 p-3 sm:p-4 bg-muted/30 rounded-xl border border-transparent hover:border-primary/20 transition-all cursor-pointer group">
                      <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                        <div className={`p-2 sm:p-3 rounded-full shrink-0 ${order.status === 'awaiting_confirmation' ? 'bg-orange-100' : 'bg-primary/10'}`}>
                          <CreditCard className={order.status === 'awaiting_confirmation' ? 'text-orange-600' : 'text-primary'} size={18} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-bold flex flex-wrap items-center gap-2 text-sm sm:text-base">
                            <span className="truncate">{order.id.slice(0, 8).toUpperCase()}</span>
                            <Badge variant="outline" className="text-[10px] uppercase shrink-0">
                              {order.order_type.replace('_', '-')}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {order.table ? `Table ${order.table.table_number}` : 'Online Order'} • {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex flex-row sm:flex-col items-center sm:items-end gap-2 shrink-0 w-full sm:w-auto justify-between sm:justify-end">
                        <span className="font-bold text-sm sm:text-base">{formatCurrency(order.total_amount)}</span>
                        <Badge className={`${getStatusColor(order.status)} text-xs`}>
                          {order.status.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Subscription & Support */}
        <div className="space-y-6">
          {/* Share Menu Card */}
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Link2 size={20} className="text-primary" />
                Share Your Menu
              </CardTitle>
              <CardDescription>Share this link with your customers</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 p-2 sm:p-3 bg-muted rounded-lg border">
                <code className="flex-1 text-xs sm:text-sm text-muted-foreground truncate min-w-0">
                  {menuUrl || 'Loading...'}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyMenuLink}
                  className="shrink-0 h-8 w-8 p-0"
                >
                  {copied ? (
                    <Check size={16} className="text-green-600" />
                  ) : (
                    <Copy size={16} />
                  )}
                </Button>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => window.open(menuUrl, '_blank')}
                disabled={!menuUrl}
              >
                <Link2 className="mr-2 h-4 w-4" />
                View Public Menu
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-primary text-white border-none shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2 sm:p-4 opacity-20">
              <ShieldCheck size={60} className="sm:w-20 sm:h-20" />
            </div>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg text-white">Subscription</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4">
              <div>
                <p className="text-xs sm:text-sm opacity-80">Plan: Professional</p>
                <p className="text-xl sm:text-2xl font-bold capitalize">{restaurant?.subscription_status || 'Trial'}</p>
              </div>
              {restaurant?.subscription_expires_at && (
                <p className="text-xs opacity-80 break-words">
                  {restaurant.subscription_status === 'active' ? 'Next billing: ' : 'Expires: '}
                  {new Date(restaurant.subscription_expires_at).toLocaleDateString()} (₦20,000)
                </p>
              )}
              <Button variant="secondary" className="w-full font-bold text-sm sm:text-base" asChild>
                <Link href="/dashboard/billing">Manage Billing</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2 sm:gap-3">
              <Button variant="outline" className="h-16 sm:h-20 flex-col gap-1 sm:gap-2 bg-white rounded-xl text-xs sm:text-sm" asChild>
                <Link href="/dashboard/menu">
                  <Utensils size={18} className="sm:w-5 sm:h-5" /> <span>Menu</span>
                </Link>
              </Button>
              <Button variant="outline" className="h-16 sm:h-20 flex-col gap-1 sm:gap-2 bg-white rounded-xl text-xs sm:text-sm" asChild>
                <Link href="/dashboard/tables">
                  <Smartphone size={18} className="sm:w-5 sm:h-5" /> <span>QR Codes</span>
                </Link>
              </Button>
              <Button variant="outline" className="h-16 sm:h-20 flex-col gap-1 sm:gap-2 bg-white rounded-xl text-xs sm:text-sm" asChild>
                <Link href="/dashboard/orders">
                  <TrendingUp size={18} className="sm:w-5 sm:h-5" /> <span>Orders</span>
                </Link>
              </Button>
              <Button variant="outline" className="h-16 sm:h-20 flex-col gap-1 sm:gap-2 bg-white rounded-xl text-xs sm:text-sm" asChild>
                <Link href="/dashboard/settings">
                  <Bell size={18} className="sm:w-5 sm:h-5" /> <span>Settings</span>
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
