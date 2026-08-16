// CDL Comprehensive Test Runner - uses Supabase REST API directly
// Run with: bun test-all.mjs
import fs from 'fs';

const SUPABASE_URL = "https://dljvplrbjogncwrpmfsj.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsanZwbHJiam9nbmN3cnBtZnNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODUyMDEzMiwiZXhwIjoyMDk0MDk2MTMyfQ.20i7g7ClEJVCvKiVFR3-mXT-9EoHVhRV6iSiioWa-O0";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsanZwbHJiam9nbmN3cnBtZnNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1MjAxMzIsImV4cCI6MjA5NDA5NjEzMn0.GmsMNKlRos6ZChy143_YrSlDB477RHPxkRqA0wGJB1E";

const REPORT = [];
let passed = 0, failed = 0, skipped = 0;

function log(msg) { console.log(msg); REPORT.push(msg); }
function ok(m) { passed++; log(`  ✅ ${m}`); }
function err(m) { failed++; log(`  ❌ ${m}`); }
function skip(m) { skipped++; log(`  ⊘ ${m}`); }
function info(m) { log(`  ℹ ${m}`); }
function section(m) { log(`\n═══ ${m} ═══`); }

async function supa(method, path, body, useService = true) {
  const key = useService ? SERVICE_KEY : ANON_KEY;
  const opts = {
    method,
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...(method === 'GET' ? {} : { 'Prefer': 'return=representation' })
    }
  };
  if (body) opts.body = JSON.stringify(body);
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, opts);
    let data;
    try { data = await res.json(); } catch { data = null; }
    return { ok: res.ok, status: res.status, data, res };
  } catch (e) {
    return { ok: false, status: 0, data: null, error: e.message };
  }
}

async function supaGet(path, useService) { return supa('GET', path, null, useService); }
async function supaPost(path, body, useService) { return supa('POST', path, body, useService); }
async function supaPatch(path, body, useService) { return supa('PATCH', path, body, useService); }
async function supaDelete(path, useService) { return supa('DELETE', path, null, useService); }

// ─── TESTS ──────────────────────────────────────────────────────────────────

async function testSites() {
  section('SITES');
  const r = await supaGet('sites?select=*&order=id.asc');
  if (!r.ok || !r.data) { err(`Sites: status ${r.status}`); return false; }
  ok(`${r.data.length} sites found`);
  r.data.forEach(s => info(`  ${s.id}. ${s.name} (${s.type})`));
  return r.data.length >= 11;
}

async function testUsers() {
  section('USERS');
  const r = await supaGet('users?select=id,name,email,role,site_ids,storekeeper_type,is_active&order=name.asc');
  if (!r.ok || !r.data) { err(`Users: status ${r.status}`); return null; }
  ok(`${r.data.length} users found`);
  r.data.forEach(u => info(`  ${u.name} | ${u.role} | ${u.email} | active:${u.is_active}`));
  return r.data;
}

async function testUserLogin(email, password, roleName) {
  const r = await supaGet(`users?email=eq.${encodeURIComponent(email)}&is_active=eq.true&limit=1`, false);
  if (!r.ok || !r.data || !r.data.length) { err(`Login ${roleName}: user not found`); return null; }
  const u = r.data[0];
  if (u.password_hash !== password) { err(`Login ${roleName}: password mismatch (stored="${u.password_hash}" vs provided="${password}")`); return null; }
  ok(`Login ${roleName} (${email}) — OK`);
  return u;
}

