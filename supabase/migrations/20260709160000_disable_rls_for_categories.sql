-- Migration: Disable Row Level Security (RLS) on categories (price_ranges, amenities, room_types), employees, and landlords tables
-- This allows client-side anonymous queries (via NEXT_PUBLIC_SUPABASE_ANON_KEY) to read and write data,
-- matching the custom JWT authentication architecture of the application.

ALTER TABLE public.room_types DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_ranges DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.amenities DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.landlords DISABLE ROW LEVEL SECURITY;
