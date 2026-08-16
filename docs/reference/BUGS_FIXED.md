# Bugs Fixed During Testing Sprint — 2026-05-31

## Critical Login/Render Bugs

### 1. `SHELL is not defined` — app.js
- **Cause**: `app.js` imported `S` from `ui_shell.js` but not `SHELL`, `MODAL_OVERLAY`, `MODAL_CONTENT`
- **Fix**: `import { S, SHELL, MODAL_OVERLAY, MODAL_CONTENT } from "./modules/ui_shell.js"`
- **Impact**: App crashed on every login

### 2. `Cannot read properties of undefined (reading 'lg')` — app.js
- **Cause**: `app.js` used `S.shadow.lg` but `S` object had no `shadow` property
- **Fix**: Added `shadow: { sm: ..., md: ..., lg: ..., gold: ... }` to `S` in `ui_shell.js`
- **Impact**: App crashed on every login

### 3. `S.bg800`, `S.bg500`, etc. undefined — ui_shell.js
- **Cause**: `app.js` used flat `S.bg800` but `ui_shell.js` only had nested `S.bg.bg800`
- **Fix**: Flattened all color/bg/border/text properties in `ui_shell.js` `S` object
- **Impact**: Sidebar, header, cards rendered with invisible/transparent backgrounds

### 4. `supervisor` role missing — roles.js
- **Cause**: `ROLES` object in `roles.js` had no `supervisor` entry
- **Fix**: Added `supervisor` role with `canCreateRequest: true, canCreateIncident: true`
- **Impact**: Supervisor login showed "Unknown role: supervisor" error

### 5. Dashboard crashes: `Cannot set properties of null (setting 'innerHTML')` — dashboards_roles.js
- **Cause**: `document.getElementById("dash-kpis")` returns null after `await` gap because container element may be detached from DOM
- **Fix**: Changed all `document.getElementById("dash-*")` to `container.querySelector("#dash-*")` which searches within the container reference itself
- **Impact**: Admin dashboard, Store Manager dashboard, and other role dashboards all showed errors

### 6. Audit log crash — app.js
- **Cause**: `document.getElementById("audit-rows")` returns null after `await` gap
- **Fix**: Changed to `container.querySelector("#audit-rows")`
- **Impact**: Audit log page showed "Error loading module"

### 7. Inventory crash — inventory.js
- **Cause**: `container` could be null; `res.json()` could fail on non-OK response
- **Fix**: Added `if (!container) return;` guard, `res.ok` check, defensive innerHTML setter
- **Impact**: Inventory page sometimes showed "Error loading module"

### 8. Syntax error in dashboards_roles.js
- **Cause**: Extra closing `}` from earlier edit trying to return values from shell()
- **Fix**: Removed duplicate `}` on line 27
- **Impact**: Entire dashboard module failed to load with "Unexpected token '}'"

## Password Corrections
| User | Old (wrong) | Correct |
|------|-------------|---------|
| admin@canaan.co.ke | admin123 | CDL@admin2025 |
| owner@canaan.co.ke | owner123 | 12345 |
| ceo@canaan.co.ke | ceo123 | CDL@ceo2025 |

## Root Cause Pattern
The main pattern was **container detachment during async gaps**. When a render function:
1. Sets `container.innerHTML = ...` (creates `dash-kpis`, `dash-main` etc.)
2. Does `await fetch(...)` (yields to event loop)
3. Tries `document.getElementById("dash-kpis")` (returns null if container was detached)

The fix is to use `container.querySelector("#dash-kpis")` which searches within the container element reference itself, regardless of whether the container is still in the live DOM tree.
