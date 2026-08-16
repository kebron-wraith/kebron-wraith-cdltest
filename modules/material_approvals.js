// ============================================================
// CDL Site Management v10 — modules/material_approvals.js
// Feature 4: Material Approval Gate (Watcher)
// New material names not in MATERIALS_DB get "pending" status
// until approved by an admin/store_manager.
// ============================================================

import { SUPABASE_URL, getHeaders } from "../config.js";
import { findMaterial } from "../data.js";
import { logAudit } from "./audit_core.js";
import { sendNotif } from "./notifs.js";
import { showToast } from "../app.js";
import { ROLES } from "./roles.js";

/**
 * checkAndQueueNewMaterial — the approval gate.
 *
 * Called before upsertStock when a storekeeper adds material via GRN.
 * If the material name already exists as *approved* stock for this site+type,
 * returns { isNew: false, stockId } so the caller can do a normal merge.
 * If the name is new, creates a material_watchlist entry and returns
 * { isNew: true, watchId } — the stock is NOT inserted; it waits for approval.
 */
export async function checkAndQueueNewMaterial(materialName, siteId, skType, userId, userInfo) {
  const auth = getHeaders();

  // Check if exact name exists as approved stock for this site+type
  const check = await fetch(
    `${SUPABASE_URL}/rest/v1/stock` +
    `?select=id,status` +
    `&site_id=eq.${siteId}` +
    `&material_name=eq.${encodeURIComponent(materialName)}` +
    `&storekeeper_type=eq.${skType}` +
    `&status=eq.approved` +
    `&limit=1`,
    { headers: auth }
  );
  let existing = await check.json();
  // Fallback: if status column missing (migration_v10 not applied), retry without filter
  if (!check.ok && check.status === 400) {
    const checkRetry = await fetch(
      `${SUPABASE_URL}/rest/v1/stock`
      + `?select=id&site_id=eq.`
      + `&material_name=eq.`
      + `&storekeeper_type=eq.`
      + `&limit=1`,
      { headers: auth }
    );
    existing = checkRetry.ok ? await checkRetry.json().catch(() => []) : [];
  }

  if (Array.isArray(existing) && existing.length > 0) {
    return { isNew: false, stockId: existing[0].id };
  }

  // Also check pending watchlist entries for the same name (dedup)
  const dupCheck = await fetch(
    `${SUPABASE_URL}/rest/v1/material_watchlist` +
    `?select=id` +
    `&site_id=eq.${siteId}` +
    `&storekeeper_type=eq.${skType}` +
    `&material_name=eq.${encodeURIComponent(materialName)}` +
    `&status=eq.pending` +
    `&limit=1`,
    { headers: auth }
  );
  const dupes = await dupCheck.json();
  if (Array.isArray(dupes) && dupes.length > 0) {
    // Already queued by another storekeeper — treat as "not new stock yet"
    return { isNew: false, watchId: dupes[0].id, alreadyQueued: true };
  }

  // New material — queue for approval
  const matched = findMaterial(materialName);
  const res = await fetch(`${SUPABASE_URL}/rest/v1/material_watchlist`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...auth,
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      material_name: materialName,
      material_code: matched?.code || null,
      category: matched?.category || "Other",
      unit: matched?.unit || null,
      site_id: siteId,
      storekeeper_type: skType,
      proposed_by: userId,
      status: "pending",
      created_at: new Date().toISOString(),
    }),
  });
  const saved = await res.json();
  const watchId = Array.isArray(saved) ? saved[0]?.id : saved?.id;

  if (watchId) {
    await logAudit({
      action: "material_queued",
      module: "material_approvals",
      record_id: watchId,
      after: { material_name: materialName, site_id: siteId, storekeeper_type: skType },
      reason: `New material proposed by ${userInfo?.name || userId}`,
    });

    // Notify admins / store_managers that approval is needed
    const approverRoles = ["admin", "store_manager"];
    const notifRes = await fetch(
      `${SUPABASE_URL}/rest/v1/users?role=in.(${approverRoles.join(",")})&select=id`,
      { headers: auth }
    );
    const approvers = await notifRes.json();
    if (Array.isArray(approvers)) {
      for (const approver of approvers) {
        await sendNotif(
          approver.id,
          "Material Approval Needed",
          `"${materialName}" was proposed by ${userInfo?.name || "a storekeeper"}. Review in Material Approvals.`,
          "approval",
          watchId,
          "material_watchlist"
        );
      }
    }
  }

  return { isNew: true, watchId, alreadyQueued: false };
}

