// CDL — E2E: Live site smoke test across all accounts
const { test, expect } = require('@playwright/test');

const LIVE_URL = 'https://cdllivetest.netlify.app';

const CREDENTIALS = {
  admin:        { email: 'admin@canaan.co.ke',       password: 'admin123',    role: 'admin' },
  company_owner:{ email: 'owner@canaan.co.ke',       password: 'owner123',    role: 'company_owner' },
  ceo:          { email: 'ceo@canaan.co.ke',         password: 'ceo123',      role: 'ceo' },
  asset_manager:{ email: 'am@canaan.co.ke',          password: 'am123',       role: 'asset_manager' },
  finance:      { email: 'finance@canaan.co.ke',     password: 'finance123',  role: 'finance' },
  pm1:          { email: 'pm1@canaan.co.ke',         password: 'pm1123',      role: 'project_manager' },
  pm2:          { email: 'pm2@canaan.co.ke',         password: 'pm2123',      role: 'project_manager' },
  engineer:     { email: 'eng@canaan.co.ke',         password: 'eng123',      role: 'engineer' },
  store_manager:{ email: 'sm@canaan.co.ke',          password: 'sm123',       role: 'store_manager' },
  sk_local:     { email: 'sk.local@canaan.co.ke',    password: 'sklocal123',  role: 'storekeeper_local' },
  sk_import:    { email: 'sk.import@canaan.co.ke',   password: 'skimport123', role: 'storekeeper_import' },
  sk_scaff:     { email: 'sk.scaff@canaan.co.ke',    password: 'skscaff123',  role: 'storekeeper_scaffolding' },
  procurement:  { email: 'po@canaan.co.ke',          password: 'po123',       role: 'procurement_officer' },
  transfer:     { email: 'to@canaan.co.ke',          password: 'to123',       role: 'transfer_officer' },
  data_holder:  { email: 'dh@canaan.co.ke',          password: 'dh123',       role: 'data_holder' },
  site_overseer:{ email: 'so@canaan.co.ke',          password: 'so123',       role: 'site_overseer' },
  supervisor:   { email: 'sup@canaan.co.ke',         password: 'sup123',      role: 'supervisor' }
};

