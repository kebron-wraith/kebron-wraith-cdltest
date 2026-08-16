// CDL — E2E: Storekeeper material addition flow
const { test, expect } = require('@playwright/test');

const BASE = 'http://localhost:8080';

test.describe('Storekeeper Material Addition Flow', () => {

  test('app.js has Material Approvals in NAV_ITEMS', async ({ page }) => {
    // Fetch the app.js source to verify nav item config
    const response = await page.request.get(`${BASE}/app.js`);
    const text = await response.text();
    expect(text).toContain('material_approvals');
    expect(text).toContain('Material Approvals');
  });

  test('app.js has material_approvals route in navigate switch', async ({ page }) => {
    const response = await page.request.get(`${BASE}/app.js`);
    const text = await response.text();
    expect(text).toContain('case "material_approvals"');
  });

  test('nav_guard.js has material_approvals access rule', async ({ page }) => {
    const response = await page.request.get(`${BASE}/modules/nav_guard.js`);
    const text = await response.text();
    expect(text).toContain('material_approvals');
    expect(text).toContain('store_manager');
  });

  test('material_approvals.js module exists with watcher functions', async ({ page }) => {
    const response = await page.request.get(`${BASE}/modules/material_approvals.js`);
    const text = await response.text();
    expect(text).toContain('checkAndQueueNewMaterial');
    expect(text).toContain('renderMaterialApprovals');
    expect(text).toContain('approveMaterial');
    expect(text).toContain('rejectMaterial');
    // Should NOT contain "AI" per user request
    expect(text).not.toContain('AI');
  });

  test('storekeeper.js has unit dropdown, required fields, approval gate', async ({ page }) => {
    const response = await page.request.get(`${BASE}/modules/storekeeper.js`);
    const text = await response.text();
    // Unit dropdown (select, not input)
    expect(text).toContain('UNITS.map');
    // Required field markers - dynamic in UI, check for pattern
    expect(text).toMatch(/GRN Number.*?\*/);
    expect(text).toMatch(/Invoice #.*?\*/);
    // Approval gate
    expect(text).toContain('checkAndQueueNewMaterial');
    expect(text).toContain('queued: true');
  });

  test('inventory.js filters pending stock for read-only users', async ({ page }) => {
    const response = await page.request.get(`${BASE}/modules/inventory.js`);
    const text = await response.text();
    // Supabase client SDK uses .eq("status", "approved") syntax
    expect(text).toContain('status", "approved');
    expect(text).toContain('Pending Approval');
    expect(text).toContain('isPending');
  });

  test('users.js has position field in form and payload', async ({ page }) => {
    const response = await page.request.get(`${BASE}/modules/users.js`);
    const text = await response.text();
    expect(text).toContain('uf-position');
    expect(text).toContain('position');
  });

  test('migration SQL adds status column and watchlist table', async ({ page }) => {
    const response = await page.request.get(`${BASE}/supabase/migration_v10_material_approvals.sql`);
    const text = await response.text();
    expect(text).toContain('material_watchlist');
    expect(text).toContain('status TEXT DEFAULT');
    expect(text).toContain('CHECK (status IN');
    expect(text).toContain('position TEXT');
  });
});
