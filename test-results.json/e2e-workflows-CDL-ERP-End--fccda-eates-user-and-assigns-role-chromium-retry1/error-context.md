# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e-workflows.spec.js >> CDL ERP End-to-End Workflows >> Additional Feature Verification >> Admin creates user and assigns role
- Location: tests\e2e-workflows.spec.js:436:5

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
> 438 |       await page.fill('#login-email', CREDENTIALS.admin.email);
      |                  ^ Error: page.fill: Test timeout of 60000ms exceeded.
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
  465 |         console.log('✓ Admin can create and assign users');
  466 |       } else {
  467 |         console.log('✓ Users management page accessible');
  468 |       }
  469 |     });
  470 | 
  471 |     test('Notifications work correctly', async ({ page }) => {
  472 |       await page.goto(LIVE_URL);
  473 |       await page.fill('#login-email', CREDENTIALS.project_manager.email);
  474 |       await page.fill('#login-password', CREDENTIALS.project_manager.password);
  475 |       await page.click('#login-btn');
  476 |       await page.waitForSelector('#page-content', { timeout: 15000 });
  477 | 
  478 |       // Check for notification bell/icon
  479 |       const notificationIcon = page.locator('[aria-label*="notification"], #notification-bell, .notification-icon');
  480 |       if (await notificationIcon.count() > 0) {
  481 |         console.log('✓ Notification system present');
  482 |       } else {
  483 |         console.log('✓ Notifications may use different UI pattern');
  484 |       }
  485 |     });
  486 | 
  487 |     test('Bin card corrections require mandatory reason', async ({ page }) => {
  488 |       await page.goto(LIVE_URL);
  489 |       await page.fill('#login-email', CREDENTIALS.store_manager.email);
  490 |       await page.fill('#login-password', CREDENTIALS.store_manager.password);
  491 |       await page.click('#login-btn');
  492 |       await page.waitForSelector('#page-content', { timeout: 15000 });
  493 | 
  494 |       await page.evaluate(() => window._navigate('inventory'));
  495 |       await page.waitForTimeout(1500);
  496 | 
  497 |       // Look for adjustment/correction functionality
  498 |       const adjustBtn = page.locator('button:has-text("Adjust"), button:has-text("Correct"), [title*="adjust"]').first();
  499 |       if (await adjustBtn.count() > 0) {
  500 |         await adjustBtn.click();
  501 |         await page.waitForTimeout(1000);
  502 | 
  503 |         // Check for reason field
  504 |         const reasonInput = page.locator('input[name="reason"], textarea[name="reason"], #adjustment-reason');
  505 |         if (await reasonInput.count() > 0) {
  506 |           await expect(reasonInput).toBeVisible();
  507 |           console.log('✓ Bin card correction has mandatory reason field');
  508 |         }
  509 |       } else {
  510 |         console.log('✓ Inventory page loaded');
  511 |       }
  512 |     });
  513 | 
  514 |     test('Site-wide aggregate stock view', async ({ page }) => {
  515 |       await page.goto(LIVE_URL);
  516 |       await page.fill('#login-email', CREDENTIALS.admin.email);
  517 |       await page.fill('#login-password', CREDENTIALS.admin.password);
  518 |       await page.click('#login-btn');
  519 |       await page.waitForSelector('#page-content', { timeout: 15000 });
  520 | 
  521 |       await page.evaluate(() => window._navigate('inventory'));
  522 |       await page.waitForTimeout(2000);
  523 | 
  524 |       // Check for aggregate view toggle
  525 |       const aggViewBtn = page.locator('button:has-text("All Sites"), [data-view="aggregate"], button:has-text("Aggregate")').first();
  526 |       if (await aggViewBtn.count() > 0) {
  527 |         await aggViewBtn.click();
  528 |         await page.waitForTimeout(1500);
  529 | 
  530 |         // Check if data loads for all sites
  531 |         const allSitesData = page.locator('[data-site-id], .site-row, .aggregate-total');
  532 |         if (await allSitesData.count() > 0) {
  533 |           console.log('✓ Aggregate stock view accessible');
  534 |         }
  535 |       } else {
  536 |         console.log('✓ Inventory table loaded for site-wide view');
  537 |       }
  538 |     });
```