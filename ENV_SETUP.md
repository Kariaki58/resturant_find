# Environment Variables Setup

This document outlines all the environment variables required for the application to function properly.

## Required Environment Variables

Create a `.env.local` file in the root directory with the following variables:

### Supabase Configuration

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

**How to get these:**
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Create a new project or select an existing one
3. Go to Settings > API
4. Copy the "Project URL" and "anon public" key
5. Copy the "service_role" key (⚠️ Keep this secret! Never expose it to the client)

### Application URL

```env
NEXT_PUBLIC_APP_URL=http://localhost:9002
```

**Note:** Change this to your production URL when deploying (e.g., `https://yourdomain.com`)

### Flutterwave Configuration

```env
FLUTTERWAVE_SECRET_KEY=your_flutterwave_secret_key
FLUTTERWAVE_SECRET_HASH=your_flutterwave_secret_hash
```

**How to get these:**
1. Go to [Flutterwave Dashboard](https://dashboard.flutterwave.com)
2. Navigate to Settings > API Keys
3. Copy your "Secret Key"
4. For the Secret Hash:
   - Go to Settings > Webhooks
   - Create a webhook URL pointing to: `https://yourdomain.com/api/webhooks/flutterwave`
   - Copy the "Secret Hash" generated

**Important Notes:**
- Use test keys for development and live keys for production
- The `FLUTTERWAVE_SECRET_HASH` is optional but highly recommended for webhook security
- Make sure your webhook URL is publicly accessible (not localhost) for Flutterwave to send webhooks

### Cloudinary Configuration

```env
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

**How to get these:**
1. Go to [Cloudinary Dashboard](https://console.cloudinary.com)
2. Sign up or log in to your account
3. Go to Dashboard
4. Copy your "Cloud name", "API Key", and "API Secret"
5. Add them to your `.env.local` file

**Important Notes:**
- Cloudinary is used for image uploads (menu items, etc.)
- The API Secret should be kept secure and never exposed to the client
- Free tier includes 25GB storage and 25GB monthly bandwidth

## Example .env.local File

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (⚠️ Keep secret!)

# Application URL
NEXT_PUBLIC_APP_URL=http://localhost:9002

# Flutterwave Configuration
FLUTTERWAVE_SECRET_KEY=FLWSECK_TEST-xxxxxxxxxxxxxxxxxxxxx
FLUTTERWAVE_SECRET_HASH=your_secret_hash_here
```

## Database Setup

Make sure your Supabase database has the following tables:

1. **users** - Stores user information
2. **restaurants** - Stores restaurant information
3. **tables** - Stores table/QR code information
4. **menu_categories** - Stores menu categories
5. **menu_items** - Stores menu items
6. **orders** - Stores order information
7. **order_items** - Stores order line items

Refer to `src/lib/supabase.ts` for the expected schema structure.

## Testing the Setup

1. Start the development server: `npm run dev`
2. Navigate to `http://localhost:9002`
3. Try registering a new account
4. Complete the checkout process with Flutterwave test credentials
5. Verify the webhook creates the restaurant in your database

