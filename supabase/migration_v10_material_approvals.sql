-- ============================================================
-- CDL Site Management — Migration v10: Material Approval Gate
-- Adds stock.status column, users.position column, material_watchlist table
-- Run this in Supabase SQL Editor AFTER migration_v9.sql
-- ============================================================

-- ============================================================
-- Add `status` column to stock (for approval gate on new materials)
-- ============================================================
ALTER TABLE stock ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'approved'
  CHECK (status IN ('approved','pending'));

-- Backfill existing stock rows as 'approved' (they were pre-existing before this gate)
UPDATE stock SET status = 'approved' WHERE status IS NULL OR status != 'approved';

-- ============================================================
-- Add `position` column to users
-- ============================================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS position TEXT;

-- ============================================================
-- MATERIAL WATCHLIST — new materials proposed by storekeepers
-- ============================================================
CREATE TABLE IF NOT EXISTS material_watchlist (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_name   TEXT NOT NULL,
  material_code   TEXT,
  category        TEXT,
  unit            TEXT,
  site_id         INTEGER REFERENCES sites(id),
  storekeeper_type TEXT CHECK (storekeeper_type IN ('local','imported','scaffolding')),
  proposed_by     UUID REFERENCES users(id),
  status          TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  approved_by     UUID REFERENCES users(id),
  approved_at     TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookup by site + type + name
CREATE INDEX IF NOT EXISTS idx_watchlist_lookup
  ON material_watchlist (site_id, storekeeper_type, material_name, status);

-- Index for pending queue
CREATE INDEX IF NOT EXISTS idx_watchlist_pending
  ON material_watchlist (status, created_at)
  WHERE status = 'pending';

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE material_watchlist ENABLE ROW LEVEL SECURITY;

-- Permissive dev policy (same as other tables)
CREATE POLICY "anon_all" ON material_watchlist FOR ALL USING (true);
