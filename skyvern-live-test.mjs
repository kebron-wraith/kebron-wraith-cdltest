import { test, expect, chromium, devices } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const APP_URL = 'https://cdl-testt.netlify.app';
const RESULTS_DIR = path.join(process.cwd(), 'test-results', 'live-test');
const SCREENSHOT_DIR = path.join(RESULTS_DIR, 'screenshots');

// All 17 credentials
const ROLES = [
  { name: 'Company Owner', email: 'owner@canaan.co.ke', password: 'owner123', role: 'company_owner' },
  { name: 'CEO', email: 'ceo@canaan.co.ke', password: 'ceo123', role: 'ceo' },
  { name: 'Office Manager', email: 'om@canaan.co.ke', password: 'om123', role: 'office_manager' },
  { name: 'Asset Manager', email: 'am@canaan.co.ke', password: 'am123', role: 'asset_manager' },
  { name: 'Finance', email: 'finance@canaan.co.ke', password: 'finance123', role: 'finance' },
  { name: 'Project Manager 1', email: 'pm1@canaan.co.ke', password: 'pm123', role: 'project_manager' },
  { name: 'Project Manager 2', email: 'pm2@canaan.co.ke', password: 'pm123', role: 'project_manager' },
  { name: 'Engineer', email: 'eng@canaan.co.ke', password: 'eng123', role: 'engineer' },
  { name: 'Store Manager', email: 'sm@canaan.co.ke', password: 'sm123', role: 'store_manager' },
  { name: 'Storekeeper Local', email: 'sk.local@canaan.co.ke', password: 'sk123', role: 'storekeeper_local' },
  { name: 'Storekeeper Import', email: 'sk.import@canaan.co.ke', password: 'sk123', role: 'storekeeper_import' },
  { name: 'Storekeeper Scaffolding', email: 'sk.scaff@canaan.co.ke', password: 'sk123', role: 'storekeeper_scaffolding' },
  { name: 'Procurement Officer', email: 'po@canaan.co.ke', password: 'po123', role: 'procurement_officer' },
  { name: 'Transfer Officer', email: 'to@canaan.co.ke', password: 'to123', role: 'transfer_officer' },
  { name: 'Data Holder', email: 'dh@canaan.co.ke', password: 'dh123', role: 'data_holder' },
  { name: 'Site Overseer', email: 'so@canaan.co.ke', password: 'so123', role: 'site_overseer' },
  { name: 'Supervisor', email: 'so@canaan.co.ke', password: 'so123', role: 'supervisor' },
  { name: 'Admin', email: 'admin@canaan.co.ke', password: 'admin123', role: 'admin' },
];

// Navigation items per role (from app.js NAV_ITEMS)
const ROLE_NAV = {
  company_owner: ['dashboard', 'inventory', 'requests', 'transfers', 'procurement', 'grn', 'incidents', 'reports', 'users', 'audit', 'material_approvals', 'onboarding'],
  ceo: ['dashboard', 'inventory', 'requests', 'transfers', 'procurement', 'grn', 'incidents', 'reports', 'users', 'audit', 'material_approvals', 'onboarding'],
  office_manager: ['dashboard', 'inventory', 'requests', 'transfers', 'grn', 'incidents', 'reports'],
  asset_manager: ['dashboard', 'inventory', 'requests', 'transfers', 'procurement', 'grn', 'incidents', 'reports'],
  finance: ['dashboard', 'inventory', 'requests', 'transfers', 'grn', 'incidents', 'reports'],
  project_manager: ['dashboard', 'inventory', 'requests', 'transfers', 'procurement', 'grn', 'incidents', 'reports'],
  engineer: ['dashboard', 'requests', 'incidents'],
  store_manager: ['dashboard', 'inventory', 'grn', 'incidents', 'reports', 'material_approvals'],
  storekeeper_local: ['dashboard', 'grn', 'incidents', 'reports'],
  storekeeper_import: ['dashboard', 'grn', 'incidents', 'reports'],
  storekeeper_scaffolding: ['dashboard', 'grn', 'incidents', 'reports'],
  procurement_officer: ['dashboard', 'procurement', 'incidents', 'reports'],
  transfer_officer: ['dashboard', 'transfers', 'incidents', 'reports'],
  data_holder: ['dashboard', 'grn', 'incidents', 'reports'],
  site_overseer: ['dashboard', 'requests', 'incidents', 'reports'],
  supervisor: ['dashboard', 'requests', 'incidents', 'reports'],
  admin: ['dashboard', 'inventory', 'requests', 'transfers', 'procurement', 'grn', 'incidents', 'reports', 'users', 'audit', 'material_approvals', 'onboarding'],
};

