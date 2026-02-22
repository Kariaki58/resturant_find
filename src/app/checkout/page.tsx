'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase/client';
import { ShieldCheck, CreditCard, CheckCircle2, AlertCircle } from 'lucide-react';

function CheckoutContent() {
  const [formData, setFormData] = useState({
    restaurantName: '',
    slug: '',
    bankName: '',
    accountNumber: '',
    accountName: '',
  });
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/login');
        return;
      }
      setUser(user);
    };
    getUser();

    // Check for error in URL params
    const error = searchParams.get('error');
    if (error === 'payment_failed') {
      toast({
        title: 'Payment failed',
        description: 'Your payment could not be processed. Please try again.',
        variant: 'destructive',
      });
    } else if (error === 'user_not_found') {
      toast({
        title: 'Account setup incomplete',
        description: 'Your account is still being set up. Please wait a moment and try again, or contact support if the issue persists.',
        variant: 'destructive',
      });
    }
  }, [router, supabase, searchParams, toast]);

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleSlugChange = (name: string) => {
    setFormData({
      ...formData,
      restaurantName: name,
      slug: generateSlug(name),
    });
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Initialize Flutterwave payment
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          restaurantName: formData.restaurantName,
          slug: formData.slug,
          bankName: formData.bankName,
          accountNumber: formData.accountNumber,
          accountName: formData.accountName,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initialize payment');
      }

      // Store checkout data in localStorage as backup (in case webhook fails)
      localStorage.setItem('pending_restaurant_data', JSON.stringify({
        restaurantName: formData.restaurantName,
        slug: formData.slug,
        bankName: formData.bankName,
        accountNumber: formData.accountNumber,
        accountName: formData.accountName,
        txRef: data.txRef,
      }));

      // Redirect to Flutterwave payment page
      if (data.paymentLink) {
        window.location.href = data.paymentLink;
      }
    } catch (error: any) {
      toast({
        title: 'Checkout failed',
        description: error.message || 'An error occurred during checkout',
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Complete Your Registration</h1>
          <p className="text-muted-foreground">Set up your restaurant and start your subscription</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="flex items-center gap-3 p-4 bg-primary/10 rounded-xl">
            <CheckCircle2 className="text-primary" size={24} />
            <div>
              <p className="font-bold text-sm">Account Created</p>
              <p className="text-xs text-muted-foreground">Step 1 of 3</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 bg-primary/10 rounded-xl border-2 border-primary">
            <CreditCard className="text-primary" size={24} />
            <div>
              <p className="font-bold text-sm">Restaurant Setup</p>
              <p className="text-xs text-muted-foreground">Step 2 of 3</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 bg-muted rounded-xl">
            <ShieldCheck className="text-muted-foreground" size={24} />
            <div>
              <p className="font-bold text-sm">Payment</p>
              <p className="text-xs text-muted-foreground">Step 3 of 3</p>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Restaurant Information</CardTitle>
                <CardDescription>Enter your restaurant details</CardDescription>
              </CardHeader>
              <CardContent>
                {searchParams.get('error') === 'payment_failed' && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Payment could not be processed. Please try again or contact support.
                    </AlertDescription>
                  </Alert>
                )}
                {searchParams.get('error') === 'user_not_found' && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Your account is still being set up. Please wait a moment and try again. If the issue persists, please contact support.
                    </AlertDescription>
                  </Alert>
                )}
                <form onSubmit={handleCheckout} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="restaurantName">Restaurant Name</Label>
                    <Input
                      id="restaurantName"
                      type="text"
                      placeholder="Mama Put HQ"
                      value={formData.restaurantName}
                      onChange={(e) => handleSlugChange(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="slug">Restaurant URL Slug</Label>
                    <Input
                      id="slug"
                      type="text"
                      placeholder="mama-put-hq"
                      value={formData.slug}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Your menu will be available at: /menu/{formData.slug || 'your-slug'}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bankName">Bank Name</Label>
                    <Input
                      id="bankName"
                      type="text"
                      placeholder="Access Bank"
                      value={formData.bankName}
                      onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="accountNumber">Account Number</Label>
                    <Input
                      id="accountNumber"
                      type="text"
                      placeholder="1234567890"
                      value={formData.accountNumber}
                      onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="accountName">Account Name</Label>
                    <Input
                      id="accountName"
                      type="text"
                      placeholder="Mama Put HQ"
                      value={formData.accountName}
                      onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Processing...' : 'Proceed to Payment'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card className="bg-primary text-white border-none">
              <CardHeader>
                <CardTitle className="text-white">Subscription Plan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-3xl font-bold">₦3,800</p>
                  <p className="text-sm opacity-80">per month</p>
                </div>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={16} />
                    <span>Unlimited Orders</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={16} />
                    <span>QR Table System</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={16} />
                    <span>Bank Transfer Verification</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={16} />
                    <span>Menu Management</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={16} />
                    <span>Real-time Sales</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={16} />
                    <span>Multi-staff Support</span>
                  </li>
                </ul>
                <p className="text-xs opacity-80 pt-4 border-t border-white/20">
                  Cancel anytime • 7-day trial available
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  );
}

