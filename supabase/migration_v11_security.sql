-- ============================================================
-- CDL Site Management — Migration v11: Security Hardening
-- Replaces all "anon_all" permissive policies with role-based RLS
-- using auth.uid() to identify the authenticated user.
--
-- Prerequisites: Phase 2 (Supabase Auth JWT migration) must be complete.
-- All client API calls must use the Supabase client SDK which attaches
-- the JWT bearer token automatically. Without JWT, auth.uid() returns NULL
-- and no rows will be returned — security by default-deny.
--
-- Run this SQL in Supabase SQL Editor AFTER migration_v9.sql + migration_v10.sql
-- ============================================================

-- ============================================================
-- Helper function: return user's site_ids array
-- ============================================================
-- Falls back to '{}' so site scoping works safely for all roles.
CREATE OR REPLACE FUNCTION public.user_site_ids(uid UUID DEFAULT auth.uid())
RETURNS INTEGER[] LANGUAGE sql STABLE AS $$
  SELECT COALESCE((SELECT site_ids FROM users WHERE id = uid AND is_active = true), '{}');
$$;

-- ============================================================
-- Helper function: return user's role
-- ============================================================
CREATE OR REPLACE FUNCTION public.user_role(uid UUID DEFAULT auth.uid())
RETURNS TEXT LANGUAGE sql STABLE AS $$
  SELECT role FROM users WHERE id = uid AND is_active = true;
$$;

-- ============================================================
-- Helper function: return user's storekeeper_type
-- ============================================================
CREATE OR REPLACE FUNCTION public.user_sk_type(uid UUID DEFAULT auth.uid())
RETURNS TEXT LANGUAGE sql STABLE AS $$
  SELECT storekeeper_type FROM users WHERE id = uid AND is_active = true;
$$;

-- ============================================================
-- 1. SITES
-- ============================================================
-- Roles with admin/all scope can see all sites.
-- Everyone can read site list (needed for UI dropdowns).
DROP POLICY IF EXISTS "anon_all" ON sites;

CREATE POLICY "public_read_sites" ON sites
  FOR SELECT USING (true);

CREATE POLICY "site_managers_full_sites" ON sites
  FOR ALL USING (
    (public.user_role() IN ('admin', 'company_owner', 'asset_manager', 'ceo'))
  ) WITH CHECK (
    public.user_role() IN ('admin', 'company_owner', 'asset_manager', 'ceo')
  );

-- ============================================================
-- 2. USERS
-- ============================================================
-- Admin and Company Owner can manage users.
-- Users can read their own record.
-- CEO and Asset Manager are READ-ONLY on users (cannot create/edit).
DROP POLICY IF EXISTS "anon_all" ON users;

CREATE POLICY "users_read_own" ON users
  FOR SELECT USING (id = auth.uid() OR public.user_role() IN ('admin', 'company_owner'));

CREATE POLICY "users_write_admin_only" ON users
  FOR INSERT WITH CHECK (public.user_role() = 'admin');

CREATE POLICY "users_update_admin_only" ON users
  FOR UPDATE USING (
    id = auth.uid() AND public.user_role() IN ('admin', 'project_manager')
    OR public.user_role() = 'admin'
  ) WITH CHECK (
    public.user_role() = 'admin'
  );

CREATE POLICY "users_delete_admin_only" ON users
  FOR DELETE USING (public.user_role() = 'admin');

-- ============================================================
-- 3. STOCK
-- ============================================================
-- Storekeepers see only their type + assigned sites.
-- Project managers / Site Overseer see assigned sites only.
-- CEO, Company Owner, Asset Manager, Admin, Finance, Office Manager see all.
-- No INSERT/UPDATE/DELETE for finance (HARD BLOCK), CEO/Company Owner/AM are
-- read-only on stock.
DROP POLICY IF EXISTS "anon_all" ON stock;

