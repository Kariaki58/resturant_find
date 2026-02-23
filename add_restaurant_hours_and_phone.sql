-- Add restaurant hours and phone number fields
-- Run this in Supabase SQL Editor

ALTER TABLE public.restaurants 
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS monday_open TIME,
ADD COLUMN IF NOT EXISTS monday_close TIME,
ADD COLUMN IF NOT EXISTS tuesday_open TIME,
ADD COLUMN IF NOT EXISTS tuesday_close TIME,
ADD COLUMN IF NOT EXISTS wednesday_open TIME,
ADD COLUMN IF NOT EXISTS wednesday_close TIME,
ADD COLUMN IF NOT EXISTS thursday_open TIME,
ADD COLUMN IF NOT EXISTS thursday_close TIME,
ADD COLUMN IF NOT EXISTS friday_open TIME,
ADD COLUMN IF NOT EXISTS friday_close TIME,
ADD COLUMN IF NOT EXISTS saturday_open TIME,
ADD COLUMN IF NOT EXISTS saturday_close TIME,
ADD COLUMN IF NOT EXISTS sunday_open TIME,
ADD COLUMN IF NOT EXISTS sunday_close TIME;

