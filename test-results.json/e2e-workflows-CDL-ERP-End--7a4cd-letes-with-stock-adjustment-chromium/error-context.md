# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e-workflows.spec.js >> CDL ERP End-to-End Workflows >> Workflow 2: Transfer Flow >> Transfer completes with stock adjustment
- Location: tests\e2e-workflows.spec.js:155:5

# Error details

```
TypeError: Cannot read properties of undefined (reading 'email')
```

# Test source

```ts
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
  135 | 
  136 |       // Add item to transfer
  137 |       const addItemBtn = page.locator('button:has-text("+ Add Item"), #add-transfer-item');
  138 |       if (await addItemBtn.count() > 0) {
  139 |         await addItemBtn.click();
  140 |         await page.waitForTimeout(500);
  141 |       }
  142 | 
  143 |       // Select material and quantity
  144 |       const materialOption = page.locator('select[name="material"], .transfer-material-select');
  145 |       await materialOption.selectOption({ label: 'Cement 50kg Bag' });
  146 |       await page.fill('input[name="quantity"], .transfer-quantity', '5');
  147 | 
  148 |       // Submit transfer
  149 |       await page.click('button:has-text("Submit Transfer"), button:has-text("Create")');
  150 |       await page.waitForTimeout(2000);
  151 | 
  152 |       console.log('✓ Transfer request created');
  153 |     });
  154 | 
  155 |     test('Transfer completes with stock adjustment', async ({ page }) => {
  156 |       await page.goto(LIVE_URL);
> 157 |       await page.fill('#login-email', CREDENTIALS.asset_manager.email); // Head of Projects / AM approves
      |                                                                 ^ TypeError: Cannot read properties of undefined (reading 'email')
  158 |       await page.fill('#login-password', CREDENTIALS.asset_manager.password);
  159 |       await page.click('#login-btn');
  160 |       await page.waitForSelector('#page-content', { timeout: 15000 });
  161 | 
  162 |       // Navigate to Transfers and complete approval chain
  163 |       await page.evaluate(() => window._navigate('transfers'));
  164 |       await page.waitForTimeout(1500);
  165 | 
  166 |       // Look for transfer in various stages and advance
  167 |       const completeStepBtn = page.locator('button:has-text("Mark Delivered"), button:has-text("Complete")').first();
  168 |       if (await completeStepBtn.count() > 0) {
  169 |         await completeStepBtn.click();
  170 |         await page.waitForTimeout(1500);
  171 |         console.log('✓ Transfer completed - stock should adjust');
  172 |       } else {
  173 |         console.log('✓ Transfer workflow ready for completion');
  174 |       }
  175 |     });
  176 |   });
  177 | 
  178 |   // ─────────────────────────────────────────────────────────────────
  179 |   // WORKFLOW 3: GRN Entry (Local Delivery)
  180 |   // storekeeper receives local delivery, writes GRN with mandatory fields
  181 |   // ─────────────────────────────────────────────────────────────────
  182 |   test.describe('Workflow 3: GRN Entry (Local Delivery)', () => {
  183 | 
  184 |     test('Storekeeper enters manual GRN with mandatory fields', async ({ page }) => {
  185 |       await page.goto(LIVE_URL);
  186 |       await page.fill('#login-email', CREDENTIALS.storekeeper_local.email);
  187 |       await page.fill('#login-password', CREDENTIALS.storekeeper_local.password);
  188 |       await page.click('#login-btn');
  189 |       await page.waitForSelector('#page-content', { timeout: 15000 });
  190 | 
  191 |       // Navigate to GRN module
  192 |       await page.evaluate(() => window._navigate('grn'));
  193 |       await page.waitForTimeout(1500);
  194 | 
  195 |       // Click Manual GRN Entry
  196 |       const manualGrnBtn = page.locator('button:has-text("Manual GRN"), button:has-text("Add Materials")').first();
  197 |       await expect(manualGrnBtn).toBeVisible();
  198 |       await manualGrnBtn.click();
  199 |       await page.waitForSelector('#modal-overlay[style*="flex"]', { timeout: 5000 });
  200 | 
  201 |       // Check mandatory fields are present
  202 |       const grnNumber = page.locator('input[name="grn_number"], #mg-grn, input[placeholder*="GRN"]');
  203 |       const invoiceNumber = page.locator('input[name="invoice_number"], #mg-inv, input[placeholder*="Invoice"]');
  204 |       const supplier = page.locator('input[name="supplier"], #mg-sup');
  205 | 
  206 |       await expect(grnNumber).toBeVisible();
  207 |       await expect(invoiceNumber).toBeVisible();
  208 |       await expect(supplier).toBeVisible();
  209 | 
  210 |       // Fill GRN form
  211 |       await grnNumber.fill('GRN-' + Date.now().toString().slice(-6));
  212 |       await invoiceNumber.fill('INV-' + Date.now().toString().slice(-4));
  213 |       await supplier.fill('Test Supplier Ltd');
  214 | 
  215 |       // Add item row
  216 |       const firstItemRow = page.locator('[data-row="0"], .grn-item-row').first();
  217 |       await firstItemRow.locator('input[placeholder*="Material"], [data-f="name"]').fill(TEST_MATERIAL.name);
  218 |       await firstItemRow.locator('input[placeholder*="Qty"], [data-f="qty"]').fill('20');
  219 |       await firstItemRow.locator('select[placeholder*="Unit"], [data-f="unit"]').selectOption({ label: 'bags' });
  220 |       await firstItemRow.locator('input[placeholder*="Price"], [data-f="price"]').fill('2500');
  221 | 
  222 |       // Verify unit field is required
  223 |       const unitSelect = firstItemRow.locator('select[placeholder*="Unit"], [data-f="unit"]');
  224 |       await expect(unitSelect).toBeVisible();
  225 | 
  226 |       // Submit GRN
  227 |       await page.click('button:has-text("Submit GRN")');
  228 |       await page.waitForTimeout(2000);
  229 | 
  230 |       console.log('✓ Manual GRN submitted with mandatory fields');
  231 |     });
  232 |   });
  233 | 
  234 |   // ─────────────────────────────────────────────────────────────────
  235 |   // WORKFLOW 4: Import Entry
  236 |   // storekeeper receives container, counts contents, logs to bin card
  237 |   // ─────────────────────────────────────────────────────────────────
  238 |   test.describe('Workflow 4: Import Entry', () => {
  239 | 
  240 |     test('Storekeeper imports container with counting', async ({ page }) => {
  241 |       await page.goto(LIVE_URL);
  242 |       await page.fill('#login-email', CREDENTIALS.storekeeper_import.email);
  243 |       await page.fill('#login-password', CREDENTIALS.storekeeper_import.password);
  244 |       await page.click('#login-btn');
  245 |       await page.waitForSelector('#page-content', { timeout: 15000 });
  246 | 
  247 |       // Navigate to GRN or Import module
  248 |       await page.evaluate(() => window._navigate('grn'));
  249 |       await page.waitForTimeout(1500);
  250 | 
  251 |       // Use GRN scanner or manual entry
  252 |       const importBtn = page.locator('button:has-text("Container Import"), button:has-text("Import Items")').first();
  253 |       if (await importBtn.count() > 0) {
  254 |         await importBtn.click();
  255 |         await page.waitForTimeout(1000);
  256 | 
  257 |         // Container number should be enforced
```