-- Migration: Add missing updated_at column to roles table to resolve trigger failure
-- File: 20260709170000_add_updated_at_to_roles.sql

ALTER TABLE public.roles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
