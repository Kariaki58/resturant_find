import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * POST /api/auth/create-user
 * Creates or updates the public.users profile row for the authenticated user.
 * Called immediately after supabase.auth.signUp() — no trigger required.
 *
 * Uses UPSERT so it is safe to call multiple times (idempotent).
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { fullName, email, phone } = body;

    // Validate required fields
    if (!fullName || !email) {
      return NextResponse.json(
        { error: 'fullName and email are required' },
        { status: 400 }
      );
    }

    // Get the authenticated user from the session cookie
    const supabase = await createClient();
    const {
      data: { user: sessionUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use the service-role admin client to bypass RLS for this trusted
    // server-side operation. This is safe because we validate the session above.
    const adminClient = createAdminClient();

    const { data: upsertedUser, error: upsertError } = await adminClient
      .from('users')
      .upsert(
        {
          id: sessionUser.id,
          full_name: fullName,
          email: email,
          phone: phone || '',
          role: 'restaurant_owner',
          restaurant_id: null,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'id',
          // Only update these fields if the row already exists
          ignoreDuplicates: false,
        }
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