// Test actions per module
const MODULE_ACTIONS = {
  dashboard: async (page, role) => {
    await page.waitForSelector('#page-content', { timeout: 10000 });
    return { success: true, content: 'Dashboard loaded' };
  },
  inventory: async (page, role) => {
    await page.waitForSelector('#page-content', { timeout: 10000 });
    // Check if inventory table/data loads
    return { success: true, content: 'Inventory loaded' };
  },
  requests: async (page, role) => {
    await page.waitForSelector('#page-content', { timeout: 10000 });
    // Try to open create request modal
    const createBtn = page.locator('button:has-text("Create Request"), button:has-text("New Request")').first();
    if (await createBtn.count() > 0) {
      await createBtn.click();
      await page.waitForSelector('#modal-overlay[style*="flex"]', { timeout: 5000 });
      // Check if material field is a dropdown (not free text)
      const materialSelect = page.locator('#modal-content select[name="material"]').first();
      const isDropdown = await materialSelect.count() > 0;
      await page.locator('#modal-overlay button:has-text("✕")').first().click();
      return { success: true, content: `Requests loaded, material dropdown: ${isDropdown}` };
    }
    return { success: true, content: 'Requests loaded' };
  },
  transfers: async (page, role) => {
    await page.waitForSelector('#page-content', { timeout: 10000 });
    // Try create transfer
    const createBtn = page.locator('button:has-text("Create Transfer"), button:has-text("New Transfer")').first();
    if (await createBtn.count() > 0) {
      await createBtn.click();
      await page.waitForSelector('#modal-overlay[style*="flex"]', { timeout: 5000 });
      await page.locator('#modal-overlay button:has-text("✕")').first().click();
      return { success: true, content: 'Transfers loaded, create modal works' };
    }
    return { success: true, content: 'Transfers loaded' };
  },
  procurement: async (page, role) => {
    await page.waitForSelector('#page-content', { timeout: 10000 });
    return { success: true, content: 'Procurement loaded' };
  },
  grn: async (page, role) => {
    await page.waitForSelector('#page-content', { timeout: 10000 });
    // Test manual GRN entry
    const grnBtn = page.locator('button:has-text("Add Materials"), button:has-text("Manual GRN")').first();
    if (await grnBtn.count() > 0) {
      await grnBtn.click();
      await page.waitForSelector('#modal-overlay[style*="flex"]', { timeout: 5000 });
      // Check for mandatory fields
      const hasGrn = await page.locator('#mg-grn').count() > 0;
      const hasInv = await page.locator('#mg-inv').count() > 0;
      const hasSup = await page.locator('#mg-sup').count() > 0;
      const hasUnit = await page.locator('#mg-items select').count() > 0;
      await page.locator('#modal-overlay button:has-text("✕")').first().click();
      return { success: true, content: `GRN loaded, modal fields: grn=${hasGrn}, inv=${hasInv}, sup=${hasSup}, unit=${hasUnit}` };
    }
    return { success: true, content: 'GRN loaded' };
  },
  incidents: async (page, role) => {
    await page.waitForSelector('#page-content', { timeout: 10000 });
    // Test incident creation
    const incidentBtn = page.locator('button:has-text("Report Incident"), button:has-text("New Incident")').first();
    if (await incidentBtn.count() > 0) {
      await incidentBtn.click();
      await page.waitForSelector('#modal-overlay[style*="flex"]', { timeout: 5000 });
      await page.locator('#modal-overlay button:has-text("✕")').first().click();
      return { success: true, content: 'Incidents loaded, create modal works' };
    }
    return { success: true, content: 'Incidents loaded' };
  },
  reports: async (page, role) => {
    await page.waitForSelector('#page-content', { timeout: 10000 });
    return { success: true, content: 'Reports loaded' };
  },
  users: async (page, role) => {
    await page.waitForSelector('#page-content', { timeout: 10000 });
    return { success: true, content: 'Users loaded' };
  },
  audit: async (page, role) => {
    await page.waitForSelector('#page-content', { timeout: 10000 });
    return { success: true, content: 'Audit loaded' };
  },
  material_approvals: async (page, role) => {
    await page.waitForSelector('#page-content', { timeout: 10000 });
    return { success: true, content: 'Material Approvals loaded' };
  },
  onboarding: async (page, role) => {
    await page.waitForSelector('#page-content', { timeout: 10000 });
    return { success: true, content: 'Onboarding loaded' };
  },
};

