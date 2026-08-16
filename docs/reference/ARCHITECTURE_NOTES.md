# CDL Site Management — Architecture Reference

## Stack
- **Pure HTML/CSS/JS** — no build step, no framework, no Node.js
- **Supabase** — cloud database + auth (REST API, no JS SDK)
- **Google Gemini AI** — via REST API with key rotation
- **EmailJS** — email reports (CDN-loaded, initialized with public key)
- **Chart.js** — dashboards (CDN)
- **SheetJS/XLSX** — Excel exports (CDN)
- **PWA** — manifest.json + service worker

## Data Flow
```
User Action → nav_guard.js (auth check) → Module Logic
    → audit_core.js (log everything)
    → Supabase REST API (persist)
    → notifs.js (real-time alerts)
    → omni_ai.js (AI analysis trigger)
```

## Key Files
| File | Purpose |
|------|---------|
| `index.html` | App shell, CDN deps, EmailJS init |
| `config.js` | All API keys, constants, sites list |
| `data.js` | 2,427 materials DB, categories, role configs |
| `app.js` | Login, routing, navigation, modal/toast, session |
| `modules/roles.js` | Role definitions, permissions, email scoping |
| `modules/nav_guard.js` | Route protection |
| `modules/audit_core.js` | Immutable audit trail |
| `modules/ui_shell.js` | Centralized inline style constants |
| `modules/dashboards.js` | Dashboard router |
| `modules/dashboards_owner.js` | Owner AI dashboard |
| `modules/dashboards_ceo.js` | CEO sci-fi dashboard |
| `modules/dashboards_am.js` | Asset Manager operations |
| `modules/dashboards_pm.js` | Project Manager site dashboard |
| `modules/dashboards_finance.js` | Finance dashboard (read-only) |
| `modules/dashboards_roles.js` | All other role dashboards |
| `modules/inventory.js` | Stock management |
| `modules/requests.js` | Material request lifecycle |
| `modules/transfers.js` | 9-step transfer workflow |
| `modules/procurement.js` | Procurement approval chain |
| `modules/incidents.js` | Damage/theft/missing reports |
| `modules/grn.js` | Goods Received Notes |
| `modules/storekeeper.js` | Storekeeper GRN + issue interface |
| `modules/notifs.js` | Real-time notifications |
| `modules/ai_engine.js` | Gemini/Groq API caller |
| `modules/ai_roles.js` | Per-role AI system prompts |
| `modules/ai_chat.js` | AI chat sidebar UI |
| `modules/omni_ai.js` | Master AI brain |
| `modules/reports.js` | Email reports |
| `modules/excel_pro.js` | Excel exports |
| `modules/scheduler.js` | Automated jobs |
| `modules/popups.js` | Smart notifications |
| `modules/pwa.js` | PWA install prompt |
| `modules/users.js` | User management (admin) |

## Supabase Tables
- `users` — user accounts (id, name, email, password_hash, role, site_ids, is_active)
- `sites` — construction sites (id, name, type, is_active)
- `stock` — inventory (id, site_id, material_name, quantity, unit_price, storekeeper_type)
- `grns` — Goods Received Notes (id, site_id, items JSONB, status, received_by, verified_by)
- `material_requests` — request lifecycle (id, site_id, requested_by, material_name, quantity, status)
- `transfers` — inter-site transfers (id, from_site_id, to_site_id, items JSONB, status, step_log)
- `procurement` — procurement (id, site_id, requested_by, items JSONB, status, approval_chain)
- `incidents` — damage/theft/missing (id, site_id, reported_by, type, material_name, status)
- `audit_log` — immutable log (id, actor_id, action, module, before_value, after_value) — DELETE/UPDATE protected by RULE
- `notifications` — real-time alerts (id, user_id, title, body, is_read)
- `agent_chat_history` — AI chat persistence (id, user_id, agent_type, messages JSONB)

## Role Permissions Summary
| Role | Sites | AI/day | Key Capabilities |
|------|-------|--------|-----------------|
| company_owner | All | 20 | Everything |
| ceo | All | 7 | Company-wide, approve high-value |
| admin | All | ∞ | User/site management |
| asset_manager | All | 7 | Stock, transfers, procurement |
| finance | All | 7 | Budget, reports — NO inventory edit |
| store_manager | All | 10 | GRN verify, stock, approvals |
| project_manager | Assigned | 5 | Site requests, transfers, GRN |
| engineer | Assigned | 5 | Create requests, read-only most |
| supervisor | Assigned | 5 | Create requests, create incidents |
| storekeeper_* | Assigned | 0 | GRN scan, issue stock, local type only |
| procurement_officer | All | 5 | AM-approved procurement only |
| transfer_officer | All | 5 | Transfer logistics |
| data_holder | All | 5 | GRN verify, flag discrepancies |
| site_overseer | All | 5 | PM KPIs, cross-site |
| office_manager | All | 7 | Cross-site ops |

## Material Request Lifecycle
```
CREATED → PM_APPROVED → RESERVED → ISSUED → COLLECTED → COMPLETED
                    ↓                        ↓
               PM_REJECTED              EXPIRED (midnight)
                                         → stock returned
```

## Transfer Workflow (9 steps)
```
pending → source_pm_approved → dest_pm_approved → am_approved
→ preparing → picked_up → in_transit → delivered → received → completed
```

## Storekeeper Types (3 per site)
- `local` — local materials
- `imported` — imported materials  
- `scaffolding` — scaffolding equipment

Each type has separate inventory, GRNs, transfers, and dashboard.

## Sites (11)
1. Aura Peponi (residential)
2. Aura Riverside (residential)
3. Miotoni / Karen (residential)
4. SBC (residential)
5. EL-Signature (residential)
6. OKAS (residential)
7. Altura / Upper Hill (commercial)
8. Whispering Oaks / Karen (residential)
9. Enchanting Oaks (residential)
10. Nyari (residential)
11. Central Store / Mlolongo (warehouse)

## Deployment
1. Run `supabase/migration_v9.sql` in Supabase SQL Editor
2. Drag folder to Netlify → Deploy manually
3. Target URL: `https://cdl-management.netlify.app`
