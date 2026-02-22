import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Server-side API route to create user record
 * Uses admin client to bypass RLS for this trusted server-side operation
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { fullName, email, phone, userId } = body;

    // Validate userId is provided
    if (!userId) {
      // Try to get from session as fallback
      const supabase = await createClient();
      const { data: { user: sessionUser } } = await supabase.auth.getUser();
      
      if (!sessionUser) {
        return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
      }
      
      // Use session user ID
      const adminClient = createAdminClient();
      
      // Check if user already exists in public.users
      const { data: existingUser } = await adminClient
        .from('users')
        .select('id')
        .eq('id', sessionUser.id)
        .maybeSingle();

      if (existingUser) {
        return NextResponse.json({ 
          success: true, 
          message: 'User already exists',
          user: existingUser 
        });
      }

      // Create user record with retry logic for foreign key constraint
      let newUser = null;
      let userError = null;
      const maxRetries = 5;
      
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        if (attempt > 0) {
          await new Promise(resolve => setTimeout(resolve, 300 * attempt));
        }
        
        const result = await adminClient
          .from('users')
          .insert({
            id: sessionUser.id,
            full_name: fullName,
            email: email,
            phone: phone,
            role: 'restaurant_owner',
            restaurant_id: null,
          })
          .select()
          .single();
        
        newUser = result.data;
        userError = result.error;
        
        if (newUser && !userError) {
          break; // Success
        }
        
        // If it's not a foreign key constraint error, break
        if (userError?.code !== '23503') {
          break;
        }
        
        // If it's the last attempt, break
        if (attempt === maxRetries - 1) {
          break;
        }
      }

      if (userError) {
        console.error('Error creating user:', userError);
        
        if (userError.code === '23503') {
          return NextResponse.json(
            { error: 'User account is still being created. Please wait a moment and try again.' },
            { status: 409 }
          );
        }
        
        return NextResponse.json(
          { error: userError.message || 'Failed to create user record' },
          { status: 500 }
        );
      }

      return NextResponse.json({ 
        success: true, 
        user: newUser 
      });
    }

    // Use admin client with provided userId (bypasses RLS)
    const adminClient = createAdminClient();
    
    // Validate input
    if (!fullName || !email || !phone) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    // Check if user already exists (trigger might have created it)
    // Wait a moment for trigger to fire, then check
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    let existingUser = null;
    let checkAttempts = 0;
    const maxCheckAttempts = 3;
    
    while (checkAttempts < maxCheckAttempts) {
      const { data: userCheck } = await adminClient
        .from('users')
        .select('id, full_name, email, phone, role, restaurant_id')
        .eq('id', userId)
        .maybeSingle();
      
      if (userCheck) {
        existingUser = userCheck;
        break;
      }
      
      if (checkAttempts < maxCheckAttempts - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      checkAttempts++;
    }

    if (existingUser) {
      // User exists (created by trigger or previous attempt)
      // Update with provided data if different
      if (existingUser.full_name !== fullName || existingUser.email !== email || existingUser.phone !== phone) {
        const { data: updatedUser } = await adminClient
          .from('users')
          .update({
            full_name: fullName,
            email: email,
            phone: phone,
          })
          .eq('id', userId)
          .select()
          .single();
        
        return NextResponse.json({ 
          success: true, 
          message: 'User already exists, updated',
          user: updatedUser || existingUser 
        });
      }
      
      return NextResponse.json({ 
        success: true, 
        message: 'User already exists',
        user: existingUser 
      });
    }

    // User doesn't exist yet, create it manually
    // Wait for user to be available in auth.users with aggressive retry
    let authUser = null;
    const maxRetries = 10; // Increased retries
    const baseDelay = 500; // Start with 500ms
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      if (attempt > 0) {
        // Exponential backoff: 500ms, 1000ms, 2000ms, 4000ms, etc.
        await new Promise(resolve => setTimeout(resolve, baseDelay * Math.pow(2, attempt - 1)));
      }
      
      try {
        const result = await adminClient.auth.admin.getUserById(userId);
        authUser = result.data?.user;
        
        if (authUser) {
          break; // User found
        }
      } catch (error) {
        // Continue retrying
        if (attempt === maxRetries - 1) {
          console.warn('Could not verify user in auth.users after retries');
        }
      }
    }

    // Try to create user record (even if verification failed, the user should exist)
    let newUser = null;
    let userError = null;
    const maxInsertRetries = 10;
    
    for (let attempt = 0; attempt < maxInsertRetries; attempt++) {
      if (attempt > 0) {
        await new Promise(resolve => setTimeout(resolve, baseDelay * Math.pow(2, attempt - 1)));
      }
      
      const result = await adminClient
        .from('users')
        .insert({
          id: userId,
          full_name: fullName,
          email: email,
          phone: phone,
          role: 'restaurant_owner',
          restaurant_id: null,
        })
        .select()
        .single();
      
      newUser = result.data;
      userError = result.error;
      
      if (newUser && !userError) {
        break; // Success
      }
      
      // If it's not a foreign key constraint error, break
      if (userError?.code !== '23503') {
        // Check if user was created by trigger while we were retrying
        const { data: triggerUser } = await adminClient
          .from('users')
          .select('id, full_name, email, phone, role, restaurant_id')
          .eq('id', userId)
          .maybeSingle();
        
        if (triggerUser) {
          // Update with our data
          const { data: updatedUser } = await adminClient
            .from('users')
            .update({
              full_name: fullName,
              email: email,
              phone: phone,
            })
            .eq('id', userId)
            .select()
            .single();
          
          return NextResponse.json({ 
            success: true, 
            message: 'User created by trigger, updated',
            user: updatedUser || triggerUser 
          });
        }
        break;
      }
      
      // If it's the last attempt, check one more time if trigger created it
      if (attempt === maxInsertRetries - 1) {
        const { data: triggerUser } = await adminClient
          .from('users')
          .select('id, full_name, email, phone, role, restaurant_id')
          .eq('id', userId)
          .maybeSingle();
        
        if (triggerUser) {
          return NextResponse.json({ 
            success: true, 
            message: 'User created by trigger',
            user: triggerUser 
          });
        }
      }
    }

    if (userError && !newUser) {
      console.error('Error creating user:', userError);
      
      if (userError.code === '23503') {
        return NextResponse.json(
          { error: 'User account is still being created. The system will retry automatically. Please refresh in a few moments.' },
          { status: 409 }
        );
      }
      
      return NextResponse.json(
        { error: userError.message || 'Failed to create user record' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      user: newUser 
    });
  } catch (error: any) {
    console.error('Create user error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

