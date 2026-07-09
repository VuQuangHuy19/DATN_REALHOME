-- Migration: Disable RLS for custom auth flow on remaining business tables
-- Since the application uses a custom JWT authorization and does not log in via native Supabase Auth,
-- standard RLS policies (using auth.uid()) will block select/insert/update/delete operations.

ALTER TABLE public.appointments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.landlords DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_kpis DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_invitations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_activities DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_timelines DISABLE ROW LEVEL SECURITY;
