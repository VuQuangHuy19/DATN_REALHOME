-- Disable Row Level Security (RLS) on tables to allow client-side operations
-- since the application uses a custom JWT flow and does not log in via Supabase Auth.
ALTER TABLE public.buildings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.building_services DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_contracts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.deposit_contracts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_readings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_images DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites DISABLE ROW LEVEL SECURITY;