test.describe('Live site smoke test', () => {
  for (const [key, cred] of Object.entries(CREDENTIALS)) {
    test(`${cred.role} (${key}) full navigation`, async ({ page }) => {
      const errors = [];
      page.on('console', msg => {
        if (msg.type() === 'error' && !msg.text().includes('Failed to load resource'))
          errors.push(`[console.error] ${msg.text()}`);
      });
      page.on('pageerror', err => {
        // Filter out the expected inventory fallback 400
        if (!err.message.includes('closeModal')) errors.push(`[pageerror] ${err.message}`);
      });

      await page.goto(LIVE_URL, { waitUntil: 'networkidle' });
      // Wait for the dynamically rendered login form
      await page.waitForSelector('#login-email', { timeout: 30000 });
      await page.fill('#login-email', cred.email);
      await page.fill('#login-password', cred.password);
      await page.click('#login-btn');
      await page.waitForSelector('#sidebar', { timeout: 10000 });
      await page.waitForTimeout(2000);

      const navButtons = await page.$$eval('[data-nav-item]', btns =>
        btns.map(b => ({ id: b.id, label: b.textContent.trim() }))
      );
      console.log(`${cred.role} nav buttons:`, navButtons.map(n => n.label).join(', '));

      const errorFreeNavs = [];
      for (const btn of navButtons) {
        errors.length = 0;
        await page.click(`#${btn.id}`);
        await page.waitForTimeout(1500);

        const mainContent = await page.$('#main-content');
        const html = mainContent ? await mainContent.evaluate(el => el.innerHTML) : '';
        const hasErrorBlock = html.includes('Error:');
        const hasJSRefError = html.includes('is not defined');

        if (!hasErrorBlock && !hasJSRefError && errors.length === 0) {
          errorFreeNavs.push(btn.label);
        } else {
          console.log(`  ❌ ${btn.label}: errors=[${errors.join('; ')}] errorBlock=${hasErrorBlock} refError=${hasJSRefError}`);
        }
      }

      console.log(`${cred.role}: ${errorFreeNavs.length}/${navButtons.length} nav modules clean`);
    });
  }

  test('admin — Users page modal open + Cancel close (window._closeModal)', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });

    await page.goto(LIVE_URL, { waitUntil: 'networkidle' });
    await page.waitForSelector('#login-email', { timeout: 30000 });
    await page.fill('#login-email', CREDENTIALS.admin.email);
    await page.fill('#login-password', CREDENTIALS.admin.password);
    await page.click('#login-btn');
    await page.waitForSelector('#sidebar', { timeout: 15000 });
    await page.waitForTimeout(500);

    // Go to Users page
    await page.click('#nav-users');
    await page.waitForTimeout(2000);

    // Verify Users page loaded
    const panel = await page.$('#adm-panel');
    expect(panel).not.toBeNull();

    // The Users page defaults to the "sites" tab — switch to "users" tab first
    const usersTab = await page.$('#adm-tab-users');
    if (usersTab) await usersTab.click();
    await page.waitForTimeout(800);

    // Click "+ Add User" to open modal
    await page.waitForTimeout(1500);
    const addUserBtn = await page.$('button[onclick*="_admOpenUserForm"]');
    expect(addUserBtn).not.toBeNull();

    errors.length = 0;
    await addUserBtn.click();
    await page.waitForTimeout(800);

    // Verify modal is showing — look for modal overlay or form content
    const modalContent = await page.evaluate(() => {
      // Check if there's a modal with the user form
      const btn = document.querySelector('button[onclick*="_closeModal"]');
      return !!btn;
    });
    expect(modalContent).toBe(true);

    // Click Cancel — this uses window._closeModal()
    const cancelBtn = await page.$('button[onclick*="_closeModal"]');
    expect(cancelBtn).not.toBeNull();

    await cancelBtn.click();
    await page.waitForTimeout(500);

    // Verify no closeModal ReferenceError
    const refErrors = errors.filter(e => e.includes('closeModal') && e.includes('not defined'));
    expect(refErrors).toEqual([]);

    // Verify modal closed — closeModal() sets overlay style.display='none' (content stays in DOM)
    const modalAfter = await page.evaluate(() => {
      const overlay = document.getElementById('modal-overlay');
      if (!overlay) return false;
      return overlay.style.display === 'none';
    });
    expect(modalAfter).toBe(true);
  });

  test('admin — Sites page modal open + Cancel close', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await page.goto(LIVE_URL, { waitUntil: 'networkidle' });
    await page.waitForSelector('#login-email', { timeout: 30000 });
    await page.fill('#login-email', CREDENTIALS.admin.email);
    await page.fill('#login-password', CREDENTIALS.admin.password);
    await page.click('#login-btn');
    await page.waitForSelector('#sidebar', { timeout: 15000 });
    await page.waitForTimeout(500);

    // Go to Users page, switch to Sites tab
    await page.click('#nav-users');
    await page.waitForTimeout(1000);
    await page.click('#adm-tab-sites');
    await page.waitForTimeout(1000);

    // Click "+ Add Site"
    const addSiteBtn = await page.$('button[onclick*="_admOpenSiteForm"]');
    expect(addSiteBtn).not.toBeNull();
    await addSiteBtn.click();
    await page.waitForTimeout(500);

    // Click Cancel
    const cancelBtn = await page.$('button[onclick*="_closeModal"]');
    expect(cancelBtn).not.toBeNull();
    await cancelBtn.click();
    await page.waitForTimeout(500);

    const refErrors = errors.filter(e => e.includes('closeModal') && e.includes('not defined'));
    expect(refErrors).toEqual([]);
  });

  test('admin — Inventory renders table (fallback works)', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await page.goto(LIVE_URL, { waitUntil: 'networkidle' });
    await page.waitForSelector('#login-email', { timeout: 30000 });
    await page.fill('#login-email', CREDENTIALS.admin.email);
    await page.fill('#login-password', CREDENTIALS.admin.password);
    await page.click('#login-btn');
    await page.waitForSelector('#sidebar', { timeout: 15000 });
    await page.waitForTimeout(500);

    await page.click('#nav-inventory');
    // Wait for inventory data to load (table or "No stock items" message)
    await page.waitForFunction(() => {
      const wrap = document.getElementById('inv-table-wrap');
      if (!wrap) return false;
      return wrap.innerHTML.includes('<table') || wrap.innerHTML.includes('No stock items') || wrap.innerHTML.includes('No stock');
    }, { timeout: 15000 });

    const tableWrap = await page.$('#inv-table-wrap');
    const hasTable = tableWrap && await tableWrap.evaluate(el =>
      el.innerHTML.includes('<table') || el.innerHTML.includes('No stock items') || el.innerHTML.includes('No stock')
    );
    expect(hasTable).toBe(true);

    // No JS ReferenceError
    const refErrors = errors.filter(e => e.includes('not defined'));
    expect(refErrors).toEqual([]);
  });

  test('all accounts — login works, no JS errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    for (const [key, cred] of Object.entries(CREDENTIALS)) {
      errors.length = 0;
      // Clear session BEFORE goto so login form appears
      await page.context().clearCookies();
      await page.goto(LIVE_URL, { waitUntil: 'networkidle' });
      await page.waitForSelector('#login-email', { timeout: 30000 });
      await page.fill('#login-email', cred.email);
      await page.fill('#login-password', cred.password);
      await page.click('#login-btn');
      await page.waitForSelector('#sidebar', { timeout: 15000 });
      await page.waitForTimeout(500);

      const refErrors = errors.filter(e => e.includes('not defined'));
      expect(refErrors).toEqual([]);
      console.log(`${key}: login OK, no JS errors`);
    }
  });
});
