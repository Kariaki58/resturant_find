'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CreditCard, ShieldCheck, Calendar, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { createClient } from '@/lib/supabase/client';

interface Restaurant {
  id: string;
  name: string;
  subscription_status: 'active' | 'expired' | 'trial';
  subscription_expires_at: string;
}

export default function BillingPage() {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const fetchRestaurant = async () => {
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

        const { data: restaurantData } = await supabase
          .from('restaurants')
          .select('*')
          .eq('id', userData.restaurant_id)
          .single();

        if (restaurantData) {
          setRestaurant(restaurantData);
        }
      } catch (error) {
        console.error('Error fetching restaurant:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurant();
  }, [router, supabase]);

  const isExpiringSoon = () => {
    if (!restaurant?.subscription_expires_at) return false;
    const expiresAt = new Date(restaurant.subscription_expires_at);
    const daysUntilExpiry = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 7 && daysUntilExpiry > 0;
  };

  const isExpired = () => {
    if (!restaurant?.subscription_expires_at) return false;
    return new Date(restaurant.subscription_expires_at) < new Date();
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6 max-w-4xl mx-auto">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold font-headline">Subscription & Billing</h1>
        <p className="text-muted-foreground">Manage your subscription and billing information</p>
      </div>

      {isExpired() && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Your subscription has expired. Please renew to continue using the service.
          </AlertDescription>
        </Alert>
      )}

      {isExpiringSoon() && !isExpired() && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Your subscription expires in {Math.ceil((new Date(restaurant!.subscription_expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days. Renew now to avoid service interruption.
          </AlertDescription>
        </Alert>
      )}

      <Card className="bg-primary text-white border-none shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-20">
          <ShieldCheck size={80} />
        </div>
        <CardHeader>
          <CardTitle className="text-white text-2xl">Current Plan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <p className="text-sm opacity-80 mb-2">Plan Name</p>
            <p className="text-3xl font-bold">Professional</p>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge className={`${
              restaurant?.subscription_status === 'active' ? 'bg-green-500' :
              restaurant?.subscription_status === 'expired' ? 'bg-red-500' :
              'bg-yellow-500'
            } text-white`}>
              {restaurant?.subscription_status?.toUpperCase() || 'TRIAL'}
            </Badge>
          </div>

          {restaurant?.subscription_expires_at && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 opacity-80" />
                <p className="text-sm opacity-80">
                  {restaurant.subscription_status === 'active' ? 'Next billing date' : 'Expires on'}
                </p>
              </div>
              <p className="text-xl font-bold">
                {new Date(restaurant.subscription_expires_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
          )}

          <div className="pt-4 border-t border-white/20">
            <p className="text-3xl font-bold mb-2">₦3,800</p>
            <p className="text-sm opacity-80">per month</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle>Plan Features</CardTitle>
          <CardDescription>Everything included in your Professional plan</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {[
              'Unlimited Orders',
              'QR Table System',
              'Bank Transfer Verification',
              'Menu Management',
              'Real-time Sales Dashboard',
              'Multi-staff Support',
              'Order Notifications',
              'Customer Management',
            ].map((feature, i) => (
              <li key={i} className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle>Payment Information</CardTitle>
          <CardDescription>Your restaurant payment details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {restaurant && (
            <div className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Bank Name</p>
                <p className="font-medium">{restaurant.bank_name || 'Not set'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Account Number</p>
                <p className="font-medium">{restaurant.account_number || 'Not set'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Account Name</p>
                <p className="font-medium">{restaurant.account_name || 'Not set'}</p>
              </div>
            </div>
          )}
          <Button variant="outline" asChild>
            <a href="/dashboard/settings">Update Payment Information</a>
          </Button>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle>Renew Subscription</CardTitle>
          <CardDescription>Continue your subscription for another month</CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full" size="lg">
            <CreditCard className="mr-2 h-4 w-4" />
            Renew Subscription (₦3,800)
          </Button>
          <p className="text-xs text-muted-foreground text-center mt-4">
            Your subscription will be renewed for 30 days from the payment date
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

