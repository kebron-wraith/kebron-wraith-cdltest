// CDL — modules/reports.js
import { SUPABASE_URL, SUPABASE_ANON_KEY, SITES } from "../config.js";
import { ROLES } from "./roles.js";
import { CATEGORIES } from "../data.js";

const ALL_REQUESTS_STATUSES=["pending","pm_approved","pm_rejected","reserved","issued","collected","completed","returned","expired","cancelled"];
const ALL_TRANSFER_STATUSES=["pending","source_pm_approved","dest_pm_approved","am_approved","preparing","picked_up","in_transit","delivered","received","completed","rejected","expired"];

export async function renderReports(container,user){
  const roleInfo=ROLES[user.role]||{};
  const siteFilter=roleInfo.siteScope==="assigned"?(user.site_ids||[]):SITES.map(s=>s.id);
  const siteParam=siteFilter.length<SITES.length?`&site_id=in.(${siteFilter.join(",")})`:"";
  container.innerHTML=`<div style="margin-bottom:24px;"><h1 style="font-size:24px;font-weight:700;">Reports & Analytics</h1><p style="color:var(--text-200);font-size:14px;">Export data, analyse trends, generate summaries</p></div><div style="display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap;"><select id="rpt-site" style="background:var(--bg-600);border:1px solid var(--border);border-radius:8px;padding:8px 12px;color:var(--text-100);font-size:13px;"><option value="">All Sites</option>${SITES.filter(s=>siteFilter.includes(s.id)).map(s=>`<option value="${s.id}">${s.name}</option>`).join("")}</select><select id="rpt-days" style="background:var(--bg-600);border:1px solid var(--border);border-radius:8px;padding:8px 12px;color:var(--text-100);font-size:13px;"><option value="7">Last 7 days</option><option value="30" selected>Last 30 days</option><option value="90">Last 90 days</option><option value="365">Last 12 months</option><option value="0">All time</option></select><button onclick="window._rptRefresh()" class="btn btn-ghost" style="font-size:12px;">↻ Refresh Data</button></div><div id="charts-row" style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px;"><div class="card"><h3 style="font-size:14px;margin-bottom:12px;">📊 Request Status Breakdown</h3><div style="position:relative;height:220px;"><canvas id="chart-requests"></canvas></div></div><div class="card"><h3 style="font-size:14px;margin-bottom:12px;">🚚 Transfer Pipeline</h3><div style="position:relative;height:220px;"><canvas id="chart-transfers"></canvas></div></div></div><div id="charts-row2" style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px;"><div class="card"><h3 style="font-size:14px;margin-bottom:12px;">📦 Stock by Category</h3><div style="position:relative;height:220px;"><canvas id="chart-stock-cat"></canvas></div></div><div class="card"><h3 style="font-size:14px;margin-bottom:12px;">💰 Monthly Spend (Procurement)</h3><div style="position:relative;height:220px;"><canvas id="chart-procurement"></canvas></div></div></div><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px;margin-bottom:28px;">${[{icon:"📦",label:"Stock Report",desc:"All materials by site, category, value",fn:"genStockReport",color:"var(--blue)"},{icon:"📋",label:"Requests Report",desc:"All material requests with status timeline",fn:"genRequestsReport",color:"var(--orange)"},{icon:"🚚",label:"Transfers Report",desc:"Transfer pipeline and completion stats",fn:"genTransfersReport",color:"var(--green)"},{icon:"🏗",label:"GRN Report",desc:"Goods received by supplier and site",fn:"genGRNReport",color:"var(--purple)"},{icon:"🚨",label:"Incidents Report",desc:"All incidents, values, and PM decisions",fn:"genIncidentsReport",color:"var(--red)"},{icon:"💰",label:"Procurement Report",desc:"Purchase requests and approval chain",fn:"genProcurementReport",color:"var(--gold)"},{icon:"⚖️",label:"Reconciliation Report",desc:"Weekly cross-site stock reconciliation",fn:"genReconciliationReport",color:"var(--teal)"}].map(r=>`<div class="card" style="cursor:pointer;border-left:3px solid ${r.color};" onclick="window.${r.fn}()"><div style="font-size:24px;margin-bottom:8px;">${r.icon}</div><div style="font-size:14px;font-weight:600;color:var(--text-100);margin-bottom:4px;">${r.label}</div><div style="font-size:12px;color:var(--text-200);">${r.desc}</div><div style="margin-top:10px;display:flex;gap:6px;"><span class="badge badge-gold">Excel</span><span class="badge badge-muted">CSV</span></div></div>`).join("")}</div><div id="report-preview" class="card" style="display:none;"></div>`;
  window.genStockReport=()=>generateReport("stock",user);window.genRequestsReport=()=>generateReport("requests",user);window.genTransfersReport=()=>generateReport("transfers",user);window.genGRNReport=()=>generateReport("grns",user);window.genIncidentsReport=()=>generateReport("incidents",user);window.genProcurementReport=()=>generateReport("procurement",user);window.genReconciliationReport=()=>genReconciliationReport(user);window._rptRefresh=()=>loadAllCharts(user,siteFilter);
  loadAllCharts(user,siteFilter);
}

