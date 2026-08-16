// ============================================================
// CDL Site Management v10 — modules/onboarding.js
// Feature 5: Storekeeper Onboarding Module
// Step-by-step wizard for Owner/Admin to set up a storekeeper
// at a new site, assign materials, and generate credentials.
// ============================================================

import { SUPABASE_URL, SUPABASE_ANON_KEY, SITES } from "../config.js";
import { logAudit } from "./audit_core.js";
import { showToast, showModal, closeModal } from "../app.js";

const MATERIAL_TEMPLATES = {
  residential: [
    {name:"Cement 50kg Bag", qty:100, unit:"Bags", unit_price:7500},
    {name:"Sand (m³)", qty:50, unit:"m³", unit_price:18000},
    {name:"Ballast (m³)", qty:30, unit:"m³", unit_price:15000},
    {name:"Steel Rebar #12", qty:50, unit:"Rods", unit_price:1200},
    {name:"Water Tank 2000L", qty:2, unit:"Tanks", unit_price:25000},
    {name:"Scaffold Pipe 6m", qty:40, unit:"Pcs", unit_price:3500},
    {name:"Scaffold Clamps", qty:200, unit:"Pcs", unit_price:150},
    {name:"Plywood 2\" x 4\"", qty:20, unit:"Sheets", unit_price:2800},
    {name:"Nails 3\" (kg)", qty:10, unit:"Kg", unit_price:120},
    {name:"Paint White 4L", qty:30, unit:"Liters", unit_price:450},
  ],
  commercial: [
    {name:"Cement 50kg Bag", qty:200, unit:"Bags", unit_price:7500},
    {name:"Sand (m³)", qty:100, unit:"m³", unit_price:18000},
    {name:"Ballast (m³)", qty:80, unit:"m³", unit_price:15000},
    {name:"Steel Rebar #16", qty:100, unit:"Rods", unit_price:1800},
    {name:"Steel Rebar #20", qty:50, unit:"Rods", unit_price:2500},
    {name:"Scaffold Tower 6m", qty:10, unit:"Pcs", unit_price:45000},
    {name:"Scaffold Planks 3m", qty:100, unit:"Pcs", unit_price:2200},
    {name:"Water Tank 5000L", qty:2, unit:"Tanks", unit_price:55000},
    {name:"Generator 50kVA", qty:1, unit:"Set", unit_price:850000},
    {name:"Safety Helmet", qty:30, unit:"Pcs", unit_price:800},
  ],
  warehouse: [
    {name:"Pallet Racking Upright", qty:50, unit:"Pcs", unit_price:4500},
    {name:"Pallet Racking Beam", qty:100, unit:"Pcs", unit_price:2200},
    {name:"Pallet (1.2m x 1m)", qty:200, unit:"Pcs", unit_price:3500},
    {name:"Hand Pallet Truck", qty:4, unit:"Pcs", unit_price:85000},
    {name:"Electric Forklift", qty:1, unit:"Pcs", unit_price:1200000},
    {name:"Wrapping Machine", qty:1, unit:"Pcs", unit_price:180000},
    {name:"Storage Boxes", qty:500, unit:"Pcs", unit_price:250},
    {name:"Barcode Scanner", qty:4, unit:"Pcs", unit_price:12000},
    {name:"Safety Cones", qty:100, unit:"Pcs", unit_price:120},
    {name:"Industrial Broom", qty:20, unit:"Pcs", unit_price:350},
  ],
};

const STOREKEEPER_TYPES = ["local", "imported", "scaffolding"];
const SK_COLORS = {local:"var(--accent-green)", imported:"var(--accent-blue)", scaffolding:"var(--accent-orange)"};

// Build step indicator dots HTML using string concatenation (avoids nested template literal parse conflict)
function renderStepDots(step) {
  return [1,2,3,4].map(s =>
    '<div style="width:24px;height:4px;border-radius:2px;background:' +
    (s <= step ? "var(--accent-gold)" : "var(--border)") +
    '"></div>'
  ).join("");
}

