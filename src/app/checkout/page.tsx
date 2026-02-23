'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
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
  const [subscriptionPlan, setSubscriptionPlan] = useState<'monthly' | 'yearly'>('monthly');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [profileReady, setProfileReady] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const supabase = createClient();

  useEffect(() => {
    const init = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        router.push('/auth/login');
        return;
      }

      // Check that the user's profile row exists.
      // It should always exist — created immediately at registration.
      // If somehow missing (e.g. email-link login without going through register),
      // create it now via the API.
      const { data: profile } = await supabase
        .from('users')
        .select('id, restaurant_id')
        .eq('id', authUser.id)
        .maybeSingle() as { data: { id: string; restaurant_id: string | null } | null, error: unknown };

      if (!profile) {
        // Profile missing — create it now (e.g. user signed in via magic link / OAuth)
        await fetch('/api/auth/create-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: authUser.id,
            fullName: authUser.user_metadata?.full_name || 'Restaurant Owner',
            email: authUser.email || '',
            phone: authUser.user_metadata?.phone || '',
          }),
        });
      } else if (profile.restaurant_id) {
        // User already has a restaurant — send them to the dashboard
        router.push('/dashboard');
        return;
      }

      setUser(authUser);
      setProfileReady(true);
    };

    init();

    // Handle payment failure URL params
    const error = searchParams.get('error');
    if (error === 'payment_failed') {
      toast({
        title: 'Payment failed',
        description: 'Your payment could not be processed. Please try again.',
        variant: 'destructive',
      });
    } else if (error === 'slug_taken' || error === 'name_taken') {
      toast({
        title: 'Restaurant name taken',
        description: error === 'name_taken' 
          ? 'That restaurant name is already in use. Please choose a different name.'
          : 'That restaurant URL is already in use. Please choose a different name.',
        variant: 'destructive',
      });
    } else if (error === 'restaurant_creation_failed') {
      toast({
        title: 'Setup failed',
        description: 'Your payment was received but restaurant creation failed. Please contact support.',
        variant: 'destructive',
      });
    }
  }, [router, supabase, searchParams, toast]);

  const generateSlug = (name: string) =>
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

  const handleNameChange = (name: string) => {
    setFormData({ ...formData, restaurantName: name, slug: generateSlug(name) });
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantName: formData.restaurantName,
          slug: formData.slug,
          bankName: formData.bankName,
          accountNumber: formData.accountNumber,
          accountName: formData.accountName,
          plan: subscriptionPlan,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initialize payment');
      }

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

  if (!user || !profileReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="space-y-4 text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground animate-pulse">Loading secure checkout...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/10 py-8 px-4 sm:py-12">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold mb-3 font-headline tracking-tight">Complete Your Registration</h1>
          <p className="text-muted-foreground text-lg">Set up your restaurant and start your journey</p>
        </div>

        {/* Step Indicator - Refined for Mobile */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-10">
          <div className="flex-1 flex items-center gap-4 p-4 bg-primary/5 rounded-2xl border border-primary/10">
            <div className="shrink-0 w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
              <CheckCircle2 size={22} />
            </div>
            <div>
              <p className="font-bold text-sm leading-none mb-1">Account Created</p>
              <p className="text-xs text-muted-foreground">Step 1 of 3</p>
            </div>
          </div>
          <div className="flex-1 flex items-center gap-4 p-4 bg-primary/10 rounded-2xl border-2 border-primary shadow-sm shadow-primary/10 ring-1 ring-primary/20">
            <div className="shrink-0 w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white">
              <CreditCard size={22} />
            </div>
            <div>
              <p className="font-bold text-sm leading-none mb-1">Restaurant Setup</p>
              <p className="text-xs text-primary/80 font-medium">Step 2 of 3</p>
            </div>
          </div>
          <div className="flex-1 flex items-center gap-4 p-4 bg-muted/50 rounded-2xl border border-border/50">
            <div className="shrink-0 w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
              <ShieldCheck size={22} />
            </div>
            <div>
              <p className="font-bold text-sm leading-none mb-1">Payment</p>
              <p className="text-xs text-muted-foreground">Step 3 of 3</p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-7 space-y-6">
            <Card className="border-none shadow-xl shadow-foreground/5 rounded-3xl overflow-hidden">
              <CardHeader className="bg-muted/30 pb-6">
                <CardTitle className="text-2xl font-headline">Restaurant Details</CardTitle>
                <CardDescription>Enter the basic information for your restaurant</CardDescription>
              </CardHeader>
              <CardContent className="pt-8">
                {searchParams.get('error') === 'payment_failed' && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Payment could not be processed. Please try again or contact support.
                    </AlertDescription>
                  </Alert>
                )}
                {(searchParams.get('error') === 'slug_taken' || searchParams.get('error') === 'name_taken') && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {searchParams.get('error') === 'name_taken'
                        ? 'That restaurant name is already taken. Please choose a different name.'
                        : 'That restaurant URL is already taken. Please choose a different name.'}
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
                      onChange={(e) => handleNameChange(e.target.value)}
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
                  <Button type="submit" className="w-full h-12 text-lg font-bold rounded-xl mt-4" disabled={loading}>
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Processing...
                      </div>
                    ) : 'Proceed to Payment'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-5">
            <Card className="bg-primary text-white border-none shadow-2xl shadow-primary/20 rounded-3xl overflow-hidden relative">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <CreditCard size={120} />
              </div>
              <CardHeader className="relative">
                <Badge className="w-fit mb-2 bg-white/20 hover:bg-white/30 text-white border-none">Most Popular</Badge>
                <CardTitle className="text-white text-2xl">Premium Plan</CardTitle>
                <CardDescription className="text-white/70">Everything you need to run your restaurant</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 relative">
                {/* Plan Selector */}
                <div className="flex gap-2 p-1 bg-white/10 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setSubscriptionPlan('monthly')}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-bold transition-all ${
                      subscriptionPlan === 'monthly'
                        ? 'bg-white text-primary'
                        : 'text-white/70 hover:text-white'
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubscriptionPlan('yearly')}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-bold transition-all ${
                      subscriptionPlan === 'yearly'
                        ? 'bg-white text-primary'
                        : 'text-white/70 hover:text-white'
                    }`}
                  >
                    Yearly
                  </button>
                </div>

                <div>
                  {subscriptionPlan === 'monthly' ? (
                    <p className="text-5xl font-black flex items-baseline gap-1">
                      <span className="text-2xl font-bold">₦</span>3,800
                      <span className="text-lg font-normal opacity-70">/mo</span>
                    </p>
                  ) : (
                    <div>
                      <p className="text-5xl font-black flex items-baseline gap-1">
                        <span className="text-2xl font-bold">₦</span>38,000
                        <span className="text-lg font-normal opacity-70">/year</span>
                      </p>
                      <p className="text-sm text-white/70 mt-2">
                        Save ₦3,800 - Only ₦3,800/month for 10 months
                      </p>
                    </div>
                  )}
                </div>
                
                <div className="space-y-4">
                  <p className="text-sm font-bold uppercase tracking-wider opacity-70">What's included:</p>
                  <ul className="space-y-3">
                    <li className="flex items-center gap-3">
                      <div className="shrink-0 w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                        <CheckCircle2 size={12} />
                      </div>
                      <span className="text-sm">Unlimited Orders & Customers</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <div className="shrink-0 w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                        <CheckCircle2 size={12} />
                      </div>
                      <span className="text-sm">Interactive QR Table System</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <div className="shrink-0 w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                        <CheckCircle2 size={12} />
                      </div>
                      <span className="text-sm">Bank Transfer Automation</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <div className="shrink-0 w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                        <CheckCircle2 size={12} />
                      </div>
                      <span className="text-sm">Rich Menu Management</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <div className="shrink-0 w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                        <CheckCircle2 size={12} />
                      </div>
                      <span className="text-sm">Real-time Sales Analytics</span>
                    </li>
                  </ul>
                </div>

                <div className="pt-6 border-t border-white/10 flex items-center justify-between">
                  <span className="text-xs opacity-70">Secure Checkout by Flutterwave</span>
                  <div className="flex gap-2">
                    <div className="w-8 h-5 bg-white/10 rounded flex items-center justify-center text-[8px] font-bold">VISA</div>
                    <div className="w-8 h-5 bg-white/10 rounded flex items-center justify-center text-[8px] font-bold">MC</div>
                  </div>
                </div>
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
        <p className="text-muted-foreground">Loading...</p>
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  );
}