let _chartsLoading=false;
async function loadAllCharts(user,siteFilter){
  if(_chartsLoading)return;
  _chartsLoading=true;
  const days=parseInt(document.getElementById("rpt-days")?.value||30);const specificSite=document.getElementById("rpt-site")?.value||"";const dateFrom=days>0?new Date(Date.now()-days*86400000).toISOString().split("T")[0]:"";const siteParam=specificSite?`&site_id=eq.${specificSite}`:(siteFilter.length<SITES.length?`&site_id=in.(${siteFilter.join(",")})`:"");const dateParam=dateFrom?`&created_at=gte.${dateFrom}`:"";
  try{
    let [reqs,transfers,stock,procurement]=await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/material_requests?select=status,created_at${siteParam}${dateParam}&limit=5000`,{headers:{apikey:SUPABASE_ANON_KEY,Authorization:`Bearer ${SUPABASE_ANON_KEY}`}}).then(r=>r.json()).catch(()=>[]),
      fetch(`${SUPABASE_URL}/rest/v1/transfers?select=status,created_at,completed_at${siteParam}${dateParam}&limit=2000`,{headers:{apikey:SUPABASE_ANON_KEY,Authorization:`Bearer ${SUPABASE_ANON_KEY}`}}).then(r=>r.json()).catch(()=>[]),
      fetch(`${SUPABASE_URL}/rest/v1/stock?select=category,quantity,unit_price${specificSite?`&site_id=eq.${specificSite}`:siteParam}&limit=2000`,{headers:{apikey:SUPABASE_ANON_KEY,Authorization:`Bearer ${SUPABASE_ANON_KEY}`}}).then(r=>r.json()).catch(()=>[]),
      fetch(`${SUPABASE_URL}/rest/v1/procurement?select=status,total_amount,created_at${siteParam}${dateParam}&limit=2000`,{headers:{apikey:SUPABASE_ANON_KEY,Authorization:`Bearer ${SUPABASE_ANON_KEY}`}}).then(r=>r.json()).catch(()=>[]),
    ]);
    if(!Array.isArray(reqs))reqs=[];if(!Array.isArray(transfers))transfers=[];if(!Array.isArray(stock))stock=[];if(!Array.isArray(procurement))procurement=[];
    renderChart("chart-requests",reqs,"doughnut",ALL_REQUESTS_STATUSES);renderChart("chart-transfers",transfers,"bar",ALL_TRANSFER_STATUSES);
    const cats={};stock.forEach(i=>{const c=i.category||"Other";cats[c]=(cats[c]||0)+(i.quantity||0);});const sortedCats=Object.entries(cats).sort((a,b)=>b[1]-a[1]).slice(0,10);
    const canvas3=document.getElementById("chart-stock-cat");if(canvas3&&window.Chart){const ctx3=canvas3.getContext("2d");if(canvas3._chart){canvas3._chart.destroy();canvas3._chart=null;}canvas3._chart=new Chart(ctx3,{type:"bar",data:{labels:sortedCats.map(s=>s[0]),datasets:[{label:"Qty",data:sortedCats.map(s=>s[1]),backgroundColor:["#c8a96e","#3d8ef8","#2ea043","#e67e22","#8b5cf6","#e74c3c","#2ecc71","#f39c12","#1abc9c","#9b59b6"],borderRadius:4}]},options:{indexAxis:"y",responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{ticks:{color:"#8892a0"},grid:{color:"#1e2330"}},y:{ticks:{color:"#8892a0",font:{size:11}},grid:{display:false}}}}})};
    const monthly={};procurement.forEach(p=>{const d=new Date(p.created_at);const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;monthly[key]=(monthly[key]||0)+(p.total_amount||0);});const sortedM=Object.entries(monthly).sort().slice(-6);
    const canvas4=document.getElementById("chart-procurement");if(canvas4&&window.Chart){const ctx4=canvas4.getContext("2d");if(canvas4._chart){canvas4._chart.destroy();canvas4._chart=null;}canvas4._chart=new Chart(ctx4,{type:"line",data:{labels:sortedM.map(s=>s[0]),datasets:[{label:"KES",data:sortedM.map(s=>s[1]),borderColor:"#c8a96e",backgroundColor:"rgba(200,169,110,0.1)",fill:true,tension:0.3,pointRadius:4,pointBackgroundColor:"#c8a96e"}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{ticks:{color:"#8892a0"},grid:{display:false}},y:{ticks:{color:"#8892a0",callback:v=>"KES "+(v/1000).toFixed(0)+"K"},grid:{color:"#1e2330"}}}}})};
  }catch(err){console.error("[Charts]",err);}
  finally{_chartsLoading=false;}
}

function renderChart(canvasId,data,type,statuses){
  if(!Array.isArray(data))data=[];
  const canvas=document.getElementById(canvasId);if(!canvas||!window.Chart)return;
  const ctx=canvas.getContext("2d");const counts={};statuses.forEach(s=>counts[s]=0);data.forEach(r=>{if(counts[r.status]!==undefined)counts[r.status]++;});
  const labels=Object.keys(counts).map(s=>s.replace(/_/g," "));const values=Object.values(counts);
  const colors=["#e67e22","#c8a96e","#e74c3c","#3d8ef8","#2ea043","#8b5cf6","#2ecc71","#f39c12","#4a5568","#1e2330","#95a5a6","#1abc9c"];
  if(canvas._chart){canvas._chart.destroy();canvas._chart=null;}
  canvas._chart=new Chart(ctx,{type,data:{labels,datasets:[{data:values,backgroundColor:colors.slice(0,labels.length),borderWidth:0}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:"right",labels:{color:"#8892a0",font:{size:11},padding:8,boxWidth:12}}}}});
}

async function generateReport(type,user){
  const preview=document.getElementById("report-preview");if(!preview)return;preview.style.display="block";preview.innerHTML=`<div style="padding:40px;text-align:center;color:var(--gold);">🔄 Generating ${type} report…</div>`;
  const roleInfo=ROLES[user.role]||{};const siteFilter=roleInfo.siteScope==="assigned"?(user.site_ids||[]):SITES.map(s=>s.id);const days=parseInt(document.getElementById("rpt-days")?.value||30);const specificSite=document.getElementById("rpt-site")?.value||"";const dateFrom=days>0?`&created_at=gte.${new Date(Date.now()-days*86400000).toISOString().split("T")[0]}`:"";const siteParam=specificSite?`&site_id=eq.${specificSite}`:(siteFilter.length<SITES.length?`&site_id=in.(${siteFilter.join(",")})`:"");
  const queries={stock:`stock?select=*,sites(name)${specificSite?`&site_id=eq.${specificSite}`:siteParam}&order=material_name.asc&limit=500`,requests:`material_requests?select=*,sites(name)${siteParam}${dateFrom}&order=created_at.desc&limit=500`,transfers:`transfers?select=*${siteParam}${dateFrom}&order=created_at.desc&limit=500`,grns:`grns?select=*,sites(name)${siteParam}${dateFrom}&order=created_at.desc&limit=500`,incidents:`incidents?select=*,sites(name)${siteParam}${dateFrom}&order=created_at.desc&limit=500`,procurement:`procurement?select=*,sites(name)${siteParam}${dateFrom}&order=created_at.desc&limit:500`};
  try{
    const url=`${SUPABASE_URL}/rest/v1/${queries[type]}`;const res=await fetch(url,{headers:{apikey:SUPABASE_ANON_KEY,Authorization:`Bearer ${SUPABASE_ANON_KEY}`}});const data=await res.json();
    if(!data.length){preview.innerHTML=`<div style="padding:40px;text-align:center;color:var(--text-300);">No data found</div>`;return;}
    const rows=flattenData(type,data);
    preview.innerHTML=`<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:12px;"><h3 style="font-size:16px;font-weight:600;color:var(--text-100);">${type.charAt(0).toUpperCase()+type.slice(1)} Report — ${data.length} records</h3><div style="display:flex;gap:8px;"><button onclick="window._rptDownload('${type}')" class="btn btn-gold" style="font-size:13px;padding:8px 20px;">⬇ Download Excel</button><button onclick="window._rptDownloadCSV('${type}')" class="btn btn-ghost" style="font-size:13px;padding:8px 16px;">CSV</button></div></div><div style="overflow-x:auto;max-height:400px;overflow-y:auto;"><table style="width:100%;border-collapse:collapse;font-size:12px;"><thead><tr style="border-bottom:1px solid var(--border);">${Object.keys(rows[0]||{}).map(k=>`<th style="text-align:left;padding:8px;color:var(--text-400);font-weight:500;white-space:nowrap;position:sticky;top:0;background:var(--bg-600);">${k}</th>`).join("")}</tr></thead><tbody>${rows.slice(0,50).map(row=>`<tr style="border-bottom:1px solid rgba(30,35,48,0.4);">${Object.values(row).map(v=>`<td style="padding:8px;color:var(--text-200);">${v??""}</td>`).join("")}</tr>`).join("")}</tbody></table>${rows.length>50?`<p style="color:var(--text-300);font-size:12px;padding:12px;">Showing 50 of ${rows.length} rows. Download for full data.</p>`:""}</div>`;
    window._reportData=window._reportData||{};window._reportData[type]=rows;
    window._rptDownload=(t)=>{const r=window._reportData?.[t];if(r&&typeof XLSX!=="undefined")exportExcel(r,t);else if(r)exportCSV(r,t);};
    window._rptDownloadCSV=(t)=>{const r=window._reportData?.[t];if(r)exportCSV(r,t);};
  }catch(err){preview.innerHTML=`<p style="color:var(--red);padding:20px;">Error: ${err.message}</p>`;}
}