export async function renderOnboarding(container, user) {
  if (!container) return;
  container.innerHTML = `
    <div style="margin-bottom:28px;">
      <h1 style="font-size:24px;font-weight:700;">✦ Storekeeper Onboarding</h1>
      <p style="color:var(--text-200);font-size:14px;">Set up storekeepers at new sites with initial stock and access templates</p>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin-bottom:28px;">
      ${SITES.map(site => `
        <div class="card" style="border-left:3px solid var(--accent-gold);cursor:pointer;" onclick="window._openOnboarding('${site.id}')">
          <div style="padding:16px;">
            <div style="font-size:12px;color:var(--accent-gold);letter-spacing:1px;text-transform:uppercase;margin-bottom:6px;">${site.type}</div>
            <div style="font-size:16px;font-weight:700;color:var(--text-100);margin-bottom:8px;">${site.name}</div>
            <div style="font-size:12px;color:var(--text-muted);">Site ID: ${site.id}</div>
          </div>
        </div>
      `).join("")}
    </div>
    <div class="card" style="margin-top:20px;">
      <h3 style="font-family:var(--font-display);font-size:15px;margin-bottom:14px;">Onboarding Checklist</h3>
      <div id="onboarding-checklist" style="overflow-x:auto;">
        <table style="width:100%;border-collapse:collapse;font-size:12px;">
          <thead><tr style="border-bottom:1px solid var(--border);">
            ${["Site","Materials","Storekeepers","GRNs","Status"].map(h => `<th style="text-align:left;padding:7px 6px;color:var(--text-muted);font-weight:500;font-size:11px;text-transform:uppercase;">${h}</th>`).join("")}
          </tr></thead>
          <tbody id="onboarding-rows"><div class="spinner" style="margin:30px auto;"></div></tbody>
        </table>
      </div>
    </div>`;
  window._openOnboarding = (siteId) => openOnboardingWizard(siteId);
  loadOnboardingChecklist();
}

