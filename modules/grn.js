// CDL — modules/grn.js
import { supabase, SITES } from "../config.js";
import { logAudit } from "./audit_core.js";
import { ROLES } from "./roles.js";
import { scanGRN, renderGRNPreview } from "./ai_grn.js";
import { showToast, showModal, closeModal } from "../app.js";
import { findMaterial } from "../data.js";

export async function renderGRN(container, user) {
  const role = ROLES[user.role] || {};
  const siteFilter = role.siteScope === "assigned" ? (user.site_ids||[]) : SITES.map(s=>s.id);
  const skType = role.storekeeperType || user.storekeeper_type || null;
  container.innerHTML = `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;"><div><h1 style="font-size:24px;font-weight:700;color:var(--text-100);">GRN Scanner</h1><p style="color:var(--text-200);font-size:14px;">Goods Received Notes — AI-Powered Verification + Auto Stock</p></div><button onclick="window._grnOpenNew()" class="btn btn-gold">📷 New GRN</button></div><div id="grn-tabs" style="display:flex;gap:4px;margin-bottom:20px;">${["Pending","Verified","Disputed"].map((t,i)=>`<button onclick="window._grnSwitchTab('${t.toLowerCase()}')" id="grn-tab-${t.toLowerCase()}" style="padding:8px 20px;border-radius:8px;border:none;cursor:pointer;font-size:13px;font-weight:500;${i===0?"background:var(--gold);color:#0a0c10;":"background:var(--bg-600);color:var(--text-200);"}">${t}</button>`).join("")}</div><div id="grn-list"><div class="spinner" style="margin:60px auto;"></div></div>`;
  window._grnSwitchTab = (status) => { ["pending","verified","disputed"].forEach(s=>{const btn=document.getElementById(`grn-tab-${s}`);if(!btn)return;btn.style.background=s===status?"var(--gold)":"var(--bg-600)";btn.style.color=s===status?"#0a0c10":"var(--text-200)";}); loadGRNs(user, siteFilter, status, skType); };
  window._grnOpenNew = () => openNewGRNModal(user, siteFilter);
  loadGRNs(user, siteFilter, "pending");
}

async function loadGRNs(user, siteFilter, status, skType) {
  const list = document.getElementById("grn-list"); if (!list) return;
  list.innerHTML = `<div class="spinner" style="margin:60px auto;"></div>`;
  try {
    let query = supabase.from("grns").select("*,sites(name)").eq("status", status).order("created_at", { ascending: false }).limit(50);
    if (siteFilter.length) query = query.in("site_id", siteFilter);
    if (skType) query = query.eq("storekeeper_type", skType);
    const { data: grns, error } = await query;
    if (error) throw error;
    if (!grns || !grns.length) { list.innerHTML = `<div class="card" style="text-align:center;padding:40px;color:var(--text-300);">No ${status} GRNs</div>`; return; }
    list.innerHTML = grns.map(g => { const items = Array.isArray(g.items) ? g.items : []; return `<div class="card" style="margin-bottom:12px;cursor:pointer;" onclick="window._grnView('${g.id}')"><div style="display:flex;align-items:center;justify-content:space-between;"><div><div style="font-weight:600;color:var(--text-100);font-size:14px;">${g.grn_number||"GRN-"+g.id.substring(0,8)} · ${g.sites?.name||`Site ${g.site_id}`}</div><div style="color:var(--text-200);font-size:12px;margin-top:4px;">${g.supplier||"No supplier"} · ${items.length} item(s) · ${g.storekeeper_type||"—"}${g.invoice_number?` · Inv: ${g.invoice_number}`:""}</div></div><div style="text-align:right;"><div style="color:var(--gold);font-weight:600;">${g.total_value?"KES "+Number(g.total_value).toLocaleString():"—"}</div><div style="color:var(--text-300);font-size:12px;">${new Date(g.created_at).toLocaleDateString("en-KE")}</div></div></div>${status==="pending"&&ROLES[user.role]?.canVerifyGRN?`<div style="margin-top:12px;display:flex;gap:8px;"><button onclick="event.stopPropagation();window._grnVerify('${g.id}')" class="btn btn-gold" style="font-size:12px;padding:6px 16px;">✓ Verify + Add Stock</button><button onclick="event.stopPropagation();window._grnDispute('${g.id}')" class="btn btn-ghost" style="font-size:12px;padding:6px 16px;color:var(--red);">⚠ Dispute</button></div>`:""}</div>`; }).join("");
    window._grnVerify = (id) => verifyAndStockGRN(id, user);
    window._grnDispute = (id) => updateGRNStatus(id, "disputed", user);
    window._grnView = (id) => openViewGRNModal(id, user);
  } catch (err) { list.innerHTML = `<p style="color:var(--red);">Error: ${err.message}</p>`; }
}

