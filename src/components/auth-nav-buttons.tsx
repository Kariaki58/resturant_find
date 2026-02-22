'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

export function AuthNavButtons() {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasRestaurant, setHasRestaurant] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setIsAuthenticated(false);
          setHasRestaurant(false);
          setLoading(false);
          return;
        }

        setIsAuthenticated(true);

        // Check if user has a restaurant
        const { data: userData } = await supabase
          .from('users')
          .select('restaurant_id')
          .eq('id', user.id)
          .maybeSingle();

        setHasRestaurant(!!userData?.restaurant_id);
      } catch (error) {
        console.error('Error checking auth:', error);
        setIsAuthenticated(false);
        setHasRestaurant(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [supabase]);

  if (loading) {
    return (
      <>
        <Link href="/auth/login" className="text-sm font-medium hover:text-primary transition-colors">Login</Link>
        <Button asChild className="rounded-full px-6">
          <Link href="/auth/register">Get Started</Link>
        </Button>
      </>
    );
  }

  if (isAuthenticated) {
    // If authenticated, show dashboard link instead
    const dashboardPath = hasRestaurant ? '/dashboard' : '/restaurants';
    return (
      <Button asChild className="rounded-full px-6">
      <Link href={dashboardPath}>Go to Dashboard</Link>
    </Button>
    );
  }

  // Not authenticated, show login and register
  return (
    <>
      <Link href="/auth/login" className="text-sm font-medium hover:text-primary transition-colors">Login</Link>
      <Button asChild className="rounded-full px-6">
        <Link href="/auth/register">Start Free Trial</Link>
      </Button>
    </>
  );
}

