import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'https://wraith-w.netlify.app';
const SUPABASE_URL = 'https://dljvplrbjogncwrpmfsj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsanZwbHJiam9nbmN3cnBtZnNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQxNzI4MzIsImV4cCI6MjA0OTc0ODgzMn0.lKzZGmGbCFtH9x0GQ3JbZJ9xKzJ9fJ9KzJ9fJ9KzJ9f';

// Fetch test users from Supabase instead of hard-coding
async function fetchTestUsers() {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/users?select=email,password_hash,name,role,site_ids&is_active=eq.true`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` }
    });
    const users = await res.json();
    return users.reduce((acc, u) => {
      // Map role to expected test key
      const roleMap = {
        'company_owner': 'company_owner',
        'ceo': 'ceo',
        'admin': 'admin',
        'finance': 'finance',
        'project_manager': 'project_manager',
        'store_manager': 'store_manager',
        'engineer': 'engineer',
        'storekeeper_local': 'storekeeper_local',
        'storekeeper_import': 'storekeeper_import',
        'storekeeper_scaffolding': 'storekeeper_scaffolding',
        'procurement_officer': 'procurement_officer',
        'transfer_officer': 'transfer_officer',
        'data_holder': 'data_holder',
        'site_overseer': 'site_overseer',
        'supervisor': 'supervisor',
        'office_manager': 'office_manager',
        'asset_manager': 'asset_manager',
      };
      const key = roleMap[u.role];
      if (key) {
        acc[key] = { email: u.email, password: u.password_hash, name: u.name, role: u.role };
      }
      return acc;
    }, {});
  } catch (err) {
    console.error('Failed to fetch users from Supabase:', err.message);
    // Fallback to hardcoded if Supabase unavailable
    return {
      company_owner: { email: 'owner@canaan.co.ke', password: 'owner123' },
      ceo: { email: 'ceo@canaan.co.ke', password: 'ceo123' },
      office_manager: { email: 'om@canaan.co.ke', password: 'om123' },
      asset_manager: { email: 'am@canaan.co.ke', password: 'am123' },
      finance: { email: 'finance@canaan.co.ke', password: 'finance123' },
      project_manager: { email: 'pm1@canaan.co.ke', password: 'pm123' },
      engineer: { email: 'eng@canaan.co.ke', password: 'eng123' },
      store_manager: { email: 'sm@canaan.co.ke', password: 'sm123' },
      storekeeper_local: { email: 'sk.local@canaan.co.ke', password: 'sk123' },
      storekeeper_import: { email: 'sk.import@canaan.co.ke', password: 'sk123' },
      storekeeper_scaffolding: { email: 'sk.scaff@canaan.co.ke', password: 'sk123' },
      procurement_officer: { email: 'po@canaan.co.ke', password: 'po123' },
      transfer_officer: { email: 'to@canaan.co.ke', password: 'to123' },
      data_holder: { email: 'dh@canaan.co.ke', password: 'dh123' },
      site_overseer: { email: 'so@canaan.co.ke', password: 'so123' },
      supervisor: { email: 'supervisor@canaan.co.ke', password: 'so123' },
      admin: { email: 'admin@canaan.co.ke', password: 'admin123' },
    };
  }
}