async function verifyAndStockGRN(id, user) {
  try {
    const { data: grn, error: grnErr } = await supabase.from("grns").select("*").eq("id", id).single();
    if (grnErr || !grn) { showToast("GRN not found","error"); return; }
    const items = Array.isArray(grn.items) ? grn.items : [];
    const skType = grn.storekeeper_type || "local"; const siteId = grn.site_id; let stockAdded = 0;
    for (const item of items) {
      const itemName = item.name||item.material_name; const itemQty = parseFloat(item.quantity||item.qty)||0;
      if (!itemName||itemQty<=0) continue;
      const mat = findMaterial(itemName);
      const { data: existing, error: chkErr } = await supabase.from("stock").select("*").eq("site_id", siteId).eq("material_name", itemName).eq("storekeeper_type", skType).limit(1);
      if (chkErr) throw chkErr;
      if (existing && existing.length) {
        const cur = existing[0];
        const { error: updErr } = await supabase.from("stock").update({ quantity: (cur.quantity||0)+itemQty, unit_price: item.unit_price||cur.unit_price, last_updated: new Date().toISOString(), updated_by: user.id }).eq("id", cur.id);
        if (updErr) throw updErr;
      } else {
        const { error: insErr } = await supabase.from("stock").insert({ site_id: siteId, material_name: itemName, material_code: mat?.code||null, category: mat?.category||"Other", quantity: itemQty, unit: item.unit||mat?.unit||"Pcs", unit_price: item.unit_price||0, storekeeper_type: skType, updated_by: user.id });
        if (insErr) throw insErr;
      }
      stockAdded++;
    }
    const { error: grnUpdErr } = await supabase.from("grns").update({ status: "verified", verified_by: user.id, verified_at: new Date().toISOString() }).eq("id", id);
    if (grnUpdErr) throw grnUpdErr;
    await logAudit({action:"grn_verified",module:"grn",record_id:id,after:{items:stockAdded,site_id:siteId,supplier:grn.supplier}});
    showToast(`GRN verified — ${stockAdded} item(s) added to stock`,"success");
  } catch(err) { showToast(`Error: ${err.message}`,"error"); }
}

async function openNewGRNModal(user, siteFilter) {
  showModal(`<h2 style="margin-bottom:20px;">New GRN Entry</h2><div style="display:flex;flex-direction:column;gap:16px;"><div style="background:var(--bg-700);border:2px dashed var(--border);border-radius:12px;padding:30px;text-align:center;cursor:pointer;" onclick="document.getElementById('grn-files').click()"><div style="font-size:32px;margin-bottom:8px;">📷</div><div style="color:var(--text-200);font-size:13px;">Click to upload delivery note / invoice</div><div style="color:var(--text-300);font-size:12px;margin-top:4px;">AI will extract items automatically</div><input id="grn-files" type="file" accept="image/*,application/pdf" multiple style="display:none;" onchange="window._grnProcessFiles(this.files)"></div><div id="grn-ai-preview"></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;"><div><label style="color:var(--text-300);font-size:12px;text-transform:uppercase;">Site</label><select id="g-site" style="width:100%;margin-top:6px;background:var(--bg-700);border:1px solid var(--border);border-radius:8px;padding:10px;color:var(--text-100);">${SITES.filter(s=>siteFilter.includes(s.id)).map(s=>`<option value="${s.id}">${s.name}</option>`).join("")}</select></div><div><label style="color:var(--text-300);font-size:12px;text-transform:uppercase;">Type</label><select id="g-type" style="width:100%;margin-top:6px;background:var(--bg-700);border:1px solid var(--border);border-radius:8px;padding:10px;color:var(--text-100);"><option value="local">Local</option><option value="imported">Imported</option><option value="scaffolding">Scaffolding</option></select></div></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;"><div><label style="color:var(--text-300);font-size:12px;text-transform:uppercase;">GRN Number</label><input id="g-grn" type="text" style="width:100%;margin-top:6px;background:var(--bg-700);border:1px solid var(--border);border-radius:8px;padding:10px;color:var(--text-100);"></div><div><label style="color:var(--text-300);font-size:12px;text-transform:uppercase;">Invoice #</label><input id="g-inv" type="text" style="width:100%;margin-top:6px;background:var(--bg-700);border:1px solid var(--border);border-radius:8px;padding:10px;color:var(--text-100);"></div></div><div><label style="color:var(--text-300);font-size:12px;text-transform:uppercase;">Supplier</label><input id="g-supplier" type="text" style="width:100%;margin-top:6px;background:var(--bg-700);border:1px solid var(--border);border-radius:8px;padding:10px;color:var(--text-100);"></div><div style="display:flex;gap:12px;margin-top:8px;"><button onclick="window._grnSave()" class="btn btn-gold" style="flex:1;">Submit GRN</button><button onclick="window._closeModal()" class="btn btn-ghost">Cancel</button></div></div>`);
  window._grnProcessFiles = async (files) => { const preview = document.getElementById("grn-ai-preview"); preview.innerHTML = `<div style="text-align:center;padding:20px;color:var(--gold);">🔍 AI scanning document…</div>`; const grnData = await scanGRN(files); if (grnData&&!grnData.error) { renderGRNPreview(grnData,"grn-ai-preview"); if(grnData.grn_number)document.getElementById("g-grn").value=grnData.grn_number; if(grnData.invoice_number)document.getElementById("g-inv").value=grnData.invoice_number; if(grnData.supplier)document.getElementById("g-supplier").value=grnData.supplier; } else { renderGRNPreview(grnData,"grn-ai-preview"); } };
  window._grnSave = async () => { const siteId=parseInt(document.getElementById("g-site").value); const type=document.getElementById("g-type").value; const grnNum=document.getElementById("g-grn").value.trim(); const invNum=document.getElementById("g-inv").value.trim(); const supplier=document.getElementById("g-supplier").value.trim(); if(!siteId){showToast("Select a site","error");return;} const payload={site_id:siteId,grn_number:grnNum||null,invoice_number:invNum||null,supplier:supplier||null,storekeeper_type:type,items:[],total_value:null,received_by:user.id,status:"pending"}; try { const { data, error } = await supabase.from("grns").insert(payload).select().single(); if (error) throw error; await logAudit({action:"grn_created",module:"grn",record_id:data?.id,after:payload}); closeModal(); showToast("GRN submitted for verification","success"); loadGRNs(user,siteFilter,"pending"); } catch(err){showToast(`Error: ${err.message}`,"error");} };
}