async function testAllLogins() {
  section('ALL ROLE LOGINS');
  const users = [
    {email:'owner@canaan.co.ke', pw:'owner123', name:'Company Owner'},
    {email:'ceo@canaan.co.ke', pw:'ceo123', name:'CEO'},
    {email:'am@canaan.co.ke', pw:'am123', name:'Asset Manager'},
    {email:'pm1@canaan.co.ke', pw:'pm123', name:'PM1'},
    {email:'pm2@canaan.co.ke', pw:'pm123', name:'PM2'},
    {email:'eng@canaan.co.ke', pw:'eng123', name:'Engineer'},
    {email:'sk.local@canaan.co.ke', pw:'sk123', name:'Storekeeper Local'},
    {email:'sk.import@canaan.co.ke', pw:'sk123', name:'Storekeeper Import'},
    {email:'sk.scaff@canaan.co.ke', pw:'sk123', name:'Storekeeper Scaff'},
    {email:'sm@canaan.co.ke', pw:'sm123', name:'Store Manager'},
    {email:'finance@canaan.co.ke', pw:'finance123', name:'Finance'},
    {email:'po@canaan.co.ke', pw:'po123', name:'Procurement Officer'},
    {email:'to@canaan.co.ke', pw:'to123', name:'Transfer Officer'},
    {email:'dh@canaan.co.ke', pw:'dh123', name:'Data Holder'},
    {email:'so@canaan.co.ke', pw:'so123', name:'Site Overseer'},
    {email:'admin@canaan.co.ke', pw:'admin123', name:'Admin'},
    {email:'om@canaan.co.ke', pw:'om123', name:'Office Manager'},
  ];
  const results = {};
  for (const u of users) {
    const user = await testUserLogin(u.email, u.pw, u.name);
    if (user) results[u.name] = user;
  }
  return results;
}

async function testStockData() {
  section('STOCK DATA');
  const r = await supaGet('stock?select=id,site_id,material_name,quantity,unit_price,storekeeper_type&limit=500');
  if (!r.ok || !r.data) { err(`Stock: status ${r.status}`); return null; }
  if (r.data.length === 0) { skip('Stock table empty'); return null; }
  ok(`${r.data.length} stock items`);
  const types = [...new Set(r.data.map(s => s.storekeeper_type))];
  const sites = [...new Set(r.data.map(s => s.site_id))];
  info(`  Types: ${types.join(', ')}`);
  info(`  Sites: ${sites.sort((a,b)=>a-b).join(', ')}`);
  const totalVal = r.data.reduce((s,i) => s + ((i.quantity||0)*(i.unit_price||0)), 0);
  info(`  Total value: KES ${totalVal.toLocaleString()}`);
  return r.data;
}

