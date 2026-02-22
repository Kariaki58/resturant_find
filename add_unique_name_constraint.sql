-- Migration to add UNIQUE constraint to the name column of the restaurants table
-- This ensures no two restaurants can have the same name.

ALTER TABLE public.restaurants
ADD CONSTRAINT restaurants_name_key UNIQUE (name);