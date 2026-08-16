// CDL — modules/transfers.js
import { SUPABASE_URL, SUPABASE_ANON_KEY, SITES } from "../config.js";
import { logAudit } from "./audit_core.js";
import { ROLES } from "./roles.js";
import { showToast, showModal, closeModal } from "../app.js";
import { sendNotif } from "./notifs.js";

const TRANSFER_STEPS = [
  {key:"pm_approved",label:"PM Approved",roles:["project_manager","admin"]},
  {key:"preparing",label:"Stock Prepared",roles:["storekeeper_local","storekeeper_import","storekeeper_scaffolding","admin"]},
  {key:"in_transit",label:"In Transit",roles:["transfer_officer","admin"]},
  {key:"delivered",label:"Delivered",roles:["transfer_officer","admin"]},
  {key:"completed",label:"Completed",roles:["asset_manager","admin"]},
];

export async function renderTransfers(container, user) {
  if (!container) return;
  const role = ROLES[user.role] || {};
  const canCreate = role.canCreateTransfer;
  const siteFilter = role.siteScope === "assigned" ? (user.site_ids||[]) : SITES.map(s=>s.id);
  container.innerHTML = `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;"><div><h1 style="font-size:24px;font-weight:700;">Material Transfers</h1><p style="color:var(--text-200);font-size:14px;">5-Step Approval Workflow with Stock Tracking</p></div>${canCreate?`<button onclick="window._tfOpenNew()" class="btn btn-gold">+ New Transfer</button>`:""}</div><div style="display:flex;gap:4px;overflow-x:auto;padding-bottom:8px;margin-bottom:24px;">${TRANSFER_STEPS.map((s,i)=>`<div style="display:flex;align-items:center;gap:4px;white-space:nowrap;"><span style="width:24px;height:24px;border-radius:50%;background:var(--bg-600);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:11px;color:var(--gold);">${i+1}</span><span style="font-size:11px;color:var(--text-300);">${s.label}</span>${i<TRANSFER_STEPS.length-1?`<span style="color:var(--border);">›</span>`:""}</div>`).join("")}</div><div id="tf-tabs" style="display:flex;gap:4px;margin-bottom:20px;flex-wrap:wrap;">${["Active","Completed","Rejected"].map((t,i)=>`<button onclick="window._tfLoad('${t.toLowerCase()}')" id="tf-tab-${t.toLowerCase()}" style="padding:8px 20px;border-radius:8px;border:none;cursor:pointer;font-size:13px;font-weight:500;${i===0?"background:var(--gold);color:#0a0c10;":"background:var(--bg-600);color:var(--text-200);"}">${t}</button>`).join("")}</div><div id="tf-list"><div class="spinner" style="margin:60px auto;"></div></div>`;
  window._tfLoad=(tab)=>{"active","completed","rejected".forEach(t=>{const b=document.getElementById(`tf-tab-${t}`);if(b){b.style.background=t===tab?"var(--gold)":"var(--bg-600)";b.style.color=t===tab?"#0a0c10":"var(--text-200)";}});fetchTransfers(user,siteFilter,tab);};
  window._tfOpenNew=()=>openNewTransferModal(user,siteFilter);
  fetchTransfers(user,siteFilter,"active");
}

