-- Update appointments table insertion policy to allow public/anonymous visitor bookings
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_insert_appointments" ON appointments;
DROP POLICY IF EXISTS "Allow anon and authenticated to insert appointments" ON appointments;

CREATE POLICY "Allow anon and authenticated to insert appointments" 
ON appointments FOR INSERT 
TO anon, authenticated 
WITH CHECK (true);
