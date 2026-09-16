-- Knightly Database Schema Migration

CREATE TABLE IF NOT EXISTS public.students (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  major TEXT NOT NULL,
  class_year TEXT NOT NULL,
  residence_hall TEXT NOT NULL,
  room TEXT NOT NULL,
  advisor TEXT NOT NULL,
  meal_plan TEXT NOT NULL,
  swipes_remaining INTEGER NOT NULL DEFAULT 0,
  dining_dollars NUMERIC(8, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.clubs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  members_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
