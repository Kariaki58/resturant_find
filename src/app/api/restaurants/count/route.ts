import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  try {
    const adminClient = createAdminClient();
    
    // Count all restaurants (regardless of subscription status)
    const { count, error } = await adminClient
      .from('restaurants')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error('Error counting restaurants:', error);
      return NextResponse.json({ error: 'Failed to count restaurants' }, { status: 500 });
    }

    return NextResponse.json({ count: count || 0 });
  } catch (error: any) {
    console.error('Error in restaurant count API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

