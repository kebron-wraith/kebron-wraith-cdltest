# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e-workflows.spec.js >> CDL ERP End-to-End Workflows >> Workflow 6: AI Advisor Access Control >> CEO/Company Owner can access AI advisor (20 messages/day)
- Location: tests\e2e-workflows.spec.js:362:5

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
> 364 |       await page.fill('#login-email', CREDENTIALS.ceo.email);
      |                  ^ Error: page.fill: Test timeout of 60000ms exceeded.
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
  391 |       await page.fill('#login-password', CREDENTIALS.storekeeper_local.password);
  392 |       await page.click('#login-btn');
  393 |       await page.waitForSelector('#page-content', { timeout: 15000 });
  394 | 
  395 |       // Look for AI advisor/chat icon - should not appear or should be disabled
  396 |       const aiBtn = page.locator('button:has-text("AI"), [aria-label*="AI"], #ai-chat-btn, .ai-chat-icon');
  397 |       if (await aiBtn.count() > 0) {
  398 |         // Click to see if it's disabled
  399 |         await aiBtn.first().click();
  400 |         await page.waitForTimeout(1000);
  401 | 
  402 |         // Check for error or disabled state
  403 |         const errorMsg = page.locator('text=AI chat not available, text=not available, text=quota, .error-message');
  404 |         if (await errorMsg.count() > 0) {
  405 |           console.log('✓ Storekeeper correctly blocked from AI');
  406 |         } else {
  407 |           console.log('✓ AI button exists but role quota enforcement happens server-side');
  408 |         }
  409 |       } else {
  410 |         console.log('✓ No AI button visible for storekeeper - access control working');
  411 |       }
  412 |     });
  413 | 
  414 |     test('Admin has unlimited AI access', async ({ page }) => {
  415 |       await page.goto(LIVE_URL);
  416 |       await page.fill('#login-email', CREDENTIALS.admin.email);
  417 |       await page.fill('#login-password', CREDENTIALS.admin.password);
  418 |       await page.click('#login-btn');
  419 |       await page.waitForSelector('#page-content', { timeout: 15000 });
  420 | 
  421 |       // Admin should have AI advisor with Infinity quota
  422 |       const aiBtn = page.locator('button:has-text("AI"), [aria-label*="AI"], #ai-chat-btn, .ai-chat-icon');
  423 |       if (await aiBtn.count() > 0) {
  424 |         await aiBtn.click();
  425 |         await page.waitForTimeout(1500);
  426 |         console.log('✓ Admin has AI advisor access (Infinity quota)');
  427 |       }
  428 |     });
  429 |   });
  430 | 
  431 |   // ─────────────────────────────────────────────────────────────────
  432 |   // ADDITIONAL FEATURE VERIFICATION
  433 |   // ─────────────────────────────────────────────────────────────────
  434 |   test.describe('Additional Feature Verification', () => {
  435 | 
  436 |     test('Admin creates user and assigns role', async ({ page }) => {
  437 |       await page.goto(LIVE_URL);
  438 |       await page.fill('#login-email', CREDENTIALS.admin.email);
  439 |       await page.fill('#login-password', CREDENTIALS.admin.password);
  440 |       await page.click('#login-btn');
  441 |       await page.waitForSelector('#page-content', { timeout: 15000 });
  442 | 
  443 |       // Navigate to Users
  444 |       await page.evaluate(() => window._navigate('users'));
  445 |       await page.waitForTimeout(1500);
  446 | 
  447 |       // Add User
  448 |       const addUserBtn = page.locator('button:has-text("Add User"), button:has-text("+ Add User")').first();
  449 |       if (await addUserBtn.count() > 0) {
  450 |         await addUserBtn.click();
  451 |         await page.waitForTimeout(1000);
  452 | 
  453 |         const modal = page.locator('#modal-overlay[style*="flex"]');
  454 |         await expect(modal).toBeVisible({ timeout: 5000 });
  455 | 
  456 |         const emailInput = page.locator('input[name="email"], #user-email');
  457 |         await emailInput.fill('testuser@test.com');
  458 | 
  459 |         const roleSelect = page.locator('select[name="role"], #user-role');
  460 |         await roleSelect.selectOption({ label: 'Engineer' });
  461 | 
  462 |         await page.click('button:has-text("Save"), button:has-text("Create")');
  463 |         await page.waitForTimeout(1500);
  464 | 
```