-- SELECT
CREATE POLICY "stock_read_by_role" ON stock
  FOR SELECT USING (
    public.user_role() IN ('admin', 'ceo', 'company_owner', 'asset_manager', 'finance', 'office_manager')
    OR (
      public.user_role() IN ('project_manager', 'engineer', 'supervisor')
      AND site_id = ANY(public.user_site_ids())
    )
    OR (
      public.user_role() IN ('storekeeper_local', 'storekeeper_import', 'storekeeper_scaffolding')
      AND storekeeper_type = public.user_sk_type()
      AND site_id = ANY(public.user_site_ids())
    )
    OR (
      public.user_role() = 'store_manager'
      AND site_id = ANY(public.user_site_ids())
    )
    OR (
      public.user_role() = 'site_overseer'
      AND site_id = ANY(public.user_site_ids())
    )
  );

-- INSERT — only active inventory roles can add stock
CREATE POLICY "stock_insert_by_role" ON stock
  FOR INSERT WITH CHECK (
    public.user_role() IN ('admin', 'store_manager', 'storekeeper_local', 'storekeeper_import', 'storekeeper_scaffolding')
    AND (
      public.user_role() = 'storekeeper_local' OR public.user_role() = 'storekeeper_import' OR public.user_role() = 'storekeeper_scaffolding'
      OR site_id = ANY(public.user_site_ids())
    )
  );

-- UPDATE — only storekeepers + store_manager + admin (NOT finance, NOT executives)
CREATE POLICY "stock_update_by_role" ON stock
  FOR UPDATE USING (
    public.user_role() IN ('admin', 'store_manager')
    OR (
      public.user_role() IN ('storekeeper_local', 'storekeeper_import', 'storekeeper_scaffolding')
      AND storekeeper_type = public.user_sk_type()
      AND site_id = ANY(public.user_site_ids())
    )
  ) WITH CHECK (
    public.user_role() IN ('admin', 'store_manager')
    OR (
      public.user_role() IN ('storekeeper_local', 'storekeeper_import', 'storekeeper_scaffolding')
      AND storekeeper_type = public.user_sk_type()
      AND site_id = ANY(public.user_site_ids())
    )
  );

-- DELETE — admin and store_manager only
CREATE POLICY "stock_delete_by_role" ON stock
  FOR DELETE USING (
    public.user_role() IN ('admin', 'store_manager')
    OR (
      public.user_role() IN ('storekeeper_local', 'storekeeper_import', 'storekeeper_scaffolding')
      AND storekeeper_type = public.user_sk_type()
      AND site_id = ANY(public.user_site_ids())
    )
  );

-- ============================================================
-- 4. GRNS (Goods Received Notes)
-- ============================================================
-- Storekeepers submit GRNs; store_manager + data_holder verify.
-- READ: all active users can see GRNs within their scope.
-- WRITE: only storekeepers (assigned sites) and store_manager.
DROP POLICY IF EXISTS "anon_all" ON grns;

CREATE POLICY "grns_read_by_scope" ON grns
  FOR SELECT USING (
    public.user_role() IN ('admin', 'ceo', 'company_owner', 'asset_manager', 'finance', 'office_manager', 'site_overseer')
    OR site_id = ANY(public.user_site_ids())
  );

CREATE POLICY "grns_insert_storekeepers" ON grns
  FOR INSERT WITH CHECK (
    public.user_role() IN ('storekeeper_local', 'storekeeper_import', 'storekeeper_scaffolding', 'store_manager', 'data_holder', 'admin')
    AND (
      public.user_role() IN ('storekeeper_local', 'storekeeper_import', 'storekeeper_scaffolding')
      AND storekeeper_type = public.user_sk_type()
      OR site_id = ANY(public.user_site_ids())
    )
  );

CREATE POLICY "grns_update_by_role" ON grns
  FOR UPDATE USING (
    public.user_role() IN ('admin', 'store_manager', 'data_holder')
    OR (
      public.user_role() IN ('storekeeper_local', 'storekeeper_import', 'storekeeper_scaffolding')
      AND storekeeper_type = public.user_sk_type()
      AND site_id = ANY(public.user_site_ids())
    )
  ) WITH CHECK (
    public.user_role() IN ('admin', 'store_manager', 'data_holder')
    OR (
      public.user_role() IN ('storekeeper_local', 'storekeeper_import', 'storekeeper_scaffolding')
      AND storekeeper_type = public.user_sk_type()
      AND site_id = ANY(public.user_site_ids())
    )
  );