function flattenData(type,data){
  if(type==="stock")return data.map(i=>({Site:i.sites?.name||`#${i.site_id}`,Code:i.material_code||"",Material:i.material_name,Category:i.category||"",Type:i.storekeeper_type||"",Quantity:i.quantity||0,Unit:i.unit||"","Unit Price":i.unit_price||0,"Total Value":((i.quantity||0)*(i.unit_price||0)).toFixed(2),"Last Updated":i.last_updated?new Date(i.last_updated).toLocaleDateString("en-KE"):""}));
  if(type==="requests")return data.map(i=>({Site:i.sites?.name||`#${i.site_id}`,Material:i.material_name,Quantity:i.quantity||0,Unit:i.unit||"",Urgency:i.urgency,Status:i.status,Purpose:i.purpose||"",Date:new Date(i.created_at).toLocaleDateString("en-KE"),"PM Approved":i.pm_approved_at?new Date(i.pm_approved_at).toLocaleDateString("en-KE"):"",Issued:i.issued_at?new Date(i.issued_at).toLocaleDateString("en-KE"):"",Collected:i.collected_at?new Date(i.collected_at).toLocaleDateString("en-KE"):"","Return Qty":i.return_qty||"","Return Reason":i.return_reason||""}));
  if(type==="transfers")return data.map(i=>({"Transfer ID":i.id?.slice(0,8)||"",From:SITES.find(s=>s.id===i.from_site_id)?.name||`Site ${i.from_site_id}`,To:SITES.find(s=>s.id===i.to_site_id)?.name||`Site ${i.to_site_id}`,Items:Array.isArray(i.items)?i.items.length:0,Status:i.status,Created:i.created_at?new Date(i.created_at).toLocaleDateString("en-KE"):"",Completed:i.completed_at?new Date(i.completed_at).toLocaleDateString("en-KE"):"",Steps:Array.isArray(i.step_log)?i.step_log.length:0}));
  if(type==="grns")return data.map(i=>({Site:i.sites?.name||`#${i.site_id}`,"GRN #":i.grn_number||"","Invoice #":i.invoice_number||"",Supplier:i.supplier||"",Type:i.storekeeper_type||"",Items:Array.isArray(i.items)?i.items.length:0,"Total Value (KES)":i.total_value||"",Status:i.status,Date:new Date(i.created_at).toLocaleDateString("en-KE"),Verified:i.verified_at?new Date(i.verified_at).toLocaleDateString("en-KE"):""}));
  if(type==="incidents")return data.map(i=>({Site:i.sites?.name||`#${i.site_id}`,Type:i.type,Material:i.material_name,Quantity:i.quantity||"","Est. Value (KES)":i.estimated_value||"",Reason:i.reason||"",Status:i.status,"PM Decision":i.pm_decision||"",Date:new Date(i.created_at).toLocaleDateString("en-KE")}));
  if(type==="procurement")return data.map(i=>({Site:i.sites?.name||`#${i.site_id}`,Supplier:i.supplier||"",Items:Array.isArray(i.items)?i.items.length:0,"Total (KES)":i.total_amount||"",Status:i.status,Approvals:Array.isArray(i.approval_chain)?i.approval_chain.map(a=>a.by).join(" → "):"",Date:new Date(i.created_at).toLocaleDateString("en-KE")}));
  return data.map(i=>({...i}));
}

