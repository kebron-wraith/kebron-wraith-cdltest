# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e-workflows.spec.js >> CDL ERP End-to-End Workflows >> Workflow 4: Import Entry >> Storekeeper imports container with counting
- Location: tests\e2e-workflows.spec.js:240:5

# Error details

```
TypeError: Cannot read properties of undefined (reading 'email')
```

# Test source

```ts
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
  157 |       await page.fill('#login-email', CREDENTIALS.asset_manager.email); // Head of Projects / AM approves
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
> 242 |       await page.fill('#login-email', CREDENTIALS.storekeeper_import.email);
      |                                                                      ^ TypeError: Cannot read properties of undefined (reading 'email')
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
  290 |       await page.fill('#login-email', CREDENTIALS.storekeeper_local.email);
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
```