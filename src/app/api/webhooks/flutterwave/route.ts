import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

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
      const { tx_ref } = payload;
      // tx_ref would contain the restaurant_id
      const restaurantId = tx_ref.split('-')[1];

      // Update subscription status in Supabase
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 1);

      await supabase
        .from('restaurants')
        .update({
          subscription_status: 'active',
          subscription_expires_at: expiresAt.toISOString(),
        })
        .eq('id', restaurantId);

      return NextResponse.json({ status: 'ok' });
    }

    return NextResponse.json({ status: 'ignored' });
  } catch (err) {
    console.error('Webhook error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}