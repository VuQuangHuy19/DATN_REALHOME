const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const sql = `
-- Migration to add avatar_url, landlord_id, and code to managers table
ALTER TABLE managers ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE managers ADD COLUMN IF NOT EXISTS landlord_id uuid REFERENCES landlords(id) ON DELETE SET NULL;
ALTER TABLE managers ADD COLUMN IF NOT EXISTS code text;

-- Add index on landlord_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_managers_landlord_id ON managers(landlord_id);

-- Add index on code
CREATE INDEX IF NOT EXISTS idx_managers_code ON managers(code);
`;

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  await client.connect();
  console.log('Connected to DB. Running migration...');
  try {
    await client.query(sql);
    console.log('Migration completed successfully.');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await client.end();
  }
}

run();
