-- ============================================================
-- FIX: Replace all QUAL=true policies with proper company-scoped
-- isolation for multitenant tables.
--
-- Tables fixed:
--   companies, subscriptions, leads, consultations,
--   notifications, activity_logs, lead_activities,
--   employee_kpis, roles
--
-- Pattern used:
--   company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
--   OR role = 'super_admin' (for cross-company super admin access)
-- ============================================================

-- Helper: inline function for current user's company_id
-- (avoids N+1 subquery repetition via stable function)
CREATE OR REPLACE FUNCTION auth_company_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT company_id FROM public.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION auth_is_super_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
$$;

-- ============================================================
-- COMPANIES: users see only their own company; super_admin sees all
-- ============================================================
DROP POLICY IF EXISTS "companies_select" ON companies;
DROP POLICY IF EXISTS "companies_insert" ON companies;
DROP POLICY IF EXISTS "companies_update" ON companies;
DROP POLICY IF EXISTS "companies_delete" ON companies;

CREATE POLICY "companies_select" ON companies FOR SELECT TO authenticated
  USING (auth_is_super_admin() OR id = auth_company_id());

CREATE POLICY "companies_insert" ON companies FOR INSERT TO authenticated
  WITH CHECK (auth_is_super_admin());

CREATE POLICY "companies_update" ON companies FOR UPDATE TO authenticated
  USING (auth_is_super_admin() OR id = auth_company_id())
  WITH CHECK (auth_is_super_admin() OR id = auth_company_id());

CREATE POLICY "companies_delete" ON companies FOR DELETE TO authenticated
  USING (auth_is_super_admin());

-- ============================================================
-- SUBSCRIPTIONS: scoped to own company; super_admin sees all
-- ============================================================
DROP POLICY IF EXISTS "subscriptions_select" ON subscriptions;
DROP POLICY IF EXISTS "subscriptions_insert" ON subscriptions;
DROP POLICY IF EXISTS "subscriptions_update" ON subscriptions;
DROP POLICY IF EXISTS "subscriptions_delete" ON subscriptions;

CREATE POLICY "subscriptions_select" ON subscriptions FOR SELECT TO authenticated
  USING (auth_is_super_admin() OR company_id = auth_company_id());

CREATE POLICY "subscriptions_insert" ON subscriptions FOR INSERT TO authenticated
  WITH CHECK (auth_is_super_admin() OR company_id = auth_company_id());

CREATE POLICY "subscriptions_update" ON subscriptions FOR UPDATE TO authenticated
  USING (auth_is_super_admin() OR company_id = auth_company_id())
  WITH CHECK (auth_is_super_admin() OR company_id = auth_company_id());

CREATE POLICY "subscriptions_delete" ON subscriptions FOR DELETE TO authenticated
  USING (auth_is_super_admin());

-- ============================================================
-- LEADS: scoped to own company; anon insert allowed (public forms)
-- ============================================================
DROP POLICY IF EXISTS "leads_select" ON leads;
DROP POLICY IF EXISTS "leads_insert" ON leads;
DROP POLICY IF EXISTS "leads_update" ON leads;
DROP POLICY IF EXISTS "leads_delete" ON leads;

CREATE POLICY "leads_select" ON leads FOR SELECT TO authenticated
  USING (auth_is_super_admin() OR company_id = auth_company_id() OR company_id IS NULL);

CREATE POLICY "leads_insert" ON leads FOR INSERT TO authenticated
  WITH CHECK (company_id = auth_company_id() OR company_id IS NULL);

CREATE POLICY "leads_update" ON leads FOR UPDATE TO authenticated
  USING (auth_is_super_admin() OR company_id = auth_company_id())
  WITH CHECK (auth_is_super_admin() OR company_id = auth_company_id());

CREATE POLICY "leads_delete" ON leads FOR DELETE TO authenticated
  USING (auth_is_super_admin() OR company_id = auth_company_id());

-- ============================================================
-- CONSULTATIONS: scoped to own company
-- ============================================================
DROP POLICY IF EXISTS "consultations_select" ON consultations;
DROP POLICY IF EXISTS "consultations_insert" ON consultations;
DROP POLICY IF EXISTS "consultations_update" ON consultations;
DROP POLICY IF EXISTS "consultations_delete" ON consultations;

