// CDL — modules/dashboards_pm.js
// Project Manager: Their assigned site(s) only. Spec: site-scoped, with daily popup.
import { SUPABASE_URL, SUPABASE_ANON_KEY, SITES, LOGO_URL } from "../config.js";
import { initAIChat } from "./ai_chat.js";

export async function renderPMDashboard(container, user) {
  const siteIds = user.site_ids || [];
  const siteParam = siteIds.length ? `site_id=in.(${siteIds.join(",")})` : "";
  const siteNames = siteIds.map(id=>SITES.find(s=>s.id===id)?.name||`Site ${id}`).join(", ");

  container.innerHTML = `
    <div style="margin-bottom:24px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
      <div>
        <div style="font-size:11px;color:var(--accent-blue);letter-spacing:2px;text-transform:uppercase;margin-bottom:6px;">
          📍 ${siteNames||"Your Site"}
        </div>
        <h1 style="font-family:var(--font-display);font-size:26px;font-weight:800;">Project Manager</h1>
      </div>
      <img src="${LOGO_URL}" style="height:40px;object-fit:contain;opacity:0.8;" onerror="this.style.display='none'" />
    </div>
    <div id="pm-kpis" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:14px;margin-bottom:24px;"></div>
    <div style="display:grid;grid-template-columns:1fr 1fr 320px;gap:20px;">
      <div class="card">
        <h3 style="font-family:var(--font-display);font-size:15px;margin-bottom:14px;">📋 Pending Requests</h3>
        <div id="pm-requests">Loading…</div>
      </div>
      <div class="card">
        <h3 style="font-family:var(--font-display);font-size:15px;margin-bottom:14px;">⚠️ Low Stock Items</h3>
        <div id="pm-stock">Loading…</div>
      </div>
      <div class="card" style="display:flex;flex-direction:column;height:420px;">
        <h3 style="font-family:var(--font-display);font-size:14px;margin-bottom:12px;">💬 AI Advisor</h3>
        <div id="ai-chat-messages" style="flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:8px;margin-bottom:10px;"></div>
        <div style="display:flex;gap:8px;">
          <input id="ai-input" type="text" placeholder="Ask about your site…"
            style="flex:1;background:var(--bg-secondary);border:1px solid var(--border);border-radius:8px;padding:9px;color:var(--text-primary);font-size:13px;" />
          <button id="ai-send" style="background:var(--accent-blue);border:none;border-radius:8px;padding:9px 14px;color:#fff;font-weight:700;cursor:pointer;">→</button>
        </div>
      </div>
    </div>`;

  const [requests, stock, grns] = await Promise.all([
    fetch(`${SUPABASE_URL}/rest/v1/material_requests?status=eq.pending&${siteParam}&order=created_at.desc&limit=20`,
      {headers:{apikey:SUPABASE_ANON_KEY,Authorization:`Bearer ${SUPABASE_ANON_KEY}`}}).then(r=>r.json()).catch(()=>[]),
    fetch(`${SUPABASE_URL}/rest/v1/stock?${siteParam}&limit=200`,
      {headers:{apikey:SUPABASE_ANON_KEY,Authorization:`Bearer ${SUPABASE_ANON_KEY}`}}).then(r=>r.json()).catch(()=>[]),
    fetch(`${SUPABASE_URL}/rest/v1/grns?status=eq.pending&${siteParam}&select=id&limit=20`,
      {headers:{apikey:SUPABASE_ANON_KEY,Authorization:`Bearer ${SUPABASE_ANON_KEY}`}}).then(r=>r.json()).catch(()=>[]),
  ]);

  const low = stock.filter(i=>(i.quantity||0)<10&&(i.quantity||0)>0).length;
  const siteVal = stock.reduce((s,i)=>s+((i.quantity||0)*(i.unit_price||0)),0);

  document.getElementById("pm-kpis").innerHTML = [
    {icon:"📋",label:"Pending Requests",val:requests.length,c:"var(--accent-orange)"},
    {icon:"⚠️",label:"Low Stock",val:low,c:"var(--accent-red)"},
    {icon:"📦",label:"Pending GRNs",val:grns.length,c:"var(--accent-blue)"},
    {icon:"💰",label:"Site Value",val:`KES ${(siteVal/1000).toFixed(0)}K`,c:"var(--accent-gold)"},
  ].map(k=>`<div class="card" style="border-top:2px solid ${k.c};padding:16px;text-align:center;">
    <div style="font-size:20px;margin-bottom:6px;">${k.icon}</div>
    <div style="font-size:22px;font-weight:700;color:${k.c};font-family:var(--font-display);">${k.val}</div>
    <div style="font-size:12px;color:var(--text-muted);margin-top:4px;">${k.label}</div>
  </div>`).join("");

  document.getElementById("pm-requests").innerHTML = requests.length
    ? requests.slice(0,6).map(r=>`<div style="padding:9px 0;border-bottom:1px solid var(--border);">
        <div style="font-size:13px;color:var(--text-primary);">${r.material_name} × ${r.quantity} ${r.unit||""}</div>
        <div style="font-size:11px;margin-top:3px;color:${r.urgency==="critical"?"var(--accent-red)":"var(--accent-orange)"};">${r.urgency}</div>
      </div>`).join("")
    : `<div style="color:var(--accent-green);font-size:13px;text-align:center;padding:20px;">✓ No pending requests</div>`;

  const lowItems = stock.filter(i=>(i.quantity||0)<10).slice(0,6);
  document.getElementById("pm-stock").innerHTML = lowItems.length
    ? lowItems.map(i=>`<div style="display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid var(--border);font-size:13px;">
        <span style="color:var(--text-primary);">${i.material_name}</span>
        <span style="color:${(i.quantity||0)<5?"var(--accent-red)":"var(--accent-orange)"};">${i.quantity} ${i.unit||""}</span>
      </div>`).join("")
    : `<div style="color:var(--accent-green);font-size:13px;text-align:center;padding:20px;">✓ Stock OK</div>`;

  initAIChat(user);
}
