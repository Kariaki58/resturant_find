import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Fallback API route to manually create restaurant if webhook fails
 * This ensures users can complete onboarding even if webhook has issues
 */
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { restaurantName, slug, bankName, accountNumber, accountName, txRef } = body;

    // Validate input
    if (!restaurantName || !slug || !bankName || !accountNumber || !accountName) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    // Check if user already has a restaurant
    const { data: existingUser } = await supabase
      .from('users')
      .select('restaurant_id')
      .eq('id', user.id)
      .single();

    if (existingUser?.restaurant_id) {
      // User already has a restaurant, return it
      const { data: restaurant } = await supabase
        .from('restaurants')
        .select('*')
        .eq('id', existingUser.restaurant_id)
        .single();

      return NextResponse.json({ 
        restaurant,
        message: 'Restaurant already exists' 
      });
    }

    // Check if name or slug is already taken
    const { data: existingRestaurant } = await supabase
      .from('restaurants')
      .select('id, name, slug')
      .or(`name.eq."${restaurantName}",slug.eq."${slug}"`)
      .maybeSingle();

    if (existingRestaurant) {
      if (existingRestaurant.name === restaurantName) {
        return NextResponse.json({ error: 'A restaurant with this name already exists' }, { status: 400 });
      }
      return NextResponse.json({ error: 'This restaurant slug is already taken' }, { status: 400 });
    }

    // Create restaurant
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);

    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .insert({
        name: restaurantName,
        slug: slug,
        bank_name: bankName,
        account_number: accountNumber,
        account_name: accountName,
        subscription_status: 'active',
        subscription_expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (restaurantError) {
      console.error('Error creating restaurant:', restaurantError);
      return NextResponse.json({ error: 'Failed to create restaurant' }, { status: 500 });
    }

    // Update user with restaurant_id
    const { error: userError } = await supabase
      .from('users')
      .update({ restaurant_id: restaurant.id })
      .eq('id', user.id);

    if (userError) {
      console.error('Error updating user:', userError);
      // Try to clean up restaurant if user update fails
      await supabase.from('restaurants').delete().eq('id', restaurant.id);
      return NextResponse.json({ error: 'Failed to link restaurant to user' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      restaurant,
      message: 'Restaurant created successfully' 
    });
  } catch (error: any) {
    console.error('Create restaurant error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

