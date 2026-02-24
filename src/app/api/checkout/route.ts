import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { restaurantName, slug, bankName, accountNumber, accountName, plan = 'monthly' } = body;

    // Validate input
    if (!restaurantName || !slug || !bankName || !accountNumber || !accountName) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
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

    // Generate a unique transaction reference
    const txRef = `restaurant-${user.id}-${Date.now()}`;

    // Store restaurant data temporarily for callback retrieval (optional fallback)
    // Primary source will be transaction meta from Flutterwave
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: storeError } = await (supabase as any)
        .from('pending_restaurants')
        .insert({
          tx_ref: txRef,
          user_id: user.id,
          restaurant_name: restaurantName,
          slug: slug,
          bank_name: bankName,
          account_number: accountNumber,
          account_name: accountName,
          plan: plan,
        });

      if (storeError) {
        console.error('Error storing pending restaurant (non-critical):', storeError);
        // Continue anyway - we'll use transaction meta as primary source
      }
    } catch (error) {
      console.error('Error storing pending restaurant (non-critical):', error);
      // Continue anyway - transaction meta should have the data
    }

    // Get restaurant count to determine pricing
    const adminClient = createAdminClient();
    const { count } = await adminClient
      .from('restaurants')
      .select('*', { count: 'exact', head: true });
    
    const restaurantCount = count || 0;
    const isEarlyBird = restaurantCount < 20;
    
    // Determine amount based on plan and restaurant count
    // First 20 restaurants: ₦3,800/month or ₦38,000/year
    // After 20: ₦5,000/month or ₦50,000/year
    const amount = plan === 'yearly' 
      ? (isEarlyBird ? 38000 : 50000)
      : (isEarlyBird ? 3800 : 5000);
    
    const planDescription = plan === 'yearly' 
      ? `Yearly subscription (10 months) for restaurant management platform${isEarlyBird ? ' - Early Bird Pricing' : ''}`
      : `Monthly subscription for restaurant management platform${isEarlyBird ? ' - Early Bird Pricing' : ''}`;

    // Prepare Flutterwave payment data
    const paymentData = {
      tx_ref: txRef,
      amount: amount,
      currency: 'NGN',
      payment_options: 'card,account,ussd,mpesa,mobilemoneyghana,credit,payattitude,barter,banktransfer,depositaccount,mpesa,pesapal,airtel,applepay,googlepay,mobilemoneyrwanda,mobilemoneyzambia,ussd_mobilemoneyghana,ussd_mobilemoneyuganda,ussd_mobilemoneytanzania,ussd_mobilemoneyrwanda,ussd_mobilemoneyzambia',
      redirect_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002'}/api/callback/flutterwave`,
      customer: {
        email: user.email!,
        name: user.user_metadata?.full_name || 'Restaurant Owner',
        phone_number: user.user_metadata?.phone || '',
      },
      customizations: {
        title: 'Restaurant Subscription',
        description: planDescription,
        logo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002'}/favicon.ico`,
      },
      meta: {
        user_id: user.id,
        restaurant_name: restaurantName,
        slug: slug,
        bank_name: bankName,
        account_number: accountNumber,
        account_name: accountName,
        plan: plan,
      },
    };

    // Initialize Flutterwave payment
    const flutterwaveResponse = await fetch('https://api.flutterwave.com/v3/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paymentData),
    });

    const flutterwaveData = await flutterwaveResponse.json();

    if (!flutterwaveResponse.ok || flutterwaveData.status !== 'success') {
      return NextResponse.json(
        { error: flutterwaveData.message || 'Failed to initialize payment' },
        { status: 500 }
      );
    }

    // Store pending restaurant data temporarily (you might want to use a cache or database)
    // For now, we'll store it in the webhook handler using the tx_ref

    return NextResponse.json({
      paymentLink: flutterwaveData.data.link,
      txRef: txRef,
    });
  } catch (error: any) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

