-- Migration: Add deposit_terms to buildings and rooms tables
-- File: supabase/migrations/20260709180000_add_deposit_terms_to_buildings_and_rooms.sql

ALTER TABLE public.buildings
ADD COLUMN IF NOT EXISTS deposit_terms text;

ALTER TABLE public.rooms
ADD COLUMN IF NOT EXISTS deposit_terms text;
