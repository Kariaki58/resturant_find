import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const txRef = searchParams.get('tx_ref');
  const transactionId = searchParams.get('transaction_id');

  console.log('[flutterwave-callback] Received:', { status, txRef, transactionId });

  if ((status === 'successful' || status === 'completed') && txRef) {
    try {
      // ── 1. Parse user ID from tx_ref ─────────────────────────────────────
      if (!txRef.startsWith('restaurant-')) {
        console.error('[flutterwave-callback] Invalid tx_ref format:', txRef);
        return NextResponse.redirect(new URL('/checkout?error=invalid_transaction', req.url));
      }

      // tx_ref format: restaurant-{UUID}-{timestamp}
      const withoutPrefix = txRef.substring(11); // remove "restaurant-"
      const uuidMatch = withoutPrefix.match(
        /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})-/
      );

      if (!uuidMatch) {
        console.error('[flutterwave-callback] UUID parse failed:', txRef);
        return NextResponse.redirect(new URL('/checkout?error=invalid_transaction', req.url));
      }

      const userId = uuidMatch[1];
      const adminClient = createAdminClient();

      // ── 2. Verify payment with Flutterwave ───────────────────────────────
      let transactionData: any = null;

      if (transactionId) {
        const verifyResponse = await fetch(
          `https://api.flutterwave.com/v3/transactions/${transactionId}/verify`,
          {
            headers: {
              Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
            },
          }
        );

        if (!verifyResponse.ok) {
          console.error('[flutterwave-callback] Verification request failed:', verifyResponse.status);
          return NextResponse.redirect(new URL('/checkout?error=payment_failed', req.url));
        }

        transactionData = await verifyResponse.json();
        console.log('[flutterwave-callback] Verification:', transactionData?.data?.status);

        if (
          transactionData.status !== 'success' ||
          transactionData.data?.status !== 'successful'
        ) {
          return NextResponse.redirect(new URL('/checkout?error=payment_failed', req.url));
        }
      }

      // ── 3. Resolve restaurant details ────────────────────────────────────
      const meta = transactionData?.data?.meta || {};
      let restaurantName: string = meta.restaurant_name;
      let slug: string = meta.slug;
      let bankName: string = meta.bank_name;
      let accountNumber: string = meta.account_number;
      let accountName: string = meta.account_name;

      // Fallback: retrieve from pending_restaurants table if meta is missing
      if (!restaurantName || !slug) {
        console.log('[flutterwave-callback] Meta missing, looking up pending_restaurants');
        const { data: pendingData } = await adminClient
          .from('pending_restaurants')
          .select('*')
          .eq('tx_ref', txRef)
          .maybeSingle();

        if (pendingData) {
          restaurantName = pendingData.restaurant_name;
          slug = pendingData.slug;
          bankName = pendingData.bank_name;
          accountNumber = pendingData.account_number;
          accountName = pendingData.account_name;
          // Clean up the pending record
          await adminClient.from('pending_restaurants').delete().eq('tx_ref', txRef);
        }
      }

      if (!restaurantName || !slug) {
        console.error('[flutterwave-callback] Missing restaurant details. Meta:', meta);
        return NextResponse.redirect(
          new URL(`/checkout?error=missing_data&tx_ref=${txRef}`, req.url)
        );
      }

      // ── 4. Verify the user's profile exists ──────────────────────────────
      // The profile MUST already exist — created at registration time.
      // We do NOT create it here; that would reintroduce race conditions.
      const { data: userProfile, error: profileError } = await adminClient
        .from('users')
        .select('id, restaurant_id')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) {
        console.error('[flutterwave-callback] Profile lookup error:', profileError);
        return NextResponse.redirect(new URL('/checkout?error=payment_failed', req.url));
      }

      if (!userProfile) {
        // This should never happen with the new flow (profile created at signup).
        // If it does, the user should re-register.
        console.error('[flutterwave-callback] No profile found for user:', userId);
        return NextResponse.redirect(new URL('/checkout?error=payment_failed', req.url));
      }

      // Already has a restaurant — payment may be a duplicate
      if (userProfile.restaurant_id) {
        console.log('[flutterwave-callback] User already has a restaurant, redirecting to dashboard');
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }

      // ── 5. Check name and slug uniqueness ───────────────────────────────
      const { data: existingRestaurant } = await adminClient
        .from('restaurants')
        .select('id, name, slug')
        .or(`name.eq."${restaurantName}",slug.eq."${slug}"`)
        .maybeSingle();

      if (existingRestaurant) {
        if (existingRestaurant.name === restaurantName) {
          console.error('[flutterwave-callback] Name already taken:', restaurantName);
          return NextResponse.redirect(new URL('/checkout?error=name_taken', req.url));
        }
        console.error('[flutterwave-callback] Slug already taken:', slug);
        return NextResponse.redirect(new URL('/checkout?error=slug_taken', req.url));
      }

      // ── 6. Create the restaurant ─────────────────────────────────────────
      const periodEnd = new Date();
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      const { data: restaurant, error: restaurantError } = await adminClient
        .from('restaurants')
        .insert({
          name: restaurantName,
          slug: slug,
          bank_name: bankName,
          account_number: accountNumber,
          account_name: accountName,
          subscription_status: 'active',
          subscription_expires_at: periodEnd.toISOString(),
        })
        .select('id')
        .single();

      if (restaurantError || !restaurant) {
        console.error('[flutterwave-callback] Restaurant creation failed:', restaurantError);
        return NextResponse.redirect(new URL('/checkout?error=restaurant_creation_failed', req.url));
      }

      // ── 7. Link restaurant to user ───────────────────────────────────────
      const { error: userUpdateError } = await adminClient
        .from('users')
        .update({
          restaurant_id: restaurant.id,
          onboarding_complete: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (userUpdateError) {
        console.error('[flutterwave-callback] User update failed:', userUpdateError);
        // Roll back the restaurant row to avoid orphaned records
        await adminClient.from('restaurants').delete().eq('id', restaurant.id);
        return NextResponse.redirect(new URL('/checkout?error=restaurant_creation_failed', req.url));
      }

      // ── 8. Log subscription ──────────────────────────────────────────────
      await adminClient.from('subscriptions').insert({
        restaurant_id: restaurant.id,
        user_id: userId,
        plan: 'monthly',
        status: 'active',
        amount_paid: transactionData?.data?.amount || 3800,
        currency: 'NGN',
        flutterwave_tx_ref: txRef,
        flutterwave_tx_id: transactionId || null,
        period_start: new Date().toISOString(),
        period_end: periodEnd.toISOString(),
      });

      console.log('[flutterwave-callback] Restaurant created and linked:', {
        restaurant_id: restaurant.id,
        user_id: userId,
      });

      // ── 9. Clean up pending record (best effort) ─────────────────────────
      void adminClient
        .from('pending_restaurants')
        .delete()
        .eq('tx_ref', txRef);

      return NextResponse.redirect(
        new URL(`/onboarding/success?created=true`, req.url)
      );
    } catch (error) {
      console.error('[flutterwave-callback] Unexpected error:', error);
      return NextResponse.redirect(new URL('/checkout?error=processing_failed', req.url));
    }
  }

  console.log('[flutterwave-callback] Payment not successful. Status:', status);
  return NextResponse.redirect(new URL('/checkout?error=payment_failed', req.url));
}