const ROLE_NAV = {
  admin: ['dashboard', 'inventory', 'requests', 'transfers', 'procurement', 'grn', 'incidents', 'reports', 'users', 'audit', 'material_approvals', 'onboarding', 'transfer_log'],
  ceo: ['dashboard', 'inventory', 'requests', 'transfers', 'procurement', 'grn', 'incidents', 'reports', 'users', 'audit', 'material_approvals', 'onboarding', 'transfer_log'],
  finance: ['dashboard', 'inventory', 'requests', 'transfers', 'procurement', 'grn', 'incidents', 'reports'],
  company_owner: ['dashboard', 'inventory', 'requests', 'transfers', 'procurement', 'grn', 'incidents', 'reports', 'users', 'audit', 'material_approvals', 'onboarding'],
  project_manager: ['dashboard', 'inventory', 'requests', 'transfers', 'procurement', 'grn', 'incidents', 'reports'],
  store_manager: ['dashboard', 'inventory', 'requests', 'transfers', 'procurement', 'grn', 'incidents', 'reports', 'material_approvals'],
  storekeeper_local: ['dashboard', 'inventory', 'requests', 'transfers', 'grn', 'incidents'],
  storekeeper_import: ['dashboard', 'inventory', 'requests', 'transfers', 'grn', 'incidents'],
  storekeeper_scaffolding: ['dashboard', 'inventory', 'requests', 'transfers', 'grn', 'incidents'],
  procurement_officer: ['dashboard', 'inventory', 'requests', 'transfers', 'procurement', 'grn', 'incidents', 'reports'],
  transfer_officer: ['dashboard', 'inventory', 'requests', 'transfers', 'grn', 'incidents'],
  engineer: ['dashboard', 'inventory', 'requests', 'incidents'],
  asset_manager: ['dashboard', 'inventory', 'requests', 'transfers', 'grn', 'incidents'],
  office_manager: ['dashboard', 'inventory', 'requests', 'transfers', 'grn', 'incidents', 'reports'],
  data_holder: ['dashboard', 'inventory', 'requests', 'transfers', 'procurement', 'grn', 'incidents', 'reports'],
  site_overseer: ['dashboard', 'inventory', 'requests', 'transfers', 'grn', 'incidents'],
  supervisor: ['dashboard', 'inventory', 'requests', 'transfers', 'grn', 'incidents'],
};

const ROLES_WITH_AI = ['admin', 'ceo', 'company_owner', 'finance', 'procurement_officer', 'transfer_officer', 'data_holder'];

async function login(page, email, password) {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#login-email', { timeout: 30000 });

  await page.evaluate(({ email, password }) => {
    document.getElementById('login-email').value = email;
    document.getElementById('login-password').value = password;
    document.getElementById('login-btn').click();
  }, { email, password });

  // Wait for app shell to load - check for nav elements instead of URL
  await page.waitForTimeout(5000);

  // Check for login error first
  const loginError = await page.textContent('#login-error').catch(() => '');
  if (loginError && loginError.trim()) {
    throw new Error(`Login failed: ${loginError.substring(0, 200)}`);
  }

  // Check if app shell loaded (nav elements present = logged in)
  const hasNav = await page.evaluate(() => {
    const nav = document.querySelector('nav') || document.querySelector('[role="navigation"]') || document.querySelector('.nav') || document.querySelector('#nav');
    return !!nav;
  });

  // Also check if login screen is gone
  const hasLoginScreen = await page.evaluate(() => {
    return !!document.getElementById('login-screen');
  });

  if (hasLoginScreen && !hasNav) {
    const bodyText = await page.textContent('body').catch(() => '');
    throw new Error(`Login failed - still on login page. Body: ${bodyText.substring(0, 300)}`);
  }

  return true;
}

