# Database Setup Instructions

This guide will help you set up the required database tables in Supabase.

## Quick Setup

1. Go to your Supabase project dashboard: https://app.supabase.com
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy and paste the entire contents of `supabase_migration.sql`
5. Click **Run** (or press `Ctrl+Enter` / `Cmd+Enter`)

## What This Migration Does

The migration script will create:

1. **users** - Stores user information linked to Supabase Auth
2. **restaurants** - Stores restaurant information and subscription details
3. **tables** - Stores table/QR code information
4. **menu_categories** - Stores menu categories
5. **menu_items** - Stores menu items
6. **orders** - Stores order information
7. **order_items** - Stores order line items

It also:
- Sets up Row Level Security (RLS) policies
- Creates indexes for better performance
- Establishes foreign key relationships
- Allows public read access to restaurants and menu items (for public menu pages)

## Verifying the Setup

After running the migration:

1. Go to **Table Editor** in Supabase
2. You should see all 7 tables listed
3. Click on the `users` table to verify it was created correctly
4. Check that the columns match the expected schema

## Troubleshooting

### If you get an error about existing tables:
- The migration uses `CREATE TABLE IF NOT EXISTS`, so it's safe to run multiple times
- If you need to start fresh, you can drop tables first (be careful with this in production!)

### If RLS policies cause issues:
- The policies allow users to manage their own data
- Public menu pages can read restaurant and menu data
- If you need to adjust permissions, modify the policies in the SQL editor

## Next Steps

After running the migration:
1. Try registering a new user
2. The registration should now work without the "table not found" error
3. Complete the checkout flow to create your first restaurant

