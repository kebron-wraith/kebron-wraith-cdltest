// ============================================================
// CDL Site Management — modules/audit_core.js
// Immutable audit trail — called by EVERY module on every action.
// ============================================================

import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../config.js";

// Get current user from localStorage (avoids circular import with app.js)
function getCurrentUser() {
  try { return JSON.parse(localStorage.getItem("cdl_session") || "null"); }
  catch { return null; }
}

// Persistent session ID via crypto.randomUUID()
function getSessionId() {
  if (!sessionStorage.getItem("cdl_session_id")) {
    sessionStorage.setItem("cdl_session_id", crypto.randomUUID());
  }
  return sessionStorage.getItem("cdl_session_id");
}

// In-memory queue for failed audit logs (sync on reconnect)
const pendingAudits = [];

/**
 * Log an action to the immutable audit_log table.
 * Never fails silently — logs to console if Supabase unreachable.
 *
 * @param {Object} entry
 * @param {string} entry.action       - e.g. "stock_adjusted", "grn_verified", "transfer_approved"
 * @param {string} entry.module       - e.g. "inventory", "transfers", "procurement"
 * @param {string} [entry.record_id]  - UUID of the affected record
 * @param {*}      [entry.before]     - Value before change
 * @param {*}      [entry.after]      - Value after change
 * @param {string} [entry.reason]     - Human-readable reason
 */
export async function logAudit({ action, module, record_id, before, after, reason }) {
  const user = getCurrentUser();
  if (!user) return;

  const entry = {
    actor_id:     user.id,
    actor_name:   user.name,
    actor_role:   user.role,
    action,
    module,
    record_id:    record_id || null,
    before_value: before ? JSON.stringify(before) : null,
    after_value:  after  ? JSON.stringify(after)  : null,
    reason:       reason || null,
    session_id:   getSessionId(),
    timestamp:    new Date().toISOString(),
  };

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/audit_log`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
        "Prefer": "return=minimal"
      },
      body: JSON.stringify(entry)
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Supabase ${res.status}: ${errText}`);
    }
  } catch (err) {
    console.error("[AUDIT] Failed to log:", entry, err);
    pendingAudits.push(entry);
  }
}

/**
 * Retry all pending (previously failed) audit log entries.
 * Called on reconnect or on a timer.
 */
export async function syncPendingAudits() {
  if (!pendingAudits.length) return;
  const batch = [...pendingAudits];
  pendingAudits.length = 0;
  for (const entry of batch) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/audit_log`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": SUPABASE_ANON_KEY,
          "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
          "Prefer": "return=minimal"
        },
        body: JSON.stringify(entry)
      });
      if (!res.ok) {
        throw new Error(`Supabase ${res.status}`);
      }
    } catch {
      pendingAudits.push(entry);
    }
  }
}
