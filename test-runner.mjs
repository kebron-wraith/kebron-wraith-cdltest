// CDL App Automated Test Runner
// Run with: node test-runner.mjs
import { chromium } from 'playwright';
import fs from 'fs';

const BASE = 'http://localhost:8080';
const SCREENSHOTS = './screenshots';
const REPORT = [];

if (!fs.existsSync(SCREENSHOTS)) fs.mkdirSync(SCREENSHOTS, { recursive: true });

function log(msg) {
  console.log(msg);
  REPORT.push(msg);
}

async function screenshot(page, name) {
  const path = `${SCREENSHOTS}/${name}.png`;
  await page.screenshot({ path, fullPage: false });
  log(`  📸 Screenshot: ${path}`);
}

async function login(page, email, password) {
  await page.goto(BASE + '/index.html');
  await page.waitForTimeout(1500);
  await screenshot(page, `login-page`);

  await page.fill('#login-email', email);
  await page.fill('#login-password', password);
  await page.click('#login-btn');
  await page.waitForTimeout(3000);
}

async function testAdmin(page) {
  log('\n=== TESTING: Admin ===');
  await login(page, 'admin@canaan.co.ke', 'admin123');
  await screenshot(page, 'admin-dashboard');

  // Check if login succeeded
  const sidebar = await page.$('#sidebar');
  if (!sidebar) {
    log('  ❌ LOGIN FAILED - no sidebar found');
    const errorEl = await page.$('#login-error');
    if (errorEl) {
      const text = await errorEl.textContent();
      log(`  Error: ${text}`);
    }
    return false;
  }
  log('  ✅ Login successful');

  // Get visible nav items
  const navItems = await page.$$eval('[data-nav-item]', els =>
    els.filter(e => e.offsetParent !== null).map(e => e.textContent.trim())
  );
  log(`  Nav items: ${navItems.join(', ')}`);

  // Test each navigation
  const routes = ['dashboard', 'inventory', 'grn', 'requests', 'transfers', 'procurement', 'incidents', 'reports', 'users', 'audit'];
  for (const route of routes) {
    const btn = await page.$(`#nav-${route}`);
    if (btn && await btn.isVisible()) {
      await btn.click();
      await page.waitForTimeout(1500);
      await screenshot(page, `admin-${route}`);
      // Check for errors
      const errorEl = await page.$('[style*="color:var(--accent-red)"]');
      if (errorEl) {
        const text = await errorEl.textContent();
        log(`  ⚠ ${route} error: ${text.substring(0, 100)}`);
      } else {
        log(`  ✅ ${route} loaded`);
      }
    } else {
      log(`  ⊘ ${route} not visible (role-restricted)`);
    }
  }

  // Test Users section - add a user
  await page.click('#nav-users');
  await page.waitForTimeout(1000);
  const addUserBtn = await page.$('button:has-text("Add User")');
  if (addUserBtn) {
    await addUserBtn.click();
    await page.waitForTimeout(1000);
    await screenshot(page, 'admin-add-user-form');
    await page.click('button:has-text("Cancel")');
    await page.waitForTimeout(500);
    log('  ✅ User form opens');
  }

  // Logout
  await page.click('button:has-text("Sign Out")');
  await page.waitForTimeout(1000);
  log('  ✅ Logout');
  return true;
}

async function testRole(page, email, password, roleName) {
  log(`\n=== TESTING: ${roleName} (${email}) ===`);
  await login(page, email, password);
  await screenshot(page, `${roleName}-dashboard`);

  const sidebar = await page.$('#sidebar');
  if (!sidebar) {
    log(`  ❌ LOGIN FAILED for ${roleName}`);
    return false;
  }
  log(`  ✅ Login successful`);

  const navItems = await page.$$eval('[data-nav-item]', els =>
    els.filter(e => e.offsetParent !== null).map(e => e.textContent.trim())
  );
  log(`  Nav items: ${navItems.join(', ')}`);

  // Navigate to each visible section
  const allRoutes = ['dashboard', 'inventory', 'grn', 'requests', 'transfers', 'procurement', 'incidents', 'reports'];
  for (const route of allRoutes) {
    const btn = await page.$(`#nav-${route}`);
    if (btn && await btn.isVisible()) {
      await btn.click();
      await page.waitForTimeout(1200);
      await screenshot(page, `${roleName}-${route}`);
      const errorEl = await page.$('[style*="color:var(--accent-red)"]');
      if (errorEl) {
        const text = await errorEl.textContent();
        log(`  ⚠ ${route} error: ${text.substring(0, 100)}`);
      } else {
        log(`  ✅ ${route} loaded`);
      }
    }
  }

  // Logout
  await page.click('button:has-text("Sign Out")');
  await page.waitForTimeout(1000);
  return true;
}

