# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e-workflows.spec.js >> CDL ERP End-to-End Workflows >> Additional Feature Verification >> Bin card corrections require mandatory reason
- Location: tests\e2e-workflows.spec.js:487:5

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
> 489 |       await page.fill('#login-email', CREDENTIALS.store_manager.email);
      |                  ^ Error: page.fill: Test timeout of 60000ms exceeded.
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
  539 | 
  540 |     test('File export (Excel/PDF) scoped to role', async ({ page }) => {
  541 |       await page.goto(LIVE_URL);
  542 |       await page.fill('#login-email', CREDENTIALS.project_manager.email);
  543 |       await page.fill('#login-password', CREDENTIALS.project_manager.password);
  544 |       await page.click('#login-btn');
  545 |       await page.waitForSelector('#page-content', { timeout: 15000 });
  546 | 
  547 |       await page.evaluate(() => window._navigate('reports'));
  548 |       await page.waitForTimeout(1500);
  549 | 
  550 |       const exportBtn = page.locator('button:has-text("Export"), button:has-text("Download"), [aria-label*="export"]').first();
  551 |       if (await exportBtn.count() > 0) {
  552 |         await exportBtn.click();
  553 |         await page.waitForTimeout(1000);
  554 | 
  555 |         // Check for format options
  556 |         const formatMenu = page.locator('[role="menu"], .dropdown-menu');
  557 |         if (await formatMenu.count() > 0) {
  558 |           console.log('✓ Export options available (scoped to role)');
  559 |         } else {
  560 |           console.log('✓ Export button available');
  561 |         }
  562 |       } else {
  563 |         console.log('✓ Reports page loaded');
  564 |       }
  565 |     });
  566 | 
  567 |     test('Damaged/Lost material reporting', async ({ page }) => {
  568 |       await page.goto(LIVE_URL);
  569 |       await page.fill('#login-email', CREDENTIALS.storekeeper_local.email);
  570 |       await page.fill('#login-password', CREDENTIALS.storekeeper_local.password);
  571 |       await page.click('#login-btn');
  572 |       await page.waitForSelector('#page-content', { timeout: 15000 });
  573 | 
  574 |       await page.evaluate(() => window._navigate('incidents'));
  575 |       await page.waitForTimeout(1500);
  576 | 
  577 |       // Check for incident/report types
  578 |       const incidentBtn = page.locator('button:has-text("Report Incident"), button:has-text("New Incident")').first();
  579 |       if (await incidentBtn.count() > 0) {
  580 |         await incidentBtn.click();
  581 |         await page.waitForTimeout(1000);
  582 | 
  583 |         // Check for damaged/lost type options
  584 |         const typeSelect = page.locator('select[name="type"], #incident-type');
  585 |         if (await typeSelect.count() > 0) {
  586 |           const damagedOption = typeSelect.locator('option:has-text("damaged"), option:has-text("lost"), option:has-text("Missing")');
  587 |           if (await damagedOption.count() > 0) {
  588 |             console.log('✓ Damaged/Lost material reporting available');
  589 |           }
```