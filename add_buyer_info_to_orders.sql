-- Add buyer email and phone columns to orders table
-- This allows restaurants to see customer contact information directly on orders

ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS buyer_email TEXT,
ADD COLUMN IF NOT EXISTS buyer_phone TEXT;

-- Add index for faster lookups by email
CREATE INDEX IF NOT EXISTS idx_orders_buyer_email ON public.orders(buyer_email);

-- Add comment for documentation
COMMENT ON COLUMN public.orders.buyer_email IS 'Email address of the buyer/customer who placed the order';
COMMENT ON COLUMN public.orders.buyer_phone IS 'Phone number of the buyer/customer who placed the order';