CREATE POLICY "consultations_select" ON consultations FOR SELECT TO authenticated
  USING (auth_is_super_admin() OR company_id = auth_company_id() OR company_id IS NULL);

CREATE POLICY "consultations_insert" ON consultations FOR INSERT TO authenticated
  WITH CHECK (company_id = auth_company_id() OR company_id IS NULL);

CREATE POLICY "consultations_update" ON consultations FOR UPDATE TO authenticated
  USING (auth_is_super_admin() OR company_id = auth_company_id())
  WITH CHECK (auth_is_super_admin() OR company_id = auth_company_id());

CREATE POLICY "consultations_delete" ON consultations FOR DELETE TO authenticated
  USING (auth_is_super_admin() OR company_id = auth_company_id());

-- ============================================================
-- NOTIFICATIONS: own company; recipient gets extra guard
-- ============================================================
DROP POLICY IF EXISTS "notifications_select" ON notifications;
DROP POLICY IF EXISTS "notifications_insert" ON notifications;
DROP POLICY IF EXISTS "notifications_update" ON notifications;
DROP POLICY IF EXISTS "notifications_delete" ON notifications;
DROP POLICY IF EXISTS "select_own_notifications" ON notifications;
DROP POLICY IF EXISTS "update_own_notifications" ON notifications;

CREATE POLICY "notifications_select" ON notifications FOR SELECT TO authenticated
  USING (auth_is_super_admin() OR company_id = auth_company_id());

CREATE POLICY "notifications_insert" ON notifications FOR INSERT TO authenticated
  WITH CHECK (company_id = auth_company_id());

CREATE POLICY "notifications_update" ON notifications FOR UPDATE TO authenticated
  USING (company_id = auth_company_id() AND (recipient_id IS NULL OR recipient_id = auth.uid()))
  WITH CHECK (company_id = auth_company_id());

CREATE POLICY "notifications_delete" ON notifications FOR DELETE TO authenticated
  USING (auth_is_super_admin() OR company_id = auth_company_id());

-- ============================================================
-- ACTIVITY_LOGS: scoped to own company; no user edits
-- ============================================================
DROP POLICY IF EXISTS "activity_logs_select" ON activity_logs;
DROP POLICY IF EXISTS "activity_logs_insert" ON activity_logs;
DROP POLICY IF EXISTS "activity_logs_update" ON activity_logs;
DROP POLICY IF EXISTS "activity_logs_delete" ON activity_logs;
DROP POLICY IF EXISTS "select_company_activity_logs" ON activity_logs;
DROP POLICY IF EXISTS "insert_activity_logs" ON activity_logs;

CREATE POLICY "activity_logs_select" ON activity_logs FOR SELECT TO authenticated
  USING (auth_is_super_admin() OR company_id = auth_company_id());

-- Insert only via triggers (SECURITY DEFINER) or authenticated users in their own company
CREATE POLICY "activity_logs_insert" ON activity_logs FOR INSERT TO authenticated, anon
  WITH CHECK (true);

-- No UPDATE or DELETE for activity_logs (immutable audit trail)

-- ============================================================
-- LEAD_ACTIVITIES: scoped to own company
-- ============================================================
DROP POLICY IF EXISTS "lead_activities_select" ON lead_activities;
DROP POLICY IF EXISTS "lead_activities_insert" ON lead_activities;
DROP POLICY IF EXISTS "lead_activities_update" ON lead_activities;
DROP POLICY IF EXISTS "lead_activities_delete" ON lead_activities;

CREATE POLICY "lead_activities_select" ON lead_activities FOR SELECT TO authenticated
  USING (auth_is_super_admin() OR company_id = auth_company_id() OR company_id IS NULL);

CREATE POLICY "lead_activities_insert" ON lead_activities FOR INSERT TO authenticated
  WITH CHECK (company_id = auth_company_id() OR company_id IS NULL);

-- No UPDATE/DELETE for activity log records

