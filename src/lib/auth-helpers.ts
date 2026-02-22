import { createClient } from '@/lib/supabase/client';

/**
 * Production-ready authentication helpers
 */

export interface UserWithRestaurant {
  user: any;
  userData: {
    id: string;
    restaurant_id: string | null;
    role: string;
    full_name: string;
    email: string;
    phone: string;
  } | null;
  restaurant: any | null;
}

/**
 * Get authenticated user with restaurant data
 * Includes retry logic and proper error handling
 */
export async function getAuthenticatedUser(): Promise<UserWithRestaurant | null> {
  const supabase = createClient();
  
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return null;
    }

    // Get user data with retry logic
    let userData = null;
    let retries = 0;
    const maxRetries = 3;

    while (retries < maxRetries) {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching user data:', error);
        break;
      }

      if (data) {
        userData = data;
        break;
      }

      if (retries < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      retries++;
    }

    // Get restaurant if user has one
    let restaurant = null;
    if (userData?.restaurant_id) {
      const { data: restaurantData, error: restaurantError } = await supabase
        .from('restaurants')
        .select('*')
        .eq('id', userData.restaurant_id)
        .maybeSingle();

      if (restaurantError) {
        console.error('Error fetching restaurant:', restaurantError);
      } else {
        restaurant = restaurantData;
      }
    }

    return {
      user,
      userData,
      restaurant,
    };
  } catch (error) {
    console.error('Error in getAuthenticatedUser:', error);
    return null;
  }
}

/**
 * Check if user has completed onboarding (has a restaurant)
 */
export async function hasCompletedOnboarding(): Promise<boolean> {
  const authData = await getAuthenticatedUser();
  return !!(authData?.userData?.restaurant_id && authData?.restaurant);
}

/**
 * Refresh user session and data
 */
export async function refreshUserSession() {
  const supabase = createClient();
  await supabase.auth.refreshSession();
}