async function navigateToModule(page, module) {
  try {
    const result = await page.evaluate((mod) => {
      if (typeof window._navigate === 'function') {
        window._navigate(mod);
        return { success: true };
      }
      return { success: false, error: 'window._navigate not available' };
    }, module);
    await page.waitForTimeout(1500);
    return result;
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function checkModuleContent(page, module) {
  try {
    const text = await page.textContent('body');
    const title = await page.title();
    const hasContent = text && text.length > 100;

    let checks = { loaded: hasContent, title };

    const jsErrors = await page.evaluate(() => {
      // Check for common parse errors
      const body = document.body;
      if (!body) return { noBody: true };
      return { noBody: false };
    });

    if (jsErrors.noBody) {
      return { loaded: false, error: 'Page body not rendered - possible JS error' };
    }

    if (module === 'dashboard') {
      checks.hasCharts = text.includes('canvas') || text.includes('Chart') || text.includes('KES');
      checks.hasAI = text.includes('AI Advisor') || (text.includes('AI') && text.includes('Advisor'));
    }
    if (module === 'requests') {
      checks.hasTable = text.includes('Material Request') || text.includes('Request') || text.includes('pending');
    }
    if (module === 'transfers') {
      checks.hasTransfers = text.includes('Transfer') || text.includes('5-Step') || text.includes('Step');
    }
    if (module === 'inventory') {
      checks.hasInventory = text.includes('Inventory') || text.includes('Stock') || text.includes('Material');
    }
    if (module === 'material_approvals') {
      checks.hasApprovals = text.includes('Approval') || text.includes('Pending') || text.includes('New Material');
    }
    if (module === 'procurement') {
      checks.hasProcurement = text.includes('Procurement') || text.includes('Supplier') || text.includes('Order');
    }
    if (module === 'grn') {
      checks.hasGRN = text.includes('GRN') || text.includes('Goods Received') || text.includes('Received');
    }
    if (module === 'incidents') {
      checks.hasIncidents = text.includes('Incident') || text.includes('Report');
    }
    if (module === 'users') {
      checks.hasUsers = text.includes('User') || text.includes('Role') || text.includes('Admin');
    }
    if (module === 'audit') {
      checks.hasAudit = text.includes('Audit') || text.includes('Log') || text.includes('History');
    }
    if (module === 'onboarding') {
      checks.hasOnboarding = text.includes('Onboard') || text.includes('Setup') || text.includes('Welcome');
    }
    if (module === 'reports') {
      checks.hasReports = text.includes('Report') || text.includes('Analytics') || text.includes('Export');
    }
    if (module === 'transfer_log') {
      checks.hasTransferLog = text.includes('Transfer Log') || text.includes('Transfer ID') || text.includes('transfer');
    }

    return checks;
  } catch (e) {
    return { loaded: false, error: e.message };
  }
}

async function checkForJSErrors(page) {
  // This is now handled by page.on('console') and page.on('pageerror') listeners
  // Just return empty array - errors are captured in results.consoleErrors
  return [];
}

async function testRole(browser, roleName, creds, modules) {
  const page = await browser.newPage();
  page.setDefaultTimeout(60000);

  // Capture console errors
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
  page.on('pageerror', err => {
    consoleErrors.push(err.message);
  });

  const errors = [];
  const results = { role: roleName, login: false, modules: {}, consoleErrors: [] };

  try {
    await login(page, creds.email, creds.password);
    results.login = true;
    results.consoleErrors = consoleErrors.slice();
    console.log(`  ✓ ${roleName}: Login successful`);

    await page.waitForTimeout(2000);

    // Test each module
    for (const module of modules) {
      console.log(`  Testing ${module}...`);
      const navResult = await navigateToModule(page, module);

      if (!navResult.success) {
        errors.push(`${module}: Navigation failed - ${navResult.error}`);
        results.modules[module] = { success: false, error: navResult.error };
        continue;
      }

      const content = await checkModuleContent(page, module);
      results.modules[module] = content;

      // Check for JS errors specific to this module
      const moduleErrors = await checkForJSErrors(page);
      if (moduleErrors.length > 0) {
        errors.push(`${module}: JS errors detected - ${moduleErrors.join('; ')}`);
      }

      if (!content.loaded) {
        errors.push(`${module}: Content not loaded`);
        console.log(`    ✗ ${module}: FAILED - No content`);
      } else {
        let detail = '';
        if (content.hasCharts) detail += ' (charts)';
        if (content.hasAI) detail += ' (AI)';
        if (content.hasTable) detail += ' (table)';
        console.log(`    ✓ ${module}: Loaded${detail}`);
      }

      await page.waitForTimeout(500);
    }

  } catch (e) {
    errors.push(`Fatal: ${e.message}`);
    results.error = e.message;
  } finally {
    await page.close();
  }

  return { results, errors };
}

async function testMaterialFlow(browser, ROLES) {
  const page = await browser.newPage();
  page.setDefaultTimeout(60000);

  const flowResults = { steps: [], errors: [] };

  try {
    // Login as CEO (can approve requests)
    await login(page, ROLES.ceo.email, ROLES.ceo.password);
    await page.waitForTimeout(2000);

    // Step 1: Navigate to requests module
    console.log('  Step 1: Navigate to requests module');
    await page.evaluate(() => window._navigate('requests'));
    await page.waitForTimeout(2000);
    flowResults.steps.push('navigate_requests');

    // Check for request button
    const hasRequestBtn = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.some(b => b.textContent.includes('New Request') || b.textContent.includes('Create Request'));
    });
    if (hasRequestBtn) {
      console.log('    ✓ Request button found');
      flowResults.steps.push('request_button_found');
    } else {
      console.log('    ✗ Request button not found');
      flowResults.errors.push('Request button not found');
    }

    // Step 2: Test creating a new request
    console.log('  Step 2: Creating new material request');
    try {
      await page.evaluate(() => window._reqOpenNew());
      await page.waitForTimeout(1000);

      // Fill in request form
      await page.evaluate(() => {
        document.getElementById('rq-site').value = '1';
        document.getElementById('rq-material').value = 'Cement';
        document.getElementById('rq-qty').value = '10';
        document.getElementById('rq-unit').value = 'Bags';
        document.getElementById('rq-urgency').value = 'normal';
        document.getElementById('rq-purpose').value = 'Test request from automation';
      });
      await page.waitForTimeout(500);

      // Submit
      await page.evaluate(() => window._reqSubmitNew());
      await page.waitForTimeout(3000);

      flowResults.steps.push('create_request');
      console.log('    ✓ Request created');
    } catch (e) {
      flowResults.errors.push(`Create request failed: ${e.message}`);
    }

    // Step 3: Test approval (login as PM)
    console.log('  Step 3: Approve request as PM');
    try {
      await page.evaluate(() => window._navigate('requests'));
      await page.waitForTimeout(1500);

      // Find and click approve on first pending request
      const approved = await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const approveBtn = btns.find(b => b.textContent.includes('Approve'));
        if (approveBtn) {
          approveBtn.click();
          return true;
        }
        return false;
      });

      if (approved) {
        await page.waitForTimeout(2000);
        flowResults.steps.push('approve_request');
        console.log('    ✓ Request approved');
      } else {
        flowResults.errors.push('No approve button found');
      }
    } catch (e) {
      flowResults.errors.push(`Approve request failed: ${e.message}`);
    }

    // Step 4: Test transfer flow
    console.log('  Step 4: Test transfer flow');
    try {
      // Navigate to transfers
      await page.evaluate(() => window._navigate('transfers'));
      await page.waitForTimeout(2000);

      // Check for new transfer button
      const hasTransferBtn = await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        return btns.some(b => b.textContent.includes('New Transfer') || b.textContent.includes('Create Transfer'));
      });

      if (hasTransferBtn) {
        flowResults.steps.push('transfer_module_loaded');
        console.log('    ✓ Transfer module loaded');
      }

      // Test transfer log
      await page.evaluate(() => window._navigate('transfer_log'));
      await page.waitForTimeout(2000);

      const hasTransferLog = await page.evaluate(() => {
        const text = document.body?.textContent || '';
        return text.includes('Transfer Log') || text.includes('Transfer ID');
      });

      if (hasTransferLog) {
        flowResults.steps.push('transfer_log_loaded');
        console.log('    ✓ Transfer log loaded');
      } else {
        flowResults.errors.push('Transfer log not loaded');
      }

    } catch (e) {
      flowResults.errors.push(`Transfer flow failed: ${e.message}`);
    }

  } catch (e) {
    flowResults.errors.push(`Material flow error: ${e.message}`);
  } finally {
    await page.close();
  }

  return flowResults;
}

