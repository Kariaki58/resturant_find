import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * POST /api/auth/create-user
 * Creates or updates the public.users profile row.
 * Called immediately after supabase.auth.signUp() — no trigger required.
 *
 * Why adminClient + userId in body (not session-based):
 * When email confirmation is enabled, signUp() returns a user but NO active session.
 * The session cookie is not set yet, so getUser() returns null → 401.
 * Instead we accept userId from the body and verify it exists in auth.users via adminClient.
 *
 * Security: the admin client confirms the userId exists in auth.users before writing.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { fullName, email, phone, userId } = body;

    if (!userId || !fullName || !email) {
      return NextResponse.json(
        { error: 'userId, fullName, and email are required' },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // Verify the userId actually exists in auth.users — prevents spoofing
    const { data: authUser, error: authLookupError } =
      await adminClient.auth.admin.getUserById(userId);

    if (authLookupError || !authUser?.user) {
      console.error('[create-user] Auth user not found:', userId, authLookupError);
      return NextResponse.json(
        { error: 'Auth user not found' },
        { status: 404 }
      );
    }

    // UPSERT the public.users profile — idempotent, safe to call multiple times
    const { data: upsertedUser, error: upsertError } = await adminClient
      .from('users')
      .upsert(
        {
          id: userId,
          full_name: fullName,
          email: email,
          phone: phone || '',
          role: 'restaurant_owner',
          restaurant_id: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id', ignoreDuplicates: false }
      )
      .select('id, full_name, email, phone, role, restaurant_id')
      .single();

    if (upsertError) {
      console.error('[create-user] Upsert error:', upsertError);
      return NextResponse.json(
        { error: upsertError.message || 'Failed to create user profile' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, user: upsertedUser });
  } catch (error: any) {
    console.error('[create-user] Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