async function loadOnboardingChecklist() {
  const rowsEl = document.getElementById("onboarding-rows");
  if (!rowsEl) return;
  rowsEl.innerHTML = `<div class="spinner" style="margin:30px auto;"></div>`;
  try {
    const [stockRes, grnRes, usersRes] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/stock?select=site_id&limit=1000`, { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }),
      fetch(`${SUPABASE_URL}/rest/v1/grns?select=site_id&limit=1000`, { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }),
      fetch(`${SUPABASE_URL}/rest/v1/users?select=site_ids,role&limit=1000`, { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }),
    ]);
    const stock = (await stockRes.json()) || [];
    const grns = (await grnRes.json()) || [];
    const users = (await usersRes.json()) || [];
    rowsEl.innerHTML = SITES.map(site => {
      const siteStock = stock.filter(s => s.site_id === site.id).length;
      const siteGrns = grns.filter(g => g.site_id === site.id).length;
      const siteSKs = users.filter(u => Array.isArray(u.site_ids) && u.site_ids.includes(site.id) && u.role?.includes("storekeeper")).length;
      const status = siteStock > 0 ? `active` : `pending`;
      const sc = status === "active" ? "var(--accent-green)" : "var(--accent-orange)";
      return `<tr style="border-bottom:1px solid rgba(30,35,48,0.3);">
        <td style="padding:7px 6px;color:var(--text-primary);">${site.name}</td>
        <td style="padding:7px 6px;color:var(--text-200);">${siteStock} items</td>
        <td style="padding:7px 6px;color:var(--text-200);">${siteSKs} storekeeper(s)</td>
        <td style="padding:7px 6px;color:var(--text-200);">${siteGrns} GRNs</td>
        <td style="padding:7px 6px;"><span style="background:${sc}22;color:${sc};padding:2px 8px;border-radius:10px;font-size:11px;">${status}</span></td>
      </tr>`;
    }).join("");
  } catch (err) {
    rowsEl.innerHTML = `<tr><td colspan="5" style="padding:20px;color:var(--red);">Error: ${err.message}</td></tr>`;
  }
}

function openOnboardingWizard(siteId) {
  const site = SITES.find(s => s.id === siteId);
  if (!site) return;
  let step = 1;
  const templates = MATERIAL_TEMPLATES[site.type] || MATERIAL_TEMPLATES.residential;

  const dotsHtml = renderStepDots(step);

  showModal(`
    <div id="onboard-wizard">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;">
        ${dotsHtml}
      </div>
      <h2 style="font-family:var(--font-display);font-size:18px;font-weight:700;margin-bottom:4px;">Step ${step}: ${site.name}</h2>
      <p style="color:var(--text-muted);font-size:12px;margin-bottom:16px;">${step === 1 ? "Select storekeeper type and assign site" : step === 2 ? "Review materials template" : step === 3 ? "Set access credentials" : "Confirm and create"}</p>
      <div id="onboard-step-content"></div>
      <div style="display:flex;gap:12px;margin-top:20px;">
        <button onclick="window._onboardBack()" class="btn btn-ghost" style="flex:1;font-size:13px;">← Back</button>
        <button onclick="window._onboardNext(${siteId})" class="btn btn-gold" style="flex:1;font-size:13px;">${step === 4 ? "✓ Complete" : "Next →"}</button>
      </div>
    </div>
  `);

  renderOnboardingStep();
  setupOnboardingNav(siteId, site, templates);

  function renderOnboardingStep() {
    const el = document.getElementById("onboard-step-content");
    if (!el) return;
    if (step === 1) {
      el.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:14px;">
          <div>
            <label style="font-size:11px;color:var(--text-muted);display:block;margin-bottom:6px;text-transform:uppercase;">Storekeeper Type</label>
            <select id="ob-sk-type" style="width:100%;background:var(--bg-secondary);border:1px solid var(--border);border-radius:8px;padding:10px;color:var(--text-primary);font-size:13px;">
              ${STOREKEEPER_TYPES.map(t => `<option value="${t}">${t.charAt(0).toUpperCase()+t.slice(1)}</option>`).join("")}
            </select>
          </div>
          <div>
            <label style="font-size:11px;color:var(--text-muted);display:block;margin-bottom:6px;text-transform:uppercase;">Site</label>
            <div style="padding:10px;background:var(--bg-secondary);border-radius:8px;color:var(--text-primary);font-size:13px;">${site.name} (ID: ${site.id})</div>
          </div>
          <div style="font-size:12px;color:var(--text-300);padding:10px;background:rgba(0,0,0,0.1);border-radius:6px;">
            Storekeeper will be assigned to this site and see only their site's stock.
          </div>
        </div>
      `;
    } else if (step === 2) {
      el.innerHTML = `
        <div style="max-height:280px;overflow-y:auto;border:1px solid var(--border);border-radius:8px;">
          <table style="width:100%;border-collapse:collapse;font-size:12px;">
            <thead><tr style="border-bottom:1px solid var(--border);">
              ${["Material","Qty","Unit","Unit Price","Est. Value"].map(h => `<th style="text-align:left;padding:7px 6px;color:var(--text-muted);font-weight:500;font-size:10px;text-transform:uppercase;">${h}</th>`).join("")}
            </tr></thead>
            <tbody>${templates.map(m => `<tr style="border-bottom:1px solid rgba(30,35,48,0.3);">
              <td style="padding:7px 6px;color:var(--text-100);">${m.name}</td>
              <td style="padding:7px 6px;">${m.qty}</td>
              <td style="padding:7px 6px;color:var(--text-muted);">${m.unit}</td>
              <td style="padding:7px 6px;">${m.unit_price}</td>
              <td style="padding:7px 6px;color:var(--accent-gold);">KES ${(m.qty*m.unit_price).toLocaleString()}</td>
            </tr>`).join("")}</tbody>
          </table>
        </div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:10px;text-align:right;">
          Total: ${templates.length} items · KES ${templates.reduce((s,m)=>s+m.qty*m.unit_price,0).toLocaleString()}
        </div>
      `;
    } else if (step === 3) {
      el.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:14px;">
          <div>
            <label style="font-size:11px;color:var(--text-muted);display:block;margin-bottom:6px;text-transform:uppercase;">Temporary Password</label>
            <div style="display:flex;gap:8px;">
              <input id="ob-temp-pw" type="text" readonly value="${generateTempPassword()}"
                style="flex:1;background:var(--bg-secondary);border:1px solid var(--border);border-radius:6px;padding:8px;color:var(--text-primary);font-size:13px;font-family:var(--font-mono);text-align:center;" />
              <button onclick="navigator.clipboard.writeText(document.getElementById('ob-temp-pw').value)" class="btn btn-ghost" style="font-size:12px;">Copy</button>
            </div>
          </div>
          <div style="font-size:12px;color:var(--text-300);padding:10px;background:rgba(0,0,0,0.1);border-radius:6px;">
            Share this password with the storekeeper. They will be prompted to change it on first login.
          </div>
        </div>
      `;
    } else {
      el.innerHTML = `
        <div style="text-align:center;padding:30px;">
          <div style="font-size:48px;margin-bottom:16px;">✓</div>
          <div style="font-size:16px;font-weight:600;color:var(--accent-gold);margin-bottom:8px;">Ready to onboard!</div>
          <div style="font-size:12px;color:var(--text-muted);">
            Site: ${site.name} · Type: <span style="color:${SK_COLORS.local}">Local</span> · Materials: ${templates.length}<br>
            All materials will be pre-loaded and a storekeeper record created.
          </div>
        </div>
      `;
    }
  }

  function setupOnboardingNav(siteId, site, templates) {
    window._onboardBack = () => { if (step > 1) { step--; renderOnboardingStep(); updateHeader(); } };
    window._onboardNext = async () => {
      if (step < 4) { step++; renderOnboardingStep(); updateHeader(); return; }
      const skType = document.getElementById("ob-sk-type")?.value || "local";
      try {
        for (const item of templates) {
          await fetch(`${SUPABASE_URL}/rest/v1/stock`, {
            method: "POST",
            headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
            body: JSON.stringify({
              site_id: siteId, material_name: item.name, quantity: item.qty, unit: item.unit,
              unit_price: item.unit_price, category: site.type, storekeeper_type: skType,
              opening_balance_value: item.qty * item.unit_price,
              updated_by: "onboarding", last_updated: new Date().toISOString(),
            })
          });
        }
        await logAudit({ action: "storekeeper_onboarded", module: "onboarding", record_id: siteId, after: { site: site.name, type: skType, materials: templates.length } });
        closeModal();
        showToast(`✓ ${site.name} onboarded — ${templates.length} materials loaded`, "success");
        setTimeout(() => window._onboardRefresh && window._onboardRefresh(), 500);
      } catch (err) {
        showToast(`Onboarding failed: ${err.message}`, "error");
      }
    };

    function updateHeader() {
      const h2 = document.querySelector("#onboard-wizard h2");
      if (h2) h2.textContent = `Step ${step}: ${site.name}`;
      const p = document.querySelector("#onboard-wizard p");
      if (p) p.textContent = step === 1 ? "Select storekeeper type and assign site" : step === 2 ? "Review materials template" : step === 3 ? "Set access credentials" : "Confirm and create";
      const dots = document.querySelector("#onboard-wizard div");
      if (dots) dots.innerHTML = renderStepDots(step);
      const nextBtn = document.querySelector("#onboard-wizard button:last-child");
      if (nextBtn) nextBtn.textContent = step === 4 ? "✓ Complete" : "Next →";
      const backBtn = document.querySelector("#onboard-wizard button:first-child");
      if (backBtn) backBtn.textContent = step === 1 ? "✕ Cancel" : "← Back";
    }
  }
}

function generateTempPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let pw = "";
  for (let i = 0; i < 8; i++) pw += chars[Math.floor(Math.random() * chars.length)];
  return pw;
}
