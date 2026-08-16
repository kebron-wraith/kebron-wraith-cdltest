# CDL Site Management — Test Plan

## End-to-End Testing Patterns

### 1. Complete Material Request Lifecycle
```
[Supervisor/Engineer] → Create request → status: pending
    ↓
[PM] → Approve request → status: pm_approved → Storekeeper notified
    ↓
[Storekeeper] → Issue material → status: issued → Stock deducted from site
    ↓
[Supervisor] → Mark collected → status: collected
    ↓ (optional)
[Supervisor] → Return unused → status: returned → qty logged separately
```

**Test steps:**
1. Login as supervisor → navigate to Requests → + New Request
2. Fill material name, quantity, purpose → Submit
3. Login as PM → navigate to Requests → Pending tab → Approve
4. Verify storekeeper gets notification (notification badge/count)
5. Login as storekeeper → see pending issue request → click "Issue"
6. Verify stock quantity deducted in Supabase for that site
7. Login as supervisor → mark as collected

### 2. Transfer Flow (9 steps)
```
Step 1: Source PM creates transfer request → pending
Step 2: Dest PM approves need → dest_pm_approved
Step 3: Asset Manager approves → am_approved
Step 4: Storekeeper prepares → preparing
Step 5: Transfer Officer picks up + signs → picked_up
Step 6: In transit → in_transit
Step 7: Delivered to dest → delivered
Step 8: Dest storekeeper receives + signs → received
Step 9: Stock updated → completed
```

**Test steps:**
1. PM1 (site 1) creates transfer to site 2
2. PM2 (site 2) approves
3. AM approves
4. Storekeeper prepares
5. Transfer Officer picks up
6. Transfer Officer delivers
7. Dest Storekeeper receives
8. Verify stock deducted from source, added to destination

### 3. GRN Flow
```
Delivery arrives → Storekeeper scans receipt image → AI extracts items
→ Store Manager verifies → Stock updated → PM notified → Audit log
```

### 4. AI Testing
- Owner dashboard: AI greeting popup, enterprise health score, AI agent panel
- CEO dashboard: AI chat "CEO Intelligence"
- PM dashboard: AI chat "AI Advisor"
- Store Manager: AI advisor on dashboard
- Message limits: enforce per role
- Data scoping: PM only sees their site, Owner sees all

### 5. Role Permission Verification
- Finance: NO inventory edit buttons, NO inventory nav item
- Storekeeper: NO AI chat, NO financial data
- Engineer: NO popups, read-only most sections
- Admin: Full access, user management, audit log viewer
- PM: Only assigned site(s) data
- CEO/AM/Owner: All sites data

## Test Data
All test users with real Supabase credentials:
| Role | Email | Password |
|------|-------|----------|
| admin | admin@canaan.co.ke | CDL@admin2025 |
| ceo | ceo@canaan.co.ke | CDL@ceo2025 |
| asset_manager | am@canaan.co.ke | am123 |
| finance | finance@canaan.co.ke | finance123 |
| project_manager | pm1@canaan.co.ke | pm123 |
| store_manager | sm@canaan.co.ke | sm123 |
| storekeeper_local | sk.local@canaan.co.ke | sk123 |
| storekeeper_import | sk.import@canaan.co.ke | sk123 |
| storekeeper_scaffolding | sk.scaff@canaan.co.ke | sk123 |
| procurement_officer | po@canaan.co.ke | po123 |
| transfer_officer | to@canaan.co.ke | to123 |
| data_holder | dh@canaan.co.ke | dh123 |
| site_overseer | so@canaan.co.ke | so123 |
| engineer | eng@canaan.co.ke | eng123 |
| supervisor | sup1@canaan.co.ke | sup123 |
| office_manager | om@canaan.co.ke | om123 |

## Running Tests
```bash
cd cdl-final
npx http-server -p 8080 -c-1 --cors &
npx playwright test tests/full-e2e.spec.js --reporter=list
npx playwright test tests/smoke-test.spec.js --reporter=list
```
