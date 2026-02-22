'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

function OnboardingSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [restaurant, setRestaurant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/auth/login');
        return;
      }

      // The restaurant was created synchronously in the callback route —
      // no polling needed. A single fetch is sufficient.
      const { data: userData } = await supabase
        .from('users')
        .select('restaurant_id')
        .eq('id', user.id)
        .maybeSingle() as { data: { restaurant_id: string | null } | null, error: unknown };

      if (userData?.restaurant_id) {
        const { data: restaurantData } = await supabase
          .from('restaurants')
          .select('id, name, slug')
          .eq('id', userData.restaurant_id)
          .maybeSingle() as { data: { id: string; name: string; slug: string } | null, error: unknown };

        if (restaurantData) {
          setRestaurant(restaurantData);
        }
      }

      setLoading(false);

      // Auto-redirect to dashboard after a brief success moment
      setTimeout(() => {
        router.push('/dashboard');
      }, 2500);
    };

    load();
  }, [router, supabase, searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Loading your restaurant...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <CardTitle className="text-2xl">Welcome to Restaurantme!</CardTitle>
          <CardDescription>
            Your restaurant has been set up and your subscription is active.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {restaurant && (
            <div className="p-4 bg-muted rounded-lg space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Restaurant Name</p>
              <p className="text-lg font-bold">{restaurant.name}</p>
              <p className="text-sm text-muted-foreground">
                Menu URL: /menu/{restaurant.slug}
              </p>
            </div>
          )}
          <p className="text-sm text-center text-muted-foreground">
            Redirecting you to the dashboard…
          </p>
          <Button asChild className="w-full">
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function OnboardingSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <OnboardingSuccessContent />
    </Suspense>
  );
}
