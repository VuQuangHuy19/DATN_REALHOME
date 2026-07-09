-- Public read access for customer portal (anonymous users)
-- and public appointment booking from website forms.

-- Active companies visible for tenant resolution by domain
CREATE POLICY "public_select_companies" ON public.companies
  FOR SELECT TO anon, authenticated
  USING (status IN ('active', 'trial'));

-- Buildings linked to listings
CREATE POLICY "public_select_buildings" ON public.buildings
  FOR SELECT TO anon, authenticated
  USING (true);

-- All room listings (status shown in UI)
CREATE POLICY "public_select_rooms" ON public.rooms
  FOR SELECT TO anon, authenticated
  USING (true);

-- Viewing appointment requests from public website
CREATE POLICY "public_insert_appointments" ON public.appointments
  FOR INSERT TO anon, authenticated
  WITH CHECK (company_id IS NOT NULL);
