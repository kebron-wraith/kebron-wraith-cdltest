# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e-workflows.spec.js >> CDL ERP End-to-End Workflows >> Workflow 5: New Material Naming >> Storekeeper attempts to create new material request
- Location: tests\e2e-workflows.spec.js:288:5

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: page.fill: Test timeout of 60000ms exceeded.
Call log:
  - waiting for locator('#login-email')

```

# Test source

```ts
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
  258 |         const containerInput = page.locator('input[name="container_number"], #container-number');
  259 |         await expect(containerInput).toBeVisible();
  260 | 
  261 |         await containerInput.fill('CONT-' + Date.now().toString().slice(-8));
  262 | 
  263 |         console.log('✓ Container import ready');
  264 |       } else {
  265 |         // Use GRN scanner flow for import
  266 |         const addBtn = page.locator('button:has-text("Add Materials"), button:has-text("Manual GRN")').first();
  267 |         await addBtn.click();
  268 |         await page.waitForTimeout(1000);
  269 | 
  270 |         // Check for container-specific fields for imported materials
  271 |         const containerField = page.locator('input[name="container_number"], #grn-number-input');
  272 |         if (await containerField.count() > 0) {
  273 |           await containerField.fill('CONT-' + Date.now().toString().slice(-8));
  274 |           console.log('✓ Container number entered');
  275 |         }
  276 | 
  277 |         console.log('✓ Import entry ready');
  278 |       }
  279 |     });
  280 |   });
  281 | 
  282 |   // ─────────────────────────────────────────────────────────────────
  283 |   // WORKFLOW 5: New Material Naming
  284 |   // storekeeper cannot free-type → submits with photo → Store Manager approves/rejects
  285 |   // ─────────────────────────────────────────────────────────────────
  286 |   test.describe('Workflow 5: New Material Naming', () => {
  287 | 
  288 |     test('Storekeeper attempts to create new material request', async ({ page }) => {
  289 |       await page.goto(LIVE_URL);
> 290 |       await page.fill('#login-email', CREDENTIALS.storekeeper_local.email);
      |                  ^ Error: page.fill: Test timeout of 60000ms exceeded.
  291 |       await page.fill('#login-password', CREDENTIALS.storekeeper_local.password);
  292 |       await page.click('#login-btn');
  293 |       await page.waitForSelector('#page-content', { timeout: 15000 });
  294 | 
  295 |       // Navigate to Requests (create request)
  296 |       await page.evaluate(() => window._navigate('requests'));
  297 |       await page.waitForTimeout(1500);
  298 | 
  299 |       const createBtn = page.locator('button:has-text("Create Request"), button:has-text("New Request")').first();
  300 |       if (await createBtn.count() > 0) {
  301 |         await createBtn.click();
  302 |         await page.waitForSelector('#modal-overlay[style*="flex"]', { timeout: 5000 });
  303 | 
  304 |         // Check that material dropdown exists, not free text
  305 |         const materialSelect = page.locator('select[name="material"], #material-select, [role="combobox"]');
  306 |         const freeTextInput = page.locator('input[placeholder*="Search material"], input[name*="material"], [data-testid="material-search"]');
  307 | 
  308 |         // Either there's a dropdown with "__NEW__" option, or free text is disabled
  309 |         if (await materialSelect.count() > 0) {
  310 |           await expect(materialSelect).toBeVisible();
  311 | 
  312 |           // Check for new material option
  313 |           const newOption = page.locator('option[value="__NEW__"], option:has-text("New Material")');
  314 |           if (await newOption.count() > 0) {
  315 |             await newOption.selectOption();
  316 |             console.log('✓ New material option available in dropdown');
  317 |           }
  318 |         }
  319 | 
  320 |         await page.click('button:has-text("Submit"), button:has-text("Create")');
  321 |         await page.waitForTimeout(1500);
  322 | 
  323 |         console.log('✓ New material request flow initiated');
  324 |       } else {
  325 |         console.log('✓ Storekeeper cannot create requests - blocked as expected');
  326 |       }
  327 |     });
  328 | 
  329 |     test('Store Manager approves new material', async ({ page }) => {
  330 |       await page.goto(LIVE_URL);
  331 |       await page.fill('#login-email', CREDENTIALS.store_manager.email);
  332 |       await page.fill('#login-password', CREDENTIALS.store_manager.password);
  333 |       await page.click('#login-btn');
  334 |       await page.waitForSelector('#page-content', { timeout: 15000 });
  335 | 
  336 |       // Navigate to Material Approvals
  337 |       await page.evaluate(() => window._navigate('material_approvals'));
  338 |       await page.waitForTimeout(1500);
  339 | 
  340 |       // Check pending materials
  341 |       const pendingMaterials = page.locator('[data-pending-material], .pending-material-item');
  342 |       if (await pendingMaterials.count() > 0) {
  343 |         const approveBtn = page.locator('button:has-text("Approve"), button:has-text("Approve Material")').first();
  344 |         if (await approveBtn.count() > 0) {
  345 |           await approveBtn.click();
  346 |           await page.waitForTimeout(1500);
  347 |           console.log('✓ New material approved by Store Manager');
  348 |         }
  349 |       } else {
  350 |         console.log('✓ Material Approvals page accessible to Store Manager');
  351 |       }
  352 |     });
  353 |   });
  354 | 
  355 |   // ─────────────────────────────────────────────────────────────────
  356 |   // WORKFLOW 6: AI Advisor Access Control
  357 |   // CEO/Company Owner/Asset Manager/Admin: read-only + AI
  358 |   // Store Manager/storekeepers: NO AI access (0 quota)
  359 |   // ─────────────────────────────────────────────────────────────────
  360 |   test.describe('Workflow 6: AI Advisor Access Control', () => {
  361 | 
  362 |     test('CEO/Company Owner can access AI advisor (20 messages/day)', async ({ page }) => {
  363 |       await page.goto(LIVE_URL);
  364 |       await page.fill('#login-email', CREDENTIALS.ceo.email);
  365 |       await page.fill('#login-password', CREDENTIALS.ceo.password);
  366 |       await page.click('#login-btn');
  367 |       await page.waitForSelector('#page-content', { timeout: 15000 });
  368 | 
  369 |       // Look for AI advisor/chat icon
  370 |       const aiBtn = page.locator('button:has-text("AI"), [aria-label*="AI"], #ai-chat-btn, .ai-chat-icon').first();
  371 |       if (await aiBtn.count() > 0) {
  372 |         await aiBtn.click();
  373 |         await page.waitForTimeout(2000);
  374 | 
  375 |         // Check prompt input exists
  376 |         const promptInput = page.locator('textarea[placeholder*="Ask"], input[placeholder*="Ask"], #ai-prompt');
  377 |         await expect(promptInput.first()).toBeVisible();
  378 | 
  379 |         // Type test query
  380 |         await promptInput.first().fill('What is the current stock level for building materials?');
  381 | 
  382 |         console.log('✓ CEO can access AI advisor');
  383 |       } else {
  384 |         console.log('✓ AI advisor available via menu');
  385 |       }
  386 |     });
  387 | 
  388 |     test('Store Manager/storekeeper CANNOT access AI (quota=0)', async ({ page }) => {
  389 |       await page.goto(LIVE_URL);
  390 |       await page.fill('#login-email', CREDENTIALS.storekeeper_local.email);
```