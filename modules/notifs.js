// CDL Site Management — modules/notifs.js
// Notification system: polling, rendering, sending, and read management.
// Uses CSS classes only — no inline styles.

import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../config.js";

// ── State ──────────────────────────────────────────────────────
let _user = null;
let _interval = null;

// ── API helpers ────────────────────────────────────────────────
const _headers = {
  "Content-Type": "application/json",
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
};

async function _fetch(url, opts = {}) {
  return fetch(url, { ...opts, headers: { ..._headers, ...(opts.headers || {}) } });
}

// ── Init & polling ─────────────────────────────────────────────

export function initNotifs(user) {
  _user = user;
  pollNotifs();
  if (_interval) clearInterval(_interval);
  _interval = setInterval(pollNotifs, 30_000);
}

export async function pollNotifs() {
  if (!_user) return;

  try {
    const data = await _fetch(
      `${SUPABASE_URL}/rest/v1/notifications?user_id=eq.${_user.id}&is_read=eq.false&order=created_at.desc&limit=50`
    ).then((r) => r.json());

    _renderList(data);
    _updateBadge(data.length);
  } catch (err) {
    console.warn("[notifs] poll failed:", err.message);
  }
}

// ── Send ───────────────────────────────────────────────────────

export async function sendNotif(userId, title, body, type = "info", refId = null, refTable = null) {
  try {
    await _fetch(`${SUPABASE_URL}/rest/v1/notifications`, {
      method: "POST",
      body: JSON.stringify({ user_id: userId, title, body, type, ref_id: refId, ref_table: refTable }),
      headers: { ..._headers, Prefer: "return=minimal" },
    });
  } catch (err) {
    console.error("[notifs] send failed:", err.message);
  }
}

// ── Mark single as read ────────────────────────────────────────

window.markRead = async function (id) {
  try {
    await _fetch(`${SUPABASE_URL}/rest/v1/notifications?id=eq.${id}`, {
      method: "PATCH",
      body: JSON.stringify({ is_read: true }),
    });
    pollNotifs();
  } catch (err) {
    console.warn("[notifs] markRead failed:", err.message);
  }
};

// ── Mark all as read ───────────────────────────────────────────

window.markAllRead = async function () {
  if (!_user) return;
  try {
    const items = await _fetch(
      `${SUPABASE_URL}/rest/v1/notifications?user_id=eq.${_user.id}&is_read=eq.false&select=id`
    ).then((r) => r.json());

    await Promise.all(
      items.map((n) =>
        _fetch(`${SUPABASE_URL}/rest/v1/notifications?id=eq.${n.id}`, {
          method: "PATCH",
          body: JSON.stringify({ is_read: true }),
        })
      )
    );
    pollNotifs();
  } catch (err) {
    console.warn("[notifs] markAllRead failed:", err.message);
  }
};

// ── Rendering ──────────────────────────────────────────────────

function _renderList(notifs) {
  const el = document.getElementById("notif-list");
  if (!el) return;

  if (!notifs.length) {
    el.innerHTML = "";
    const empty = document.createElement("p");
    empty.className = "notif-empty";
    empty.textContent = "No new notifications";
    el.appendChild(empty);
    return;
  }

  el.innerHTML = "";
  for (const n of notifs) {
    const item = document.createElement("div");
    item.className = "notif-item";
    item.dataset.id = n.id;
    item.addEventListener("click", () => window.markRead(n.id));

    const accent = _typeAccent(n.type);

    const titleEl = document.createElement("div");
    titleEl.className = "notif-item__title";
    titleEl.textContent = n.title;

    const bodyEl = document.createElement("div");
    bodyEl.className = "notif-item__body";
    bodyEl.textContent = n.body || "";

    const timeEl = document.createElement("div");
    timeEl.className = "notif-item__time";
    timeEl.textContent = _timeAgo(n.created_at);

    if (accent) {
      const dot = document.createElement("span");
      dot.className = `notif-item__dot notif-item__dot--${accent}`;
      item.appendChild(dot);
    }

    item.appendChild(titleEl);
    item.appendChild(bodyEl);
    item.appendChild(timeEl);
    el.appendChild(item);
  }
}

function _updateBadge(count) {
  const badge = document.getElementById("notif-badge");
  if (!badge) return;

  if (count > 0) {
    badge.textContent = count > 9 ? "9+" : String(count);
    badge.classList.remove("hidden");
  } else {
    badge.classList.add("hidden");
  }
}

// ── Type accent mapping ────────────────────────────────────────

function _typeAccent(type) {
  const map = {
    warning: "orange",
    danger: "red",
    error: "red",
    success: "green",
    info: "blue",
  };
  return map[type] || "gold";
}

// ── Time formatting ────────────────────────────────────────────

function _timeAgo(iso) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
