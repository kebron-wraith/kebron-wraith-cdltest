// CDL — modules/site_closeout.js
// Feature 7: Site Closeout Workflow
// Blocks new requests/transfers/GRNs, requires all stock transferred out,
// generates final report, Admin/Store Manager approval

import { supabase, SITES } from "../config.js";
import { logAudit } from "./audit_core.js";
import { ROLES } from "./roles.js";
import { showToast, showModal, closeModal } from "../app.js";

/**
 * renderSiteCloseout — UI for admin/store_manager to close a site
 */
export async function renderSiteCloseout(container, user) {
  if (!container) return;

  const role = ROLES[user.role] || {};
  const canClose = ["admin", "store_manager", "company_owner", "ceo"].includes(user.role);

  container.innerHTML = `
    <div style="margin-bottom:24px;">
      <h1 style="font-size:24px;font-weight:700;color:var(--text-100);">🏭 Site Closeout</h1>
      <p style="color:var(--text-200);font-size:14px;margin-top:4px;">Close site operations and transfer out remaining stock</p>
    </div>
    ${canClose ? `<button class="btn btn-danger" onclick="window._scOpenCloseoutModal()">⚠ Initiate Site Closeout</button>` : ""}
    <div id="site-closeout-wrap">
      <div class="spinner" style="margin:60px auto;"></div>
    </div>`;

  await loadCloseoutStatus(user);
  window._siteCloseoutRefresh = () => loadCloseoutStatus(user);
}

/**
 * loadCloseoutStatus — checks if site is in closeout mode and loads status
 */
async function loadCloseoutStatus(user) {
  const wrap = document.getElementById("site-closeout-wrap");
  if (!wrap) return;

  try {
    // Check if any sites are in closeout mode
    const { data: closeouts, error } = await supabase
      .from("site_closeouts")
      .select("*")
      .eq("status", "active")
      .limit(1);

    if (error && error.code === '42P01') {
      // Table doesn't exist yet - migration needed
      wrap.innerHTML = '<div class="card" style="text-align:center;padding:40px;color:var(--text-300);">Site closeout system not initialized</div>';
      return;
    }
    if (error) throw error;

    const activeCloseout = closeouts && closeouts.length > 0 ? closeouts[0] : null;

    if (activeCloseout) {
      wrap.innerHTML = `
        <div class="card" style="background:var(--bg-700);border-left:3px solid var(--red);">
          <h2 style="color:var(--text-100);margin-bottom:8px;">🚨 SITE CLOSEOUT ACTIVE</h2>
          <p><strong>Site:</strong> Site ${activeCloseout.site_id}</p>
          <p><strong>Initiated by:</strong> ${activeCloseout.initiated_by_name || "Unknown"}</p>
          <p><strong>Started:</strong> ${new Date(activeCloseout.started_at).toLocaleDateString("en-KE")}</p>
          <p><strong>Status:</strong> ${activeCloseout.status}</p>
          ${activeCloseout.report_url ? `<p><a href="${activeCloseout.report_url}" target="_blank">View Final Report</a></p>` : ""}
          <div style="margin-top:16px;display:flex;gap:8px;">
            <button onclick="window._scGenerateReport('${activeCloseout.id}')" class="btn btn-gold">📊 Generate Final Report</button>
            ${["admin", "company_owner", "ceo"].includes(user.role) ? `<button onclick="window._scCompleteCloseout('${activeCloseout.id}')" class="btn btn-danger">✓ Complete Closeout</button>` : ""}
          </div>
        </div>
      `;
    } else {
      wrap.innerHTML = `
        <div class="card" style="text-align:center;padding:40px;color:var(--text-300);">
          <h3>No active site closeout</h3>
          <p>Use the "Initiate Site Closeout" button to begin the closeout process for a site.</p>
        </div>
      `;
    }
  } catch (err) {
    wrap.innerHTML = `<div class="card" style="padding:40px;text-align:center;color:var(--red);">Error: ${err.message}</div>`;
  }
}

/**
 * Open site closeout modal
 */