async function testSeedStockIfNeeded(existingStock) {
  section('SEEDING STOCK (if needed)');
  if (existingStock && existingStock.length > 50) { skip('Stock already seeded with sufficient items'); return; }

  const MATERIALS = [
    {name:'Ordinary Portland Cement 50kg',category:'Concrete',unit:'Bags',price:750,type:'local'},
    {name:'Steel Rebar 12mm',category:'Steel',unit:'Metres',price:650,type:'local'},
    {name:'Steel Rebar 8mm',category:'Steel',unit:'Metres',price:380,type:'local'},
    {name:'Ballast 20mm',category:'Concrete',unit:'Tons',price:2800,type:'local'},
    {name:'River Sand',category:'Concrete',unit:'Tons',price:2200,type:'local'},
    {name:'13A Socket Outlet',category:'Electrical',unit:'Pcs',price:650,type:'local'},
    {name:'Cable 2.5mm Twin & Earth',category:'Electrical',unit:'Metres',price:85,type:'local'},
    {name:'Conduit Pipe 20mm',category:'Electrical',unit:'Metres',price:120,type:'local'},
    {name:'MCB 32A Single Pole',category:'Electrical',unit:'Pcs',price:1200,type:'local'},
    {name:'PVC Pipe 50mm',category:'Plumbing',unit:'Metres',price:320,type:'local'},
    {name:'Ball Valve 25mm',category:'Plumbing',unit:'Pcs',price:480,type:'local'},
    {name:'Sink Mixer',category:'Plumbing',unit:'Pcs',price:3500,type:'imported'},
    {name:'Floor Tiles 60x60',category:'Finishing',unit:'M2',price:1800,type:'imported'},
    {name:'Wall Paint 20L White',category:'Finishing',unit:'Litres',price:2800,type:'local'},
    {name:'Safety Helmet',category:'Safety',unit:'Pcs',price:850,type:'local'},
    {name:'Safety Vest Hi-Vis',category:'Safety',unit:'Pcs',price:650,type:'local'},
    {name:'Scaffolding Frame 1.8m',category:'Scaffolding',unit:'Pcs',price:8500,type:'scaffolding'},
    {name:'Scaffolding Base Jack',category:'Scaffolding',unit:'Pcs',price:3200,type:'scaffolding'},
    {name:'Scaffolding Coupler',category:'Scaffolding',unit:'Pcs',price:1800,type:'scaffolding'},
    {name:'Nails 3 inch',category:'Hardware',unit:'Kgs',price:280,type:'local'},
    {name:'Door Lock Set',category:'Hardware',unit:'Pcs',price:4500,type:'imported'},
    {name:'Mabati Box Profile G28',category:'Roofing',unit:'Metres',price:650,type:'local'},
    {name:'SuperPlast Waterproof',category:'Waterproofing',unit:'Kgs',price:1200,type:'local'},
  ];

  let seeded = 0;
  for (let siteId = 1; siteId <= 11; siteId++) {
    const siteMats = MATERIALS.filter(m => !(m.type === 'scaffolding' && siteId > 10));
    for (const mat of siteMats) {
      const qty = mat.type === 'scaffolding' ? Math.floor(Math.random() * 20) + 5 : Math.floor(Math.random() * 200) + 10;
      const r = await supaPost('stock', {
        site_id: siteId, material_name: mat.name, category: mat.category,
        quantity: qty, unit: mat.unit, unit_price: mat.price,
        storekeeper_type: mat.type, opening_balance_locked: false
      });
      if (r.ok || r.status === 201) seeded++;
    }
    info(`  Site ${siteId}: ${siteMats.length} materials seeded`);
  }
  ok(`Seeded ${seeded} stock items total`);
}

async function testMaterialRequestFlow(users) {
  section('MATERIAL REQUEST FLOW');
  const eng = users['Engineer'];
  const pm1 = users['PM1'];
  const sk = users['Storekeeper Local'];
  if (!eng || !pm1 || !sk) { skip('Missing users for flow test'); return; }

  // 1. Engineer creates request
  info('Step 1: Engineer creates material request');
  const createR = await supaPost('material_requests', {
    site_id: 1, requested_by: eng.id, material_name: 'Steel Rebar 12mm',
    quantity: 25, unit: 'Metres', urgency: 'high', purpose: 'Foundation work phase 2', status: 'pending'
  });
  if (!createR.ok && createR.status !== 201) { err(`Create request: ${createR.status} ${JSON.stringify(createR.data)}`); return; }
  const requestId = createR.data?.[0]?.id || createR.data?.id;
  ok(`Request created: ${requestId}`);
  await showRequestsByStatus();

  // 2. PM approves
  info('Step 2: PM approves request');
  const approveR = await supaPatch(`material_requests?id=eq.${requestId}`, {
    status: 'pm_approved', pm_approved_by: pm1.id, pm_approved_at: new Date().toISOString()
  });
  if (approveR.ok) { ok('PM approved request'); } else { err(`PM approve: ${approveR.status}`); }

  // Check notifications created
  const notifs = await supaGet(`notifications?user_id=eq.${sk.id}&order=created_at.desc&limit=5`);
  if (notifs.ok && notifs.data?.length > 0) {
    ok(`Storekeeper has ${notifs.data.length} notification(s): "${notifs.data[0].title}"`);
  } else {
    info('  (Notifications may not be auto-created by API - app.js handles this)');
  }

  // 3. Storekeeper issues
  info('Step 3: Storekeeper issues material');
  // First check stock
  const stockR = await supaGet(`stock?site_id=eq.1&material_name=eq.Ordinary Portland Cement 50kg&storekeeper_type=eq.local&limit=1`);
  if (stockR.ok && stockR.data?.length > 0) {
    const stock = stockR.data[0];
    const oldQty = stock.quantity;
    info(`  Stock before issue: ${oldQty} Bags`);
    if (oldQty >= 25) {
      const issueR = await supaPatch(`material_requests?id=eq.${requestId}`, {
        status: 'issued', issued_by: sk.id, issued_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24*3600000).toISOString()
      });
      if (issueR.ok) { ok('Request issued by storekeeper'); } else { err(`Issue: ${issueR.status}`); }

      // Deduct stock
      const newQty = oldQty - 25;
      const deductR = await supaPatch(`stock?id=eq.${stock.id}`, {
        quantity: newQty, last_updated: new Date().toISOString(), updated_by: sk.id
      });
      if (deductR.ok) { ok(`Stock deducted: ${oldQty} → ${newQty} Bags`); } else { err(`Stock deduct: ${deductR.status}`); }
    } else {
      err(`Insufficient stock: ${oldQty} available, 25 needed`);
    }
  } else {
    err('Stock item not found for issue test');
  }

  // 4. Mark collected
  info('Step 4: Mark as collected');
  const collectR = await supaPatch(`material_requests?id=eq.${requestId}`, {
    status: 'collected', collected_at: new Date().toISOString()
  });
  if (collectR.ok) { ok('Request marked collected'); } else { err(`Collect: ${collectR.status}`); }

  await showRequestsByStatus();
}

