'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingBag, CheckCircle2, Clock, CreditCard, Filter, Search, ChevronDown, ChevronUp, Utensils, XCircle, AlertCircle, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

interface GuestSession {
  id: string;
  status: 'OPEN' | 'READY_FOR_PAYMENT' | 'AWAITING_CONFIRMATION' | 'PAID' | 'CLOSED';
  total_amount: number;
  created_at: string;
  closed_at: string | null;
  payment_confirmed_at: string | null;
  guest_table: {
    id: string;
    name: string;
  };
  guest_orders: Array<{
    id: string;
    quantity: number;
    price: number;
    created_at: string;
    status: string;
    menu_item: {
      id: string;
      name: string;
    };
  }>;
}

export default function GuestSessionsPage() {
  const [sessions, setSessions] = useState<GuestSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [hasRestaurant, setHasRestaurant] = useState<boolean | null>(null);
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());
  const router = useRouter();
  const supabase = createClient();
  const { toast } = useToast();

  useEffect(() => {
    fetchSessions();
  }, [statusFilter, searchQuery]);

  const fetchSessions = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        console.error('Auth error:', authError);
        router.push('/auth/login');
        return;
      }

      const { data: userData } = await supabase
        .from('users')
        .select('restaurant_id')
        .eq('id', user.id)
        .maybeSingle();

      if (!userData?.restaurant_id) {
        setHasRestaurant(false);
        setTimeout(() => {
          router.push('/restaurants');
        }, 1000);
        return;
      }

      setHasRestaurant(true);

      // Fetch guest tables for this restaurant
      const { data: guestTables } = await supabase
        .from('guest_tables')
        .select('id, name')
        .eq('restaurant_id', userData.restaurant_id);

      if (!guestTables || guestTables.length === 0) {
        setSessions([]);
        setLoading(false);
        return;
      }

      const tableIds = guestTables.map(t => t.id);

      // Build query
      let query = supabase
        .from('guest_sessions')
        .select(`
          *,
          guest_orders(
            id,
            quantity,
            price,
            created_at,
            status,
            menu_item:menu_items(id, name)
          )
        `)
        .in('guest_table_id', tableIds)
        .order('created_at', { ascending: false });

      // Note: guest_orders will be sorted by created_at in the UI

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data: sessionsData, error: sessionsError } = await query;

      if (sessionsError) {
        console.error('Error fetching sessions:', sessionsError);
        setSessions([]);
      } else if (sessionsData) {
        // Map guest_table_id to guest_table object
        const sessionsWithTable = sessionsData.map((session: any) => {
          const table = guestTables.find(t => t.id === session.guest_table_id);
          return {
            ...session,
            guest_table: table || { id: session.guest_table_id, name: 'Unknown Table' },
          };
        }) as GuestSession[];

        // Filter by search query
        let filtered = sessionsWithTable;
        if (searchQuery) {
          filtered = filtered.filter(session =>
            session.guest_table.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            session.id.toLowerCase().includes(searchQuery.toLowerCase())
          );
        }

        setSessions(filtered);
      } else {
        setSessions([]);
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
      setSessions([]);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN':
        return 'bg-blue-500';
      case 'READY_FOR_PAYMENT':
        return 'bg-orange-500';
      case 'AWAITING_CONFIRMATION':
        return 'bg-yellow-500';
      case 'PAID':
        return 'bg-green-500';
      case 'CLOSED':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  const toggleSessionExpanded = (sessionId: string) => {
    setExpandedSessions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(sessionId)) {
        newSet.delete(sessionId);
      } else {
        newSet.add(sessionId);
      }
      return newSet;
    });
  };

  const confirmRemoval = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from('guest_orders')
        .delete()
        .eq('id', orderId);

      if (error) throw error;

      toast({
        title: 'Removal Confirmed',
        description: 'Item has been removed from the order.',
      });

      fetchSessions();
    } catch (error: any) {
      console.error('Error confirming removal:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to confirm removal',
        variant: 'destructive',
      });
    }
  };

  const rejectRemoval = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from('guest_orders')
        .update({ status: 'pending' })
        .eq('id', orderId);

      if (error) throw error;

      toast({
        title: 'Removal Rejected',
        description: 'Item will remain in the order.',
      });

      fetchSessions();
    } catch (error: any) {
      console.error('Error rejecting removal:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to reject removal',
        variant: 'destructive',
      });
    }
  };

  const confirmPayment = async (sessionId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('guest_sessions')
        .update({
          status: 'PAID',
          payment_confirmed_at: new Date().toISOString(),
          payment_confirmed_by: user.id,
        })
        .eq('id', sessionId);

      if (error) throw error;

      // Close the session
      await supabase
        .from('guest_sessions')
        .update({
          status: 'CLOSED',
          closed_at: new Date().toISOString(),
        })
        .eq('id', sessionId);

      toast({
        title: 'Payment Confirmed',
        description: 'Guest session has been marked as paid and closed.',
      });

      fetchSessions();
    } catch (error: any) {
      console.error('Error confirming payment:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to confirm payment',
        variant: 'destructive',
      });
    }
  };

  if (hasRestaurant === false) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 w-full">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold font-headline">Guest Sessions</h1>
            <p className="text-muted-foreground">Manage guest table ordering sessions</p>
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
          <h1 className="text-3xl font-bold font-headline">Guest Sessions</h1>
          <p className="text-muted-foreground">Manage and track guest table ordering sessions</p>
        </div>
      </div>

      {/* Filters */}
      <Card className="border-none shadow-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
                <Input
                  placeholder="Search by table name or session ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
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
                <SelectItem value="OPEN">Open</SelectItem>
                <SelectItem value="READY_FOR_PAYMENT">Ready for Payment</SelectItem>
                <SelectItem value="AWAITING_CONFIRMATION">Awaiting Confirmation</SelectItem>
                <SelectItem value="PAID">Paid</SelectItem>
                <SelectItem value="CLOSED">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Sessions List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <Card className="border-none shadow-sm">
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <ShoppingBag className="mx-auto h-12 w-12 mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No guest sessions found</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sessions.map((session) => {
            const isExpanded = expandedSessions.has(session.id);
            return (
              <Card key={session.id} className="border border-border/50 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex flex-col gap-4">
                    {/* Header Section */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1">
                        <div className={`p-3 rounded-full ${getStatusColor(session.status)}/10`}>
                          <CreditCard 
                            className={session.status === 'OPEN' ? 'text-blue-500' :
                                      session.status === 'READY_FOR_PAYMENT' ? 'text-orange-500' :
                                      session.status === 'AWAITING_CONFIRMATION' ? 'text-yellow-500' :
                                      session.status === 'PAID' ? 'text-green-500' :
                                      'text-gray-500'} 
                            size={24} 
                          />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-bold text-lg">{session.guest_table.name}</h3>
                            <Badge className={`${getStatusColor(session.status)} text-white`}>
                              {session.status.replace('_', ' ')}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              Session {session.id.slice(0, 8).toUpperCase()}
                            </span>
                          </div>
                          <div className="space-y-1 text-sm text-muted-foreground">
                            <p className="flex items-center gap-1">
                              <Clock size={14} />
                              {formatDistanceToNow(new Date(session.created_at), { addSuffix: true })}
                            </p>
                            <p className="text-xs">
                              {session.guest_orders.length} item(s) • Total: <span className="font-bold text-primary text-base">{formatCurrency(session.total_amount)}</span>
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-2xl font-bold">{formatCurrency(session.total_amount)}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleSessionExpanded(session.id)}
                            className="rounded-lg"
                          >
                            {isExpanded ? (
                              <>
                                <ChevronUp className="mr-2 h-4 w-4" />
                                Hide Details
                              </>
                            ) : (
                              <>
                                <ChevronDown className="mr-2 h-4 w-4" />
                                View Orders
                              </>
                            )}
                          </Button>
                          {(session.status === 'READY_FOR_PAYMENT' || session.status === 'AWAITING_CONFIRMATION') && (
                            <Button 
                              size="sm" 
                              onClick={() => confirmPayment(session.id)}
                              className="bg-green-600 hover:bg-green-700 rounded-lg"
                            >
                              <CheckCircle2 className="mr-2 h-4 w-4" />
                              Confirm Payment
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Expanded Order Details */}
                    {isExpanded && (
                      <div className="border-t pt-4 mt-4">
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 mb-3">
                            <Utensils className="h-4 w-4 text-muted-foreground" />
                            <h4 className="font-semibold text-sm">Order Items</h4>
                          </div>
                          {session.guest_orders.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">No items in this session</p>
                          ) : (
                            <div className="space-y-2">
                              {[...session.guest_orders].sort((a, b) => 
                                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                              ).map((order) => {
                                const isPendingRemoval = order.status === 'pending_removal';
                                return (
                                  <div
                                    key={order.id}
                                    className={`flex items-center justify-between p-3 rounded-lg border ${
                                      isPendingRemoval 
                                        ? 'bg-orange-50 border-orange-200' 
                                        : 'bg-muted/50 border-border/50'
                                    }`}
                                  >
                                    <div className="flex items-center gap-3 flex-1">
                                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                        isPendingRemoval ? 'bg-orange-100' : 'bg-primary/10'
                                      }`}>
                                        <span className={`text-xs font-bold ${
                                          isPendingRemoval ? 'text-orange-600' : 'text-primary'
                                        }`}>
                                          {order.quantity}
                                        </span>
                                      </div>
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                          <p className={`font-medium text-sm ${
                                            isPendingRemoval ? 'line-through text-muted-foreground' : ''
                                          }`}>
                                            {order.menu_item.name}
                                          </p>
                                          {isPendingRemoval && (
                                            <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300 text-xs">
                                              Awaiting Removal
                                            </Badge>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-2 mt-1">
                                          <p className="text-xs text-muted-foreground">
                                            {formatCurrency(order.price)} each
                                          </p>
                                          <span className="text-xs text-muted-foreground">•</span>
                                          <p className="text-xs text-muted-foreground">
                                            {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <div className="text-right">
                                        <p className={`font-bold text-sm ${
                                          isPendingRemoval ? 'line-through text-muted-foreground' : ''
                                        }`}>
                                          {formatCurrency(order.quantity * order.price)}
                                        </p>
                                      </div>
                                      {isPendingRemoval && (
                                        <div className="flex gap-2">
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => rejectRemoval(order.id)}
                                            className="text-blue-600 border-blue-300 hover:bg-blue-50"
                                          >
                                            <X className="mr-1 h-3 w-3" />
                                            Reject
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => confirmRemoval(order.id)}
                                            className="text-orange-600 border-orange-300 hover:bg-orange-50"
                                          >
                                            <XCircle className="mr-1 h-3 w-3" />
                                            Confirm Removal
                                          </Button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                              <div className="flex items-center justify-between pt-3 mt-3 border-t border-border">
                                <span className="font-bold text-lg">Total Amount</span>
                                <span className="font-bold text-xl text-primary">
                                  {formatCurrency(session.total_amount)}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

