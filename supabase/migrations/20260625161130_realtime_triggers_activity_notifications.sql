-- ============================================================
-- ACTIVITY LOG TRIGGERS
-- Auto-create activity_log rows on CREATE/UPDATE/DELETE for:
-- leads, buildings, rooms, contracts, appointments
-- ============================================================

-- Helper: entity label extractors per table
CREATE OR REPLACE FUNCTION log_leads_activity() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO activity_logs (company_id, user_id, user_name, action, entity, entity_id, entity_label, detail)
    VALUES (NEW.company_id, NULL, 'System', 'CREATE', 'leads', NEW.id::text, NEW.full_name, 'Lead mới: ' || NEW.full_name || ' (' || NEW.phone || ')');
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO activity_logs (company_id, user_id, user_name, action, entity, entity_id, entity_label, detail)
    VALUES (NEW.company_id, NULL, 'System', 'UPDATE', 'leads', NEW.id::text, NEW.full_name,
      CASE WHEN OLD.status IS DISTINCT FROM NEW.status
        THEN 'Trạng thái: ' || COALESCE(OLD.status,'?') || ' → ' || NEW.status
        ELSE 'Cập nhật thông tin lead'
      END);
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO activity_logs (company_id, user_id, user_name, action, entity, entity_id, entity_label, detail)
    VALUES (OLD.company_id, NULL, 'System', 'DELETE', 'leads', OLD.id::text, OLD.full_name, 'Xóa lead: ' || OLD.full_name);
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_leads_activity ON leads;
CREATE TRIGGER trg_leads_activity
  AFTER INSERT OR UPDATE OR DELETE ON leads
  FOR EACH ROW EXECUTE FUNCTION log_leads_activity();

-- Buildings
CREATE OR REPLACE FUNCTION log_buildings_activity() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO activity_logs (company_id, user_id, user_name, action, entity, entity_id, entity_label, detail)
    VALUES (NEW.company_id, NULL, 'System', 'CREATE', 'buildings', NEW.id::text, NEW.name, 'Tòa nhà mới: ' || NEW.name || ' - ' || NEW.area);
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO activity_logs (company_id, user_id, user_name, action, entity, entity_id, entity_label, detail)
    VALUES (NEW.company_id, NULL, 'System', 'UPDATE', 'buildings', NEW.id::text, NEW.name, 'Cập nhật tòa nhà: ' || NEW.name);
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO activity_logs (company_id, user_id, user_name, action, entity, entity_id, entity_label, detail)
    VALUES (OLD.company_id, NULL, 'System', 'DELETE', 'buildings', OLD.id::text, OLD.name, 'Xóa tòa nhà: ' || OLD.name);
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_buildings_activity ON buildings;
CREATE TRIGGER trg_buildings_activity
  AFTER INSERT OR UPDATE OR DELETE ON buildings
  FOR EACH ROW EXECUTE FUNCTION log_buildings_activity();

-- Rooms
CREATE OR REPLACE FUNCTION log_rooms_activity() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO activity_logs (company_id, user_id, user_name, action, entity, entity_id, entity_label, detail)
    VALUES (NEW.company_id, NULL, 'System', 'CREATE', 'rooms', NEW.id::text, NEW.code, 'Phòng mới: ' || NEW.code || ' (' || NEW.room_type || ')');
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO activity_logs (company_id, user_id, user_name, action, entity, entity_id, entity_label, detail)
    VALUES (NEW.company_id, NULL, 'System', 'UPDATE', 'rooms', NEW.id::text, NEW.code,
      CASE WHEN OLD.status IS DISTINCT FROM NEW.status
        THEN 'Trạng thái phòng ' || NEW.code || ': ' || COALESCE(OLD.status,'?') || ' → ' || NEW.status
        ELSE 'Cập nhật phòng: ' || NEW.code
      END);
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO activity_logs (company_id, user_id, user_name, action, entity, entity_id, entity_label, detail)
    VALUES (OLD.company_id, NULL, 'System', 'DELETE', 'rooms', OLD.id::text, OLD.code, 'Xóa phòng: ' || OLD.code);
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_rooms_activity ON rooms;
CREATE TRIGGER trg_rooms_activity
  AFTER INSERT OR UPDATE OR DELETE ON rooms
  FOR EACH ROW EXECUTE FUNCTION log_rooms_activity();

-- Contracts (contract_templates table)
CREATE OR REPLACE FUNCTION log_contracts_activity() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO activity_logs (company_id, user_id, user_name, action, entity, entity_id, entity_label, detail)
    VALUES (NEW.company_id, NULL, 'System', 'CREATE', 'contracts', NEW.id::text, NEW.name, 'Hợp đồng mới: ' || NEW.name);
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO activity_logs (company_id, user_id, user_name, action, entity, entity_id, entity_label, detail)
    VALUES (NEW.company_id, NULL, 'System', 'UPDATE', 'contracts', NEW.id::text, NEW.name, 'Cập nhật hợp đồng: ' || NEW.name);
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO activity_logs (company_id, user_id, user_name, action, entity, entity_id, entity_label, detail)
    VALUES (OLD.company_id, NULL, 'System', 'DELETE', 'contracts', OLD.id::text, OLD.name, 'Xóa hợp đồng: ' || OLD.name);
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_contracts_activity ON contract_templates;
CREATE TRIGGER trg_contracts_activity
  AFTER INSERT OR UPDATE OR DELETE ON contract_templates
  FOR EACH ROW EXECUTE FUNCTION log_contracts_activity();

