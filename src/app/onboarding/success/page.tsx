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
  const [loading, setLoading] = useState(true);
  const [restaurant, setRestaurant] = useState<any>(null);
  const supabase = createClient();

  useEffect(() => {
    const checkRestaurant = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/auth/login');
          return;
        }

        // Check if restaurant was just created (from URL param)
        const created = searchParams.get('created') === 'true';
        
        // Poll for restaurant creation (should be instant now, but keep polling as backup)
        let attempts = 0;
        const maxAttempts = created ? 3 : 10; // Fewer attempts if just created

        const pollRestaurant = async () => {
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('restaurant_id')
            .eq('id', user.id)
            .maybeSingle();

          if (userError) {
            console.error('Error fetching user:', userError);
          }

          if (userData?.restaurant_id) {
            const { data: restaurantData, error: restaurantError } = await supabase
              .from('restaurants')
              .select('*')
              .eq('id', userData.restaurant_id)
              .maybeSingle();

            if (restaurantError) {
              console.error('Error fetching restaurant:', restaurantError);
            }

            if (restaurantData) {
              setRestaurant(restaurantData);
              setLoading(false);
              // Auto-redirect to dashboard immediately if just created
              const delay = created ? 500 : 2000;
              setTimeout(() => {
                router.push('/dashboard');
                router.refresh();
              }, delay);
              return;
            }
          }

          attempts++;
          if (attempts < maxAttempts) {
            setTimeout(pollRestaurant, 2000);
          } else {
            setLoading(false);
            console.error('Failed to find restaurant after', maxAttempts, 'attempts');
            console.log('User ID:', user.id);
            // Check if user exists in users table
            const { data: userCheck } = await supabase
              .from('users')
              .select('*')
              .eq('id', user.id)
              .maybeSingle();
            console.log('User data:', userCheck);
          }
        };

        pollRestaurant();
      } catch (error) {
        console.error('Error checking restaurant:', error);
        setLoading(false);
      }
    };

    checkRestaurant();
  }, [router, supabase]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Setting up your restaurant...</p>
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
          <CardTitle className="text-2xl">Welcome to resturantme!</CardTitle>
          <CardDescription>
            Your restaurant has been successfully set up and your subscription is active.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {restaurant && (
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <p className="text-sm font-medium">Restaurant Name</p>
              <p className="text-lg font-bold">{restaurant.name}</p>
              <p className="text-sm text-muted-foreground">
                Your menu URL: /menu/{restaurant.slug}
              </p>
            </div>
          )}
          <div className="space-y-2">
            <Button asChild className="w-full">
              <Link href="/dashboard">Go to Dashboard</Link>
            </Button>
            {!restaurant && (
              <Button 
                variant="outline" 
                className="w-full"
                onClick={async () => {
                  // Try to manually check for restaurant
                  const { data: { user } } = await supabase.auth.getUser();
                  if (user) {
                    const { data: userData } = await supabase
                      .from('users')
                      .select('restaurant_id')
                      .eq('id', user.id)
                      .maybeSingle();
                    
                    if (userData?.restaurant_id) {
                      router.push('/dashboard');
                    } else {
                      router.push('/restaurants');
                    }
                  }
                }}
              >
                Check Status
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function OnboardingSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Loading...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    }>
      <OnboardingSuccessContent />
    </Suspense>
  );
}

