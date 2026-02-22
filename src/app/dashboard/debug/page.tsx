'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function DebugPage() {
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
          setDebugInfo({ error: 'Not authenticated', authError });
          setLoading(false);
          return;
        }

        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        let restaurantData = null;
        if (userData?.restaurant_id) {
          const { data: restaurant, error: restaurantError } = await supabase
            .from('restaurants')
            .select('*')
            .eq('id', userData.restaurant_id)
            .maybeSingle();
          
          restaurantData = restaurant;
        }

        setDebugInfo({
          authUser: {
            id: user.id,
            email: user.email,
          },
          userData,
          restaurantData,
          userError,
          hasRestaurant: !!userData?.restaurant_id,
        });
      } catch (error) {
        setDebugInfo({ error: error instanceof Error ? error.message : 'Unknown error' });
      } finally {
        setLoading(false);
      }
    };

    checkStatus();
  }, [supabase]);

  const handleManualCheck = async () => {
    setLoading(true);
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
        alert('Restaurant not found. Please check webhook logs or contact support.');
      }
    }
    setLoading(false);
  };

  if (loading) {
    return <div className="p-6">Loading debug info...</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Debug Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <pre className="bg-muted p-4 rounded-lg overflow-auto text-xs">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
          
          <div className="space-y-2">
            <p><strong>Has Restaurant:</strong> {debugInfo?.hasRestaurant ? 'Yes' : 'No'}</p>
            {debugInfo?.restaurantData && (
              <div>
                <p><strong>Restaurant Name:</strong> {debugInfo.restaurantData.name}</p>
                <p><strong>Restaurant ID:</strong> {debugInfo.restaurantData.id}</p>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button onClick={handleManualCheck}>Check Again</Button>
            {debugInfo?.hasRestaurant && (
              <Button onClick={() => router.push('/dashboard')}>Go to Dashboard</Button>
            )}
            {!debugInfo?.hasRestaurant && (
              <Button onClick={() => router.push('/checkout')} variant="outline">
                Go to Checkout
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