-- Appointments
CREATE OR REPLACE FUNCTION log_appointments_activity() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO activity_logs (company_id, user_id, user_name, action, entity, entity_id, entity_label, detail)
    VALUES (NEW.company_id, NULL, 'System', 'CREATE', 'appointments', NEW.id::text, NEW.customer_name, 'Lịch hẹn mới: ' || NEW.customer_name || ' - ' || NEW.date || ' ' || NEW.time);
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO activity_logs (company_id, user_id, user_name, action, entity, entity_id, entity_label, detail)
    VALUES (NEW.company_id, NULL, 'System', 'UPDATE', 'appointments', NEW.id::text, NEW.customer_name,
      CASE WHEN OLD.status IS DISTINCT FROM NEW.status
        THEN 'Lịch hẹn ' || NEW.customer_name || ': ' || COALESCE(OLD.status,'?') || ' → ' || NEW.status
        ELSE 'Cập nhật lịch hẹn: ' || NEW.customer_name
      END);
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO activity_logs (company_id, user_id, user_name, action, entity, entity_id, entity_label, detail)
    VALUES (OLD.company_id, NULL, 'System', 'DELETE', 'appointments', OLD.id::text, OLD.customer_name, 'Xóa lịch hẹn: ' || OLD.customer_name);
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_appointments_activity ON appointments;
CREATE TRIGGER trg_appointments_activity
  AFTER INSERT OR UPDATE OR DELETE ON appointments
  FOR EACH ROW EXECUTE FUNCTION log_appointments_activity();

-- ============================================================
-- NOTIFICATION TRIGGERS
-- Auto-create notifications on:
--   leads INSERT → new_lead notification
--   leads UPDATE (assigned_to changes) → lead_assigned notification
--   appointments INSERT → new_appointment notification
--   contract_templates INSERT → contract notification
-- ============================================================

-- Lead Created
CREATE OR REPLACE FUNCTION notify_new_lead() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO notifications (company_id, title, body, type, is_read, recipient_id, link)
  VALUES (
    NEW.company_id,
    'Lead mới: ' || NEW.full_name,
    'Số điện thoại: ' || NEW.phone || COALESCE(', Quan tâm: ' || NEW.interest, ''),
    'new_lead',
    false,
    NEW.assigned_to,
    '/admin/customers/leads'
  );
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_new_lead ON leads;
CREATE TRIGGER trg_notify_new_lead
  AFTER INSERT ON leads
  FOR EACH ROW EXECUTE FUNCTION notify_new_lead();

-- Lead Assigned (assigned_to changed)
CREATE OR REPLACE FUNCTION notify_lead_assigned() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.assigned_to IS NOT NULL AND (OLD.assigned_to IS NULL OR OLD.assigned_to IS DISTINCT FROM NEW.assigned_to) THEN
    INSERT INTO notifications (company_id, title, body, type, is_read, recipient_id, link)
    VALUES (
      NEW.company_id,
      'Lead được phân công: ' || NEW.full_name,
      'Bạn được phân công xử lý lead từ ' || NEW.full_name || ' (' || NEW.phone || ')',
      'lead',
      false,
      NEW.assigned_to,
      '/admin/customers/leads'
    );
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_lead_assigned ON leads;
CREATE TRIGGER trg_notify_lead_assigned
  AFTER UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION notify_lead_assigned();

-- Appointment Created
CREATE OR REPLACE FUNCTION notify_new_appointment() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO notifications (company_id, title, body, type, is_read, recipient_id, link)
  VALUES (
    NEW.company_id,
    'Lịch hẹn mới: ' || NEW.customer_name,
    'Khách ' || NEW.customer_name || ' đặt lịch xem phòng ' || COALESCE(NEW.room_title, '') || ' vào ' || NEW.date || ' ' || NEW.time,
    'new_appointment',
    false,
    NEW.assigned_to,
    '/admin/customers/appointments'
  );
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_new_appointment ON appointments;
CREATE TRIGGER trg_notify_new_appointment
  AFTER INSERT ON appointments
  FOR EACH ROW EXECUTE FUNCTION notify_new_appointment();

-- Contract Created
CREATE OR REPLACE FUNCTION notify_new_contract() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO notifications (company_id, title, body, type, is_read, recipient_id, link)
  VALUES (
    NEW.company_id,
    'Hợp đồng mới: ' || NEW.name,
    'Mẫu hợp đồng mới đã được tạo: ' || NEW.name,
    'contract',
    false,
    NULL,
    '/admin/contracts'
  );
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_new_contract ON contract_templates;
CREATE TRIGGER trg_notify_new_contract
  AFTER INSERT ON contract_templates
  FOR EACH ROW EXECUTE FUNCTION notify_new_contract();

-- ============================================================
-- RLS: Allow activity_logs and notifications SELECT for authenticated users
-- Enable realtime publication for both tables
-- ============================================================

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any to avoid conflicts
DROP POLICY IF EXISTS "select_company_activity_logs" ON activity_logs;
DROP POLICY IF EXISTS "insert_activity_logs" ON activity_logs;
DROP POLICY IF EXISTS "select_own_notifications" ON notifications;
DROP POLICY IF EXISTS "update_own_notifications" ON notifications;
DROP POLICY IF EXISTS "public_insert_notifications" ON notifications;

CREATE POLICY "select_company_activity_logs" ON activity_logs FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "insert_activity_logs" ON activity_logs FOR INSERT
  TO authenticated, anon WITH CHECK (true);

CREATE POLICY "select_own_notifications" ON notifications FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "update_own_notifications" ON notifications FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "public_insert_notifications" ON notifications FOR INSERT
  TO authenticated, anon WITH CHECK (true);
