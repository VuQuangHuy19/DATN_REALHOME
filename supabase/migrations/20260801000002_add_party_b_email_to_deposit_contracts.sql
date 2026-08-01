-- Migration: Add party_b_email to deposit_contracts
-- File: 20260801000002_add_party_b_email_to_deposit_contracts.sql

ALTER TABLE public.deposit_contracts
ADD COLUMN IF NOT EXISTS party_b_email TEXT;
