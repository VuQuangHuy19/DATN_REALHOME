-- Migration: Enable RLS for appointments table so Supabase Realtime can broadcast events
-- =====================================================================================
-- Context: The app uses custom JWT auth (not native Supabase Auth).
-- All tables had RLS disabled for the custom auth flow.
-- However, Supabase Realtime requires RLS to be ENABLED (even if the policy is fully open)
-- in order to broadcast postgres_changes events to anon/authenticated subscribers.
--
-- This migration re-enables RLS on appointments and adds an open policy (USING true)
-- which preserves the exact same access behavior as before (no restrictions),
-- while allowing Realtime to correctly broadcast INSERT/UPDATE/DELETE events.

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (idempotent)
DROP POLICY IF EXISTS "appointments_open_access" ON public.appointments;

-- Open policy: allow all operations for all roles (same as RLS disabled, but Realtime works)
CREATE POLICY "appointments_open_access"
  ON public.appointments
  FOR ALL
  USING (true)
  WITH CHECK (true);