CREATE POLICY "grns_delete_admin_only" ON grns
  FOR DELETE USING (public.user_role() = 'admin');

-- ============================================================
-- 5. MATERIAL REQUESTS
-- ============================================================
-- Executives (CEO, Company Owner, Asset Manager) are READ-ONLY.
-- They can view but NOT create/approve/issue/material requests.
-- Project Managers create + approve within their assigned sites.
-- Engineers and Supervisors create requests.
-- Storekeepers and finance CANNOT access material_requests.
DROP POLICY IF EXISTS "anon_all" ON material_requests;

CREATE POLICY "requests_read_by_role" ON material_requests
  FOR SELECT USING (
    public.user_role() IN ('admin', 'ceo', 'company_owner', 'asset_manager', 'finance', 'office_manager', 'site_overseer', 'procurement_officer', 'transfer_officer', 'data_holder')
    OR (
      public.user_role() IN ('project_manager', 'engineer', 'supervisor')
      AND site_id = ANY(public.user_site_ids())
    )
    OR (
      public.user_role() = 'project_manager'
      AND requested_by = auth.uid()
    )
  );

CREATE POLICY "requests_insert_non_executive" ON material_requests
  FOR INSERT WITH CHECK (
    public.user_role() IN ('project_manager', 'engineer', 'supervisor', 'store_manager', 'admin')
    AND (
      public.user_role() IN ('engineer', 'supervisor')
      OR site_id = ANY(public.user_site_ids())
    )
  );

CREATE POLICY "requests_update_by_role" ON material_requests
  FOR UPDATE USING (
    (public.user_role() = 'project_manager' AND site_id = ANY(public.user_site_ids()) AND status IN ('pending', 'pm_approved'))
    OR public.user_role() = 'admin'
    OR public.user_role() IN ('store_manager', 'storekeeper_local', 'storekeeper_import', 'storekeeper_scaffolding')
  ) WITH CHECK (
    (public.user_role() = 'project_manager' AND site_id = ANY(public.user_site_ids()))
    OR public.user_role() = 'admin'
    OR public.user_role() IN ('store_manager', 'storekeeper_local', 'storekeeper_import', 'storekeeper_scaffolding')
  );

CREATE POLICY "requests_delete_admin_only" ON material_requests
  FOR DELETE USING (public.user_role() = 'admin');

-- ============================================================
-- 6. TRANSFERS
-- ============================================================
-- Asset Manager can approve transfers (canApproveTransfers: true).
-- Project Managers initiate + approve at source/dest.
-- Transfer Officers handle pickup/delivery.
-- Executives (CEO, Company Owner) READ-ONLY.
DROP POLICY IF EXISTS "anon_all" ON transfers;

CREATE POLICY "transfers_read_by_role" ON transfers
  FOR SELECT USING (
    public.user_role() IN ('admin', 'ceo', 'company_owner', 'asset_manager', 'finance', 'office_manager', 'site_overseer', 'procurement_officer', 'transfer_officer', 'data_holder')
    OR from_site_id = ANY(public.user_site_ids())
    OR to_site_id = ANY(public.user_site_ids())
  );

CREATE POLICY "transfers_insert_by_role" ON transfers
  FOR INSERT WITH CHECK (
    public.user_role() IN ('admin', 'project_manager', 'asset_manager', 'transfer_officer')
    AND (
      public.user_role() IN ('admin', 'asset_manager', 'transfer_officer')
      OR from_site_id = ANY(public.user_site_ids())
      OR to_site_id = ANY(public.user_site_ids())
    )
  );

CREATE POLICY "transfers_update_by_role" ON transfers
  FOR UPDATE USING (
    public.user_role() IN ('admin', 'asset_manager', 'project_manager', 'transfer_officer')
  ) WITH CHECK (
    public.user_role() IN ('admin', 'asset_manager', 'project_manager', 'transfer_officer')
  );

CREATE POLICY "transfers_delete_admin_only" ON transfers
  FOR DELETE USING (public.user_role() = 'admin');

-- ============================================================
-- 7. PROCUREMENT
-- ============================================================
-- Asset Manager + Company Owner + CEO approve procurement (read-only execs).
-- Procurement Officer acts on am_approved items.
-- Project Managers submit procurement requests.
-- Executives can read but NOT modify procurement records.
DROP POLICY IF EXISTS "anon_all" ON procurement;

