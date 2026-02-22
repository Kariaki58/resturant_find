'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Utensils, Plus, RefreshCw, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function RestaurantsPage() {
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [pendingRestaurant, setPendingRestaurant] = useState<any>(null);
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();

  const checkForRestaurant = async (retry = false) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/login');
        return;
      }

      // Check if user has a restaurant
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('restaurant_id')
        .eq('id', user.id)
        .maybeSingle();

      if (userError) {
        console.error('Error fetching user:', userError);
      }

      if (userData?.restaurant_id) {
        // User has a restaurant, redirect to dashboard
        console.log('User has restaurant_id:', userData.restaurant_id);
        router.push('/dashboard');
        router.refresh();
        return;
      }

      // Check if there's an unlinked restaurant (created but not linked)
      // This can happen if webhook created restaurant but failed to link
      // Check restaurants created in the last 10 minutes
      const tenMinutesAgo = new Date();
      tenMinutesAgo.setMinutes(tenMinutesAgo.getMinutes() - 10);

      const { data: recentRestaurants } = await supabase
        .from('restaurants')
        .select('*')
        .gte('created_at', tenMinutesAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(5);

      // Check if any restaurant matches stored checkout data
      const storedData = localStorage.getItem('pending_restaurant_data');
      if (storedData && recentRestaurants && recentRestaurants.length > 0) {
        try {
          const checkoutData = JSON.parse(storedData);
          const matchingRestaurant = recentRestaurants.find(
            r => r.slug === checkoutData.slug || r.name === checkoutData.restaurantName
          );
          
          if (matchingRestaurant && !userData?.restaurant_id) {
            setPendingRestaurant(matchingRestaurant);
          }
        } catch (e) {
          console.error('Error parsing stored data:', e);
        }
      }

      // Fetch user's restaurants (for future multi-restaurant support)
      if (userData?.restaurant_id) {
        const { data: userRestaurants } = await supabase
          .from('restaurants')
          .select('*')
          .eq('id', userData.restaurant_id);

        setRestaurants(userRestaurants || []);
      } else {
        setRestaurants([]);
      }
    } catch (error) {
      console.error('Error fetching restaurants:', error);
    } finally {
      setLoading(false);
      setChecking(false);
    }
  };

  useEffect(() => {
    let channel: any = null;
    let pollInterval: NodeJS.Timeout | null = null;

    const setupSubscriptions = async () => {
      checkForRestaurant();
      
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Set up real-time subscription for users table changes
        channel = supabase
          .channel('restaurant-updates')
          .on('postgres_changes', 
            { 
              event: 'UPDATE', 
              schema: 'public', 
              table: 'users',
              filter: `id=eq.${user.id}`
            },
            () => {
              // User's restaurant_id was updated, check again
              checkForRestaurant(true);
            }
          )
          .on('postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'restaurants',
            },
            () => {
              // New restaurant created, check if it's for this user
              checkForRestaurant(true);
            }
          )
          .subscribe();
      }

      // Also set up polling as backup (every 5 seconds)
      pollInterval = setInterval(() => {
        checkForRestaurant(true);
      }, 5000);
    };

    setupSubscriptions();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [router, supabase]);

  const handleManualCreate = async () => {
    setChecking(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/login');
        return;
      }

      // If there's a pending restaurant, try to link it first
      if (pendingRestaurant) {
        const { error: linkError } = await supabase
          .from('users')
          .update({ restaurant_id: pendingRestaurant.id })
          .eq('id', user.id);

        if (!linkError) {
          toast({
            title: 'Restaurant linked!',
            description: 'Your restaurant has been successfully linked to your account.',
          });
          setTimeout(() => {
            router.push('/dashboard');
            router.refresh();
          }, 1000);
          return;
        }
      }

      // Get stored checkout data from localStorage if available
      const storedData = localStorage.getItem('pending_restaurant_data');
      let restaurantData = null;

      if (storedData) {
        try {
          restaurantData = JSON.parse(storedData);
        } catch (e) {
          console.error('Error parsing stored data:', e);
        }
      }

      if (!restaurantData) {
        toast({
          title: 'No checkout data found',
          description: 'Please complete checkout again to create your restaurant.',
          variant: 'destructive',
        });
        router.push('/checkout');
        return;
      }

      // Call fallback API to create restaurant
      const response = await fetch('/api/restaurant/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(restaurantData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create restaurant');
      }

      toast({
        title: 'Restaurant created!',
        description: 'Your restaurant has been successfully created.',
      });

      // Clear stored data
      localStorage.removeItem('pending_restaurant_data');

      // Refresh and redirect
      setTimeout(() => {
        router.push('/dashboard');
        router.refresh();
      }, 1000);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create restaurant',
        variant: 'destructive',
      });
    } finally {
      setChecking(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Your Restaurants</h1>
            <p className="text-muted-foreground">Manage your restaurant subscriptions</p>
          </div>
          <Button asChild>
            <Link href="/checkout">
              <Plus className="mr-2 h-4 w-4" />
              Add Restaurant
            </Link>
          </Button>
        </div>

        {restaurants.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <Utensils className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No restaurants yet</h3>
                <p className="text-muted-foreground mb-4">
                  Get started by setting up your first restaurant
                </p>
                
                {pendingRestaurant && (
                  <Alert className="mb-6 text-left">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      A restaurant was recently created but may not be linked to your account. 
                      Click "Link Restaurant" below to complete setup.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {restaurants.map((restaurant) => (
              <Card key={restaurant.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle>{restaurant.name}</CardTitle>
                  <CardDescription>/{restaurant.slug}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Status:</span>
                      <span
                        className={`font-medium ${
                          restaurant.subscription_status === 'active'
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}
                      >
                        {restaurant.subscription_status}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Expires:</span>
                      <span className="font-medium">
                        {new Date(restaurant.subscription_expires_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <Button asChild className="w-full" variant="outline">
                    <Link href={`/menu/${restaurant.slug}`}>View Menu</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

