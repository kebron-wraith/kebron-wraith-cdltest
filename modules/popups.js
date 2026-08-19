// CDL — modules/popups.js
import { callAI } from "./ai_engine.js";
import { getSystemPrompt } from "./ai_roles.js";
import { SUPABASE_URL, SUPABASE_ANON_KEY, LOGO_URL } from "../config.js";
import { ROLES } from "./roles.js";

const TODAY = new Date().toDateString();

export async function triggerLoginPopup(user) {
  const role = ROLES[user.role] || {};
  if (!role.showPopups || navigator.webdriver) return;
  const key = `cdl_popup_${user.id}_${TODAY}`;
  if (localStorage.getItem(key)) return;
  localStorage.setItem(key, "1");
  if (user.role === "company_owner") await showOwnerPopup(user);
  else if (["ceo", "asset_manager", "office_manager"].includes(user.role)) await showExecPopup(user);
  else if (user.role === "project_manager") await showPMPopup(user);
}

async function showOwnerPopup(user) {
  const yesterday = new Date(Date.now() - 86400000).toISOString();
  const [incidents, requests, grns] = await Promise.all([
    fetch(`${SUPABASE_URL}/rest/v1/incidents?created_at=gte.${yesterday}&select=type,estimated_value`, { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }).then(r => r.json()).catch(() => []),
    fetch(`${SUPABASE_URL}/rest/v1/material_requests?status=eq.pending&select=id,urgency`, { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }).then(r => r.json()).catch(() => []),
    fetch(`${SUPABASE_URL}/rest/v1/grns?status=eq.pending&select=id`, { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }).then(r => r.json()).catch(() => []),
  ]);
  const critReqs = requests.filter(r => r.urgency === "critical").length;
  const incLoss = incidents.reduce((s, i) => s + (i.estimated_value || 0), 0);
  const overlay = document.createElement("div");
  overlay.id = "cdl-popup-overlay";
  overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:600;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(8px);";
  overlay.innerHTML = `<div style="max-width:560px;width:92%;background:var(--bg-600);border:1px solid var(--gold);border-radius:20px;padding:36px;position:relative;animation:fadeIn 0.4s ease;box-shadow:0 0 60px rgba(200,169,110,0.2);"><div style="text-align:center;margin-bottom:28px;"><img src="${LOGO_URL}" style="height:52px;object-fit:contain;margin-bottom:16px;filter:drop-shadow(0 0 16px rgba(200,169,110,0.4));" onerror="this.style.display='none'"><div style="font-size:11px;color:var(--gold);letter-spacing:3px;text-transform:uppercase;margin-bottom:8px;">✦ Good ${getGreeting()}, ${user.name.split(" ")[0]}</div><h2 style="font-size:22px;font-weight:800;color:var(--text-100);">Executive Brief — ${new Date().toLocaleDateString("en-KE",{weekday:"long",month:"long",day:"numeric"})}</h2></div><div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:24px;">${[{icon:"📋",val:requests.length,label:"Pending Requests",c:critReqs>0?"var(--red)":"var(--gold)"},{icon:"📦",val:grns.length,label:"GRNs Awaiting",c:"var(--blue)"},{icon:"💸",val:`KES ${incLoss.toLocaleString()}`,label:"Overnight Losses",c:incLoss>0?"var(--red)":"var(--green)"}].map(k=>`<div style="background:var(--bg-700);border-radius:10px;padding:14px;text-align:center;"><div style="font-size:20px;margin-bottom:6px;">${k.icon}</div><div style="font-size:18px;font-weight:700;color:${k.c};">${k.val}</div><div style="font-size:11px;color:var(--text-300);margin-top:4px;">${k.label}</div></div>`).join("")}</div><div id="popup-ai-brief" style="background:var(--bg-700);border-radius:10px;padding:16px;margin-bottom:20px;font-size:13px;color:var(--text-200);line-height:1.7;min-height:60px;"><div class="spinner" style="margin:0 auto;width:24px;height:24px;border-width:2px;"></div></div><button onclick="document.getElementById('cdl-popup-overlay').remove()" class="btn btn-gold" style="width:100%;">Begin the Day →</button></div>`;
  document.body.appendChild(overlay);
  const brief = await callAI(`Generate a 2-sentence executive morning brief for the Company Owner of Canaan Developers Ltd. Data: ${requests.length} pending requests (${critReqs} critical), ${grns.length} GRNs unverified, KES ${incLoss.toLocaleString()} in overnight incidents. Be concise, actionable, KES currency.`, getSystemPrompt(user, {}));
  const el = document.getElementById("popup-ai-brief");
  if (el) el.innerHTML = `<span style="color:var(--gold);margin-right:8px;">✦</span>${brief || "All systems operational. Have a productive day."}`;
}

async function showExecPopup(user) {
  const overlay = document.createElement("div");
  overlay.id = "cdl-popup-overlay";
  overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:600;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(8px);";
  overlay.innerHTML = `<div style="max-width:440px;width:92%;background:var(--bg-600);border:1px solid var(--border);border-radius:16px;padding:28px;animation:fadeIn 0.3s ease;"><div style="font-size:11px;color:var(--blue);letter-spacing:2px;margin-bottom:10px;">${getGreeting().toUpperCase()} · ${ROLES[user.role]?.label||user.role}</div><h2 style="font-size:20px;font-weight:700;margin-bottom:16px;">Welcome back, ${user.name.split(" ")[0]}</h2><p style="color:var(--text-200);font-size:13px;line-height:1.6;margin-bottom:20px;">Your dashboard is ready. All systems are operational.</p><button onclick="document.getElementById('cdl-popup-overlay').remove()" class="btn btn-gold" style="width:100%;">Open Dashboard →</button></div>`;
  document.body.appendChild(overlay);
  setTimeout(() => overlay.remove(), 6000);
}

async function showPMPopup(user) {
  const siteIds = user.site_ids || [];
  const siteParam = siteIds.length ? `site_id=in.(${siteIds.join(",")})&` : "";
  const requests = await fetch(`${SUPABASE_URL}/rest/v1/material_requests?${siteParam}status=eq.pending&select=id`, { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }).then(r => r.json()).catch(() => []);
  const overlay = document.createElement("div");
  overlay.id = "cdl-popup-overlay";
  overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:600;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(8px);";
  overlay.innerHTML = `<div style="max-width:380px;width:92%;background:var(--bg-600);border:1px solid var(--border);border-radius:16px;padding:28px;animation:fadeIn 0.3s ease;"><div style="font-size:11px;color:var(--gold);letter-spacing:2px;margin-bottom:10px;">📍 YOUR SITE · PROJECT MANAGER</div><h2 style="font-size:20px;font-weight:700;margin-bottom:16px;">${getGreeting()}, ${user.name.split(" ")[0]}</h2>${requests.length ? `<div style="background:rgba(231,76,60,0.1);border:1px solid var(--red);border-radius:8px;padding:12px;margin-bottom:16px;font-size:13px;color:var(--red);">⚠ ${requests.length} material request${requests.length>1?"s":""} awaiting your approval</div>` : `<div style="background:rgba(46,160,67,0.1);border-radius:8px;padding:12px;margin-bottom:16px;font-size:13px;color:var(--green);">✓ No pending approvals — site running smoothly</div>`}<button onclick="document.getElementById('cdl-popup-overlay').remove()" class="btn btn-gold" style="width:100%;">Open Dashboard →</button></div>`;
  document.body.appendChild(overlay);
  setTimeout(() => overlay.remove(), 8000);
}

function getGreeting() { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; }
