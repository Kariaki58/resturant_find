import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * GET /api/orders/lookup?email=user@example.com&restaurantSlug=restaurant-slug
 * Lookup orders by email address for a specific restaurant
 */
export async function GET(req: Request) {
  try {
    // Use admin client to bypass RLS for customer lookup
    const supabase = createAdminClient();
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');
    const restaurantSlug = searchParams.get('restaurantSlug');

    if (!email || !restaurantSlug) {
      return NextResponse.json(
        { error: 'Email and restaurant slug are required' },
        { status: 400 }
      );
    }

    // First, get the restaurant ID from the slug
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('id')
      .eq('slug', restaurantSlug)
      .maybeSingle();

    if (restaurantError || !restaurant) {
      return NextResponse.json(
        { error: 'Restaurant not found' },
        { status: 404 }
      );
    }

    // Find customer user by email (case-insensitive)
    const normalizedEmail = email.trim().toLowerCase();
    
    // First, try to find customer by exact email match
    let { data: customer, error: customerError } = await supabase
      .from('users')
      .select('id')
      .eq('email', normalizedEmail)
      .eq('role', 'customer')
      .maybeSingle();

    // If not found, try case-insensitive search (in case email was stored with different casing)
    if (!customer && !customerError) {
      const { data: allCustomers } = await supabase
        .from('users')
        .select('id, email')
        .eq('role', 'customer');
      
      if (allCustomers) {
        customer = allCustomers.find(
          c => c.email?.toLowerCase() === normalizedEmail
        ) || null;
      }
    }

    if (customerError) {
      console.error('Error finding customer:', customerError);
      return NextResponse.json(
        { error: 'Failed to lookup customer' },
        { status: 500 }
      );
    }

    if (!customer) {
      // No customer account found with this email
      // This could happen if:
      // 1. Customer hasn't placed an order yet
      // 2. Order creation failed to create customer account
      // 3. Email was entered incorrectly
      return NextResponse.json({
        success: true,
        orders: [],
        message: 'No orders found for this email address. Please check your email or use your order ID.',
      });
    }

    // Get orders for this customer and restaurant
    console.log('Fetching orders for customer:', customer.id, 'restaurant:', restaurant.id);
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, status, total_amount, created_at')
      .eq('customer_id', customer.id)
      .eq('restaurant_id', restaurant.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (ordersError) {
      console.error('Error fetching orders:', ordersError);
      return NextResponse.json(
        { error: 'Failed to fetch orders' },
        { status: 500 }
      );
    }

    console.log('Found orders:', orders?.length || 0);

    return NextResponse.json({
      success: true,
      orders: orders || [],
    });
  } catch (error: any) {
    console.error('Error in order lookup:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

