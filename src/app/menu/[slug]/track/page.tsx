'use client';

import { useState } from 'react';
import { use } from 'react';
import { useRouter } from 'next/navigation';
import { Package, Search, Mail, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

export default function TrackOrderPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const { toast } = useToast();
  const [orderId, setOrderId] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleTrackByOrderId = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId.trim()) {
      toast({
        title: 'Order ID required',
        description: 'Please enter your order ID',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      router.push(`/menu/${slug}/track/${orderId.trim()}`);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to track order',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTrackByEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast({
        title: 'Email required',
        description: 'Please enter your email address',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/orders/lookup?email=${encodeURIComponent(email.trim())}&restaurantSlug=${slug}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to lookup orders');
      }

      if (data.orders && data.orders.length > 0) {
        // Show order IDs to the user
        if (data.orders.length === 1) {
          // Single order found - show order ID and redirect
          toast({
            title: 'Order Found!',
            description: `Your order ID is: ${data.orders[0].id.slice(0, 8).toUpperCase()}`,
          });
          router.push(`/menu/${slug}/track/${data.orders[0].id}`);
        } else {
          // Multiple orders found - show all order IDs
          const orderIds = data.orders.map(o => o.id.slice(0, 8).toUpperCase()).join(', ');
          toast({
            title: 'Orders Found!',
            description: `Found ${data.orders.length} orders. Order IDs: ${orderIds}. Redirecting to most recent...`,
          });
          const mostRecentOrder = data.orders[0];
          router.push(`/menu/${slug}/track/${mostRecentOrder.id}`);
        }
      } else {
        toast({
          title: 'No orders found',
          description: data.message || 'No orders found for this email address. Please check your email or use your order ID from the confirmation email.',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to lookup orders',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/menu/${slug}`}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold font-headline">Track Your Order</h1>
            <p className="text-muted-foreground">Enter your order details to track your order status</p>
          </div>
        </div>

        {/* Tracking Options */}
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Find Your Order
            </CardTitle>
            <CardDescription>
              Track your order using either your order ID or email address
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="orderId" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="orderId">Order ID</TabsTrigger>
                <TabsTrigger value="email">Email</TabsTrigger>
              </TabsList>

              <TabsContent value="orderId" className="space-y-4 mt-6">
                <form onSubmit={handleTrackByOrderId} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="orderId">Order ID</Label>
                    <Input
                      id="orderId"
                      type="text"
                      placeholder="Enter your order ID (e.g., abc12345)"
                      value={orderId}
                      onChange={(e) => setOrderId(e.target.value)}
                      className="text-lg"
                      disabled={loading}
                    />
                    <p className="text-xs text-muted-foreground">
                      You received this ID when you placed your order
                    </p>
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Searching...
                      </>
                    ) : (
                      <>
                        <Search className="mr-2 h-4 w-4" />
                        Track Order
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="email" className="space-y-4 mt-6">
                <form onSubmit={handleTrackByEmail} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="text-lg"
                      disabled={loading}
                    />
                    <p className="text-xs text-muted-foreground">
                      We'll find your most recent order using this email
                    </p>
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Searching...
                      </>
                    ) : (
                      <>
                        <Mail className="mr-2 h-4 w-4" />
                        Find My Orders
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Help Card */}
        <Card className="border-none shadow-sm bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-bold text-blue-900 mb-1">Need Help?</p>
                <p className="text-sm text-blue-700">
                  If you can't find your order, please check your email for the order confirmation message. 
                  Your order ID is included in the confirmation email.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