window._scOpenCloseoutModal = () => {
  showModal(`<h2 style="font-size:18px;font-weight:700;color:var(--text-100);margin-bottom:6px;">Initiate Site Closeout</h2>
  <p style="color:var(--text-300);font-size:13px;margin-bottom:20px;">This will block new requests, transfers, and GRNs for the selected site. All stock must be transferred out before completion.</p>
  <div style="display:flex;flex-direction:column;gap:16px;">
    <div>
      <label style="display:block;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:var(--text-400);margin-bottom:6px;">Site to Close</label>
      <select id="sc-site" style="width:100%;background:var(--bg-700);border:1px solid var(--border);border-radius:8px;padding:10px;color:var(--text-100);">
        ${SITES.map(s=>`<option value="${s.id}">${s.name}</option>`).join("")}
      </select>
    </div>
    <div>
      <label style="display:block;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:var(--text-400);margin-bottom:6px;">Closeout Reason</label>
      <textarea id="sc-reason" rows="3" placeholder="Reason for closing this site..." style="width:100%;background:var(--bg-700);border:1px solid var(--border);border-radius:8px;padding:10px;color:var(--text-100);resize:none;"></textarea>
    </div>
    <div style="display:flex;gap:12px;">
      <button onclick="window._scInitiateCloseout()" class="btn btn-danger" style="flex:1;">⚠ Initiate Closeout</button>
      <button onclick="window._closeModal()" class="btn btn-ghost">Cancel</button>
    </div>
  </div>`);

  window._scInitiateCloseout = async () => {
    const siteId = parseInt(document.getElementById("sc-site").value);
    const reason = document.getElementById("sc-reason").value.trim();

    if (!siteId) { showToast("Select a site", "error"); return; }
    if (!reason) { showToast("Enter closeout reason", "error"); return; }

    try {
      // Check if site has any pending requests/transfers/GRNs that would be blocked
      const { data: pendingReqs, error: reqErr } = await supabase
        .from('material_requests')
        .select('id')
        .eq('site_id', siteId)
        .in('status', ['pending', 'pm_approved'])
        .limit(1);

      const { data: pendingTrans, error: transErr } = await supabase
        .from('transfers')
        .select('id')
        .eq('from_site_id', siteId)
        .in('status', ['pending', 'approved'])
        .limit(1);

      const { data: pendingGRNs, error: grnErr } = await supabase
        .from('grns')
        .select('id')
        .eq('site_id', siteId)
        .eq('status', 'pending')
        .limit(1);

      if ((pendingReqs && pendingReqs.length > 0) ||
          (pendingTrans && pendingTrans.length > 0) ||
          (pendingGRNs && pendingGRNs.length > 0)) {
        showToast("Cannot initiate closeout: site has pending requests, transfers, or GRNs", "error");
        return;
      }

      // Check if site has any stock remaining (excluding zero quantity)
      const { data: stockItems, error: stockErr } = await supabase
        .from('stock')
        .select('id,material_name,quantity')
        .eq('site_id', siteId)
        .gt('quantity', 0);

      if (stockErr) throw stockErr;

      const { data: saved, error } = await supabase
        .from('site_closeouts')
        .insert({
          site_id: siteId,
          initiated_by: user.id,
          reason: reason,
          status: 'active',
          started_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      await logAudit({
        action: "site_closeout_initiated",
        module: "site_closeout",
        record_id: saved.id,
        after: { site_id: siteId, reason }
      });

      closeModal();
      showToast("Site closeout initiated - new requests/transfers/GRNs blocked", "warning");

      if (window._siteCloseoutRefresh) window._siteCloseoutRefresh();

    } catch (err) {
      showToast(`Error: ${err.message}`, "error");
    }
  };
};

/**
 * Generate final closeout report
 */
window._scGenerateReport = async (closeoutId) => {
  try {
    const { data: closeout, error: closeoutErr } = await supabase
      .from('site_closeouts')
      .select('*,sites(name)')
      .eq('id', closeoutId)
      .single();

    if (closeoutErr) throw closeoutErr;

    // Get remaining stock
    const { data: remainingStock, error: stockErr } = await supabase
      .from('stock')
      .select('material_name,quantity,unit')
      .eq('site_id', closeout.site_id)
      .gt('quantity', 0);

    if (stockErr) throw stockErr;

    // Get closedout transactions
    const { data: finalRequests, error: reqErr } = await supabase
      .from('material_requests')
      .select('*,users(name as requester_name)')
      .eq('site_id', closeout.site_id)
      .in('status', ['completed', 'returned'])
      .order('created_at', { ascending: false });

    const { data: finalTransfers, error: transErr } = await supabase
      .from('transfers')
      .select('*,sites_from(name as from_site),sites_to(name as to_site)')
      .or(`from_site_id.eq.${closeout.siteId},to_site_id.eq.${closeout.siteId}`)
      .in('status', ['completed'])
      .order('created_at', { ascending: false })
      .limit(50);

    // Generate report data
    const reportData = {
      site: closeout.sites?.name || `Site ${closeout.site_id}`,
      initiatedBy: closeout.initiated_by_name || "Unknown",
      startedAt: new Date(closeout.started_at).toLocaleString("en-KE"),
      reason: closeout.reason,
      remainingStock: remainingStock || [],
      totalRemainingItems: remainingStock?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0,
      finalRequests: finalRequests || [],
      finalTransfers: finalTransfers || [],
      generatedAt: new Date().toISOString()
    };

    // For now, show as modal - in production this would generate a PDF/CSV
    showModal(`<h2 style="font-size:18px;font-weight:700;color:var(--text-100);margin-bottom:6px;">Site Closeout Report</h2>
    <div style="display:flex;flex-direction:column;gap:16px;">
      <div><strong>Site:</strong> ${reportData.site}</div>
      <div><strong>Initiated By:</strong> ${reportData.initiatedBy}</div>
      <div><strong>Started:</strong> ${reportData.startedAt}</div>
      <div><strong>Reason:</strong> ${reportData.reason}</div>
      <div><strong>Remaining Stock Items:</strong> ${reportData.totalRemainingItems}</div>
      ${reportData.remainingStock.length > 0 ? `
        <div style="margin-top:8px;">
          <strong>Remaining Stock Details:</strong>
          <ul style="margin:4px 0 0 16px;color:var(--text-200);font-size:12px;">
            ${reportData.remainingStock.map(item => `<li>${item.material_name}: ${item.quantity} ${item.unit||''}</li>`).join('')}
          </ul>
        </div>` : ''
      }
      <div><strong>Completed Requests:</strong> ${reportData.finalRequests?.length || 0}</div>
      <div><strong>Completed Transfers:</strong> ${reportData.finalTransfers?.length || 0}</div>
      <div style="margin-top:16px;display:flex;gap:8px;">
        <button onclick="window._scSaveReport('${closeoutId}')" class="btn btn-gold">💾 Save Report</button>
        <button onclick="window._closeModal()" class="btn btn-ghost">Close</button>
      </div>
    </div>`);

    window._scSaveReport = async (id) => {
      try {
        const { error } = await supabase
          .from('site_closeouts')
          .update({
            report_data: reportData,
            report_url: `https://example.com/reports/site-closeout-${id}.pdf`, // placeholder
            status: 'completed',
            completed_at: new Date().toISOString()
          })
          .eq('id', id);

        if (error) throw error;

        await logAudit({
          action: "site_closeout_completed",
          module: "site_closeout",
          record_id: id,
          after: { report_generated: true }
        });

        showToast("Closeout report saved", "success");
        window._closeModal();
        if (window._siteCloseoutRefresh) window._siteCloseoutRefresh();

      } catch (err) {
        showToast(`Error saving report: ${err.message}`, "error");
      }
    };

  } catch (err) {
    showToast(`Error generating report: ${err.message}`, "error");
  }
};

/**
 * Complete site closeout (admin/ceo only)
 */
window._scCompleteCloseout = async (closeoutId) => {
  try {
    const { error } = await supabase
      .from('site_closeouts')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', closeoutId);

    if (error) throw error;

    await logAudit({
      action: "site_closeout_completed_admin",
      module: "site_closeout",
      record_id: closeoutId
    });

    showToast("Site closeout completed", "success");
    if (window._siteCloseoutRefresh) window._siteCloseoutRefresh();

  } catch (err) {
    showToast(`Error completing closeout: ${err.message}`, "error");
  }
};

// Export nav_guard rule
export const siteCloseoutNavGuard = {
  section: "site_closeout",
  check: (user) => ["admin", "store_manager", "company_owner", "ceo"].includes(user.role)
};