async function fetchTransfers(user,siteFilter,tab) {
  const list=document.getElementById("tf-list");if(!list)return;list.innerHTML=`<div class="spinner" style="margin:60px auto;"></div>`;
  const activeStatuses=["pending","pm_approved","preparing","in_transit","delivered"];
  const statusFilter=tab==="active"?`status=in.(${activeStatuses.map(s=>`'${s}'`).join(",")})`:`status=eq.${tab}`;
  let q=`${SUPABASE_URL}/rest/v1/transfers?${statusFilter}&select=*&order=created_at.desc&limit=50`;
  try {
    const res=await fetch(q,{headers:{apikey:SUPABASE_ANON_KEY,Authorization:`Bearer ${SUPABASE_ANON_KEY}`}});const transfers=await res.json();
    if(!transfers.length){list.innerHTML=`<div class="card" style="text-align:center;padding:40px;color:var(--text-300);">No ${tab} transfers</div>`;return;}
    list.innerHTML=transfers.map(tf=>{const fromSite=SITES.find(s=>s.id===tf.from_site_id)?.name||`Site ${tf.from_site_id}`;const toSite=SITES.find(s=>s.id===tf.to_site_id)?.name||`Site ${tf.to_site_id}`;const stepIdx=TRANSFER_STEPS.findIndex(s=>s.key===tf.status);const progress=stepIdx>=0?Math.round((stepIdx+1)/TRANSFER_STEPS.length*100):0;const items=Array.isArray(tf.items)?tf.items:[];const nextStep=TRANSFER_STEPS.find(s=>s.key===tf.status);const canAdvance=nextStep&&nextStep.roles.includes(user.role);return `<div class="card" style="margin-bottom:16px;"><div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:12px;"><div><div style="font-size:14px;font-weight:600;color:var(--text-100);">${fromSite} → ${toSite}</div><div style="color:var(--text-300);font-size:12px;margin-top:4px;">${items.length} item(s) · Created ${tf.created_at?new Date(tf.created_at).toLocaleDateString("en-KE"):""}</div></div><span style="padding:4px 12px;border-radius:12px;font-size:12px;background:rgba(200,169,110,0.1);color:var(--gold);">${tf.status?.replace(/_/g," ")||"pending"}</span></div><div style="background:var(--bg-700);border-radius:4px;height:4px;margin-bottom:12px;"><div style="background:var(--gold);width:${progress}%;height:4px;border-radius:4px;transition:width 0.3s;"></div></div><div style="font-size:12px;color:var(--text-200);margin-bottom:12px;">${items.slice(0,3).map(i=>`${i.quantity||i.qty||"?"} ${i.unit||""} ${i.name||i.material_name||""}`).join(" · ")}${items.length>3?` +${items.length-3} more`:""}</div>${canAdvance&&tab==="active"?`<button onclick="window._tfAdvance('${tf.id}','${tf.status}')" class="btn btn-gold" style="font-size:12px;padding:8px 20px;">${tf.status==="preparing"?"📦 Confirm Stock Ready":"Advance → "+(TRANSFER_STEPS[Math.min(stepIdx+1,TRANSFER_STEPS.length-1)]?.label||"Complete")}</button>`:""}</div>`;}).join("");
    window._tfAdvance=(id,status)=>advanceTransferStep(id,status,user);
  } catch(err){list.innerHTML=`<p style="color:var(--red);">Error: ${err.message}</p>`;}
}

