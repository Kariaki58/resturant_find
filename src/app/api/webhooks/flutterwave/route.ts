import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const signature = req.headers.get('verif-hash');
    const secretHash = process.env.FLUTTERWAVE_SECRET_HASH;

    // Check signature if configured
    if (secretHash && signature !== secretHash) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();

    if (payload.status === 'successful' && payload.amount === 3800) {
      const { tx_ref, customer } = payload;
      const supabase = await createClient();

      // Extract user_id from tx_ref (format: restaurant-{user_id}-{timestamp})
      const txRefParts = tx_ref.split('-');
      if (txRefParts.length < 3) {
        console.error('Invalid tx_ref format:', tx_ref);
        return NextResponse.json({ error: 'Invalid transaction reference' }, { status: 400 });
      }
      const userId = txRefParts[1];
      
      console.log('Processing webhook for user:', userId, 'tx_ref:', tx_ref);

      // Get restaurant details from meta
      const meta = payload.meta || {};
      const restaurantName = meta.restaurant_name;
      const slug = meta.slug;
      const bankName = meta.bank_name;
      const accountNumber = meta.account_number;
      const accountName = meta.account_name;

      if (!restaurantName || !slug) {
        console.error('Missing restaurant details in webhook payload');
        return NextResponse.json({ error: 'Missing restaurant details' }, { status: 400 });
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

      // Verify user exists first
      const { data: existingUser, error: userCheckError } = await supabase
        .from('users')
        .select('id, restaurant_id')
        .eq('id', userId)
        .maybeSingle();
      
      if (userCheckError) {
        console.error('Error checking user:', userCheckError);
        // Clean up restaurant if user check fails
        await supabase.from('restaurants').delete().eq('id', restaurant.id);
        return NextResponse.json({ error: 'Failed to verify user' }, { status: 500 });
      }

      if (!existingUser) {
        console.error('User not found:', userId);
        // Clean up restaurant if user doesn't exist
        await supabase.from('restaurants').delete().eq('id', restaurant.id);
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      // Check if user already has a restaurant
      if (existingUser.restaurant_id) {
        console.log('User already has a restaurant:', existingUser.restaurant_id);
        // Check if it's the same restaurant
        if (existingUser.restaurant_id === restaurant.id) {
          return NextResponse.json({ 
            status: 'ok', 
            restaurant_id: restaurant.id,
            message: 'Restaurant already linked' 
          });
        }
        // User has a different restaurant, don't update but return success
        return NextResponse.json({ 
          status: 'ok', 
          restaurant_id: restaurant.id,
          message: 'Restaurant created but user already has one' 
        });
      }

      // Update user with restaurant_id
      const { error: userError, data: updatedUser } = await supabase
        .from('users')
        .update({ restaurant_id: restaurant.id })
        .eq('id', userId)
        .select();

      if (userError) {
        console.error('Error updating user:', userError);
        // Try to clean up restaurant if user update fails
        await supabase.from('restaurants').delete().eq('id', restaurant.id);
        return NextResponse.json({ error: 'Failed to link restaurant to user' }, { status: 500 });
      }

      console.log('Successfully created restaurant and linked to user:', {
        restaurant_id: restaurant.id,
        user_id: userId,
        updated_user: updatedUser
      });

      return NextResponse.json({ 
        status: 'ok', 
        restaurant_id: restaurant.id,
        user_updated: true,
        message: 'Restaurant created and linked successfully'
      });
    }

    return NextResponse.json({ status: 'ignored' });
  } catch (err) {
    console.error('Webhook error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}