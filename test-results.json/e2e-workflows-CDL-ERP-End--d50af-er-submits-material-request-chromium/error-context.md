# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e-workflows.spec.js >> CDL ERP End-to-End Workflows >> Workflow 1: Material Request Flow >> Engineer submits material request
- Location: tests\e2e-workflows.spec.js:32:5

# Error details

```
TimeoutError: page.waitForSelector: Timeout 30000ms exceeded.
Call log:
  - waiting for locator('#login-email') to be visible

```

# Test source

```ts
  1   | // CDL ERP — End-to-End Workflow Tests
  2   | // Live site: https://cdl-testt.netlify.app
  3   | // Tests actual workflow completion with real data
  4   | 
  5   | const { test, expect } = require('@playwright/test');
  6   | 
  7   | const LIVE_URL = 'https://cdl-testt.netlify.app';
  8   | 
  9   | // Production test credentials - use test accounts
  10  | const CREDENTIALS = {
  11  |   admin: { email: 'admin@canaan.co.ke', password: 'admin123', role: 'admin' },
  12  |   store_manager: { email: 'sm@canaan.co.ke', password: 'sm123', role: 'store_manager' },
  13  |   project_manager: { email: 'pm1@canaan.co.ke', password: 'pm123', role: 'project_manager' },
  14  |   storekeeper_local: { email: 'sk.local@canaan.co.ke', password: 'sk123', role: 'storekeeper_local' },
  15  |   engineer: { email: 'eng@canaan.co.ke', password: 'eng123', role: 'engineer' },
  16  |   ceo: { email: 'ceo@canaan.co.ke', password: 'ceo123', role: 'ceo' },
  17  |   company_owner: { email: 'owner@canaan.co.ke', password: 'owner123', role: 'company_owner' },
  18  | };
  19  | 
  20  | // Test data
  21  | const TEST_SITE = { id: 1, name: 'Site Nairobi' };
  22  | const TEST_MATERIAL = { name: 'Cement 50kg Bag', code: 'CEM-50KG', category: 'Building Materials' };
  23  | 
  24  | test.describe('CDL ERP End-to-End Workflows', () => {
  25  | 
  26  |   // ─────────────────────────────────────────────────────────────────
  27  |   // WORKFLOW 1: Material Request Flow
  28  |   // requester (Engineer) → PM approves → Storekeeper issues → requester confirms
  29  |   // ─────────────────────────────────────────────────────────────────
  30  |   test.describe('Workflow 1: Material Request Flow', () => {
  31  | 
  32  |     test('Engineer submits material request', async ({ page }) => {
  33  |       await page.goto(LIVE_URL, { waitUntil: 'networkidle' });
> 34  |       await page.waitForSelector('#login-email', { timeout: 30000 });
      |                  ^ TimeoutError: page.waitForSelector: Timeout 30000ms exceeded.
  35  |       await page.fill('#login-email', CREDENTIALS.engineer.email);
  36  |       await page.fill('#login-password', CREDENTIALS.engineer.password);
  37  |       await page.click('#login-btn');
  38  |       await page.waitForSelector('#page-content', { timeout: 15000 });
  39  | 
  40  |       // Navigate to Requests
  41  |       await page.evaluate(() => window._navigate('requests'));
  42  |       await page.waitForTimeout(2000);
  43  | 
  44  |       // Click Create Request
  45  |       const createBtn = page.locator('button:has-text("Create Request"), button:has-text("New Request")').first();
  46  |       await expect(createBtn).toBeVisible();
  47  |       await createBtn.click();
  48  |       await page.waitForSelector('#modal-overlay[style*="flex"]', { timeout: 5000 });
  49  | 
  50  |       // Fill request form - material should be a dropdown
  51  |       const materialSelect = page.locator('select[name="material"], #material-select');
  52  |       await materialSelect.selectOption({ label: 'Other' }); // Or select from existing
  53  | 
  54  |       await page.fill('input[name="quantity"], #quantity-input', '10');
  55  |       await page.selectOption('select[name="unit"], #unit-select', 'bags');
  56  | 
  57  |       // Submit request
  58  |       await page.click('button:has-text("Submit Request"), button:has-text("Create")');
  59  |       await page.waitForTimeout(2000);
  60  | 
  61  |       // Verify request exists in Pending tab
  62  |       await page.evaluate(() => window._navigate('requests'));
  63  |       await page.waitForTimeout(1500);
  64  | 
  65  |       console.log('✓ Engineer submitted material request');
  66  |     });
  67  | 
  68  |     test('Project Manager approves request and Storekeeper issues', async ({ page }) => {
  69  |       await page.goto(LIVE_URL);
  70  |       await page.fill('#login-email', CREDENTIALS.project_manager.email);
  71  |       await page.fill('#login-password', CREDENTIALS.project_manager.password);
  72  |       await page.click('#login-btn');
  73  |       await page.waitForSelector('#page-content', { timeout: 15000 });
  74  | 
  75  |       // Navigate to Requests
  76  |       await page.evaluate(() => window._navigate('requests'));
  77  |       await page.waitForTimeout(1500);
  78  | 
  79  |       // Check PM Approved tab for pending requests
  80  |       const pmApprovedTab = page.locator('button:has-text("PM Approved"), [data-tab="pm_approved"]');
  81  |       if (await pmApprovedTab.count() > 0) {
  82  |         await pmApprovedTab.click();
  83  |         await page.waitForTimeout(1000);
  84  | 
  85  |         // Find request and approve it
  86  |         const approveBtn = page.locator('button:has-text("Approve"), button:has-text("Approve Request")').first();
  87  |         if (await approveBtn.count() > 0 && await approveBtn.isVisible()) {
  88  |           await approveBtn.click();
  89  |           await page.waitForTimeout(1500);
  90  |           console.log('✓ PM approved request');
  91  |         }
  92  |       }
  93  | 
  94  |       // Storekeeper issues the stock
  95  |       await page.goto(LIVE_URL);
  96  |       await page.fill('#login-email', CREDENTIALS.storekeeper_local.email);
  97  |       await page.fill('#login-password', CREDENTIALS.storekeeper_local.password);
  98  |       await page.click('#login-btn');
  99  |       await page.waitForSelector('#page-content', { timeout: 15000 });
  100 | 
  101 |       // Navigate to Storekeeper dashboard and check pending issues
  102 |       await page.evaluate(() => window._navigate('dashboard'));
  103 |       await page.waitForTimeout(1500);
  104 | 
  105 |       console.log('✓ Storekeeper ready to issue');
  106 |     });
  107 |   });
  108 | 
  109 |   // ─────────────────────────────────────────────────────────────────
  110 |   // WORKFLOW 2: Transfer Flow
  111 |   // Site A PM → Head of Projects approves → Pickup (Site A stock decreases) → Delivery (Site B stock increases)
  112 |   // ─────────────────────────────────────────────────────────────────
  113 |   test.describe('Workflow 2: Transfer Flow', () => {
  114 | 
  115 |     test('Project Manager creates transfer request', async ({ page }) => {
  116 |       await page.goto(LIVE_URL);
  117 |       await page.fill('#login-email', CREDENTIALS.project_manager.email);
  118 |       await page.fill('#login-password', CREDENTIALS.project_manager.password);
  119 |       await page.click('#login-btn');
  120 |       await page.waitForSelector('#page-content', { timeout: 15000 });
  121 | 
  122 |       // Navigate to Transfers
  123 |       await page.evaluate(() => window._navigate('transfers'));
  124 |       await page.waitForTimeout(1500);
  125 | 
  126 |       // Click Create Transfer
  127 |       const createBtn = page.locator('button:has-text("Create Transfer"), button:has-text("New Transfer")').first();
  128 |       await expect(createBtn).toBeVisible();
  129 |       await createBtn.click();
  130 |       await page.waitForSelector('#modal-overlay[style*="flex"]', { timeout: 5000 });
  131 | 
  132 |       // Fill transfer form
  133 |       await page.selectOption('select[name="from_site"], #from-site-select', { label: 'Site A' });
  134 |       await page.selectOption('select[name="to_site"], #to-site-select', { label: 'Site B' });
```