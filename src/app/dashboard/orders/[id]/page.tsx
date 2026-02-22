"use client";

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CheckCircle2, XCircle, Printer, MapPin, Phone, User, Calendar, CreditCard, Truck, Store, Utensils } from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";
import Link from 'next/link';
import { PaymentProofAnalyzer } from '@/components/orders/PaymentProofAnalyzer';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase/client';

interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  menu_item: {
    id: string;
    name: string;
    image_url: string | null;
  };
}

interface Order {
  id: string;
  status: string;
  order_type: string;
  delivery_method: 'delivery' | 'pickup' | 'dine_in';
  total_amount: number;
  payment_reference: string | null;
  payment_proof_url: string | null;
  buyer_transfer_name: string | null;
  note: string | null;
  created_at: string;
  customer: {
    full_name: string;
    email: string;
    phone: string;
  } | null;
  table: {
    table_number: number;
  } | null;
  order_items: OrderItem[];
}

export default function OrderDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchOrder = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/login');
        return;
      }

      // Get user's restaurant_id
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('restaurant_id')
        .eq('id', user.id)
        .maybeSingle();

      if (userError) {
        console.error('Error fetching user data:', userError);
        router.push('/restaurants');
        return;
      }

      if (!userData || !(userData as any).restaurant_id) {
        router.push('/restaurants');
        return;
      }

      const restaurantId = (userData as any).restaurant_id;

      // Fetch order with all related data
      const { data: orderData, error } = await supabase
        .from('orders')
        .select(`
          *,
          customer:users!orders_customer_id_fkey(full_name, email, phone),
          table:tables(table_number),
          order_items(
            id,
            quantity,
            price,
            menu_item:menu_items(id, name, image_url)
          )
        `)
        .eq('id', id)
        .eq('restaurant_id', restaurantId)
        .maybeSingle();

      if (error) throw error;
      if (!orderData) {
        toast({
          title: 'Order not found',
          description: 'This order does not exist or you do not have permission to view it.',
          variant: 'destructive',
        });
        router.push('/dashboard/orders');
        return;
      }

      setOrder(orderData as Order);
    } catch (error: any) {
      console.error('Error fetching order:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load order details',
        variant: 'destructive',
      });
      router.push('/dashboard/orders');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!order) return;
    
    try {
      const { error } = await (supabase
        .from('orders' as any)
        .update({ status: 'confirmed' } as any)
        .eq('id', order.id) as any);

      if (error) throw error;

      toast({
        title: "Order Confirmed",
        description: "Payment verified successfully. Moving to kitchen.",
        variant: "default"
      });

      // Refresh order data
      fetchOrder();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to confirm order",
        variant: "destructive"
      });
    }
  };

  const handleReject = async () => {
    if (!order) return;
    
    try {
      const { error } = await (supabase
        .from('orders' as any)
        .update({ status: 'cancelled' } as any)
        .eq('id', order.id) as any);

      if (error) throw error;

      toast({
        title: "Order Rejected",
        description: "Customer will be notified of payment discrepancy.",
        variant: "destructive"
      });

      // Refresh order data
      fetchOrder();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to reject order",
        variant: "destructive"
      });
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

  const getDeliveryMethodLabel = (method: string) => {
    switch (method) {
      case 'delivery':
        return 'Delivery';
      case 'dine_in':
        return 'Dine In';
      case 'pickup':
        return 'Pickup';
      default:
        return 'Pickup';
    }
  };

  const getDeliveryMethodIcon = (method: string) => {
    switch (method) {
      case 'delivery':
        return <Truck className="w-4 h-4 mt-1 text-muted-foreground" />;
      case 'dine_in':
        return <Utensils className="w-4 h-4 mt-1 text-muted-foreground" />;
      case 'pickup':
        return <Store className="w-4 h-4 mt-1 text-muted-foreground" />;
      default:
        return <Store className="w-4 h-4 mt-1 text-muted-foreground" />;
    }
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-8 w-full">
        <Skeleton className="h-12 w-64" />
        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-8">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-96 w-full" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-8 w-full">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground mb-4">Order not found</p>
            <Button asChild>
              <Link href="/dashboard/orders">Back to Orders</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 w-full">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild className="rounded-full">
          <Link href="/dashboard/orders">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold font-headline flex items-center gap-3">
            Order #{order.id.slice(0, 8).toUpperCase()}
            <Badge className={`${getStatusColor(order.status)} text-white`}>
              {order.status.replace('_', ' ')}
            </Badge>
          </h1>
          <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
            <Calendar className="w-4 h-4" /> {new Date(order.created_at).toLocaleString()}
          </p>
        </div>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" className="rounded-full">
            <Printer className="mr-2 w-4 h-4" /> Receipt
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8">
          {/* Order Items */}
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle>Order Content</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y">
                {order.order_items.map((item) => (
                  <div key={item.id} className="py-4 flex justify-between items-center first:pt-0 last:pb-0">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center font-bold text-primary text-sm">
                        {item.quantity}x
                      </div>
                      <div>
                        <p className="font-bold">{item.menu_item.name}</p>
                        <p className="text-xs text-muted-foreground">{formatCurrency(item.price)} each</p>
                      </div>
                    </div>
                    <span className="font-bold">{formatCurrency(item.quantity * item.price)}</span>
                  </div>
                ))}
              </div>
              {order.note && (
                <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm font-medium text-blue-900 mb-1">Special Instructions</p>
                  <p className="text-sm text-blue-700">{order.note}</p>
                </div>
              )}
              <div className="mt-8 pt-6 border-t space-y-2">
                <div className="flex justify-between text-xl font-bold text-primary pt-2">
                  <span>Total Amount</span>
                  <span>{formatCurrency(order.total_amount)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Proof Image */}
          {order.payment_proof_url && (
            <Card className="border-none shadow-sm overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Payment Proof</CardTitle>
                  <CardDescription>Screenshot uploaded by customer</CardDescription>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <a href={order.payment_proof_url} target="_blank" rel="noreferrer">Open Full Image</a>
                </Button>
              </CardHeader>
              <CardContent>
                <div className="relative rounded-xl overflow-hidden border bg-muted aspect-[4/5] md:aspect-auto md:max-h-[600px] flex items-center justify-center">
                  <img 
                    src={order.payment_proof_url} 
                    alt="Payment Proof" 
                    className="max-w-full max-h-full object-contain"
                    data-ai-hint="payment receipt screenshot"
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar info */}
        <div className="space-y-6">
          {/* AI Analyzer Tool */}
          {order.payment_proof_url && (
            <PaymentProofAnalyzer 
              imageUrl={order.payment_proof_url}
              expectedAmount={order.total_amount}
              customerName={order.buyer_transfer_name || order.customer?.full_name || ''}
            />
          )}

          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Customer Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {order.customer && (
                <>
                  <div className="flex items-start gap-3">
                    <User className="w-4 h-4 mt-1 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-bold">{order.customer.full_name}</p>
                      <p className="text-xs text-muted-foreground">Customer Name</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Phone className="w-4 h-4 mt-1 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-bold">{order.customer.phone}</p>
                      <p className="text-xs text-muted-foreground">Phone Number</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CreditCard className="w-4 h-4 mt-1 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-bold">{order.customer.email}</p>
                      <p className="text-xs text-muted-foreground">Email</p>
                    </div>
                  </div>
                </>
              )}
              {order.buyer_transfer_name && (
                <div className="flex items-start gap-3">
                  <CreditCard className="w-4 h-4 mt-1 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-bold text-primary">{order.buyer_transfer_name}</p>
                    <p className="text-xs text-muted-foreground">Sender Name on Transfer</p>
                  </div>
                </div>
              )}
              {order.payment_reference && (
                <div className="flex items-start gap-3">
                  <CreditCard className="w-4 h-4 mt-1 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-bold font-mono">{order.payment_reference}</p>
                    <p className="text-xs text-muted-foreground">Payment Reference</p>
                  </div>
                </div>
              )}
              {order.table && (
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 mt-1 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-bold">Table {order.table.table_number}</p>
                    <p className="text-xs text-muted-foreground">Table Number</p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-3">
                {getDeliveryMethodIcon(order.delivery_method)}
                <div>
                  <p className="text-sm font-bold capitalize">{getDeliveryMethodLabel(order.delivery_method)}</p>
                  <p className="text-xs text-muted-foreground">Delivery Method</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {order.status === 'awaiting_confirmation' && (
            <Card className="border-primary bg-white shadow-xl ring-2 ring-primary/20 sticky top-24">
              <CardContent className="p-6 space-y-4">
                <h3 className="font-bold text-center mb-4">Confirm Payment?</h3>
                <Button 
                  onClick={handleConfirm}
                  className="w-full rounded-full py-6 text-lg bg-primary hover:bg-primary/90"
                >
                  <CheckCircle2 className="mr-2 w-5 h-5" /> Confirm Order
                </Button>
                <Button 
                  onClick={handleReject}
                  variant="outline" 
                  className="w-full rounded-full border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600"
                >
                  <XCircle className="mr-2 w-5 h-5" /> Reject Payment
                </Button>
                <p className="text-[10px] text-center text-muted-foreground leading-relaxed">
                  Confirming moves the order to the kitchen. Rejecting will notify the customer via SMS/Email.
                </p>
              </CardContent>
            </Card>
          )}
          {(order.status === 'confirmed' || order.status === 'preparing') && (
            <Card className="border-blue-500 bg-white shadow-xl ring-2 ring-blue-500/20 sticky top-24">
              <CardContent className="p-6 space-y-4">
                <h3 className="font-bold text-center mb-4">Order Status</h3>
                <Badge className={`w-full justify-center py-2 ${getStatusColor(order.status)} text-white`}>
                  {order.status.replace('_', ' ').toUpperCase()}
                </Badge>
                {order.status === 'confirmed' && (
                  <Button 
                    onClick={async () => {
                      try {
                        const { error } = await (supabase
                          .from('orders' as any)
                          .update({ status: 'preparing' } as any)
                          .eq('id', order.id) as any);
                        if (error) throw error;
                        toast({ title: 'Order status updated', description: 'Order is now being prepared.' });
                        fetchOrder();
                      } catch (error: any) {
                        toast({ title: 'Error', description: error.message, variant: 'destructive' });
                      }
                    }}
                    className="w-full rounded-full py-6 text-lg"
                  >
                    Start Preparing
                  </Button>
                )}
                {order.status === 'preparing' && (
                  <Button 
                    onClick={async () => {
                      try {
                        const { error } = await (supabase
                          .from('orders' as any)
                          .update({ status: 'ready' } as any)
                          .eq('id', order.id) as any);
                        if (error) throw error;
                        toast({ title: 'Order ready', description: 'Order has been marked as ready.' });
                        fetchOrder();
                      } catch (error: any) {
                        toast({ title: 'Error', description: error.message, variant: 'destructive' });
                      }
                    }}
                    className="w-full rounded-full py-6 text-lg bg-green-600 hover:bg-green-700"
                  >
                    Mark Ready
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
          {order.status === 'ready' && (
            <Card className="border-green-500 bg-white shadow-xl ring-2 ring-green-500/20 sticky top-24">
              <CardContent className="p-6 space-y-4">
                <h3 className="font-bold text-center mb-4">Order Ready</h3>
                <Badge className={`w-full justify-center py-2 ${getStatusColor(order.status)} text-white`}>
                  READY FOR {order.delivery_method === 'dine_in' ? 'SERVICE' : order.delivery_method === 'pickup' ? 'PICKUP' : 'DELIVERY'}
                </Badge>
                <Button 
                  onClick={async () => {
                    try {
                      const { error } = await (supabase
                        .from('orders' as any)
                        .update({ status: 'completed' } as any)
                        .eq('id', order.id) as any);
                      if (error) throw error;
                      toast({ title: 'Order completed', description: 'Order has been marked as completed.' });
                      fetchOrder();
                    } catch (error: any) {
                      toast({ title: 'Error', description: error.message, variant: 'destructive' });
                    }
                  }}
                  className="w-full rounded-full py-6 text-lg bg-green-600 hover:bg-green-700"
                >
                  Mark Completed
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}