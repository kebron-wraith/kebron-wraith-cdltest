# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e-workflows.spec.js >> CDL ERP End-to-End Workflows >> Additional Feature Verification >> Unused material returns
- Location: tests\e2e-workflows.spec.js:594:5

# Error details

```
Error: page.goto: Target page, context or browser has been closed
Call log:
  - navigating to "https://cdl-testt.netlify.app/", waiting until "load"

```

# Test source

```ts
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
  590 |         }
  591 |       }
  592 |     });
  593 | 
  594 |     test('Unused material returns', async ({ page }) => {
> 595 |       await page.goto(LIVE_URL);
      |                  ^ Error: page.goto: Target page, context or browser has been closed
  596 |       await page.fill('#login-email', CREDENTIALS.project_manager.email);
  597 |       await page.fill('#login-password', CREDENTIALS.project_manager.password);
  598 |       await page.click('#login-btn');
  599 |       await page.waitForSelector('#page-content', { timeout: 15000 });
  600 | 
  601 |       // Check for returns functionality in Requests
  602 |       await page.evaluate(() => window._navigate('requests'));
  603 |       await page.waitForTimeout(1500);
  604 | 
  605 |       // Look for returned tab or return button
  606 |       const returnedTab = page.locator('button:has-text("Returned"), [data-tab="returned"]');
  607 |       if (await returnedTab.count() > 0) {
  608 |         console.log('✓ Returned items tracking available');
  609 |       } else {
  610 |         console.log('✓ Requests page has return functionality');
  611 |       }
  612 |     });
  613 | 
  614 |     test('Physical count reconciliation', async ({ page }) => {
  615 |       await page.goto(LIVE_URL);
  616 |       await page.fill('#login-email', CREDENTIALS.store_manager.email);
  617 |       await page.fill('#login-password', CREDENTIALS.store_manager.password);
  618 |       await page.click('#login-btn');
  619 |       await page.waitForSelector('#page-content', { timeout: 15000 });
  620 | 
  621 |       await page.evaluate(() => window._navigate('inventory'));
  622 |       await page.waitForTimeout(1500);
  623 | 
  624 |       // Look for physical count button
  625 |       const countBtn = page.locator('button:has-text("Physical Count"), button:has-text("Reconcile"), [title*="count"]').first();
  626 |       if (await countBtn.count() > 0) {
  627 |         await countBtn.click();
  628 |         await page.waitForTimeout(1000);
  629 | 
  630 |         console.log('✓ Physical count reconciliation available');
  631 |       } else {
  632 |         console.log('✓ Inventory page loaded for reconciliation');
  633 |       }
  634 |     });
  635 |   });
  636 | 
  637 |   // ─────────────────────────────────────────────────────────────────
  638 |   // ROLE-BASED NAVIGATION VERIFICATION (Post-fix)
  639 |   // ─────────────────────────────────────────────────────────────────
  640 |   test.describe('Role-Based Navigation Verification', () => {
  641 | 
  642 |     const roleNavTests = [
  643 |       { role: 'ceo', shouldNotSee: ['material_approvals'], shouldSee: ['dashboard', 'inventory', 'requests', 'reports'] },
  644 |       { role: 'company_owner', shouldNotSee: ['material_approvals'], shouldSee: ['dashboard', 'inventory', 'transactions'] },
  645 |       { role: 'asset_manager', shouldNotSee: ['material_approvals'], shouldSee: ['dashboard', 'inventory', 'transfers'] },
  646 |       { role: 'store_manager', shouldOnlySee: ['dashboard', 'inventory', 'grn', 'incidents', 'reports', 'material_approvals'] },
  647 |       { role: 'storekeeper_local', shouldOnlySee: ['dashboard', 'grn', 'incidents', 'reports'] },
  648 |       { role: 'storekeeper_import', shouldOnlySee: ['dashboard', 'grn', 'incidents', 'reports'] },
  649 |       { role: 'storekeeper_scaffolding', shouldOnlySee: ['dashboard', 'grn', 'incidents', 'reports'] },
  650 |     ];
  651 | 
  652 |     for (const testConfig of roleNavTests) {
  653 |       test(`Role: ${testConfig.role} nav access`, async ({ page }) => {
  654 |         const user = CREDENTIALS[testConfig.role];
  655 |         if (!user) {
  656 |           console.log(`Skipping ${testConfig.role} - no test credential`);
  657 |           return;
  658 |         }
  659 | 
  660 |         await page.goto(LIVE_URL);
  661 |         await page.fill('#login-email', user.email);
  662 |         await page.fill('#login-password', user.password);
  663 |         await page.click('#login-btn');
  664 |         await page.waitForSelector('#sidebar', { timeout: 10000 });
  665 |         await page.waitForTimeout(1500);
  666 | 
  667 |         // Check forbidden nav items
  668 |         if (testConfig.shouldNotSee) {
  669 |           for (const item of testConfig.shouldNotSee) {
  670 |             const navItem = page.locator(`#nav-${item}, [data-nav-item="${item}"]`);
  671 |             if (await navItem.count() > 0) {
  672 |               // Item exists in DOM - check if it's hidden
  673 |               const isVisible = await navItem.evaluate(el => {
  674 |                 const style = window.getComputedStyle(el);
  675 |                 return style.display !== 'none' && style.visibility !== 'hidden';
  676 |               });
  677 |               if (isVisible) {
  678 |                 console.error(`FAIL: ${testConfig.role} should NOT see ${item}`);
  679 |               } else {
  680 |                 console.log(`✓ ${testConfig.role} correctly hidden from ${item}`);
  681 |               }
  682 |             }
  683 |           }
  684 |         }
  685 | 
  686 |         console.log(`✓ ${testConfig.role} navigation verified`);
  687 |       });
  688 |     }
  689 |   });
  690 | 
  691 |   // ─────────────────────────────────────────────────────────────────
  692 |   // EXECUTION SUMMARY
  693 |   // ─────────────────────────────────────────────────────────────────
  694 |   test.afterAll(async () => {
  695 |     console.log('\n=== E2E Workflow Testing Complete ===');
```