function exportCSV(rows,name){if(!rows.length)return;const headers=Object.keys(rows[0]);const csv=[headers.join(","),...rows.map(r=>headers.map(h=>`"${String(r[h]??"").replace(/"/g,'""')}"`).join(","))].join("\n");const blob=new Blob([csv],{type:"text/csv"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`cdl_${name}_${new Date().toISOString().slice(0,10)}.csv`;a.click();}
function exportExcel(rows,name){try{const ws=XLSX.utils.json_to_sheet(rows);const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,name);XLSX.writeFile(wb,`cdl_${name}_${new Date().toISOString().slice(0,10)}.xlsx`);}catch{exportCSV(rows,name);}}

// ── Feature 3: Weekly Cross-Site Reconciliation Report ─────────
export async function genReconciliationReport(user) {
  const preview = document.getElementById("report-preview");
  if (!preview) return;
  preview.style.display = "block";
  preview.innerHTML = `<div style="padding:40px;text-align:center;color:var(--teal);">🔄 Generating reconciliation report…</div>`;
  try {
    const days = parseInt(document.getElementById("rpt-days")?.value || 7);
    const dateFrom = days > 0 ? new Date(Date.now() - days * 86400000).toISOString().split("T")[0] : "";
    const dateParam = dateFrom ? `&created_at=gte.${dateFrom}` : "";

    const [stockRes, grnRes, transferRes] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/stock?select=site_id,material_name,quantity,unit_price,category,storekeeper_type,last_updated&limit=5000`,
        {headers:{apikey:SUPABASE_ANON_KEY,Authorization:`Bearer ${SUPABASE_ANON_KEY}`}}).then(r=>r.json()),
      fetch(`${SUPABASE_URL}/rest/v1/grns?select=site_id,supplier,total_value,created_at,status&limit=2000`,
        {headers:{apikey:SUPABASE_ANON_KEY,Authorization:`Bearer ${SUPABASE_ANON_KEY}`}}).then(r=>r.json()),
      fetch(`${SUPABASE_URL}/rest/v1/transfers?select=from_site_id,to_site_id,items,status,created_at,completed_at&limit=2000`,
        {headers:{apikey:SUPABASE_ANON_KEY,Authorization:`Bearer ${SUPABASE_ANON_KEY}`}}).then(r=>r.json()),
    ]);

    const stock = Array.isArray(stockRes) ? stockRes : [];
    const grns = Array.isArray(grnRes) ? grnRes : [];
    const transfers = Array.isArray(transferRes) ? transferRes : [];

    // ── Per-site, per-material reconciliation ──
    const siteMaterialMap = {};
    stock.forEach(i => {
      const key = `${i.site_id}|${i.material_name}`;
      if (!siteMaterialMap[key]) siteMaterialMap[key] = {
        siteId: i.site_id, name: i.material_name, qty: 0, value: 0, unit: i.unit || "",
        category: i.category || "", skType: i.storekeeper_type || "", lastUpdated: i.last_updated,
      };
      siteMaterialMap[key].qty += (i.quantity || 0);
      siteMaterialMap[key].value += ((i.quantity || 0) * (i.unit_price || 0));
    });

    // ── GRN per site (expected stock from receipts) ──
    const grnBySite = {};
    grns.forEach(g => {
      if (!grnBySite[g.site_id]) grnBySite[g.site_id] = 0;
      grnBySite[g.site_id] += (parseFloat(g.total_value) || 0);
    });

    // ── Completed transfers (source loses, dest gains) ──
    const transferEffects = [];
    transfers.filter(t => t.status === "completed" || t.status === "delivered" || t.status === "received").forEach(t => {
      const items = Array.isArray(t.items) ? t.items : [];
      items.forEach(item => {
        const qty = parseFloat(item.quantity || 0);
        transferEffects.push({
          from: t.from_site_id, to: t.to_site_id, material: item.name, qty: qty,
          value: qty * (parseFloat(item.unit_price) || 0),
        });
      });
    });

    // ── Discrepancy flags: negative qty, zero stale, missing GRN ──
    const flags = [];
    Object.values(siteMaterialMap).forEach(m => {
      const site = SITES.find(s => s.id === m.siteId);
      const siteName = site ? site.name : `Site ${m.siteId}`;
      if (m.qty < 0) {
        flags.push({severity:"high",site:siteName,category:m.category,material:m.name,msg:`negative quantity (${m.qty})`,value:m.value});
      }
      if (m.qty === 0 && m.lastUpdated) {
        const daysStale = Math.floor((Date.now() - new Date(m.lastUpdated).getTime()) / 86400000);
        if (daysStale > 14) flags.push({severity:"medium",site:siteName,category:m.category,material:m.name,msg:`zero stock for ${daysStale} days`,value:m.value});
      }
    });

    // ── Build report rows ──
    const reportRows = Object.values(siteMaterialMap).sort((a,b)=>b.value-a.value).map(m => {
      const site = SITES.find(s => s.id === m.siteId);
      const siteName = site ? `${site.name} (${site.code||m.siteId})` : `Site ${m.siteId}`;
      const expected = grnBySite[m.siteId] || 0;
      const variance = m.value - expected;
      return {
        Site: siteName,
        Category: m.category || "—",
        Material: m.name,
        Quantity: m.qty,
        Unit: m.unit,
        "Unit Value (KES)": m.value > 0 && m.qty > 0 ? (m.value / m.qty).toFixed(2) : "0.00",
        "Total Value (KES)": m.value.toFixed(2),
        "GRN Value (KES)": expected.toFixed(2),
        "Variance (KES)": variance.toFixed(2),
        "Discrepancy %": expected > 0 ? ((variance / expected) * 100).toFixed(1) + "%" : "—",
        "Storekeeper Type": m.skType,
        "Last Updated": m.lastUpdated ? new Date(m.lastUpdated).toLocaleDateString("en-KE") : "—",
      };
    });

    // ── Render summary ──
    const severityColor = {high:"var(--accent-red)",medium:"var(--accent-orange)",low:"var(--accent-gold)"};
    const totalValue = reportRows.reduce((s,r)=>s+parseFloat(r["Total Value (KES)"]||0),0);
    const totalVariance = reportRows.reduce((s,r)=>s+parseFloat(r["Variance (KES)"]||0),0);

    preview.innerHTML = `
      <div style="padding:20px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:12px;">
          <h3 style="font-size:16px;font-weight:600;color:var(--text-100);">Weekly Reconciliation Report</h3>
          <button onclick="window._rptDownloadReconciliation()" class="btn btn-gold" style="font-size:12px;padding:6px 16px;">⬇ Export</button>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;margin-bottom:20px;">
          <div class="card"><div style="font-size:11px;color:var(--text-muted);margin-bottom:4px;">Total Sites</div><div style="font-size:20px;font-weight:700;">${SITES.length}</div></div>
          <div class="card"><div style="font-size:11px;color:var(--text-muted);margin-bottom:4px;">Total Materials</div><div style="font-size:20px;font-weight:700;">${reportRows.length}</div></div>
          <div class="card"><div style="font-size:11px;color:var(--text-muted);margin-bottom:4px;">Total Value</div><div style="font-size:20px;font-weight:700;color:var(--accent-gold);">KES ${totalValue.toLocaleString()}</div></div>
          <div class="card"><div style="font-size:11px;color:var(--text-muted);margin-bottom:4px;">Total Variance</div><div style="font-size:20px;font-weight:700;color:${Math.abs(totalVariance) > totalValue * 0.05 ? "var(--accent-red)" : "var(--accent-green);"}>KES ${totalVariance.toLocaleString()}</div></div>
          <div class="card"><div style="font-size:11px;color:var(--text-muted);margin-bottom:4px;">Discrepancies</div><div style="font-size:20px;font-weight:700;color:${flags.length > 0 ? "var(--accent-red)" : "var(--accent-green);"}">${flags.length}</div></div>
        </div>
        ${flags.length > 0 ? `<div style="margin-bottom:16px;">
          <h4 style="font-size:13px;font-weight:600;color:var(--accent-red);margin-bottom:10px;">⚠️ ${flags.length} Discrepancy Flags</h4>
          ${flags.slice(0,10).map(f=>`<div style="padding:8px;border-radius:6px;margin-bottom:6px;border:1px solid ${severityColor[f.severity]}22;background:${severityColor[f.severity]}11;">
            <span style="color:${severityColor[f.severity]};font-weight:600;">● ${f.severity.toUpperCase()}</span> · ${f.site} · ${f.material} · <span style="color:var(--text-secondary);">${f.msg}</span>
          </div>`).join("")}
          ${flags.length > 10 ? `<div style="font-size:11px;color:var(--text-muted);">+${flags.length - 10} more flags</div>` : ""}
        </div>` : `<div style="margin-bottom:16px;color:var(--accent-green);font-size:13px;padding:12px;border-radius:6px;background:rgba(46,208,82,0.1);">✓ No discrepancies detected — all sites reconciled</div>`}
        <div style="overflow-x:auto;max-height:350px;overflow-y:auto;">
          <table style="width:100%;border-collapse:collapse;font-size:12px;">
            <thead><tr style="border-bottom:1px solid var(--border);">
              ${Object.keys(reportRows[0]||{}).map(h=>`<th style="text-align:left;padding:7px 6px;color:var(--text-400);font-weight:500;font-size:11px;text-transform:uppercase;position:sticky;top:0;background:var(--bg-600);">${h}</th>`).join("")}
            </tr></thead>
            <tbody>${reportRows.slice(0,100).map(row=>`<tr style="border-bottom:1px solid rgba(30,35,48,0.3);">${Object.values(row).map(v=>`<td style="padding:7px 6px;color:var(--text-200);">${v??""}</td>`).join("")}</tr>`).join("")}</tbody>
          </table>
          ${reportRows.length > 100 ? `<div style="font-size:11px;color:var(--text-muted);padding:8px;">Showing 100 of ${reportRows.length} rows. Export for full data.</div>` : ""}
        </div>
      </div>
    `;

    window._reportData = window._reportData || {};
    window._reportData["reconciliation"] = reportRows;
    window._rptDownloadReconciliation = () => {
      const r = window._reportData?.["reconciliation"];
      if (r && typeof XLSX !== "undefined") exportExcel(r, "reconciliation");
      else if (r) exportCSV(r, "reconciliation");
    };
  } catch (err) {
    preview.innerHTML = `<p style="color:var(--red);padding:20px;">Error: ${err.message}</p>`;
  }
}