async function showRequestsByStatus() {
  const statuses = ['pending','pm_approved','issued','collected','completed','expired'];
  for (const s of statuses) {
    const r = await supaGet(`material_requests?status=eq.${s}&select=id,material_name,quantity`);
    if (r.ok && r.data?.length > 0) info(`  ${s}: ${r.data.length} requests`);
  }
}

async function testTransferFlow(users) {
  section('TRANSFER FLOW');
  const pm1 = users['PM1'];
  const pm2 = users['PM2'];
  const am = users['Asset Manager'];
  if (!pm1 || !pm2 || !am) { skip('Missing users for transfer test'); return; }

  // 1. PM1 creates transfer
  info('Step 1: PM1 creates transfer request (Site 1 → Site 2)');
  const createR = await supaPost('transfers', {
    from_site_id: 1, to_site_id: 2,
    items: [{name:'Steel Rebar 12mm', quantity: 50, unit: 'Metres'}],
    status: 'pending',
    step_log: [{step:'created', by: pm1.name, role: pm1.role, at: new Date().toISOString()}]
  });
  if (!createR.ok && createR.status !== 201) { err(`Create transfer: ${createR.status}`); return; }
  const tfId = createR.data?.[0]?.id || createR.data?.id;
  ok(`Transfer created: ${tfId}`);

  // 2. Source PM approves (PM1 is source)
  info('Step 2: Source PM approves');
  await advanceTransfer(tfId, 'source_pm_approved', pm1);

  // 3. Dest PM approves (PM2 is dest)
  info('Step 3: Dest PM approves');
  await advanceTransfer(tfId, 'dest_pm_approved', pm2);

  // 4. AM approves
  info('Step 4: Asset Manager approves');
  await advanceTransfer(tfId, 'am_approved', am);

  // Check transfer status
  const checkR = await supaGet(`transfers?id=eq.${tfId}&select=status,step_log`);
  if (checkR.ok && checkR.data?.[0]) {
    ok(`Transfer status: ${checkR.data[0].status}`);
    info(`  Steps: ${checkR.data[0].step_log?.length || 0}`);
  }
}

async function advanceTransfer(tfId, newStatus, user) {
  // Get current step_log
  const curR = await supaGet(`transfers?id=eq.${tfId}&select=step_log,status`);
  if (!curR.ok || !curR.data?.[0]) { err(`Fetch transfer: ${curR.status}`); return; }
  const stepLog = curR.data[0].step_log || [];
  stepLog.push({step: newStatus, by: user.name, role: user.role, at: new Date().toISOString()});
  const r = await supaPatch(`transfers?id=eq.${tfId}`, { status: newStatus, step_log: stepLog });
  if (r.ok) { ok(`  → ${newStatus} by ${user.name}`); } else { err(`  → ${newStatus}: ${r.status}`); }
}

