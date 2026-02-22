'use client';

import { useEffect, useState } from 'react';
import { use } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Clock, Package, Truck, Store, MapPin, Phone, Mail, ArrowLeft, Utensils, Download, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { generateReceiptPDF } from '@/lib/utils/receipt-pdf';
import { useToast } from '@/hooks/use-toast';

interface Order {
  id: string;
  status: string;
  total_amount: number;
  delivery_method: 'delivery' | 'pickup' | 'dine_in';
  note: string | null;
  created_at: string;
  restaurant?: {
    name: string;
    slug: string;
  };
  order_items?: Array<{
    quantity: number;
    price: number;
    menu_item: {
      name: string;
      image_url: string;
    };
  }>;
}

export default function OrderTrackingPage({ params }: { params: Promise<{ slug: string; orderId: string }> }) {
  const { slug, orderId } = use(params);
  const searchParams = useSearchParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const supabase = createClient();
  const { toast } = useToast();

  useEffect(() => {
    fetchOrder();
    // Poll for order updates every 5 seconds
    const interval = setInterval(fetchOrder, 5000);
    return () => clearInterval(interval);
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          restaurant:restaurants(slug, name),
          order_items(
            quantity,
            price,
            menu_item:menu_items(name, image_url)
          )
        `)
        .eq('id', orderId)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        setLoading(false);
        return;
      }
      setOrder(data as Order);
    } catch (error) {
      console.error('Error fetching order:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusSteps = () => {
    const statuses = [
      { key: 'awaiting_confirmation', label: 'Awaiting Confirmation', icon: Clock },
      { key: 'confirmed', label: 'Confirmed', icon: CheckCircle2 },
      { key: 'preparing', label: 'Preparing', icon: Package },
      { key: 'ready', label: 'Ready', icon: CheckCircle2 },
      { key: 'completed', label: 'Completed', icon: CheckCircle2 },
    ];

    const currentIndex = statuses.findIndex(s => s.key === order?.status);
    
    return statuses.map((status, index) => {
      const isActive = index <= currentIndex;
      const isCurrent = index === currentIndex;
      const Icon = status.icon;
      
      return {
        ...status,
        isActive,
        isCurrent,
        Icon,
      };
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <h1 className="text-2xl font-bold mb-2">Order Not Found</h1>
            <p className="text-muted-foreground mb-4">The order you are looking for does not exist.</p>
            <Button asChild>
              <Link href={`/menu/${slug}`}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Menu
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusSteps = getStatusSteps();

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold font-headline">Order Tracking</h1>
            <p className="text-muted-foreground">Track your order status in real-time</p>
          </div>
          <Button variant="outline" asChild>
            <Link href={`/menu/${slug}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Menu
            </Link>
          </Button>
        </div>

        {/* Order ID Card */}
        <Card className="border-none shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <CardTitle>Tracking Number: {order.id.slice(0, 8).toUpperCase()}</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyTrackingNumber}
                    className="h-8 w-8 p-0"
                    title="Copy tracking number"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <CardDescription>
                  Placed on {new Date(order.created_at).toLocaleString()}
                </CardDescription>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline" onClick={handleDownloadReceipt}>
                  <Download className="mr-2 h-4 w-4" />
                  Download Receipt
                </Button>
              <Badge className={`${
                order.status === 'awaiting_confirmation' ? 'bg-orange-500' :
                order.status === 'confirmed' ? 'bg-blue-500' :
                order.status === 'preparing' ? 'bg-purple-500' :
                order.status === 'ready' ? 'bg-green-500' :
                order.status === 'completed' ? 'bg-green-600' :
                'bg-gray-500'
              } text-white`}>
                {order.status.replace('_', ' ').toUpperCase()}
              </Badge>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Status Timeline */}
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Order Status</CardTitle>
            <CardDescription>Track your order progress</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {statusSteps.map((step, index) => (
                <div key={step.key} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      step.isActive ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
                    }`}>
                      <step.Icon className="h-6 w-6" />
                    </div>
                    {index < statusSteps.length - 1 && (
                      <div className={`w-0.5 h-16 ${
                        step.isActive ? 'bg-primary' : 'bg-muted'
                      }`} />
                    )}
                  </div>
                  <div className="flex-1 pb-8">
                    <h3 className={`font-bold text-lg ${
                      step.isActive ? 'text-foreground' : 'text-muted-foreground'
                    }`}>
                      {step.label}
                    </h3>
                    {step.isCurrent && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Your order is currently at this stage
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Order Details */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Order Items */}
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle>Order Items</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {order.order_items?.map((item, index) => (
                <div key={index} className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted shrink-0">
                    {item.menu_item.image_url ? (
                      <img
                        src={item.menu_item.image_url}
                        alt={item.menu_item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="h-6 w-6 text-muted-foreground opacity-50" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold">{item.menu_item.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.quantity}x {formatCurrency(item.price)}
                    </p>
                  </div>
                  <p className="font-bold">{formatCurrency(item.price * item.quantity)}</p>
                </div>
              ))}
              <div className="pt-4 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold">Total</span>
                  <span className="text-2xl font-bold text-primary">
                    {formatCurrency(order.total_amount)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Delivery Information */}
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {order.delivery_method === 'delivery' ? (
                  <Truck className="h-5 w-5" />
                ) : order.delivery_method === 'dine_in' ? (
                  <Utensils className="h-5 w-5" />
                ) : (
                  <Store className="h-5 w-5" />
                )}
                {order.delivery_method === 'delivery' 
                  ? 'Delivery' 
                  : order.delivery_method === 'dine_in'
                  ? 'Dine In'
                  : 'Pickup'} Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">Method</p>
                <p className="font-bold capitalize">{order.delivery_method.replace('_', ' ')}</p>
              </div>
              {order.note && (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-900 font-medium mb-1">Special Instructions</p>
                  <p className="text-sm text-blue-700">{order.note}</p>
                </div>
              )}
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <p className="text-sm text-green-900 font-medium mb-1">Restaurant</p>
                <p className="text-sm text-green-700 font-bold">{order.restaurant?.name}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Help Card */}
        <Card className="border-none shadow-sm bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Phone className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-bold text-blue-900 mb-1">Need Help?</p>
                <p className="text-sm text-blue-700">
                  If you have any questions about your order, please contact the restaurant directly.
                  Your order will be updated automatically as it progresses.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

