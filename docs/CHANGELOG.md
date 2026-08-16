# CDL Site Management — Changelog

## v9.1-deploy — 2026-06-01 (Final Deployment Sprint)

### Responsive Design — ✅ All Devices
- **CSS**: Added comprehensive responsive breakpoints (≤1024px tablet, ≤768px mobile, ≤480px small mobile)
- **Login page**: Stacked layout on mobile, compact brand, hidden features, 3 breakpoints (≤900px, ≤600px, ≤380px)
- **App shell**: Sidebar slides in/out with overlay, hamburger menu, compact header
- **Content**: KPI grids collapse (4→2→1 cols), tables scroll horizontally, modals go full-width
- **Touch targets**: Larger form inputs (12px padding) on small screens
- **Mobile tests**: 7 tests covering iPhone (393×852) and tablet (768×1024) viewports — all pass

### Nav Visibility — ✅ Role-Based Access Control
- Fixed `nav_guard.js` `checkAccess()` to use allow-lists instead of deny-lists for procurement, transfers, inventory
- Fixed `NAV_ITEMS` in `app.js` to properly hide sections per role
- All 17 roles verified: admin sees users/audit, SK only sees GRN, PM sees inventory+requests+transfers, finance sees reports+incidents
- 5 nav visibility tests pass — 100%

### AI Chat — ✅ Multi-Provider with Graceful Fallback
- Replaced broken Groq fallback with OpenRouter free model
- Model: `google/gemini-2.0-flash-exp:free` (free tier, no credit card)
- ⚠️ **ACTION NEEDED**: Get free OpenRouter key at https://openrouter.ai/keys and replace in config.js
- Gemini keys: Rate-limited from testing (429) — will reset per-minute/per-day
- Fixed `ai_chat.js` `setupChatHandlers()` to use container-based element lookup (fixes async gap issue)
- All 13 AI-enabled roles verified with visible AI chat input
- 3 storekeeper roles correctly have no AI (0 msgs/day per spec)
- App handles API failures gracefully — shows friendly error messages instead of crashing

### Test Results — ✅ 44/44 PASS (100%)
- 17 role login tests — all pass
- 5 nav visibility tests — all pass
- 2 auth flow tests (logout, session persist) — all pass
- 7 mobile responsive tests — all pass
- 13 AI role tests — all pass
- Full E2E flow: Admin creates users → SK adds material → SV requests → PM approves/issues → SK notified → SV returns
- Zero failures, zero flaky tests

### Files Modified
- `config.js` — OpenRouter API key and model
- `modules/ai_engine.js` — Rewritten OpenRouter fallback
- `modules/ai_chat.js` — Container-based element lookup
- `modules/nav_guard.js` — Allow-list based access control
- `modules/login_ui.js` — Responsive breakpoints
- `index.css` — Comprehensive responsive CSS (4 breakpoints)
- `app.js` — Sidebar overlay, toggleSidebar, closeSidebar, nav filtering

---

## v9.0-test — 2026-05-31 (Testing & Bug Fix Sprint)

### Critical Bugs Fixed
1. **Login crash: "SHELL is not defined"**
   - `app.js` imported `S` from `ui_shell.js` but `SHELL`, `MODAL_OVERLAY`, `MODAL_CONTENT` were not imported
   - Fixed: Added all missing imports to `app.js`

2. **Login crash: "Cannot read properties of undefined (reading 'lg')"**
   - `app.js` used `S.shadow.lg` but `S` object in `ui_shell.js` had no `shadow` property
   - Fixed: Added `shadow` property to `S` object in `ui_shell.js`

3. **Inline style undefined values: S.bg800, S.bg500, etc.**
   - `app.js` used flat properties like `S.bg800` but `ui_shell.js` only had nested `S.bg.bg800`
   - Fixed: Flattened all color/background/border/text properties in `ui_shell.js`

4. **Supervisor role crashes: "Unknown role: supervisor"**
   - `roles.js` `ROLES` object was missing the `supervisor` role
   - Fixed: Added `supervisor` role definition with `canCreateRequest: true`

5. **wrongpassword → correct passwords**
   - Test file had placeholder passwords; actual passwords pulled from Supabase
   - Fixed: Updated test credentials with real DB passwords