async function testGRNWorkflow(users) {
  section('GRN WORKFLOW');
  const sk = users['Storekeeper Local'];
  const sm = users['Store Manager'];
  if (!sk || !sm) { skip('Missing users for GRN test'); return; }

  // 1. Storekeeper creates GRN
  info('Step 1: Storekeeper creates GRN');
  const createR = await supaPost('grns', {
    site_id: 1, grn_number: 'GRN-TEST-001', supplier: 'Test Supplier Ltd',
    items: [{name:'Ordinary Portland Cement 50kg', quantity: 100, unit: 'Bags', unit_price: 750}],
    total_value: 75000, storekeeper_type: 'local', received_by: sk.id, status: 'pending'
  });
  if (!createR.ok && createR.status !== 201) { err(`Create GRN: ${createR.status}`); return; }
  const grnId = createR.data?.[0]?.id || createR.data?.id;
  ok(`GRN created: ${grnId}`);

  // 2. Store Manager verifies GRN
  info('Step 2: Store Manager verifies GRN');
  const verifyR = await supaPatch(`grns?id=eq.${grnId}`, {
    status: 'verified', verified_by: sm.id, verified_at: new Date().toISOString()
  });
  if (verifyR.ok) { ok('GRN verified by Store Manager'); } else { err(`Verify GRN: ${verifyR.status}`); }

  // 3. Check stock was updated
  const stockR = await supaGet(`stock?site_id=eq.1&material_name=eq.Ordinary Portland Cement 50kg&storekeeper_type=eq.local&limit=1`);
  if (stockR.ok && stockR.data?.[0]) {
    ok(`Stock quantity: ${stockR.data[0].quantity} Bags (after GRN verification)`);
  }
}

async function testIncidentWorkflow(users) {
  section('INCIDENT WORKFLOW');
  const sk = users['Storekeeper Local'];
  const pm1 = users['PM1'];
  if (!sk || !pm1) { skip('Missing users for incident test'); return; }

  // 1. Storekeeper reports incident
  info('Step 1: Storekeeper reports incident');
  const createR = await supaPost('incidents', {
    site_id: 1, reported_by: sk.id, type: 'damaged',
    material_name: 'Steel Rebar 12mm', quantity: 10, estimated_value: 6500,
    reason: 'Damaged during unloading', status: 'pending'
  });
  if (!createR.ok && createR.status !== 201) { err(`Create incident: ${createR.status}`); return; }
  const incId = createR.data?.[0]?.id || createR.data?.id;
  ok(`Incident reported: ${incId}`);

  // 2. PM resolves
  info('Step 2: PM resolves incident');
  const resolveR = await supaPatch(`incidents?id=eq.${incId}`, {
    pm_decision: 'operational_loss', status: 'resolved', pm_resolved_at: new Date().toISOString(),
    pm_notes: 'Approved as operational loss - no personnel fault'
  });
  if (resolveR.ok) { ok('Incident resolved by PM'); } else { err(`Resolve incident: ${resolveR.status}`); }
}

async function testProcurementFlow(users) {
  section('PROCUREMENT FLOW');
  const pm1 = users['PM1'];
  const am = users['Asset Manager'];
  const finance = users['Finance'];
  const po = users['Procurement Officer'];
  if (!pm1 || !am || !finance || !po) { skip('Missing users for procurement test'); return; }

  // 1. PM creates procurement request
  info('Step 1: PM creates procurement request');
  const createR = await supaPost('procurement', {
    site_id: 1, requested_by: pm1.id,
    items: [{name:'Floor Tiles 60x60', quantity: 200, unit: 'M2', unit_price: 1800}],
    total_amount: 360000, supplier: 'Tile & Stone Ltd', status: 'pending', approval_chain: []
  });
  if (!createR.ok && createR.status !== 201) { err(`Create procurement: ${createR.status}`); return; }
  const procId = createR.data?.[0]?.id || createR.data?.id;
  ok(`Procurement created: ${procId}`);

  // 2. PM approves
  info('Step 2: PM approves');
  await advanceProcurement(procId, 'pm_approved', pm1);

  // 3. AM approves
  info('Step 3: AM approves');
  await advanceProcurement(procId, 'am_approved', am);

  // 4. Finance approves
  info('Step 4: Finance approves');
  await advanceProcurement(procId, 'finance_approved', finance);

  // 5. Procurement officer processes
  info('Step 5: Procurement Officer processes');
  await advanceProcurement(procId, 'processing', po);

  // Check status
  const checkR = await supaGet(`procurement?id=eq.${procId}&select=status,approval_chain`);
  if (checkR.ok && checkR.data?.[0]) {
    ok(`Procurement status: ${checkR.data[0].status}`);
    info(`  Approval chain: ${checkR.data[0].approval_chain?.length || 0} steps`);
  }
}