async function advanceTransferStep(id,currentStatus,user) {
  const currentIdx=TRANSFER_STEPS.findIndex(s=>s.key===currentStatus);const nextStep=TRANSFER_STEPS[currentIdx+1];
  if(!nextStep){showToast("Transfer is already at final step","info");return;}
  try {
    if(nextStep.key==="completed"){await completeTransfer(id,user);return;}
    const tfRes=await fetch(`${SUPABASE_URL}/rest/v1/transfers?id=eq.${id}&select=step_log`,{headers:{apikey:SUPABASE_ANON_KEY,Authorization:`Bearer ${SUPABASE_ANON_KEY}`}});const [tf]=await tfRes.json();const stepLog=Array.isArray(tf?.step_log)?tf.step_log:[];stepLog.push({step:nextStep.key,by:user.name,role:user.role,at:new Date().toISOString()});
    await fetch(`${SUPABASE_URL}/rest/v1/transfers?id=eq.${id}`,{method:"PATCH",headers:{"Content-Type":"application/json",apikey:SUPABASE_ANON_KEY,Authorization:`Bearer ${SUPABASE_ANON_KEY}`},body:JSON.stringify({status:nextStep.key,step_log:stepLog})});
    await logAudit({action:"transfer_advanced",module:"transfers",record_id:id,before:{status:currentStatus},after:{status:nextStep.key}});showToast(`Transfer advanced to: ${nextStep.label}`,"success");
// Send notifications based on transfer status
if (nextStep.key === "pm_approved") {
  // Notify storekeeper at destination site to prepare stock
  const tfRes = await fetch(`${SUPABASE_URL}/rest/v1/transfers?id=eq.${id}`,{headers:{apikey:SUPABASE_ANON_KEY,Authorization:`Bearer ${SUPABASE_ANON_KEY}`}});
  const [tf] = await tfRes.json();
  if (tf) {
    // Get storekeepers for the destination site
    const skRes = await fetch(`${SUPABASE_URL}/rest/v1/users?role=in.(storekeeper_local,storekeeper_import,storekeeper_scaffolding)&site_ids=cs.{%22${tf.to_site_id}%22}&is_active=eq.true&select=id,name`,{headers:{apikey:SUPABASE_ANON_KEY,Authorization:`Bearer ${SUPABASE_ANON_KEY}`}});
    const sks = await skRes.json();
    if (Array.isArray(sks)) {
      for (const sk of sks) {
        await sendNotif(sk.id, `���📋 Transfer Approved - Prepare Stock`, `Transfer ${tf.id?.slice(0,8)} from ${SITES.find(s=>s.id===tf.from_site_id)?.name||`Site ${tf.from_site_id}`} to ${SITES.find(s=>s.id===tf.to_site_id)?.name||`Site ${tf.to_site_id}`} is approved and ready for stock preparation`, "transfer_approved", id);
      }
    }
  }
} else if (nextStep.key === "delivered") {
  // Notify destination PM that transfer has arrived
  const tfRes = await fetch(`${SUPABASE_URL}/rest/v1/transfers?id=eq.${id}`,{headers:{apikey:SUPABASE_ANON_KEY,Authorization:`Bearer ${SUPABASE_ANON_KEY}`}});
  const [tf] = await tfRes.json();
  if (tf) {
    // Get project managers for the destination site
    const pmRes = await fetch(`${SUPABASE_URL}/rest/v1/users?role=in.(project_manager,admin)&site_ids=cs.{%22${tf.to_site_id}%22}&is_active=eq.true&select=id,name`,{headers:{apikey:SUPABASE_ANON_KEY,Authorization:`Bearer ${SUPABASE_ANON_KEY}`}});
    const pms = await pmRes.json();
    if (Array.isArray(pms)) {
      for (const pm of pms) {
        await sendNotif(pm.id, `���🚚 Transfer Delivered`, `Transfer ${tf.id?.slice(0,8)} from ${SITES.find(s=>s.id===tf.from_site_id)?.name||`Site ${tf.from_site_id}`} to ${SITES.find(s=>s.id===tf.to_site_id)?.name||`Site ${tf.to_site_id}`} has been delivered`, "transfer_delivered", id);
      }
    }
  }
}
  } catch(err){showToast(`Error: ${err.message}`,"error");}
}

