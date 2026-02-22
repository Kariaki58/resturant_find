# Online Ordering Flow - Setup Guide

## Overview

A complete, professional online ordering system where customers can:
1. Browse menu items
2. Add items to cart
3. Complete checkout with customer details
4. Upload payment proof (screenshot of bank transfer)
5. Add optional notes/special instructions
6. Receive order confirmation

## Database Setup

Run these SQL scripts in your Supabase SQL Editor (in order):

### 1. Add Note Field to Orders Table
```sql
-- Run: add_order_note_field.sql
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS note TEXT;
```

### 2. Allow Public Order Creation
```sql
-- Run: add_order_insert_policy.sql
CREATE POLICY "Public can create orders"
  ON public.orders FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public can create order items"
  ON public.order_items FOR INSERT
  WITH CHECK (true);
```

## Features Implemented

### 1. Menu Page (`/menu/[slug]`)
- ✅ Browse available menu items
- ✅ Search functionality
- ✅ Category filtering
- ✅ Add to cart with one click
- ✅ Floating cart button showing item count and total
- ✅ Real-time cart updates

### 2. Checkout Page (`/menu/[slug]/checkout`)
- ✅ Order summary with item details
- ✅ Customer information form (name, email, phone)
- ✅ **Optional note field** for special instructions
- ✅ Bank account details display (with copy button)
- ✅ Payment reference input
- ✅ Buyer transfer name input
- ✅ **Payment proof upload** (screenshot of bank transfer)
  - Image preview before upload
  - Validation (JPEG, PNG, WebP, max 5MB)
  - Uploads to Cloudinary
- ✅ Step-by-step instructions
- ✅ Professional, beautiful UI

### 3. Order Success Page (`/menu/[slug]/order-success`)
- ✅ Order confirmation display
- ✅ Order ID and total amount
- ✅ Status badge (Awaiting Confirmation)
- ✅ Next steps information
- ✅ Navigation buttons

### 4. API Route (`/api/orders/create`)
- ✅ Validates all required fields
- ✅ Uploads payment proof to Cloudinary
- ✅ Creates order with status `awaiting_confirmation`
- ✅ Creates order items
- ✅ Handles table orders (if table number provided)
- ✅ Stores customer note (optional)
- ✅ Error handling and cleanup

## Order Flow

1. **Customer browses menu** → `/menu/[slug]`
2. **Adds items to cart** → Click "Add" button on menu items
3. **Clicks checkout** → Floating cart button → `/menu/[slug]/checkout`
4. **Fills customer info** → Name, email, phone, optional note
5. **Transfers money** → To restaurant's bank account
6. **Uploads payment proof** → Screenshot of transfer receipt
7. **Enters payment details** → Reference number, transfer name
8. **Submits order** → Order created with status `awaiting_confirmation`
9. **Sees confirmation** → `/menu/[slug]/order-success`

## Restaurant Owner Flow

1. **Views orders** → `/dashboard/orders`
2. **Sees new orders** → Status: "Awaiting Confirmation"
3. **Verifies payment** → Checks payment proof image
4. **Confirms order** → Changes status to "Confirmed"
5. **Manages order** → Updates status through order lifecycle

## Payment Process

- Customers transfer money directly to restaurant's bank account
- Upload screenshot/proof of transfer
- Restaurant verifies payment manually
- Order status changes from `awaiting_confirmation` → `confirmed`

## UI/UX Features

- ✅ Beautiful, modern design
- ✅ Responsive layout (mobile & desktop)
- ✅ Loading states and skeletons
- ✅ Error handling with toast notifications
- ✅ Form validation
- ✅ Image previews
- ✅ Copy-to-clipboard functionality
- ✅ Step-by-step instructions
- ✅ Professional color scheme
- ✅ Smooth animations and transitions

## Environment Variables Required

Make sure you have these in your `.env.local`:
```env
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
NEXT_PUBLIC_APP_URL=http://localhost:9002
```

## Testing the Flow

1. Visit a restaurant menu: `/menu/[restaurant-slug]`
2. Add items to cart
3. Click "View Cart" button
4. Fill in customer information
5. Upload a payment proof image
6. Enter payment details
7. Submit order
8. Verify order appears in `/dashboard/orders` with status "Awaiting Confirmation"

## Notes

- Orders are created with `status: 'awaiting_confirmation'`
- Restaurant owners verify payment manually
- Payment proof is stored in Cloudinary
- Customer notes are optional and stored in the `note` field
- Cart is stored in localStorage (cleared after successful order)
- Orders work for both online and dine-in (table-based) orders

