'use client';

import { useEffect, useState } from 'react';
import { use } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle2, ShoppingBag, Clock, ArrowLeft, Download, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { generateReceiptPDF } from '@/lib/utils/receipt-pdf';
import { useToast } from '@/hooks/use-toast';

export default function OrderSuccessPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = searchParams.get('orderId');
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const supabase = createClient();
  const { toast } = useToast();

  useEffect(() => {
    if (orderId) {
      fetchOrder();
    } else {
      setLoading(false);
    }
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          restaurant:restaurants(name, slug),
          order_items(
            quantity,
            price,
            menu_item:menu_items(name)
          )
        `)
        .eq('id', orderId!)
        .maybeSingle();

      if (error) throw error;
      setOrder(data);
    } catch (error) {
      console.error('Error fetching order:', error);
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

  const handleDownloadReceipt = () => {
    if (!order || !order.restaurant) return;

    generateReceiptPDF({
      restaurantName: order.restaurant.name,
      orderId: order.id,
      orderDate: order.created_at,
      orderType: order.order_type,
      customerName: order.buyer_transfer_name || undefined,
      paymentReference: order.payment_reference || undefined,
      orderItems: (order.order_items || []).map((item: any) => ({
        quantity: item.quantity,
        price: item.price,
        menu_item: {
          name: item.menu_item.name,
        },
      })),
      totalAmount: order.total_amount,
      note: order.note || undefined,
    });
  };

  const handleCopyTrackingNumber = async () => {
    if (!orderId) return;
    
    try {
      await navigator.clipboard.writeText(orderId);
      setCopied(true);
      toast({
        title: 'Copied!',
        description: 'Tracking number copied to clipboard',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to copy tracking number',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">Loading...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!orderId || !order) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <h2 className="text-2xl font-bold">Order Not Found</h2>
            <p className="text-muted-foreground">We couldn't find your order. Please contact support.</p>
            <Button asChild>
              <Link href="/">Go Home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full space-y-6">
        <Card className="border-none shadow-lg">
          <CardContent className="pt-12 pb-8">
            <div className="text-center space-y-6">
              <div className="mx-auto w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-12 w-12 text-green-600" />
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-bold font-headline">Order Placed Successfully!</h1>
                <p className="text-muted-foreground">
                  Your order has been received and is awaiting payment confirmation.
                </p>
              </div>

              <div className="bg-muted/50 rounded-xl p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Tracking Number</span>
                  <div className="flex items-center gap-2">
                  <span className="font-mono font-bold">{order.id.slice(0, 8).toUpperCase()}</span>
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
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Total Amount</span>
                  <span className="text-2xl font-bold text-primary">
                    {formatCurrency(order.total_amount)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Status</span>
                  <Badge className="bg-orange-500 text-white">
                    Awaiting Confirmation
                  </Badge>
                </div>
              </div>

              <div className="space-y-4 pt-4">
                <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <Clock className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
                  <div className="text-left space-y-1">
                    <p className="font-bold text-blue-900">What's Next?</p>
                    <p className="text-sm text-blue-700">
                      We're verifying your payment. You'll receive a confirmation email once your order is confirmed. 
                      This usually takes a few minutes.
                    </p>
                  </div>
                </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-4">
                    <Button variant="outline" className="flex-1" onClick={handleDownloadReceipt}>
                      <Download className="mr-2 h-4 w-4" />
                      Download Receipt
                    </Button>
                    <Button variant="outline" className="flex-1" asChild>
                      <Link href={`/menu/${order.restaurant?.slug || slug}/track/${order.id}`}>
                        <Clock className="mr-2 h-4 w-4" />
                        Track Order
                      </Link>
                    </Button>
                    <Button className="flex-1" asChild>
                      <Link href={`/menu/${order.restaurant?.slug || slug}`}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Menu
                      </Link>
                    </Button>
                  </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

