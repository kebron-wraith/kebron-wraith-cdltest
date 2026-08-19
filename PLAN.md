# Verification and Testing Plan

## Phase 1: Site Readiness
1. Wait for Netlify deploy to complete (check via Netlify dashboard or by polling the site).
2. Use Skyvern to load the live site (https://cdllivetest.netlify.app/) and check for JavaScript errors in the console.
3. If errors exist, fix them locally, commit, push, and redeploy until the site loads without errors.

## Phase 2: Account Setup
1. Log in to the admin panel (using existing admin credentials).
2. Verify that 17 test accounts exist for each role (Storekeeper Local, Storekeeper Import, Requesters (Subcontractor/Safety/Dept Head), Project Manager, Head of Projects, Store Manager, Transfer personnel, CEO, Company Owner, Asset Manager, Admin).
3. If any account is missing, create it with a known password.

## Phase 3: Login Testing
1. For each of the 17 roles, log in using the test account credentials.
2. Verify login succeeds and the user is redirected to the appropriate dashboard.

## Phase 4: Core Workflow Testing (End-to-End with real data)
1. **Material Request**:
   - Log in as a Requester, submit a material request.
   - Log in as the respective Project Manager, approve the request.
   - Log in as Storekeeper, issue the material.
   - Log in as Requester, confirm receipt.
2. **Transfer**:
   - Log in as Site A Project Manager, submit a transfer request to Site B.
   - Log in as Head of Projects, approve the transfer.
   - Log in as Transfer personnel, pick up from Site A (sign Material Issue).
   - Log in as Transfer personnel, deliver to Site B (confirm receipt).
3. **GRN Entry**:
   - Log in as Storekeeper (Local), create a GRN with mandatory fields (delivery number, invoice number, quantity, supplier name).
   - Verify that the material approval gate blocks/unlisted items correctly.
4. **Import Entry**:
   - Log in as Storekeeper (Import), create an entry with mandatory container number.
   - Test discrepancy flagging when received quantity differs from manifest.
5. **New Material Naming**:
   - Log in as Storekeeper, submit a new material request with photo attachment.
   - Log in as Store Manager, approve the request.
   - Verify the new material becomes available in the dropdown.
6. **AI Advisor**:
   - Log in as Admin/Owner/CEO/Company Owner/Asset Manager, verify access to AI advisor.
   - Log in as other roles (Store Manager, Storekeeper, etc.), verify access is denied.
   - Test the 20/day quota limit (if possible in a short test).

## Phase 5: HIGH Priority Feature Testing
1. **Bin Card Correction**:
   - Test correction below approval threshold (should not require Store Manager approval).
   - Test correction above threshold (requires Store Manager approval, mandatory reason).
2. **Site Closeout Workflow**:
   - Simulate site project end: block new transactions, require stock transferred out, generate report.
3. **Physical Count with Flagged Variance**:
   - Perform a physical count with a deliberate variance, verify it is flagged and requires Store Manager approval.
4. **Three-Tier Backup Approver Escalation**:
   - Simulate Project Manager unavailable: request escalates to Head of Projects.
   - Simulate Head of Projects unavailable: request escalates to Admin.
5. **Password Reset Flow**:
   - Test password reset for a user via the Admin panel.

## Phase 6: Documentation
- For each test item, record pass/fail with specific details.
- Provide a prioritized fix plan for any broken or missing items.
- Clarify any ambiguities encountered during testing.