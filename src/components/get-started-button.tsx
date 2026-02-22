'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface GetStartedButtonProps {
  size?: 'default' | 'sm' | 'lg' | 'icon';
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  className?: string;
  children?: React.ReactNode;
  showIcon?: boolean;
}

export function GetStartedButton({ 
  size = 'lg', 
  variant = 'default',
  className = '',
  children,
  showIcon = true 
}: GetStartedButtonProps) {
  const [loading, setLoading] = useState(true);
  const [redirectPath, setRedirectPath] = useState('/auth/register');
  const [buttonText, setButtonText] = useState(children || 'Get Started');
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const checkAuthAndRestaurant = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          // Not authenticated, go to register
          setRedirectPath('/auth/register');
          setButtonText(children || 'Register Restaurant');
          setLoading(false);
          return;
        }

        // User is authenticated, check if they have a restaurant
        const { data: userData } = await supabase
          .from('users')
          .select('restaurant_id')
          .eq('id', user.id)
          .maybeSingle();

        if (userData?.restaurant_id) {
          // User has a restaurant, go to dashboard
          setRedirectPath('/dashboard');
          setButtonText('Go to Dashboard');
        } else {
          // User doesn't have a restaurant yet, go to restaurants page (which will show checkout)
          setRedirectPath('/restaurants');
          setButtonText('Create Restaurant');
        }
      } catch (error) {
        console.error('Error checking auth:', error);
        // On error, default to register
        setRedirectPath('/auth/register');
        setButtonText(children || 'Register Restaurant');
      } finally {
        setLoading(false);
      }
    };

    checkAuthAndRestaurant();
  }, [supabase, children]);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!loading) {
      router.push(redirectPath);
    }
  };

  if (loading) {
    return (
      <Button size={size} variant={variant} className={className} disabled>
        {children || 'Loading...'}
      </Button>
    );
  }

  return (
    <Button 
      size={size} 
      variant={variant} 
      className={className}
      onClick={handleClick}
      asChild
    >
      <Link href={redirectPath}>
        {buttonText}
        {showIcon && <ChevronRight className="ml-2" />}
      </Link>
    </Button>
  );
}

