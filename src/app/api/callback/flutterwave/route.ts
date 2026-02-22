import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const txRef = searchParams.get('tx_ref');
  const transactionId = searchParams.get('transaction_id');

  console.log('Flutterwave callback received:', { status, txRef, transactionId });

  // Flutterwave can return 'successful' or 'completed' for successful payments
  if ((status === 'successful' || status === 'completed') && txRef) {
    try {

      // Extract user_id from tx_ref (format: restaurant-{user_id}-{timestamp})
      const txRefParts = txRef.split('-');
      if (txRefParts.length < 3) {
        console.error('Invalid tx_ref format:', txRef);
        return NextResponse.redirect(new URL('/checkout?error=invalid_transaction', req.url));
      }
      const userId = txRefParts[1];

      // Create admin client early for faster operations (bypasses RLS)
      const adminClient = createAdminClient();

      // Always verify the transaction with Flutterwave API
      let transactionData = null;
      
      if (transactionId) {
        const verifyResponse = await fetch(
          `https://api.flutterwave.com/v3/transactions/${transactionId}/verify`,
          {
            headers: {
              'Authorization': `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
            },
          }
        );

        if (!verifyResponse.ok) {
          console.error('Flutterwave verification request failed:', verifyResponse.status);
          return NextResponse.redirect(new URL('/checkout?error=payment_failed', req.url));
        }

        transactionData = await verifyResponse.json();
        console.log('Flutterwave verification response:', transactionData);

        // Check if payment was successful
        if (transactionData.status !== 'success' || transactionData.data?.status !== 'successful') {
          console.error('Payment verification failed:', transactionData);
          return NextResponse.redirect(new URL('/checkout?error=payment_failed', req.url));
        }
      }

      // Get restaurant details from transaction meta or pending_restaurants table
      const meta = transactionData?.data?.meta || {};
      let restaurantName = meta.restaurant_name;
      let slug = meta.slug;
      let bankName = meta.bank_name;
      let accountNumber = meta.account_number;
      let accountName = meta.account_name;

      // If meta is not available, retrieve from pending_restaurants table (fallback)
      if (!restaurantName || !slug) {
        console.log('Meta not available in transaction, retrieving from pending_restaurants table');
        try {
          const { data: pendingData, error: pendingError } = await adminClient
            .from('pending_restaurants' as any)
            .select('*')
            .eq('tx_ref', txRef)
            .maybeSingle();

          if (pendingError) {
            console.error('Error fetching pending restaurant:', pendingError);
          }

          if (pendingData) {
            restaurantName = (pendingData as any).restaurant_name;
            slug = (pendingData as any).slug;
            bankName = (pendingData as any).bank_name;
            accountNumber = (pendingData as any).account_number;
            accountName = (pendingData as any).account_name;

            // Clean up pending record
            await adminClient.from('pending_restaurants' as any).delete().eq('tx_ref', txRef);
          }
        } catch (error) {
          console.error('Error retrieving from pending_restaurants:', error);
        }
      }

      if (!restaurantName || !slug) {
        console.error('Missing restaurant details. Meta:', meta);
        console.log('Full transaction data:', JSON.stringify(transactionData, null, 2));
        return NextResponse.redirect(new URL('/checkout?error=missing_data&tx_ref=' + txRef, req.url));
      }

      // Check if user exists (with quick retry for trigger timing)
      let existingUser = null;
      let attempts = 0;
      const maxAttempts = 3; // Reduced from 5
      
      while (attempts < maxAttempts && !existingUser) {
        if (attempts > 0) {
          await new Promise(resolve => setTimeout(resolve, 200)); // Reduced delay from 500ms
        }
        
        const { data: userData } = await adminClient
          .from('users')
          .select('id, restaurant_id')
          .eq('id', userId)
          .maybeSingle();
        
        if (userData) {
          existingUser = userData;
          break;
        }
        attempts++;
      }

      // If user doesn't exist, create it immediately
      if (!existingUser) {
        console.log('User not found, creating user record immediately...');
        try {
          const { data: authUser } = await adminClient.auth.admin.getUserById(userId);
          
          if (authUser?.user) {
            const { data: newUser, error: createError } = await adminClient
              .from('users')
              .insert({
                id: userId,
                full_name: authUser.user.user_metadata?.full_name || 'Restaurant Owner',
                email: authUser.user.email || '',
                phone: authUser.user.user_metadata?.phone || '',
                role: 'restaurant_owner',
                restaurant_id: null,
              })
              .select('id, restaurant_id')
              .single();
            
            if (newUser && !createError) {
              existingUser = newUser;
              console.log('User created successfully');
            } else {
              console.error('Failed to create user:', createError);
              return NextResponse.redirect(new URL('/checkout?error=user_not_found', req.url));
            }
          } else {
            console.error('User not found in auth.users:', userId);
            return NextResponse.redirect(new URL('/checkout?error=user_not_found', req.url));
          }
        } catch (fallbackError) {
          console.error('Error creating user:', fallbackError);
          return NextResponse.redirect(new URL('/checkout?error=user_not_found', req.url));
        }
      }

      // Check if user already has a restaurant
      if (existingUser.restaurant_id) {
        console.log('User already has a restaurant, redirecting to dashboard');
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }

      // Check if slug is already taken (using admin client for speed)
      const { data: existingRestaurant } = await adminClient
        .from('restaurants')
        .select('id')
        .eq('slug', slug)
        .maybeSingle();

      if (existingRestaurant) {
        console.error('Restaurant slug already taken:', slug);
        return NextResponse.redirect(new URL('/checkout?error=slug_taken', req.url));
      }

      // Create restaurant immediately (using admin client for speed)
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 1);

      const { data: restaurant, error: restaurantError } = await adminClient
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
        const errorUrl = new URL('/checkout', req.url);
        errorUrl.searchParams.set('error', 'restaurant_creation_failed');
        return NextResponse.redirect(errorUrl);
      }

      // Link restaurant to user immediately (using admin client for speed)
      const { error: userUpdateError } = await adminClient
        .from('users')
        .update({ restaurant_id: restaurant.id })
        .eq('id', userId);

      if (userUpdateError) {
        console.error('Error linking restaurant to user:', userUpdateError);
        // Clean up restaurant if user update fails
        await adminClient.from('restaurants').delete().eq('id', restaurant.id);
        return NextResponse.redirect(new URL('/checkout?error=link_failed', req.url));
      }

      console.log('Restaurant created and linked successfully:', {
        restaurant_id: restaurant.id,
        user_id: userId,
      });

      // Clean up any pending restaurant record
      try {
        await adminClient.from('pending_restaurants' as any).delete().eq('tx_ref', txRef);
      } catch (error) {
        // Non-critical, just log
        console.log('Could not clean up pending restaurant (non-critical):', error);
      }

      // Redirect to success page
      return NextResponse.redirect(
        new URL(`/onboarding/success?tx_ref=${txRef}&created=true`, req.url)
      );
    } catch (error) {
      console.error('Payment callback error:', error);
      return NextResponse.redirect(new URL('/checkout?error=processing_failed', req.url));
    }
  }

  // If payment failed or was cancelled
  console.log('Payment failed or cancelled. Status:', status);
  return NextResponse.redirect(new URL('/checkout?error=payment_failed', req.url));
}