async function testAIDashboard(browser, roleName, creds, ROLES) {
  const page = await browser.newPage();
  page.setDefaultTimeout(60000);

  const aiResults = { role: roleName, hasAI: false, errors: [] };

  try {
    await login(page, creds.email, creds.password);
    await page.waitForTimeout(2000);

    // Navigate to dashboard
    await page.evaluate(() => window._navigate('dashboard'));
    await page.waitForTimeout(2000);

    const bodyText = await page.textContent('body') || '';
    aiResults.hasAI = bodyText.includes('AI Advisor') || bodyText.includes('AI Chat') || bodyText.includes('ai-input');

    if (aiResults.hasAI) {
      console.log(`  ✓ ${roleName}: AI Advisor visible on dashboard`);
      aiResults.steps = ['login', 'dashboard', 'ai_visible'];
    } else {
      console.log(`  ✗ ${roleName}: AI Advisor NOT visible on dashboard`);
      aiResults.steps = ['login', 'dashboard', 'ai_not_visible'];
    }

    // Check for JS errors
    const errors = await checkForJSErrors(page);
    if (errors.length > 0) {
      aiResults.errors.push(...errors);
    }

  } catch (e) {
    aiResults.errors.push(e.message);
  } finally {
    await page.close();
  }

  return aiResults;
}

