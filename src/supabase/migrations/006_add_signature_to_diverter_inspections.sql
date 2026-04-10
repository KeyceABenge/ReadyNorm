-- Add signature_data column to diverter_inspections
-- Run this in the Supabase SQL Editor.

ALTER TABLE diverter_inspections
  ADD COLUMN IF NOT EXISTS signature_data TEXT;
