// CDL — modules/dashboards_am.js
// Asset Manager: All sites stock, transfers, procurement queue. NO budget tab.
import { SUPABASE_URL, SUPABASE_ANON_KEY, SITES, LOGO_URL } from "../config.js";
import { initAIChat } from "./ai_chat.js";

export async function renderAMDashboard(container, user) {
  container.innerHTML = `
    <div style="margin-bottom:24px;display:flex;align-items:center;justify-content:space-between;">
      <div>
        <div style="font-size:11px;color:var(--accent-green);letter-spacing:2px;text-transform:uppercase;margin-bottom:6px;">
          ◆ OPERATIONS HUB
        </div>
        <h1 style="font-family:var(--font-display);font-size:26px;font-weight:800;">Asset Manager</h1>
      </div>
      <img src="${LOGO_URL}" style="height:40px;object-fit:contain;opacity:0.8;" onerror="this.style.display='none'" />
    </div>
    <div id="am-kpis" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:14px;margin-bottom:24px;"></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px;">
      <div class="card">
        <h3 style="font-family:var(--font-display);font-size:15px;margin-bottom:14px;">🚚 Transfer Pipeline</h3>
        <div id="am-transfers">Loading…</div>
      </div>
      <div class="card">
        <h3 style="font-family:var(--font-display);font-size:15px;margin-bottom:14px;">🛒 Procurement Queue</h3>
        <div id="am-procurement">Loading…</div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 340px;gap:20px;">
      <div class="card">
        <h3 style="font-family:var(--font-display);font-size:15px;margin-bottom:14px;">📦 Stock Overview (All Sites)</h3>
        <div style="position:relative;height:220px;"><canvas id="am-chart" height="200" style="width:100%;height:220px;"></canvas></div>
      </div>
    </div>`;

  const [stock, transfers, procurement] = await Promise.all([
    fetch(`${SUPABASE_URL}/rest/v1/stock?select=site_id,quantity,unit_price,material_name&limit=500`,
      {headers:{apikey:SUPABASE_ANON_KEY,Authorization:`Bearer ${SUPABASE_ANON_KEY}`}}).then(r=>r.json()).catch(()=>[]),
    fetch(`${SUPABASE_URL}/rest/v1/transfers?status=in.(pending,source_pm_approved,dest_pm_approved,am_approved,in_transit)&select=*&limit=50`,
      {headers:{apikey:SUPABASE_ANON_KEY,Authorization:`Bearer ${SUPABASE_ANON_KEY}`}}).then(r=>r.json()).catch(()=>[]),
    fetch(`${SUPABASE_URL}/rest/v1/procurement?status=in.(pm_approved,am_approved)&select=*&limit=50`,
      {headers:{apikey:SUPABASE_ANON_KEY,Authorization:`Bearer ${SUPABASE_ANON_KEY}`}}).then(r=>r.json()).catch(()=>[]),
  ]);

  const totalVal = stock.reduce((s,i)=>s+((i.quantity||0)*(i.unit_price||0)),0);
  const lowStock = stock.filter(i=>(i.quantity||0)<10&&(i.quantity||0)>0).length;
  document.getElementById("am-kpis").innerHTML = [
    {icon:"💰",label:"Portfolio",val:`KES ${(totalVal/1e6).toFixed(1)}M`,c:"var(--accent-gold)"},
    {icon:"⚠️",label:"Low Stock",val:lowStock,c:"var(--accent-orange)"},
    {icon:"🚚",label:"Active Transfers",val:transfers.length,c:"var(--accent-blue)"},
    {icon:"🛒",label:"Procurement Items",val:procurement.length,c:"var(--accent-green)"},
  ].map(k=>`<div class="card" style="border-top:2px solid ${k.c};padding:16px;text-align:center;">
    <div style="font-size:20px;margin-bottom:6px;">${k.icon}</div>
    <div style="font-size:22px;font-weight:700;color:${k.c};font-family:var(--font-display);">${k.val}</div>
    <div style="font-size:12px;color:var(--text-muted);margin-top:4px;">${k.label}</div>
  </div>`).join("");

  document.getElementById("am-transfers").innerHTML = transfers.length
    ? transfers.slice(0,5).map(t=>`<div style="padding:9px 0;border-bottom:1px solid var(--border);font-size:13px;">
        <span style="color:var(--text-primary);">Site ${t.from_site_id} → Site ${t.to_site_id}</span>
        <span style="float:right;font-size:11px;background:rgba(61,142,248,0.1);color:var(--accent-blue);padding:2px 8px;border-radius:10px;">${t.status}</span>
      </div>`).join("")
    : `<div style="color:var(--accent-green);font-size:13px;text-align:center;padding:20px;">✓ No active transfers</div>`;

  document.getElementById("am-procurement").innerHTML = procurement.length
    ? procurement.slice(0,5).map(p=>`<div style="padding:9px 0;border-bottom:1px solid var(--border);font-size:13px;">
        <span style="color:var(--text-primary);">${p.supplier||"Pending supplier"}</span>
        <div style="margin-top:3px;font-size:12px;color:var(--accent-gold);">KES ${(p.total_amount||0).toLocaleString()} · <span style="color:var(--text-muted);">${p.status}</span></div>
      </div>`).join("")
    : `<div style="color:var(--accent-green);font-size:13px;text-align:center;padding:20px;">✓ Queue empty</div>`;

  setTimeout(()=>{
    if (typeof Chart==="undefined") return;
    const cv=document.getElementById("am-chart"); if(!cv) return;
    const vals=SITES.map(s=>stock.filter(i=>i.site_id===s.id).reduce((a,i)=>a+((i.quantity||0)*(i.unit_price||0)),0));
    try {
      cv._chart=new Chart(cv,{type:"bar",data:{labels:SITES.map(s=>s.name.split(" ")[0]),
      datasets:[{data:vals,backgroundColor:"rgba(46,160,67,0.4)",borderColor:"var(--accent-green)",borderWidth:1,borderRadius:4}]},
      options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},
        scales:{y:{grid:{color:"rgba(255,255,255,0.04)"},ticks:{color:"#8892a0"}},x:{grid:{display:false},ticks:{color:"#8892a0",font:{size:10}}}}}});
    } catch(e) { console.error("[AM Chart]",e); }
  },100);

  initAIChat(user);
}