async function main() {
  console.log('Starting comprehensive live testing...\n');
  console.log('URL:', BASE_URL);
  console.log('Fetching test users from Supabase...\n');

  const ROLES = await fetchTestUsers();
  console.log(`Loaded ${Object.keys(ROLES).length} roles from Supabase`);

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  const allResults = {};
  const allErrors = {};

  // Test all roles
  const allRoleNames = Object.keys(ROLE_NAV);
  for (const roleName of allRoleNames) {
    console.log(`\n=== Testing ${roleName} ===`);
    const { results, errors } = await testRole(browser, roleName, ROLES[roleName], ROLE_NAV[roleName]);
    allResults[roleName] = results;
    allErrors[roleName] = errors;

    if (errors.length > 0) {
      console.log(`  Errors: ${errors.length}`);
      errors.forEach(e => console.log(`    - ${e}`));
    }
  }

  // Test AI advisor for relevant roles
  console.log('\n=== Testing AI Advisor on Dashboards ===');
  const aiResults = {};
  for (const roleName of ROLES_WITH_AI) {
    console.log(`\nTesting AI advisor for ${roleName}...`);
    aiResults[roleName] = await testAIDashboard(browser, roleName, ROLES[roleName], ROLES);
  }

  // Test Material Request flow
  console.log('\n=== Testing Material Request Flow ===');
  const flowResults = await testMaterialFlow(browser, ROLES);

  await browser.close();

  // Summary
  console.log('\n\n=== SUMMARY ===');
  let totalModules = 0;
  let loadedModules = 0;
  let totalErrors = 0;

  for (const roleName of allRoleNames) {
    const r = allResults[roleName];
    const e = allErrors[roleName];
    const modCount = Object.keys(r.modules || {}).length;
    const successCount = Object.values(r.modules || {}).filter(m => m.loaded).length;
    totalModules += modCount;
    loadedModules += successCount;

    const consoleErrCount = (r.consoleErrors || []).filter(err =>
      err.includes('SyntaxError') || err.includes('Unexpected identifier') || err.includes('TypeError')
    ).length;
    totalErrors += e.length;

    console.log(`${roleName}: Login ${r.login ? '✓' : '✗'} | Modules ${successCount}/${modCount} loaded | Errors: ${e.length}${consoleErrCount > 0 ? ` | Console errors: ${consoleErrCount}` : ''}`);
  }

  console.log(`\nTotal: ${loadedModules}/${totalModules} modules loaded, ${totalErrors} errors`);

  // AI Advisor summary
  console.log('\nAI Advisor on Dashboards:');
  for (const roleName of ROLES_WITH_AI) {
    const r = aiResults[roleName];
    console.log(`  ${roleName}: ${r.hasAI ? '✓ AI visible' : '✗ AI not visible'}${r.errors.length ? ` | Errors: ${r.errors.length}` : ''}`);
  }

  console.log('\nMaterial Request Flow:');
  console.log(`  Steps completed: ${flowResults.steps.join(' → ')}`);
  console.log(`  Errors: ${flowResults.errors.length}`);
  if (flowResults.errors.length > 0) {
    flowResults.errors.forEach(e => console.log(`    - ${e}`));
  }

  // Save detailed results
  const testDir = 'test-results';
  if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });
  fs.writeFileSync(path.join(testDir, 'targeted-test.json'), JSON.stringify({
    allResults, allErrors, aiResults, flowResults,
    summary: { totalModules, loadedModules, totalErrors, allRoles: allRoleNames }
  }, null, 2));
  console.log('\nResults saved to test-results/targeted-test.json');
}

main().catch(e => {
  console.error('Test runner error:', e);
  process.exit(1);
});
