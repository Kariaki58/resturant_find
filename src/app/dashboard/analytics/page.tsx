'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart3, TrendingUp, DollarSign, Package } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { createClient } from '@/lib/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell } from 'recharts';

interface MenuItemRevenue {
  menu_item_id: string;
  menu_item_name: string;
  total_quantity: number;
  total_revenue: number;
  order_count: number;
  image_url: string | null;
}

interface AnalyticsData {
  menuItems: MenuItemRevenue[];
  totalRevenue: number;
  totalOrders: number;
  totalItemsSold: number;
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'all' | 'today' | '7d' | '30d' | '90d'>('all');
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  const fetchAnalytics = async () => {
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
        .single();

      if (!userData?.restaurant_id) {
        router.push('/restaurants');
        return;
      }

      const restaurantId = userData.restaurant_id;

      // Calculate date filter
      let dateFilter = '';
      if (dateRange !== 'all') {
        const startDate = new Date();
        if (dateRange === 'today') {
          // Start of today (00:00:00)
          startDate.setHours(0, 0, 0, 0);
        } else {
          const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
          startDate.setDate(startDate.getDate() - days);
        }
        dateFilter = startDate.toISOString();
      }

      // Fetch completed orders with order items
      let ordersQuery = supabase
        .from('orders')
        .select(`
          id,
          total_amount,
          order_items(
            id,
            quantity,
            price,
            menu_item_id,
            menu_item:menu_items(
              id,
              name,
              image_url
            )
          )
        `)
        .eq('restaurant_id', restaurantId)
        .eq('status', 'completed');

      if (dateFilter) {
        ordersQuery = ordersQuery.gte('created_at', dateFilter);
      }

      const { data: orders, error } = await ordersQuery;

      if (error) {
        console.error('Error fetching analytics:', error);
        setLoading(false);
        return;
      }

      // Calculate revenue per menu item from regular orders
      const menuItemMap = new Map<string, MenuItemRevenue>();

      orders?.forEach((order: any) => {
        order.order_items?.forEach((item: any) => {
          const menuItemId = item.menu_item_id;
          const menuItemName = item.menu_item?.name || 'Unknown';
          const quantity = item.quantity || 0;
          const price = Number(item.price) || 0;
          const revenue = quantity * price;
          const imageUrl = item.menu_item?.image_url || null;

          if (menuItemMap.has(menuItemId)) {
            const existing = menuItemMap.get(menuItemId)!;
            existing.total_quantity += quantity;
            existing.total_revenue += revenue;
            existing.order_count += 1;
          } else {
            menuItemMap.set(menuItemId, {
              menu_item_id: menuItemId,
              menu_item_name: menuItemName,
              total_quantity: quantity,
              total_revenue: revenue,
              order_count: 1,
              image_url: imageUrl,
            });
          }
        });
      });

      // Fetch guest sessions and their orders
      const { data: guestTables } = await supabase
        .from('guest_tables')
        .select('id')
        .eq('restaurant_id', restaurantId);

      let guestSessionsCount = 0;
      if (guestTables && guestTables.length > 0) {
        const tableIds = guestTables.map(t => t.id);
        
        let guestSessionsQuery = supabase
          .from('guest_sessions')
          .select(`
            id,
            total_amount,
            created_at,
            guest_orders(
              id,
              quantity,
              price,
              status,
              menu_item_id,
              menu_item:menu_items(
                id,
                name,
                image_url
              )
            )
          `)
          .in('guest_table_id', tableIds)
          .in('status', ['PAID', 'CLOSED']);

        if (dateFilter) {
          guestSessionsQuery = guestSessionsQuery.gte('created_at', dateFilter);
        }

        const { data: guestSessions } = await guestSessionsQuery;
        guestSessionsCount = guestSessions?.length || 0;

        // Add guest session orders to menu item map (exclude pending_removal)
        guestSessions?.forEach((session: any) => {
          session.guest_orders?.forEach((order: any) => {
            // Skip items pending removal
            if (order.status === 'pending_removal') return;
            
            const menuItemId = order.menu_item_id;
            const menuItemName = order.menu_item?.name || 'Unknown';
            const quantity = order.quantity || 0;
            const price = Number(order.price) || 0;
            const revenue = quantity * price;
            const imageUrl = order.menu_item?.image_url || null;

            if (menuItemMap.has(menuItemId)) {
              const existing = menuItemMap.get(menuItemId)!;
              existing.total_quantity += quantity;
              existing.total_revenue += revenue;
              existing.order_count += 1;
            } else {
              menuItemMap.set(menuItemId, {
                menu_item_id: menuItemId,
                menu_item_name: menuItemName,
                total_quantity: quantity,
                total_revenue: revenue,
                order_count: 1,
                image_url: imageUrl,
              });
            }
          });
        });
      }

      // Convert map to array and sort by revenue
      const menuItems = Array.from(menuItemMap.values())
        .sort((a, b) => b.total_revenue - a.total_revenue);

      // Calculate totals (including guest sessions revenue)
      const totalRevenue = menuItems.reduce((sum, item) => sum + item.total_revenue, 0);
      const totalOrders = (orders?.length || 0) + guestSessionsCount;
      const totalItemsSold = menuItems.reduce((sum, item) => sum + item.total_quantity, 0);

      setAnalytics({
        menuItems,
        totalRevenue,
        totalOrders,
        totalItemsSold,
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);
  };

  const chartData = analytics?.menuItems.slice(0, 10).map(item => ({
    name: item.menu_item_name.length > 20 
      ? item.menu_item_name.substring(0, 20) + '...' 
      : item.menu_item_name,
    revenue: item.total_revenue,
    fullName: item.menu_item_name,
  })) || [];

  const colors = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
    '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1'
  ];

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 w-full max-w-7xl mx-auto">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 w-full max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline">Analytics Dashboard</h1>
          <p className="text-muted-foreground">Track revenue and performance by menu item</p>
        </div>
        <div className="flex gap-2">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as 'all' | 'today' | '7d' | '30d' | '90d')}
            className="px-4 py-2 border rounded-lg bg-background"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(analytics?.totalRevenue || 0)}</div>
            <p className="text-xs text-muted-foreground">
              From {analytics?.totalOrders || 0} completed orders
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items Sold</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.totalItemsSold || 0}</div>
            <p className="text-xs text-muted-foreground">
              Across all menu items
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Menu Items</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.menuItems.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              Items with sales
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top 10 Menu Items by Revenue</CardTitle>
            <CardDescription>Visual breakdown of your highest earning menu items</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                revenue: {
                  label: 'Revenue',
                  color: 'hsl(var(--chart-1))',
                },
              }}
              className="h-[400px] w-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="name"
                    angle={-45}
                    textAnchor="end"
                    height={100}
                    className="text-xs"
                    tick={{ fill: 'currentColor' }}
                  />
                  <YAxis
                    tickFormatter={(value) => `₦${(value / 1000).toFixed(0)}k`}
                    className="text-xs"
                    tick={{ fill: 'currentColor' }}
                  />
                  <ChartTooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="rounded-lg border bg-background p-2 shadow-sm">
                            <div className="grid gap-2">
                              <div className="flex flex-col">
                                <span className="text-[0.70rem] uppercase text-muted-foreground">
                                  {payload[0].payload.fullName}
                                </span>
                                <span className="font-bold text-muted-foreground">
                                  {formatCurrency(payload[0].value as number)}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="revenue" radius={[8, 8, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {/* Detailed Table */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue by Menu Item</CardTitle>
          <CardDescription>Complete breakdown of revenue for each menu item</CardDescription>
        </CardHeader>
        <CardContent>
          {analytics?.menuItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No sales data available for the selected period.</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Menu Item</TableHead>
                    <TableHead className="text-right">Quantity Sold</TableHead>
                    <TableHead className="text-right">Orders</TableHead>
                    <TableHead className="text-right">Total Revenue</TableHead>
                    <TableHead className="text-right">Avg. Price</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analytics?.menuItems.map((item) => (
                    <TableRow key={item.menu_item_id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          {item.image_url && (
                            <img
                              src={item.image_url}
                              alt={item.menu_item_name}
                              className="w-10 h-10 rounded-md object-cover"
                            />
                          )}
                          <span>{item.menu_item_name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{item.total_quantity}</TableCell>
                      <TableCell className="text-right">{item.order_count}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(item.total_revenue)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatCurrency(item.total_revenue / item.total_quantity)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

