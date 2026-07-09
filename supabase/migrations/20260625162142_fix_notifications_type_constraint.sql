-- Expand notifications.type to match TypeScript types
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type = ANY (ARRAY[
    'lead', 'appointment', 'contract', 'system', 'consultation',
    'new_lead', 'new_appointment', 'contract_expiring', 'new_landlord'
  ]));