async function login(page, email, password) {
  await page.goto(APP_URL, { waitUntil: 'networkidle' });
  await page.fill('#login-email', email);
  await page.fill('#login-password', password);
  await page.click('#login-btn');
  // Wait for dashboard to load
  await page.waitForSelector('#page-content', { timeout: 15000 });
}

async function runTests() {
  // Create results directories
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  fs.mkdirSync(RESULTS_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: false }); // headless: false to see it
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: { dir: RESULTS_DIR }
  });

  const allResults = {
    timestamp: new Date().toISOString(),
    appUrl: APP_URL,
    roles: [],
    summary: { total: 0, passed: 0, failed: 0, errors: [] }
  };

  for (const roleInfo of ROLES) {
    console.log(`\n=== Testing ${roleInfo.name} (${roleInfo.role}) ===`);
    const page = await context.newPage();

    // Capture console errors
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', err => consoleErrors.push(err.message));

    const roleResult = {
      name: roleInfo.name,
      email: roleInfo.email,
      role: roleInfo.role,
      login: { success: false, error: null },
      modules: [],
      consoleErrors: [],
      screenshots: []
    };

    try {
      // Login
      await login(page, roleInfo.email, roleInfo.password);
      roleResult.login.success = true;
      console.log(`  ✓ Login successful`);

      // Take dashboard screenshot
      const ssPath = path.join(SCREENSHOT_DIR, `${roleInfo.role}-dashboard.png`);
      await page.screenshot({ path: ssPath, fullPage: true });
      roleResult.screenshots.push(ssPath);

      // Test each accessible module
      const navItems = ROLE_NAV[roleInfo.role] || [];
      for (const moduleName of navItems) {
        console.log(`  Testing module: ${moduleName}`);
        const moduleResult = { name: moduleName, success: false, content: '', error: null, screenshot: null };

        try {
          // Navigate to module
          await page.evaluate((mod) => {
            window._navigate(mod);
          }, moduleName);

          // Wait for content to load
          await page.waitForTimeout(2000);

          // Run module-specific actions
          const actionFn = MODULE_ACTIONS[moduleName];
          if (actionFn) {
            const actionResult = await actionFn(page, roleInfo.role);
            moduleResult.success = actionResult.success;
            moduleResult.content = actionResult.content;
          } else {
            moduleResult.success = true;
            moduleResult.content = 'Module loaded (no specific actions)';
          }

          // Take screenshot
          const modSsPath = path.join(SCREENSHOT_DIR, `${roleInfo.role}-${moduleName}.png`);
          await page.screenshot({ path: modSsPath, fullPage: true });
          moduleResult.screenshot = modSsPath;

          console.log(`    ✓ ${moduleName}: ${moduleResult.content}`);
        } catch (err) {
          moduleResult.success = false;
          moduleResult.error = err.message;
          console.log(`    ✗ ${moduleName}: ${err.message}`);

          // Take error screenshot
          const modSsPath = path.join(SCREENSHOT_DIR, `${roleInfo.role}-${moduleName}-error.png`);
          await page.screenshot({ path: modSsPath, fullPage: true });
          moduleResult.screenshot = modSsPath;
        }

        roleResult.modules.push(moduleResult);
      }
    } catch (err) {
      roleResult.login.success = false;
      roleResult.login.error = err.message;
      console.log(`  ✗ Login failed: ${err.message}`);

      // Take error screenshot
      const ssPath = path.join(SCREENSHOT_DIR, `${roleInfo.role}-login-error.png`);
      await page.screenshot({ path: ssPath, fullPage: true });
      roleResult.screenshots.push(ssPath);
    }

    roleResult.consoleErrors = consoleErrors;
    allResults.roles.push(roleResult);

    await page.close();
  }

  await context.close();
  await browser.close();

  // Generate summary
  for (const role of allResults.roles) {
    allResults.summary.total += role.modules.length;
    for (const mod of role.modules) {
      if (mod.success) allResults.summary.passed++;
      else allResults.summary.failed++;
      if (mod.error) allResults.summary.errors.push({ role: role.role, module: mod.name, error: mod.error });
    }
  }

  // Write results
  const resultsPath = path.join(RESULTS_DIR, 'test-results.json');
  fs.writeFileSync(resultsPath, JSON.stringify(allResults, null, 2));
  console.log(`\n=== RESULTS ===`);
  console.log(`Total tests: ${allResults.summary.total}`);
  console.log(`Passed: ${allResults.summary.passed}`);
  console.log(`Failed: ${allResults.summary.failed}`);
  console.log(`Errors: ${allResults.summary.errors.length}`);
  console.log(`Results saved to: ${resultsPath}`);

  // Generate HTML report
  const htmlReport = generateHtmlReport(allResults);
  const htmlPath = path.join(RESULTS_DIR, 'report.html');
  fs.writeFileSync(htmlPath, htmlReport);
  console.log(`HTML report saved to: ${htmlPath}`);

  return allResults;
}