/**
 * renderMaterialApprovals — UI for admin/store_manager to review pending materials.
 */
export async function renderMaterialApprovals(container, user) {
  if (!container) return;

  const role = ROLES[user.role] || {};
  container.innerHTML = `
    <div style="margin-bottom:24px;">
      <h1 style="font-size:24px;font-weight:700;color:var(--text-100);">✦ Material Approvals</h1>
      <p style="color:var(--text-200);font-size:14px;margin-top:4px;">Review pending material proposals from storekeepers</p>
    </div>
    <div id="material-approvals-wrap">
      <div class="spinner" style="margin:60px auto;"></div>
    </div>`;

  await loadPendingMaterials(user);
  window._materialApprovalsRefresh = () => loadPendingMaterials(user);
}

/**
 * loadPendingMaterials — fetches all pending watchlist entries and renders them.
 */
async function loadPendingMaterials(user) {
  const wrap = document.getElementById("material-approvals-wrap");
  if (!wrap) return;

  wrap.innerHTML = `<div class="spinner" style="margin:60px auto;"></div>`;

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/material_watchlist` +
      `?status=eq.pending&order=created_at.desc&limit=100`,
      { headers: getHeaders() }
    );
    // Migration v10 not applied - table does not exist yet
    if (!res.ok && res.status === 404) {
      wrap.innerHTML = '<div class="card" style="text-align:center;padding:40px;color:var(--text-300);">No pending material approvals</div>';
      return;
    }
    const items = await res.json();
    const arr = Array.isArray(items) ? items : [];

    if (!arr.length) {
      wrap.innerHTML = `<div class="card" style="text-align:center;padding:40px;color:var(--text-300);">
        ✓ No pending material approvals
      </div>`;
      return;
    }

    wrap.innerHTML = `<div class="card" style="overflow-x:auto;">
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead><tr style="border-bottom:1px solid var(--border);">
          ${["Material","Site","Type","Unit","Proposed By","Proposed","Actions"].map(h =>
            `<th style="text-align:left;padding:10px 8px;color:var(--text-400);font-weight:500;font-size:11px;text-transform:uppercase;">${h}</th>`
          ).join("")}
        </tr></thead>
        <tbody>${arr.map(w => {
	          const escName = w.material_name.replace(/'/g, "\\'").replace(/"/g, "&quot;");
	          const siteName = w.site_id ? `Site ${w.site_id}` : "All Sites";
	          let bg, col;
	          if (w.storekeeper_type === "local") { bg = "rgba(46,160,67,0.15)"; col = "var(--accent-green)"; }
	          else if (w.storekeeper_type === "imported") { bg = "rgba(61,142,248,0.15)"; col = "var(--accent-blue)"; }
	          else { bg = "rgba(243,156,18,0.15)"; col = "var(--orange)"; }
	          const propDate = new Date(w.created_at).toLocaleDateString("en-KE", { month: "short", day: "numeric" });
	          return `
          <tr style="border-bottom:1px solid rgba(30,35,48,0.4);">
            <td style="padding:10px 8px;font-weight:500;color:var(--text-100);">${w.material_name}</td>
            <td style="padding:10px 8px;color:var(--text-200);">${w.site_id ? `Site ${w.site_id}` : "All Sites"}</td>
            <td style="padding:10px 8px;">
              <span style="padding:2px 8px;border-radius:10px;font-size:11px;
                background:${bg}
                color:${col}>
                ${w.storekeeper_type}
              </span>
            </td>
            <td style="padding:10px 8px;color:var(--text-300);">${w.unit || "—"}</td>
            <td style="padding:10px 8px;color:var(--text-200);font-size:12px;">${w.proposed_by_name || "—"}</td>
            <td style="padding:10px 8px;color:var(--text-300);font-size:11px;font-family:var(--font-mono);">${propDate}</td>
            <td style="padding:10px 8px;display:flex;gap:6px;">
              <button onclick="window._approveMaterial('${w.id}', '${escName}')"
                class="btn btn-gold btn-sm" style="font-size:11px;padding:4px 10px;">✓ Approve</button>
              <button onclick="window._rejectMaterial('${w.id}')"
                class="btn btn-ghost btn-sm" style="font-size:11px;padding:4px 10px;">✕ Reject</button>
            </td>
          </tr>`;
	        }).join("")}
        </tbody>
      </table>
    </div>`;

    window._approveMaterial = (watchId, materialName) => approveMaterial(watchId, materialName, user);
    window._rejectMaterial = (watchId) => rejectMaterial(watchId, user);
  } catch (err) {
    wrap.innerHTML = `<div class="card" style="padding:40px;text-align:center;color:var(--red);">
      Error: ${err.message}
    </div>`;
  }
}

/**
 * approveMaterial — sets watchlist entry to 'approved', then creates the
 * actual stock row with status='approved' so it's visible to requesters.
 */
async function approveMaterial(watchId, materialName, user) {
  const auth = getHeaders();

  try {
    // Fetch the full watchlist entry
    const res = await fetch(`${SUPABASE_URL}/rest/v1/material_watchlist?id=eq.${watchId}`, { headers: auth });
    if (!res.ok && res.status === 404) { showToast("Watchlist table not available yet", "error"); return; }
    const entries = await res.json();
    const entry = Array.isArray(entries) ? entries[0] : null;
    if (!entry) { showToast("Watchlist entry not found", "error"); return; }

    // Check if approved stock already exists (race condition guard)
    const existingCheck = await fetch(
      `${SUPABASE_URL}/rest/v1/stock` +
      `?select=id&site_id=eq.${entry.site_id}&material_name=eq.${encodeURIComponent(materialName)}` +
      `&storekeeper_type=eq.${entry.storekeeper_type}&status=eq.approved&limit=1`,
      { headers: auth }
    );
    let existing = [];
    if (existingCheck.ok) { existing = await existingCheck.json().catch(() => []); } else if (existingCheck.status === 400) { const retryRes = await fetch(`${SUPABASE_URL}/rest/v1/stock?select=id&site_id=eq.${entry.site_id}&material_name=eq.${encodeURIComponent(materialName)}&storekeeper_type=eq.${entry.storekeeper_type}&limit=1`, { headers: auth }); if (retryRes.ok) existing = await retryRes.json().catch(() => []); }

    if (Array.isArray(existing) && existing.length > 0) {
      // Approved stock already exists — reject the watchlist entry instead
      await fetch(`${SUPABASE_URL}/rest/v1/material_watchlist?id=eq.${watchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...auth },
        body: JSON.stringify({ status: "rejected", approved_by: user.id, approved_at: new Date().toISOString(), rejection_reason: "Stock already exists as approved." }),
      });
    } else {
      // Create the actual stock row with status='approved'
      await fetch(`${SUPABASE_URL}/rest/v1/stock`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...auth, Prefer: "return=minimal" },
        body: JSON.stringify({
          site_id: entry.site_id,
          material_name: entry.material_name,
          material_code: entry.material_code,
          category: entry.category,
          unit: entry.unit,
          quantity: 0,     // storekeeper already added the quantity via GRN; just create the approved master row
          unit_price: 0,
          storekeeper_type: entry.storekeeper_type,
          status: "approved",
          updated_by: user.id,
          last_updated: new Date().toISOString(),
        }),
      });

      // Mark watchlist as approved
      await fetch(`${SUPABASE_URL}/rest/v1/material_watchlist?id=eq.${watchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...auth },
        body: JSON.stringify({ status: "approved", approved_by: user.id, approved_at: new Date().toISOString() }),
      });
    }

    await logAudit({
      action: "material_approved",
      module: "material_approvals",
      record_id: watchId,
      after: { material_name: materialName, approved_by: user.id },
      reason: `Material approved by ${user.name}`,
    });

    showToast(`"${materialName}" approved — now visible in inventory`, "success");
    if (window._materialApprovalsRefresh) window._materialApprovalsRefresh();
  } catch (err) {
    showToast(`Approval failed: ${err.message}`, "error");
  }
}

/**
 * rejectMaterial — marks a watchlist entry as rejected with optional reason.
 */
async function rejectMaterial(watchId, user) {
  const auth = getHeaders();

  try {
    await fetch(`${SUPABASE_URL}/rest/v1/material_watchlist?id=eq.${watchId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...auth, Prefer: "return=minimal" },
      body: JSON.stringify({
        status: "rejected",
        approved_by: user.id,
        approved_at: new Date().toISOString(),
      }),
    });

    await logAudit({
      action: "material_rejected",
      module: "material_approvals",
      record_id: watchId,
      after: { rejected_by: user.id },
      reason: `Material rejected by ${user.name}`,
    });

    showToast("Material rejected", "success");
    if (window._materialApprovalsRefresh) window._materialApprovalsRefresh();
  } catch (err) {
    showToast(`Rejection failed: ${err.message}`, "error");
  }
}
