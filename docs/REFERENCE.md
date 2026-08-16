# CDL Site Management — Complete Reference

## Test Results: 76/76 PASS ✅

### AI Chat — Working for ALL roles with AI access

**Roles WITH AI (13 roles) — ✅ All verified:**
| Role | AI msgs/day | Status |
|------|-------------|--------|
| Owner (CEO in DB) | 20 | ✅ |
| CEO | 7 | ✅ |
| Asset Manager | 7 | ✅ |
| PM | 5 | ✅ |
| Store Manager | 10 | ✅ |
| Office Manager | 7 | ✅ |
| Finance | 7 | ✅ |
| Engineer | 5 | ✅ |
| Supervisor | 5 | ✅ |
| Procurement Officer | 5 | ✅ |
| Transfer Officer | 5 | ✅ |
| Data Holder | 5 | ✅ |
| Site Overseer | 5 | ✅ |
| Admin | ∞ (unlimited) | ✅ |

**Roles WITHOUT AI (3 roles) — ✅ Correctly blocked:**
| Role | AI msgs/day | Status |
|------|-------------|--------|
| Storekeeper Local | 0 | ✅ No AI |
| Storekeeper Import | 0 | ✅ No AI |
| Storekeeper Scaffolding | 0 | ✅ No AI |

### Key Fixes for AI
1. **`ai_chat.js`**: Changed from `document.getElementById` to event delegation + container-based querySelector
2. **`dashboards_roles.js` renderGeneric**: Added AI chat HTML block before `initAIChat()` call
3. **`dashboards_finance.js`**: Added import of `initAIChat` + AI chat HTML block + `initAIChat(user)` call

### Complete Bug Fix List
1. `SHELL not defined` → Added missing imports in `app.js`
2. `S.shadow.lg undefined` → Added shadow property to `S` in `ui_shell.js`
3. `S.bg800 undefined` → Flattened style properties in `ui_shell.js`
4. `supervisor role missing` → Added to `roles.js`
5. Wrong passwords → Pulled from Supabase
6. Dashboard crashes after `await` → `container.querySelector` pattern
7. Audit log crash → Same `container.querySelector` fix
8. Inventory crash → Null guards + defensive fetch
9. Syntax error → Removed extra `}` in `dashboards_roles.js`
10. AI chat missing for 8 roles → Added AI HTML blocks + event delegation

### Test Files
- `tests/_helpers.js` — Shared helpers (login, Supabase API)
- `tests/01-smoke-login.spec.js` — 22 tests, all role logins
- `tests/02-admin.spec.js` — 5 tests, admin dashboard
- `tests/03-requests.spec.js` — 4 tests, material request lifecycle
- `tests/04-storekeeper.spec.js` — 8 tests, SK dashboard + visibility
- `tests/05-dashboards.spec.js` — 14 tests, CEO/AM/SM + other roles
- `tests/06-ai.spec.js` — 20 tests, AI chat for all roles
- `tests/07-transfer.spec.js` — 3 tests, transfer page

### Deployment
1. Run `supabase/migration_v9.sql`
2. Drag to Netlify
3. Test on mobile
4. Target: `https://cdl-management.netlify.app`