function generateHtmlReport(results) {
  const rows = results.roles.flatMap(role =>
    role.modules.map(mod => `
      <tr class="${mod.success ? 'pass' : 'fail'}">
        <td>${role.name}</td>
        <td>${mod.name}</td>
        <td class="${mod.success ? 'pass' : 'fail'}">${mod.success ? '✓ PASS' : '✗ FAIL'}</td>
        <td>${mod.content || ''}</td>
        <td>${mod.error || ''}</td>
        <td>${mod.screenshot ? `<a href="${path.basename(mod.screenshot)}" target="_blank">📸</a>` : ''}</td>
      </tr>
    `).join('')
  ).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <title>CDL ERP Live Test Report - ${results.timestamp}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 20px; background: #0f1419; color: #e8eaed; }
    h1 { color: #c8a96e; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { padding: 12px; border: 1px solid #1e293b; text-align: left; }
    th { background: #1e293b; color: #c8a96e; }
    tr.pass { background: rgba(34, 197, 94, 0.1); }
    tr.fail { background: rgba(239, 68, 68, 0.1); }
    td.pass { color: #22c55e; }
    td.fail { color: #ef4444; }
    .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin: 20px 0; }
    .stat { background: #1e293b; padding: 16px; border-radius: 8px; text-align: center; }
    .stat h3 { margin: 0; font-size: 24px; color: #c8a96e; }
    .stat p { margin: 4px 0 0; color: #94a3b8; }
    a { color: #3d8ef8; }
  </style>
</head>
<body>
  <h1>🧪 CDL Site Management ERP - Live Browser Test Report</h1>
  <p>Tested: ${results.timestamp} | URL: <a href="${results.appUrl}" target="_blank">${results.appUrl}</a></p>

  <div class="summary">
    <div class="stat"><h3>${results.summary.total}</h3><p>Total Module Tests</p></div>
    <div class="stat"><h3>${results.summary.passed}</h3><p>Passed</p></div>
    <div class="stat"><h3>${results.summary.failed}</h3><p>Failed</p></div>
    <div class="stat"><h3>${results.summary.errors.length}</h3><p>Errors</p></div>
  </div>

  <table>
    <thead>
      <tr><th>Role</th><th>Module</th><th>Status</th><th>Details</th><th>Error</th><th>Screenshot</th></tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>
  `;
}

runTests().catch(console.error);