async function updateGRNStatus(id, status, user) {
  try {
    const { error } = await supabase.from("grns").update({ status }).eq("id", id);
    if (error) throw error;
    await logAudit({action:`grn_${status}`,module:"grn",record_id:id,after:{status}});
    showToast(`GRN ${status}`,status==="verified"?"success":"warning");
  } catch(err){showToast(`Error: ${err.message}`,"error");}
}

async function openViewGRNModal(id, user) {
  showModal(`<div class="spinner" style="margin:40px auto;"></div>`);
  try { const { data: grn, error: grnErr } = await supabase.from("grns").select("*,sites(name)").eq("id", id).single(); if (grnErr||!grn){showToast("GRN not found","error");return;} const items=Array.isArray(grn.items)?grn.items:[]; showModal(`<h2 style="margin-bottom:20px;">GRN: ${grn.grn_number||grn.id.slice(0,8)}</h2><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px;">${[["Site",grn.sites?.name||`Site ${grn.site_id}`],["Supplier",grn.supplier||"--"],["GRN #",grn.grn_number||"--"],["Invoice #",grn.invoice_number||"--"],["Type",grn.storekeeper_type||"--"],["Status",grn.status],["Total Value",grn.total_value?`KES ${Number(grn.total_value).toLocaleString()}`:"—"],["Date",new Date(grn.created_at).toLocaleDateString("en-KE")],["Verified By",grn.verified_by||"--"],["Verified At",grn.verified_at?new Date(grn.verified_at).toLocaleDateString("en-KE"):"--"]].map(([l,v])=>`<div><span style="color:var(--text-300);font-size:11px;text-transform:uppercase;">${l}</span><div style="color:var(--text-100);font-weight:500;">${v}</div></div>`).join("")}</div><h3 style="font-size:14px;margin-bottom:12px;">Items</h3>${items.length?`<table style="width:100%;border-collapse:collapse;font-size:12px;"><thead><tr style="border-bottom:1px solid var(--border);">${["Item","Qty","Unit","Unit Price","Total"].map(h=>`<th style="text-align:left;padding:6px;color:var(--text-300);">${h}</th>`).join("")}</tr></thead><tbody>${items.map(item=>`<tr style="border-bottom:1px solid rgba(30,35,48,0.4);"><td style="padding:6px;color:var(--text-100);">${item.name||item.material_name||"--"}</td><td style="padding:6px;">${item.quantity||"--"}</td><td style="padding:6px;color:var(--text-200);">${item.unit||"--"}</td><td style="padding:6px;">${item.unit_price?"KES "+Number(item.unit_price).toLocaleString():"—"}</td><td style="padding:6px;color:var(--gold);">${item.total_price?"KES "+Number(item.total_price).toLocaleString():"—"}</td></tr>`).join("")}</tbody></table>`:`<p style="color:var(--text-300);font-size:13px;">No items recorded</p>`}${grn.notes?`<p style="color:var(--text-200);font-size:12px;margin-top:12px;">Notes: ${grn.notes}</p>`:""}<div style="margin-top:20px;display:flex;gap:12px;"><button onclick="window._closeModal()" class="btn btn-ghost" style="flex:1;">Close</button></div>`); } catch(err){showToast(`Error: ${err.message}`,"error");closeModal();}
}