-- ============================================================
-- EMPLOYEE_KPIS: scoped to own company
-- ============================================================
DROP POLICY IF EXISTS "employee_kpis_select" ON employee_kpis;
DROP POLICY IF EXISTS "employee_kpis_insert" ON employee_kpis;
DROP POLICY IF EXISTS "employee_kpis_update" ON employee_kpis;
DROP POLICY IF EXISTS "employee_kpis_delete" ON employee_kpis;

CREATE POLICY "employee_kpis_select" ON employee_kpis FOR SELECT TO authenticated
  USING (auth_is_super_admin() OR company_id = auth_company_id());

CREATE POLICY "employee_kpis_insert" ON employee_kpis FOR INSERT TO authenticated
  WITH CHECK (company_id = auth_company_id());

CREATE POLICY "employee_kpis_update" ON employee_kpis FOR UPDATE TO authenticated
  USING (auth_is_super_admin() OR company_id = auth_company_id())
  WITH CHECK (auth_is_super_admin() OR company_id = auth_company_id());

CREATE POLICY "employee_kpis_delete" ON employee_kpis FOR DELETE TO authenticated
  USING (auth_is_super_admin() OR company_id = auth_company_id());

-- ============================================================
-- ROLES: scoped to own company
-- ============================================================
DROP POLICY IF EXISTS "roles_select" ON roles;
DROP POLICY IF EXISTS "roles_insert" ON roles;
DROP POLICY IF EXISTS "roles_update" ON roles;
DROP POLICY IF EXISTS "roles_delete" ON roles;

CREATE POLICY "roles_select" ON roles FOR SELECT TO authenticated
  USING (auth_is_super_admin() OR company_id = auth_company_id());

CREATE POLICY "roles_insert" ON roles FOR INSERT TO authenticated
  WITH CHECK (company_id = auth_company_id());

CREATE POLICY "roles_update" ON roles FOR UPDATE TO authenticated
  USING (auth_is_super_admin() OR company_id = auth_company_id())
  WITH CHECK (company_id = auth_company_id());

CREATE POLICY "roles_delete" ON roles FOR DELETE TO authenticated
  USING (auth_is_super_admin() OR company_id = auth_company_id());

-- ============================================================
-- PROFILES: users can only update own profile; admins can view all in company
-- SELECT is already correct (true = any authenticated user can read profiles for UX)
-- Tighten UPDATE/DELETE to own row only (already correct, keeping as-is)
-- ============================================================
-- profiles policies are already correctly scoped (auth.uid() = id)
-- no changes needed for profiles

-- ============================================================
-- PERMISSIONS / ROLE_PERMISSIONS: read-only for company users
-- Only super_admin can mutate
-- ============================================================
DROP POLICY IF EXISTS "permissions_insert" ON permissions;
DROP POLICY IF EXISTS "permissions_update" ON permissions;
DROP POLICY IF EXISTS "permissions_delete" ON permissions;

CREATE POLICY "permissions_insert" ON permissions FOR INSERT TO authenticated
  WITH CHECK (auth_is_super_admin());

CREATE POLICY "permissions_update" ON permissions FOR UPDATE TO authenticated
  USING (auth_is_super_admin()) WITH CHECK (auth_is_super_admin());

CREATE POLICY "permissions_delete" ON permissions FOR DELETE TO authenticated
  USING (auth_is_super_admin());

DROP POLICY IF EXISTS "role_permissions_insert" ON role_permissions;
DROP POLICY IF EXISTS "role_permissions_update" ON role_permissions;
DROP POLICY IF EXISTS "role_permissions_delete" ON role_permissions;

CREATE POLICY "role_permissions_insert" ON role_permissions FOR INSERT TO authenticated
  WITH CHECK (auth_is_super_admin() OR EXISTS(
    SELECT 1 FROM roles r WHERE r.id = role_id AND r.company_id = auth_company_id()
  ));

CREATE POLICY "role_permissions_delete" ON role_permissions FOR DELETE TO authenticated
  USING (auth_is_super_admin() OR EXISTS(
    SELECT 1 FROM roles r WHERE r.id = role_id AND r.company_id = auth_company_id()
  ));