async function main() {
  log('🚀 CDL App Test Runner');
  log(`Testing: ${BASE}`);

  const browser = await chromium.launch({ headless: false, slowMs: 200 });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  try {
    // Test if server is reachable
    try {
      await page.goto(BASE + '/setup.html', { timeout: 5000 });
      log('✅ Server is reachable');
      await screenshot(page, 'setup-page');
    } catch (e) {
      log(`❌ Cannot reach server at ${BASE}`);
      log(`Error: ${e.message}`);
      await browser.close();
      process.exit(1);
    }

    // Check if users exist, if not seed them
    const usersRes = await fetch(`${BASE.replace('localhost', 'dljvplrbjogncwrpmfsj.supabase.co')}/rest/v1/users?select=email&limit=1`);
    log(`Users check: ${usersRes.status}`);

    // Test Admin first
    const adminOk = await testRole(page, 'admin@canaan.co.ke', 'admin123', 'admin');

    if (!adminOk) {
      log('\n⚠️ Admin login failed - database may not be seeded!');
      log('Please run supabase/migration_v9.sql in Supabase SQL Editor first.');
      log('Then open http://localhost:8080/setup.html to seed users.');
    } else {
      // Test all other roles
      const roles = [
        ['owner@canaan.co.ke', 'owner123', 'owner'],
        ['ceo@canaan.co.ke', 'ceo123', 'ceo'],
        ['am@canaan.co.ke', 'am123', 'am'],
        ['pm1@canaan.co.ke', 'pm123', 'pm1'],
        ['eng@canaan.co.ke', 'eng123', 'engineer'],
        ['sk.local@canaan.co.ke', 'sk123', 'storekeeper-local'],
        ['sm@canaan.co.ke', 'sm123', 'store-manager'],
        ['finance@canaan.co.ke', 'finance123', 'finance'],
        ['po@canaan.co.ke', 'po123', 'procurement-officer'],
        ['to@canaan.co.ke', 'to123', 'transfer-officer'],
        ['dh@canaan.co.ke', 'dh123', 'data-holder'],
        ['so@canaan.co.ke', 'so123', 'site-overseer'],
      ];

      for (const [email, pw, name] of roles) {
        await testRole(page, email, pw, name);
      }

      // Test material request flow
      log('\n=== TESTING: Material Request Flow ===');

      // 1. Engineer creates request
      await login(page, 'eng@canaan.co.ke', 'eng123');
      await page.waitForTimeout(1000);
      await page.click('#nav-requests');
      await page.waitForTimeout(1000);
      const newReqBtn = await page.$('button:has-text("New Request")');
      if (newReqBtn) {
        await newReqBtn.click();
        await page.waitForTimeout(1000);
        await page.selectOption('#rq-site', '1');
        await page.fill('#rq-material', 'Ordinary Portland Cement 50kg');
        await page.fill('#rq-qty', '25');
        await page.fill('#rq-unit', 'Bags');
        await page.selectOption('#rq-urgency', 'high');
        await page.fill('#rq-purpose', 'Foundation work phase 2');
        await page.click('button:has-text("Submit Request")');
        await page.waitForTimeout(2000);
        await screenshot(page, 'flow-request-created');
        log('  ✅ Engineer created material request');
      }
      await page.click('button:has-text("Sign Out")');
      await page.waitForTimeout(1000);

      // 2. PM1 approves
      await login(page, 'pm1@canaan.co.ke', 'pm123');
      await page.waitForTimeout(1000);
      await page.click('#nav-requests');
      await page.waitForTimeout(1000);
      await screenshot(page, 'flow-pm-view-requests');
      const approveBtn = await page.$('button:has-text("Approve")');
      if (approveBtn) {
        await approveBtn.click();
        await page.waitForTimeout(2000);
        await screenshot(page, 'flow-pm-approved');
        log('  ✅ PM approved request');
      } else {
        log('  ⊘ No pending requests to approve (maybe already approved)');
      }
      await page.click('button:has-text("Sign Out")');
      await page.waitForTimeout(1000);

      // 3. Storekeeper sees issue request
      await login(page, 'sk.local@canaan.co.ke', 'sk123');
      await page.waitForTimeout(1000);
      await screenshot(page, 'flow-sk-dashboard');
      // Check for pending issue requests
      const issueBtn = await page.$('button:has-text("Issue")');
      if (issueBtn) {
        await issueBtn.click();
        await page.waitForTimeout(1000);
        await screenshot(page, 'flow-sk-issue-modal');
        const confirmBtn = await page.$('button:has-text("Confirm Issue")');
        if (confirmBtn) {
          await confirmBtn.click();
          await page.waitForTimeout(2000);
          log('  ✅ Storekeeper issued material');
        } else {
          log('  ⚠ Confirm Issue button disabled (insufficient stock?)');
        }
      } else {
        log('  ⊘ No issue requests visible');
      }
      await page.click('button:has-text("Sign Out")');
      await page.waitForTimeout(1000);
    }

  } catch (err) {
    log(`\n❌ FATAL ERROR: ${err.message}`);
    log(err.stack);
    await screenshot(page, 'fatal-error');
  }

  // Save report
  fs.writeFileSync('test-report.txt', REPORT.join('\n'));
  log(`\n📄 Report saved to test-report.txt`);
  log(`📸 Screenshots saved to ${SCREENSHOTS}/`);

  await browser.close();
  log('\n🏁 Done!');
}

main().catch(e => console.error(e));