CREATE POLICY "procurement_read_by_role" ON procurement
  FOR SELECT USING (
    public.user_role() IN ('admin', 'ceo', 'company_owner', 'asset_manager', 'finance', 'office_manager', 'site_overseer', 'procurement_officer', 'transfer_officer', 'data_holder')
    OR site_id = ANY(public.user_site_ids())
  );

CREATE POLICY "procurement_insert_non_executive" ON procurement
  FOR INSERT WITH CHECK (
    public.user_role() IN ('admin', 'project_manager', 'procurement_officer')
    AND (
      public.user_role() = 'procurement_officer'
      OR site_id = ANY(public.user_site_ids())
    )
  );

CREATE POLICY "procurement_update_by_role" ON procurement
  FOR UPDATE USING (
    public.user_role() IN ('admin', 'asset_manager', 'company_owner', 'ceo')
    OR (public.user_role() = 'project_manager' AND site_id = ANY(public.user_site_ids()))
    OR public.user_role() = 'procurement_officer'
  ) WITH CHECK (
    public.user_role() IN ('admin', 'asset_manager', 'company_owner', 'ceo')
    OR (public.user_role() = 'project_manager' AND site_id = ANY(public.user_site_ids()))
    OR public.user_role() = 'procurement_officer'
  );

CREATE POLICY "procurement_delete_admin_only" ON procurement
  FOR DELETE USING (public.user_role() = 'admin');

-- ============================================================
-- 8. INCIDENTS
-- ============================================================
-- Engineers, PMs, Storekeepers, Project Managers can report incidents.
-- PMs and Admin resolve incidents.
-- Executives READ-ONLY.
DROP POLICY IF EXISTS "anon_all" ON incidents;

CREATE POLICY "incidents_read_by_role" ON incidents
  FOR SELECT USING (
    public.user_role() IN ('admin', 'ceo', 'company_owner', 'asset_manager', 'finance', 'office_manager', 'site_overseer', 'procurement_officer', 'transfer_officer', 'data_holder')
    OR site_id = ANY(public.user_site_ids())
    OR reported_by = auth.uid()
  );

CREATE POLICY "incidents_insert_by_role" ON incidents
  FOR INSERT WITH CHECK (
    public.user_role() IN ('admin', 'project_manager', 'engineer', 'supervisor', 'storekeeper_local', 'storekeeper_import', 'storekeeper_scaffolding', 'site_overseer', 'data_holder')
    AND (
      public.user_role() IN ('engineer', 'supervisor', 'storekeeper_local', 'storekeeper_import', 'storekeeper_scaffolding')
      OR site_id = ANY(public.user_site_ids())
    )
  );

CREATE POLICY "incidents_update_resolvers" ON incidents
  FOR UPDATE USING (
    public.user_role() IN ('admin', 'project_manager', 'asset_manager')
    OR (public.user_role() = 'site_overseer' AND site_id = ANY(public.user_site_ids()))
  ) WITH CHECK (
    public.user_role() IN ('admin', 'project_manager', 'asset_manager')
    OR (public.user_role() = 'site_overseer' AND site_id = ANY(public.user_site_ids()))
  );

CREATE POLICY "incidents_delete_admin_only" ON incidents
  FOR DELETE USING (public.user_role() = 'admin');

-- ============================================================
-- 9. MATERIAL WATCHLIST
-- ============================================================
-- Storekeepers submit new material proposals.
-- Store Manager + Admin approve/reject.
-- Executives READ-ONLY.
DROP POLICY IF EXISTS "anon_all" ON material_watchlist;

CREATE POLICY "watchlist_read_by_role" ON material_watchlist
  FOR SELECT USING (
    public.user_role() IN ('admin', 'store_manager', 'ceo', 'company_owner', 'asset_manager', 'site_overseer')
    OR site_id = ANY(public.user_site_ids())
  );

CREATE POLICY "watchlist_insert_storekeepers" ON material_watchlist
  FOR INSERT WITH CHECK (
    public.user_role() IN ('storekeeper_local', 'storekeeper_import', 'storekeeper_scaffolding')
    AND storekeeper_type = public.user_sk_type()
    AND site_id = ANY(public.user_site_ids())
  );