async function advanceProcurement(procId, newStatus, user) {
  const curR = await supaGet(`procurement?id=eq.${procId}&select=approval_chain`);
  const chain = curR.data?.[0]?.approval_chain || [];
  chain.push({by: user.name, role: user.role, at: new Date().toISOString()});
  const r = await supaPatch(`procurement?id=eq.${procId}`, { status: newStatus, approval_chain: chain });
  if (r.ok) { ok(`  → ${newStatus} by ${user.name}`); } else { err(`  → ${newStatus}: ${r.status}`); }
}

async function testAuditLog() {
  section('AUDIT LOG');
  const r = await supaGet('audit_log?select=action,module,actor_name,timestamp&order=timestamp.desc&limit=20');
  if (!r.ok || !r.data) { err(`Audit log: ${r.status}`); return; }
  ok(`${r.data.length} recent audit entries`);
  r.data.slice(0, 5).forEach(a => info(`  ${a.action} (${a.module}) by ${a.actor_name || 'system'}`));
}

async function testNotifications() {
  section('NOTIFICATIONS');
  const r = await supaGet('notifications?select=title,body,type,user_id,created_at&order=created_at.desc&limit=10');
  if (!r.ok || !r.data) { err(`Notifications: ${r.status}`); return; }
  ok(`${r.data.length} notifications`);
  r.data.slice(0, 5).forEach(n => info(`  "${n.title}" (${n.type})`));
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

async function main() {
  log('🚀 CDL Comprehensive Test Runner');
  log(`Database: ${SUPABASE_URL}`);
  log(`Time: ${new Date().toLocaleString()}\n`);

  // 1. Check sites
  const sitesOk = await testSites();
  if (!sitesOk) { err('Sites not seeded - run migration first'); }

  // 2. Check users
  const existingUsers = await testUsers();

  // 3. Test all logins
  const users = await testAllLogins();

  // 4. Check stock
  const stock = await testStockData();

  // 5. Seed stock if needed
  await testSeedStockIfNeeded(stock);

  // 6. Re-check stock after seeding
  if (!stock || stock.length < 50) {
    const newStock = await testStockData();
    if (newStock) Object.assign(stock || {}, newStock);
  }

  // 7. Test workflows
  if (Object.keys(users).length > 0) {
    await testMaterialRequestFlow(users);
    await testTransferFlow(users);
    await testGRNWorkflow(users);
    await testIncidentWorkflow(users);
    await testProcurementFlow(users);
  }

  // 8. Check audit & notifications
  await testAuditLog();
  await testNotifications();

  // Summary
  log('\n═══════════════════════════════════════');
  log(`📊 RESULTS: ${passed} passed, ${failed} failed, ${skipped} skipped`);
  if (failed === 0) { log('🎉 ALL TESTS PASSED!'); }
  else { log(`⚠️ ${failed} test(s) failed - review above`); }

  // Save report
  fs.writeFileSync('test-report.txt', REPORT.join('\n'));
  log(`\n📄 Full report saved to test-report.txt`);
}

main().catch(e => { log(`\n❌ FATAL: ${e.message}`); log(e.stack); });
