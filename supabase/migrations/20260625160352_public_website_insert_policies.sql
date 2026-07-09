-- Allow anonymous inserts from public website forms
CREATE POLICY "public_insert_consultations" ON consultations FOR INSERT
  TO anon, authenticated WITH CHECK (true);

CREATE POLICY "public_insert_leads" ON leads FOR INSERT
  TO anon, authenticated WITH CHECK (true);

CREATE POLICY "public_insert_lead_activities" ON lead_activities FOR INSERT
  TO anon, authenticated WITH CHECK (true);