async function completeTransfer(id,user) {
  try {
    const tfRes=await fetch(`${SUPABASE_URL}/rest/v1/transfers?id=eq.${id}`,{headers:{apikey:SUPABASE_ANON_KEY,Authorization:`Bearer ${SUPABASE_ANON_KEY}`}});const [tf]=await tfRes.json();if(!tf){showToast("Transfer not found","error");return;}
    const items=Array.isArray(tf.items)?tf.items:[];
    for(const item of items){const itemName=item.name||item.material_name;const itemQty=parseFloat(item.quantity||item.qty)||0;const itemUnit=item.unit||"Pcs";if(!itemName||itemQty<=0)continue;
      const srcRes=await fetch(`${SUPABASE_URL}/rest/v1/stock?site_id=eq.${tf.from_site_id}&material_name=eq.${encodeURIComponent(itemName)}&limit=1`,{headers:{apikey:SUPABASE_ANON_KEY,Authorization:`Bearer ${SUPABASE_ANON_KEY}`}});const srcArr=await srcRes.json();if(Array.isArray(srcArr)&&srcArr.length){const srcStock=srcArr[0];await fetch(`${SUPABASE_URL}/rest/v1/stock?id=eq.${srcStock.id}`,{method:"PATCH",headers:{"Content-Type":"application/json",apikey:SUPABASE_ANON_KEY,Authorization:`Bearer ${SUPABASE_ANON_KEY}`},body:JSON.stringify({quantity:Math.max(0,(srcStock.quantity||0)-itemQty),last_updated:new Date().toISOString(),updated_by:user.id})});}
      const dstRes=await fetch(`${SUPABASE_URL}/rest/v1/stock?site_id=eq.${tf.to_site_id}&material_name=eq.${encodeURIComponent(itemName)}&limit=1`,{headers:{apikey:SUPABASE_ANON_KEY,Authorization:`Bearer ${SUPABASE_ANON_KEY}`}});const dstArr=await dstRes.json();if(Array.isArray(dstArr)&&dstArr.length){const dstStock=dstArr[0];await fetch(`${SUPABASE_URL}/rest/v1/stock?id=eq.${dstStock.id}`,{method:"PATCH",headers:{"Content-Type":"application/json",apikey:SUPABASE_ANON_KEY,Authorization:`Bearer ${SUPABASE_ANON_KEY}`},body:JSON.stringify({quantity:(dstStock.quantity||0)+itemQty,last_updated:new Date().toISOString(),updated_by:user.id})});}else{await fetch(`${SUPABASE_URL}/rest/v1/stock`,{method:"POST",headers:{"Content-Type":"application/json",apikey:SUPABASE_ANON_KEY,Authorization:`Bearer ${SUPABASE_ANON_KEY}`,Prefer:"return=minimal"},body:JSON.stringify({site_id:tf.to_site_id,material_name:itemName,quantity:itemQty,unit:itemUnit,category:item.category||null,updated_by:user.id})});}
    }
    const stepLog=Array.isArray(tf.step_log)?tf.step_log:[];stepLog.push({step:"completed",by:user.name,role:user.role,at:new Date().toISOString()});
    await fetch(`${SUPABASE_URL}/rest/v1/transfers?id=eq.${id}`,{method:"PATCH",headers:{"Content-Type":"application/json",apikey:SUPABASE_ANON_KEY,Authorization:`Bearer ${SUPABASE_ANON_KEY}`},body:JSON.stringify({status:"completed",step_log:stepLog,completed_at:new Date().toISOString()})});
    await logAudit({action:"transfer_completed",module:"transfers",record_id:id,after:{from:tf.from_site_id,to:tf.to_site_id,items:items.length}});showToast(`Transfer completed — ${items.length} item(s) moved`,"success");
  } catch(err){showToast(`Error: ${err.message}`,"error");}
}