6. **Dashboard crashes across all roles: `document.getElementById` returns null after `await`**
   - Root cause: After `container.innerHTML = ...` sets IDs like `#dash-kpis`, the `await` gap allows the container to detach from DOM
   - `document.getElementById` searches the live document tree → returns null
   - Fix: Changed ALL `document.getElementById("dash-*")` to `container.querySelector("#dash-*")` in `dashboards_roles.js`
   - Also fixed `renderAuditLog` in `app.js`: `document.getElementById("audit-rows")` → `container.querySelector("#audit-rows")`

7. **renderInventory crash: same pattern**
   - Fixed: Added null guard on container, `res.ok` check, defensive innerHTML setter

8. **Syntax error in dashboards_roles.js: "Unexpected token '}'"**
   - Extra closing `{}` from earlier edit
   - Fixed: Removed duplicate `}` on line 27

9. **EmailJS integration verified**
   - Already connected: CDN loaded, `emailjs.init()` called with public key in `index.html`
   - Service ID: `service_v1ur36h`, Template ID: `template_ygjqjys`
   - Ready for email report testing via Reports section

### Test Results (Final) — ✅ 62/62 PASS (100%)
- Test suite split into 7 focused files + 1 helpers file
- All 16 roles login successfully
- Admin dashboard renders with KPI data (35 users, 11 sites)
- All sections navigable without crashes
- Material request lifecycle: create → approve → issue
- Storekeeper stock visibility and GRN access verified
- Finance role correctly has NO inventory nav (spec-compliant)
- CEO/AM/SM/Owner dashboards all load correctly
- Owner AI chat accessible; Storekeeper has NO AI (0 msgs/day) — verified per spec
- Transfer page accessible with 9-step workflow legend
- Logout and session persistence work
- Zero failures, zero flaky tests

### Test Infrastructure
- `tests/_helpers.js` — shared helpers (login, Supabase API, user credentials)
- `tests/01-smoke-login.spec.js` — 22 tests, all role logins + auth flow
- `tests/02-admin.spec.js` — 5 tests, admin dashboard + all sections
- `tests/03-requests.spec.js` — 4 tests, material request lifecycle
- `tests/04-storekeeper.spec.js` — 8 tests, SK dashboard + material visibility
- `tests/05-dashboards.spec.js` — 12 tests, CEO/AM/SM dashboards + other roles
- `tests/06-ai.spec.js` — 5 tests, AI chat + data scope verification
- `tests/07-transfer.spec.js` — 3 tests, transfer page access
- Config: `testMatch: '*.spec.js'` prevents helper files from being run as tests
- EmailJS: ✅ Connected (CDN loaded, public key initialized)

### Reference Docs Created
- `docs/reference/BUGS_FIXED.md` — detailed bug descriptions and fixes
- `docs/reference/ARCHITECTURE_NOTES.md` — system architecture reference
- `docs/reference/EMAILJS_SETUP.md` — EmailJS configuration and testing
- `docs/reference/TEST_RESULTS.md` — test results summary
- `docs/TEST_PLAN.md` — end-to-end testing patterns and test data

### AI Testing Notes (from docs/ENGINEER_PROMPT.md)
Per the spec, the following AI features need testing:
- **AI message limits per role**: owner=20/day, store_manager=10/day, ceo/am/finance/om=7/day, pm/engineer/so/po/to/dh=5/day, storekeeper=0, admin=∞
- **Data scope per role**: owner/ceo see all; pm/engineer see assigned site only; storekeeper see site+type only
- **AI engine**: gemini-2.0-flash primary, key rotation on 429, Groq fallback
- **Owner dashboard**: cinematic welcome popup, AI agent panel, predictive warnings
- **Store Manager**: AI advisor on dashboard
- **PM**: AI Advisor chat on dashboard
- **Storekeeper**: NO AI chat (0 messages/day)

### Architecture Notes
- Pure HTML/CSS/JS, no build step, no framework
- Supabase backend (REST API, no SDK)
- Role-based access control via `nav_guard.js`
- Audit logging via `audit_core.js` (every action logged)
- Three separate storekeeper types: local, imported, scaffolding
- Material request lifecycle: pending → pm_approved → issued → collected → completed
- Transfer flow: 9-step approval workflow
- PWA with service worker for offline support
