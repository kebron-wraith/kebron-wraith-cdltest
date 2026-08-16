-- ============================================================
-- CDL Site Management — Supabase Migration v9.0
-- Run this in Supabase SQL Editor (one shot)
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- SITES
-- ============================================================
CREATE TABLE IF NOT EXISTS sites (
  id        SERIAL PRIMARY KEY,
  name      TEXT NOT NULL,
  type      TEXT CHECK (type IN ('residential','commercial','warehouse')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO sites (id, name, type) VALUES
  (1,  'Aura Peponi',               'residential'),
  (2,  'Aura Riverside',            'residential'),
  (3,  'Miotoni (Karen)',           'residential'),
  (4,  'SBC',                       'residential'),
  (5,  'EL-Signature',              'residential'),
  (6,  'OKAS',                      'residential'),
  (7,  'Altura (Upper Hill)',       'commercial'),
  (8,  'Whispering Oaks (Karen)',   'residential'),
  (9,  'Enchanting Oaks',           'residential'),
  (10, 'Nyari',                     'residential'),
  (11, 'Central Store (GRS/Mlolongo)', 'warehouse')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  role          TEXT NOT NULL,
  site_ids      INTEGER[],
  storekeeper_type TEXT,           -- 'local' | 'imported' | 'scaffolding' (for storekeeper roles)
  is_active     BOOLEAN DEFAULT true,
  last_login    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- STOCK
-- ============================================================
CREATE TABLE IF NOT EXISTS stock (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id                INTEGER REFERENCES sites(id),
  material_code          TEXT,
  material_name          TEXT NOT NULL,
  category               TEXT,
  department             TEXT,
  quantity               NUMERIC DEFAULT 0,
  reserved_quantity      NUMERIC DEFAULT 0,
  unit                   TEXT,
  unit_price             NUMERIC,
  storekeeper_type       TEXT CHECK (storekeeper_type IN ('local','imported','scaffolding')),
  opening_balance_locked BOOLEAN DEFAULT false,
  opening_balance_value  NUMERIC,
  last_updated           TIMESTAMPTZ DEFAULT now(),
  updated_by             UUID REFERENCES users(id),
  UNIQUE (site_id, material_name, storekeeper_type)
);

-- ============================================================
-- GRNs (Goods Received Notes)
-- ============================================================
CREATE TABLE IF NOT EXISTS grns (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id          INTEGER REFERENCES sites(id),
  grn_number       TEXT,
  invoice_number   TEXT,
  delivery_note    TEXT,
  supplier         TEXT,
  reference_type   TEXT CHECK (reference_type IN ('delivery_note','invoice','grn_hardcopy')),
  items            JSONB,
  total_value      NUMERIC,
  received_by      UUID REFERENCES users(id),
  verified_by      UUID REFERENCES users(id),
  verified_at      TIMESTAMPTZ,
  storekeeper_type TEXT CHECK (storekeeper_type IN ('local','imported','scaffolding')),
  status           TEXT DEFAULT 'pending' CHECK (status IN ('pending','verified','disputed')),
  photo_urls       TEXT[],
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- MATERIAL REQUESTS
-- ============================================================
CREATE TABLE IF NOT EXISTS material_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id         INTEGER REFERENCES sites(id),
  requested_by    UUID REFERENCES users(id),
  material_name   TEXT NOT NULL,
  material_code   TEXT,
  quantity        NUMERIC NOT NULL,
  unit            TEXT,
  purpose         TEXT,
  urgency         TEXT DEFAULT 'normal' CHECK (urgency IN ('low','normal','high','critical')),
  status          TEXT DEFAULT 'pending' CHECK (
                    status IN ('pending','pm_approved','pm_rejected','reserved',
                               'issued','collected','expired','returned','cancelled')
                  ),
  pm_approved_by  UUID REFERENCES users(id),
  pm_approved_at  TIMESTAMPTZ,
  issued_by       UUID REFERENCES users(id),
  issued_at       TIMESTAMPTZ,
  collected_at    TIMESTAMPTZ,
  expiry_at       TIMESTAMPTZ,
  return_qty      NUMERIC,
  return_reason   TEXT,
  return_condition TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- TRANSFERS
-- ============================================================
CREATE TABLE IF NOT EXISTS transfers (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_site_id        INTEGER REFERENCES sites(id),
  to_site_id          INTEGER REFERENCES sites(id),
  items               JSONB NOT NULL,
  status              TEXT DEFAULT 'pending' CHECK (
                        status IN (
                          'pending','source_pm_approved','dest_pm_approved',
                          'am_approved','preparing','picked_up','in_transit',
                          'delivered','received','completed','rejected','expired'
                        )
                      ),
  step_log            JSONB DEFAULT '[]',
  transfer_officer_id UUID REFERENCES users(id),
  pickup_signature    TEXT,
  delivery_signature  TEXT,
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT now(),
  completed_at        TIMESTAMPTZ
);

-- ============================================================
-- PROCUREMENT
-- ============================================================
CREATE TABLE IF NOT EXISTS procurement (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id        INTEGER REFERENCES sites(id),
  requested_by   UUID REFERENCES users(id),
  items          JSONB NOT NULL,
  status         TEXT DEFAULT 'pending' CHECK (
                   status IN (
                     'pending','pm_approved','am_approved',
                     'finance_approved','processing','ordered',
                     'delivered','cancelled','rejected'
                   )
                 ),
  approval_chain JSONB DEFAULT '[]',
  total_amount   NUMERIC,
  supplier       TEXT,
  quote_urls     TEXT[],
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- INCIDENTS (Damage / Theft / Missing)
-- ============================================================
CREATE TABLE IF NOT EXISTS incidents (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id              INTEGER REFERENCES sites(id),
  reported_by          UUID REFERENCES users(id),
  type                 TEXT CHECK (type IN ('missing','stolen','broken','damaged','expired','wasted')),
  material_name        TEXT NOT NULL,
  material_code        TEXT,
  quantity             NUMERIC,
  estimated_value      NUMERIC,
  evidence_urls        TEXT[],
  reason               TEXT,
  personnel_involved   TEXT[],
  pm_decision          TEXT CHECK (
                         pm_decision IN (
                           'payable','negligence','operational_loss',
                           'insurance','investigating','cleared'
                         )
                       ),
  pm_notes             TEXT,
  pm_resolved_at       TIMESTAMPTZ,
  status               TEXT DEFAULT 'pending' CHECK (status IN ('pending','under_review','resolved','escalated')),
  created_at           TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- AUDIT LOG (immutable — never delete rows)
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id     UUID REFERENCES users(id),
  actor_name   TEXT,
  actor_role   TEXT,
  action       TEXT NOT NULL,
  module       TEXT,
  record_id    UUID,
  before_value JSONB,
  after_value  JSONB,
  reason       TEXT,
  session_id   TEXT,
  timestamp    TIMESTAMPTZ DEFAULT now()
);

-- Prevent deletions on audit_log
CREATE RULE no_delete_audit AS ON DELETE TO audit_log DO INSTEAD NOTHING;
CREATE RULE no_update_audit AS ON UPDATE TO audit_log DO INSTEAD NOTHING;

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES users(id),
  title      TEXT NOT NULL,
  body       TEXT,
  type       TEXT,
  ref_id     UUID,
  ref_table  TEXT,
  is_read    BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- AGENT CHAT HISTORY
-- ============================================================
CREATE TABLE IF NOT EXISTS agent_chat_history (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES users(id),
  agent_type TEXT DEFAULT 'main',
  messages   JSONB DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- ROW LEVEL SECURITY (enable per table)
-- ============================================================
ALTER TABLE sites               ENABLE ROW LEVEL SECURITY;
ALTER TABLE users               ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock               ENABLE ROW LEVEL SECURITY;
ALTER TABLE grns                ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_requests   ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfers           ENABLE ROW LEVEL SECURITY;
ALTER TABLE procurement         ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents           ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log           ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications       ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_chat_history  ENABLE ROW LEVEL SECURITY;

-- NOTE: RLS policies must be implemented in the app layer.
-- For initial dev, create permissive policies and tighten in Phase 13.
-- Example permissive policy (replace with proper role-based policies):
CREATE POLICY "anon_all" ON sites FOR ALL USING (true);
CREATE POLICY "anon_all" ON users FOR ALL USING (true);
CREATE POLICY "anon_all" ON stock FOR ALL USING (true);
CREATE POLICY "anon_all" ON grns FOR ALL USING (true);
CREATE POLICY "anon_all" ON material_requests FOR ALL USING (true);
CREATE POLICY "anon_all" ON transfers FOR ALL USING (true);
CREATE POLICY "anon_all" ON procurement FOR ALL USING (true);
CREATE POLICY "anon_all" ON incidents FOR ALL USING (true);
CREATE POLICY "anon_all" ON audit_log FOR ALL USING (true);
CREATE POLICY "anon_all" ON notifications FOR ALL USING (true);
CREATE POLICY "anon_all" ON agent_chat_history FOR ALL USING (true);

-- ============================================================
-- REAL-TIME (enable for live notifications)
-- ============================================================
-- Enable in Supabase Dashboard → Database → Replication
-- Tables to enable: notifications, material_requests, transfers, grns

-- ============================================================
-- DONE
-- ============================================================
-- Run this SQL once in Supabase SQL Editor.
-- Then open the app, go to Settings, paste your Supabase URL + anon key.
