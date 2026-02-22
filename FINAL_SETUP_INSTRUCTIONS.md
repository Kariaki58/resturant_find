# Final Setup Instructions - Fix Registration Once and For All

## The Problem
The foreign key constraint error occurs because `auth.users` and `public.users` have timing issues. Even with retries, the user might not be immediately available.

## The Solution
**Use a database trigger** that automatically creates the user record when someone signs up. This eliminates all timing issues.

## Setup Steps (REQUIRED)

### Step 1: Run the Database Trigger
1. Go to Supabase Dashboard → SQL Editor
2. Copy and paste the **entire contents** of `create_user_trigger.sql`
3. Click **Run**
4. This creates a trigger that automatically creates user records when users sign up

### Step 2: Verify Environment Variables
Make sure your `.env.local` has:
```env
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  # ⚠️ CRITICAL - Must be set!
```

### Step 3: Test Registration
1. Try registering a new user
2. The trigger will automatically create the user record
3. The API route will update it with correct metadata if needed
4. No more foreign key errors!

## How It Works

1. **User signs up** → `supabase.auth.signUp()` creates user in `auth.users`
2. **Database trigger fires** → Automatically creates record in `public.users`
3. **API route called** → Ensures data is correct, updates if needed
4. **Success!** → User is redirected to checkout

## Fallback Mechanism

Even if the trigger fails (rare), the API route has:
- ✅ 10 retry attempts with exponential backoff
- ✅ Checks if trigger created the user
- ✅ Updates metadata if user exists but data is different
- ✅ Comprehensive error handling

## Troubleshooting

### If you still get errors:

1. **Check trigger exists:**
   ```sql
   SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
   ```

2. **Check function exists:**
   ```sql
   SELECT * FROM pg_proc WHERE proname = 'handle_new_user';
   ```

3. **Re-run trigger setup:**
   - Run `create_user_trigger.sql` again (it's idempotent)

4. **Check service role key:**
   - Make sure `SUPABASE_SERVICE_ROLE_KEY` is set in `.env.local`
   - Restart your dev server after adding it

## Why This Works

- **Database triggers** run at the database level, immediately after `auth.users` insert
- **No timing issues** - the trigger executes synchronously
- **Automatic** - no manual API calls needed (though we still call API for metadata)
- **Reliable** - database-level operations are atomic

This is the **definitive solution** - no more retries, no more timing issues!