function openNewTransferModal(user,siteFilter) {
  let items=[{name:"",quantity:1,unit:"Pcs"}];
  const renderItems=()=>{const el=document.getElementById("tf-items-list");if(!el)return;el.innerHTML=items.map((item,i)=>`<div style="display:grid;grid-template-columns:1fr auto auto 28px;gap:8px;align-items:center;margin-bottom:8px;"><input type="text" value="${item.name}" onchange="window._tfUpdateItem(${i},'name',this.value)" placeholder="Material name" style="background:var(--bg-700);border:1px solid var(--border);border-radius:6px;padding:8px;color:var(--text-100);font-size:13px;"><input type="number" value="${item.quantity}" min="0.1" onchange="window._tfUpdateItem(${i},'quantity',parseFloat(this.value))" style="width:80px;background:var(--bg-700);border:1px solid var(--border);border-radius:6px;padding:8px;color:var(--text-100);font-size:13px;"><input type="text" value="${item.unit}" onchange="window._tfUpdateItem(${i},'unit',this.value)" placeholder="Unit" style="width:60px;background:var(--bg-700);border:1px solid var(--border);border-radius:6px;padding:8px;color:var(--text-100);font-size:13px;"><button onclick="window._tfRemoveItem(${i})" style="background:transparent;border:none;color:var(--red);cursor:pointer;font-size:18px;">×</button></div>`).join("");};
  window._tfUpdateItem=(i,field,val)=>{items[i][field]=val;};
  window._tfRemoveItem=(i)=>{if(items.length>1){items.splice(i,1);renderItems();}};
  window._tfAddItem=()=>{items.push({name:"",quantity:1,unit:"Pcs"});renderItems();};
  const sites=SITES.filter(s=>siteFilter.includes(s.id));
  showModal(`<h2 style="margin-bottom:20px;">New Material Transfer</h2><div style="display:flex;flex-direction:column;gap:16px;"><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;"><div><label style="color:var(--text-300);font-size:12px;text-transform:uppercase;">From Site</label><select id="tf-from" style="width:100%;margin-top:6px;background:var(--bg-700);border:1px solid var(--border);border-radius:8px;padding:10px;color:var(--text-100);">${sites.map(s=>`<option value="${s.id}">${s.name}</option>`).join("")}</select></div><div><label style="color:var(--text-300);font-size:12px;text-transform:uppercase;">To Site</label><select id="tf-to" style="width:100%;margin-top:6px;background:var(--bg-700);border:1px solid var(--border);border-radius:8px;padding:10px;color:var(--text-100);">${sites.map(s=>`<option value="${s.id}">${s.name}</option>`).join("")}</select></div></div><div><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;"><label style="color:var(--text-300);font-size:12px;text-transform:uppercase;">Items</label><button onclick="window._tfAddItem()" style="background:transparent;border:1px solid var(--border);border-radius:6px;padding:4px 12px;color:var(--gold);cursor:pointer;font-size:12px;">+ Add</button></div><div id="tf-items-list"></div></div><div><label style="color:var(--text-300);font-size:12px;text-transform:uppercase;">Notes</label><textarea id="tf-notes" rows="2" style="width:100%;margin-top:6px;background:var(--bg-700);border:1px solid var(--border);border-radius:8px;padding:10px;color:var(--text-100);resize:none;"></textarea></div><div style="display:flex;gap:12px;"><button onclick="window._tfSubmit()" class="btn btn-gold" style="flex:1;">Submit Transfer Request</button><button onclick="window._closeModal()" class="btn btn-ghost">Cancel</button></div></div>`);
  renderItems();
  window._tfSubmit=async()=>{const fromSite=parseInt(document.getElementById("tf-from").value);const toSite=parseInt(document.getElementById("tf-to").value);const notes=document.getElementById("tf-notes").value.trim();if(fromSite===toSite){showToast("From and To sites must be different","error");return;}const validItems=items.filter(i=>i.name.trim());if(!validItems.length){showToast("Add at least one item","error");return;}try{const res=await fetch(`${SUPABASE_URL}/rest/v1/transfers`,{method:"POST",headers:{"Content-Type":"application/json",apikey:SUPABASE_ANON_KEY,Authorization:`Bearer ${SUPABASE_ANON_KEY}`,Prefer:"return=representation"},body:JSON.stringify({from_site_id:fromSite,to_site_id:toSite,items:validItems,notes,status:"pending",step_log:[{step:"created",by:user.name,role:user.role,at:new Date().toISOString()}]})});if(!res.ok) throw new Error(await res.text());const [saved]=await res.json();await logAudit({action:"transfer_created",module:"transfers",record_id:saved.id});closeModal();showToast("Transfer request submitted","success");}catch(err){showToast(`Error: ${err.message}`,"error");}};
}

// ── Feature 2: Standardized Inter-Site Transfer Log ────────────
export async function renderTransferLog(container, user) {
  if (!container) return;
  const statusLabels = [
    {value:"all",label:"All Statuses"},
    {value:"completed",label:"Completed"},
    {value:"in_transit",label:"In Transit"},
    {value:"pending",label:"Pending"},
    {value:"rejected",label:"Rejected"},
    {value:"delivered",label:"Delivered"},
    {value:"received",label:"Received"},
  ];
  container.innerHTML = `<div style="margin-bottom:24px;">
    <h1 style="font-size:24px;font-weight:700;">Transfer Log</h1>
    <p style="color:var(--text-200);font-size:14px;">Standardized record of all inter-site material transfers across the network</p>
  </div>
  <div style="display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap;align-items:center;">
    <select id="tl-status" onchange="window._tlRefresh()" style="background:var(--bg-600);border:1px solid var(--border);border-radius:8px;padding:8px 12px;color:var(--text-100);font-size:13px;min-width:140px;">
      ${statusLabels.map(s=>`<option value="${s.value}">${s.label}</option>`).join("")}
    </select>
    <input id="tl-search" type="text" placeholder="Search transfer ID…" onkeyup="window._tlRefresh()"
      style="background:var(--bg-600);border:1px solid var(--border);border-radius:8px;padding:8px 12px;color:var(--text-100);font-size:13px;min-width:200px;" />
    <button onclick="window._tlRefresh()" class="btn btn-ghost" style="font-size:12px;">↻ Refresh</button>
  </div>
  <div id="tl-table" style="overflow-x:auto;"></div>`;
  window._tlRefresh = () => loadTransferLog();
  loadTransferLog();
}

