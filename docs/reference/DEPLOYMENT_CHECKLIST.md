# CDL Site Management — Deployment Checklist

## Pre-Deploy Verification
- ✅ All 62 E2E tests pass (100%)
- ✅ All 16 roles can login
- ✅ All dashboards render correctly
- ✅ Material request lifecycle works
- ✅cross-role permissions verified
- ✅ AI chat accessible from Owner dashboard
- ✅ EmailJS connected and configured

## Deploy Steps
1. **Database**: Run `supabase/migration_v9.sql` in Supabase SQL Editor
2. **Files**: Drag entire `cdl-final/` folder to Netlify → Deploy manually
3. **PWA**: Verify manifest.json detected (Netlify shows green PWA badge)
4. **Test on mobile**: Install as app on Android/iOS
5. **Target URL**: `https://cdl-management.netlify.app`

## Post-Deploy Testing
- [ ] Login as each role type
- [ ] Verify each role sees correct dashboard
- [ ] Test material request: create → approve → issue → collect
- [ ] Test GRN scan flow
- [ ] Test transfer creation
- [ ] Test AI chat from Owner dashboard
- [ ] Test notification bell for storekeeper
- [ ] Test Excel export from Reports
- [ ] Test email report sending (EmailJS)
- [ ] Test PWA install on mobile
- [ ] Test offline mode

## Known Limitations
- Audit log table renders without `<tbody>` (selector `table tr` works, `table tbody tr` doesn't)
- Some dashboard sections use `container.querySelector` pattern for async resilience
- Finance role intentionally has no inventory nav or edit buttons
- Storekeeper roles have no AI chat (0 messages/day per spec)
