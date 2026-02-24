import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * POST /api/webhooks/flutterwave
 * Server-side webhook — fired asynchronously by Flutterwave after payment.
 * Uses adminClient throughout for reliability (bypasses RLS, no session needed).
 *
 * This is a secondary path; the callback route handles the primary flow.
 * The webhook is a safety net for cases where the user closes the browser
 * before being redirected back.
 */
export async function POST(req: Request) {
  try {
    const signature = req.headers.get('verif-hash');
    const secretHash = process.env.FLUTTERWAVE_SECRET_HASH;

    if (secretHash && signature !== secretHash) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    console.log('[flutterwave-webhook] Received payload status:', payload.status);

    // Accept both early bird and regular pricing
    // Early bird: monthly (3800) and yearly (38000)
    // Regular: monthly (5000) and yearly (50000)
    const validAmounts = [3800, 38000, 5000, 50000];
    if (payload.status !== 'successful' || !validAmounts.includes(payload.amount)) {
      return NextResponse.json({ status: 'ignored' });
    }

    const { tx_ref } = payload;

    if (!tx_ref?.startsWith('restaurant-')) {
      console.error('[flutterwave-webhook] Invalid tx_ref:', tx_ref);
      return NextResponse.json({ error: 'Invalid transaction reference' }, { status: 400 });
    }

    // Parse user ID from tx_ref
    const withoutPrefix = tx_ref.substring(11);
    const uuidMatch = withoutPrefix.match(
      /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})-/
    );

    if (!uuidMatch) {
      console.error('[flutterwave-webhook] UUID parse failed:', tx_ref);
      return NextResponse.json({ error: 'Invalid transaction reference' }, { status: 400 });
    }

    const userId = uuidMatch[1];
    const adminClient = createAdminClient();

    // ── Check if already processed (idempotency) ─────────────────────────
    const { data: existingUser } = await adminClient
      .from('users')
      .select('id, restaurant_id')
      .eq('id', userId)
      .maybeSingle();

    if (!existingUser) {
      console.error('[flutterwave-webhook] No profile for user:', userId);
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    if (existingUser.restaurant_id) {
      console.log('[flutterwave-webhook] Already processed for user:', userId);
      return NextResponse.json({ status: 'ok', message: 'Already processed' });
    }

    // ── Resolve restaurant details ────────────────────────────────────────
    const meta = payload.meta || {};
    let restaurantName: string = meta.restaurant_name;
    let slug: string = meta.slug;
    let bankName: string = meta.bank_name;
    let accountNumber: string = meta.account_number;
    let accountName: string = meta.account_name;
    let plan: string = meta.plan || 'monthly';

    if (!restaurantName || !slug) {
      const { data: pendingData } = await adminClient
        .from('pending_restaurants')
        .select('*')
        .eq('tx_ref', tx_ref)
        .maybeSingle();

      if (pendingData) {
        restaurantName = pendingData.restaurant_name;
        slug = pendingData.slug;
        bankName = pendingData.bank_name;
        accountNumber = pendingData.account_number;
        accountName = pendingData.account_name;
        plan = pendingData.plan || 'monthly';
      }
    }

    if (!restaurantName || !slug) {
      console.error('[flutterwave-webhook] Missing restaurant details');
      return NextResponse.json({ error: 'Missing restaurant details' }, { status: 400 });
    }

    // ── Check slug uniqueness ─────────────────────────────────────────────
    const { data: existingRestaurant } = await adminClient
      .from('restaurants')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();

    if (existingRestaurant) {
      console.error('[flutterwave-webhook] Slug taken:', slug);
      return NextResponse.json({ error: 'Restaurant slug already taken' }, { status: 409 });
    }

    // ── Create restaurant ─────────────────────────────────────────────────
    // Determine plan from meta or amount if not set
    if (!plan) {
      plan = payload.amount === 38000 ? 'yearly' : 'monthly';
    }
    const periodEnd = new Date();
    if (plan === 'yearly') {
      periodEnd.setMonth(periodEnd.getMonth() + 10);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

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
      console.error('[flutterwave-webhook] Restaurant creation failed:', restaurantError);
      return NextResponse.json({ error: 'Failed to create restaurant' }, { status: 500 });
    }

    // ── Link restaurant to user ───────────────────────────────────────────
    const { error: userUpdateError } = await adminClient
      .from('users')
      .update({
        restaurant_id: restaurant.id,
        onboarding_complete: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (userUpdateError) {
      console.error('[flutterwave-webhook] User link failed:', userUpdateError);
      await adminClient.from('restaurants').delete().eq('id', restaurant.id);
      return NextResponse.json({ error: 'Failed to link restaurant to user' }, { status: 500 });
    }

    // ── Log subscription ──────────────────────────────────────────────────
    await adminClient.from('subscriptions').insert({
      restaurant_id: restaurant.id,
      user_id: userId,
      plan: plan,
      status: 'active',
      amount_paid: payload.amount || (plan === 'yearly' ? 38000 : 3800),
      currency: 'NGN',
      flutterwave_tx_ref: tx_ref,
      period_start: new Date().toISOString(),
      period_end: periodEnd.toISOString(),
    });

    // ── Clean up pending record ───────────────────────────────────────────
    void adminClient
      .from('pending_restaurants')
      .delete()
      .eq('tx_ref', tx_ref);

    console.log('[flutterwave-webhook] Restaurant created and linked:', {
      restaurant_id: restaurant.id,
      user_id: userId,
    });

    return NextResponse.json({
      status: 'ok',
      restaurant_id: restaurant.id,
      message: 'Restaurant created and linked successfully',
    });
  } catch (err) {
    console.error('[flutterwave-webhook] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}