CREATE POLICY "watchlist_update_approvers" ON material_watchlist
  FOR UPDATE USING (
    public.user_role() IN ('admin', 'store_manager')
  ) WITH CHECK (
    public.user_role() IN ('admin', 'store_manager')
  );

CREATE POLICY "watchlist_delete_admin_only" ON material_watchlist
  FOR DELETE USING (public.user_role() = 'admin');

-- ============================================================
-- 10. AUDIT LOG
-- ============================================================
-- Append-only. Users can read audit for their own actions or all sites.
-- Executives can read all audit entries.
DROP POLICY IF EXISTS "anon_all" ON audit_log;

CREATE POLICY "audit_read_by_scope" ON audit_log
  FOR SELECT USING (
    public.user_role() IN ('admin', 'ceo', 'company_owner', 'asset_manager', 'finance', 'office_manager')
    OR actor_id = auth.uid()
    OR (
      public.user_role() IN ('project_manager', 'storekeeper_local', 'storekeeper_import', 'storekeeper_scaffolding')
      AND EXISTS (
        SELECT 1 FROM material_requests mr
        WHERE mr.site_id = ANY(public.user_site_ids())
        AND mr.id = audit_log.record_id
      )
    )
  );

-- Audit log is write-protected — only the app service or triggers can write
CREATE POLICY "audit_no_direct_insert" ON audit_log
  FOR INSERT WITH CHECK (false);

CREATE POLICY "audit_no_direct_update" ON audit_log
  FOR UPDATE USING (false);

CREATE POLICY "audit_no_direct_delete" ON audit_log
  FOR DELETE USING (false);

-- ============================================================
-- 11. NOTIFICATIONS
-- ============================================================
-- Users read their own notifications.
-- Admin reads all.
DROP POLICY IF EXISTS "anon_all" ON notifications;

CREATE POLICY "notif_read_own_or_admin" ON notifications
  FOR SELECT USING (
    user_id = auth.uid()
    OR public.user_role() = 'admin'
  );

CREATE POLICY "notif_insert_by_role" ON notifications
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    OR public.user_role() = 'admin'
  );

CREATE POLICY "notif_update_own" ON notifications
  FOR UPDATE USING (
    user_id = auth.uid()
  ) WITH CHECK (
    user_id = auth.uid()
  );

CREATE POLICY "notif_delete_own_or_admin" ON notifications
  FOR DELETE USING (
    user_id = auth.uid()
    OR public.user_role() = 'admin'
  );

-- ============================================================
-- 12. AGENT CHAT HISTORY
-- ============================================================
-- Users read their own chat history only.
-- Admin can read all (for support/debug).
DROP POLICY IF EXISTS "anon_all" ON agent_chat_history;

CREATE POLICY "chat_read_own_or_admin" ON agent_chat_history
  FOR SELECT USING (
    user_id = auth.uid()
    OR public.user_role() = 'admin'
  );

CREATE POLICY "chat_insert_own" ON agent_chat_history
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
  );

CREATE POLICY "chat_update_own" ON agent_chat_history
  FOR UPDATE USING (
    user_id = auth.uid()
  ) WITH CHECK (
    user_id = auth.uid()
  );

CREATE POLICY "chat_delete_own_or_admin" ON agent_chat_history
  FOR DELETE USING (
    user_id = auth.uid()
    OR public.user_role() = 'admin'
  );

-- ============================================================
-- SECURITY NOTES
-- ============================================================
-- All RLS policies are now active. No "anon_all" policies remain.
-- auth.uid() returns the authenticated user's UUID from the JWT.
-- If no valid JWT is present, auth.uid() returns NULL, and all
-- SELECT policies return no rows — default deny by design.
--
-- Executive roles (ceo, company_owner, asset_manager) have explicit
-- INSERT/UPDATE/DELETE denial on material_requests, transfers, stock,
-- procurement, and incidents. They are read-only + AI advisor only.
--
-- Finance has canEditInventory: false enforced both client-side (roles.js)
-- and server-side (no INSERT/UPDATE/DELETE policies on stock for finance).
-- ============================================================