const { test, expect } = require('@playwright/test');

const LIVE_URL = 'https://cdllivetest.netlify.app';

const CREDENTIALS = {
  am:     { email: 'am@canaan.co.ke',        password: 'am123',      canvas: 'am-chart',      role: 'AM'      },
  ceo:    { email: 'ceo@canaan.co.ke',       password: 'ceo123',     canvas: 'ceo-site-chart',role: 'CEO'     },
  finance:{ email: 'finance@canaan.co.ke',   password: 'finance123', canvas: 'fin-chart',     role: 'Finance' },
  owner:  { email: 'admin@canaan.co.ke',     password: 'admin123',   canvas: 'owner-chart',   role: 'Owner'   },
};

async function loginAs(page, email, password) {
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', err => errors.push(err.message));

  await page.goto(LIVE_URL);
  await page.waitForTimeout(1500);

  await page.fill('#login-email', email);
  await page.fill('#login-password', password);
  await page.click('#login-btn');
  await page.waitForTimeout(2000);

  const sidebar = await page.$('#sidebar');
  const loginOk = !!sidebar;
  if (!loginOk) {
    const errText = await page.evaluate(() => {
      const el = document.querySelector('#login-error') || document.querySelector('[id*="error"]');
      return el ? el.textContent.trim().substring(0, 200) : 'unknown';
    });
    throw new Error(`Login failed for ${email}: ${errText}`);
  }
  return errors;
}

test.describe('Dashboard chart rendering', () => {
  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status === 'failed' || testInfo.status === 'flaky') {
      await page.screenshot({ path: `tests/test-results/failure-${testInfo.title.replace(/\s/g,'_')}.png` });
    }
  });

  for (const [key, cred] of Object.entries(CREDENTIALS)) {
    test(`${cred.role} dashboard chart renders`, async ({ page }) => {
      const errors = await loginAs(page, cred.email, cred.password);

      // Wait for setTimeout chart init (100ms delay) + data fetch
      await page.waitForTimeout(2000);

      // Debug: dump page state
      const debugInfo = await page.evaluate(() => {
        const mainEl = document.querySelector('#main-content, #app, main, [class*="container"]') || document.body;
        const allCanvases = Array.from(document.querySelectorAll('canvas')).map(c => ({ id: c.id, class: c.className }));
        return {
          url: window.location.href,
          title: document.title,
          bodyHTML: mainEl.innerHTML.substring(0, 2000),
          allCanvases,
        };
      });
      console.log(`${cred.role} debug:`, JSON.stringify(debugInfo, null, 2));

      const chartData = await page.evaluate((canvasId) => {
        const cv = document.getElementById(canvasId);
        if (!cv) return { exists: false };
        const ctx = cv.getContext('2d');
        const chart = cv._chart;
        return {
          exists: true,
          hasChart: !!chart,
          chartType: chart?.config?.type || null,
          dataLabelCount: chart?.data?.labels?.length || 0,
          datasetCount: chart?.data?.datasets?.length || 0,
          firstDatasetDataLen: chart?.data?.datasets?.[0]?.data?.length || 0,
          canvasWidth: cv.width,
          canvasHeight: cv.height,
          clientWidth: cv.clientWidth,
          clientHeight: cv.clientHeight,
        };
      }, cred.canvas);

      console.log(`${cred.role} canvas (${cred.canvas}):`, JSON.stringify(chartData, null, 2));

      const chartErrors = errors.filter(e =>
        e.includes('[AM Chart]') ||
        e.includes('[CEO Chart]') ||
        e.includes('[Finance Chart]') ||
        e.includes('[Owner Chart]')
      );
      expect(chartErrors).toStrictEqual([]);
    });
  }

  test('Reports page charts render', async ({ page }) => {
    const errors = await loginAs(page, CREDENTIALS.owner.email, CREDENTIALS.owner.password);

    // Navigate to Reports
    await page.click('#nav-reports');
    await page.waitForTimeout(3000);

    const canvases = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('canvas')).map(c => {
        const chart = c._chart;
        return {
          id: c.id,
          hasChart: !!chart,
          chartType: chart?.config?.type || null,
          dataLabels: chart?.data?.labels?.length || 0,
          datasetCount: chart?.data?.datasets?.length || 0,
        };
      });
    });

    console.log('Reports page canvases:', JSON.stringify(canvases, null, 2));

    const chartCanvases = canvases.filter(c =>
      ['chart-requests', 'chart-transfers', 'chart-stock-cat', 'chart-procurement'].includes(c.id)
    );

    for (const c of chartCanvases) {
      expect(c.hasChart).toBe(true);
      expect(c.chartType).toBeTruthy();
    }
  });
});