async function loadTransferLog() {
  const el = document.getElementById("tl-table");
  const statusVal = document.getElementById("tl-status")?.value || "all";
  const search = (document.getElementById("tl-search")?.value || "").toLowerCase();
  if (!el) return;
  el.innerHTML = `<div class="spinner" style="margin:60px auto;"></div>`;
  let transfers = [];
  let url = `${SUPABASE_URL}/rest/v1/transfers?select=*&order=created_at.desc&limit=200`;
  if (statusVal && statusVal !== "all") url += `&status=eq.${statusVal}`;
  try {
    const res = await fetch(url, { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } });
    const arr = await res.json();
    if (Array.isArray(arr)) transfers = arr;
  } catch (err) {
    console.error("[TransferLog]", err);
    el.innerHTML = `<p style="color:var(--red);padding:20px;">Error: ${err.message}</p>`;
    return;
  }
  if (search) transfers = transfers.filter(t => (t.id||"").slice(0,8).toLowerCase().includes(search));
  if (!transfers.length) {
    el.innerHTML = `<div class="card" style="text-align:center;padding:40px;color:var(--text-300);">No transfers match your criteria</div>`;
    return;
  }
  const statusColor = {
    completed:"var(--accent-green)", pending:"var(--accent-orange)", rejected:"var(--accent-red)",
    in_transit:"var(--accent-blue)", delivered:"var(--accent-teal)", received:"var(--accent-teal)",
    picked_up:"var(--accent-purple)", preparing:"var(--accent-gold)", am_approved:"var(--accent-green)",
    source_pm_approved:"var(--accent-blue)", dest_pm_approved:"var(--accent-blue)", expired:"var(--text-muted)",
  };
  const fmtDate = d => d ? new Date(d).toLocaleDateString("en-KE") : "—";
  el.innerHTML = `<table style="width:100%;border-collapse:collapse;font-size:12px;">
    <thead><tr style="border-bottom:1px solid var(--border);">
      ${["Transfer ID","From","To","Materials","Status","Est. Value","Created","Completed"].map(h=>`<th style="text-align:left;padding:7px 6px;color:var(--text-muted);font-weight:500;font-size:11px;text-transform:uppercase;">${h}</th>`).join("")}
    </tr></thead>
    <tbody>${transfers.map(tf=>{
      const fromSite = SITES.find(s=>s.id===tf.from_site_id)?.name || `Site ${tf.from_site_id}`;
      const toSite = SITES.find(s=>s.id===tf.to_site_id)?.name || `Site ${tf.to_site_id}`;
      const items = Array.isArray(tf.items) ? tf.items : [];
      const sc = statusColor[tf.status] || "var(--text-muted)";
      const estVal = items.reduce((s,i)=>s+(parseFloat(i.quantity||0)*parseFloat(i.unit_price||0)),0);
      return `<tr style="border-bottom:1px solid rgba(30,35,48,0.3);">
        <td style="padding:7px 6px;color:var(--accent-gold);font-family:var(--font-mono);font-size:11px;">${(tf.id||"").slice(0,8)}</td>
        <td style="padding:7px 6px;color:var(--text-primary);">${fromSite}</td>
        <td style="padding:7px 6px;color:var(--text-secondary);">→ ${toSite}</td>
        <td style="padding:7px 6px;color:var(--text-200);" title="${items.map(i=>`${i.quantity||0} ${i.unit||""} ${i.name||""}`).join(", ")}">${items.length} item(s)</td>
        <td style="padding:7px 6px;"><span style="background:${sc}22;color:${sc};padding:2px 8px;border-radius:10px;font-size:11px;">${(tf.status||"pending").replace(/_/g," ")}</span></td>
        <td style="padding:7px 6px;color:var(--accent-gold);">${estVal?`KES ${estVal.toLocaleString()}`:"—"}</td>
        <td style="padding:7px 6px;color:var(--text-muted);">${fmtDate(tf.created_at)}</td>
        <td style="padding:7px 6px;color:var(--text-muted);">${fmtDate(tf.completed_at)}</td>
      </tr>`;
    }).join("")}</tbody>
  </table>
  <div style="margin-top:12px;font-size:12px;color:var(--text-muted);text-align:right;">Total: ${transfers.length} transfer(s)</div>`;
}
