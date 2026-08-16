// CDL — modules/excel_pro.js — Excel utilities
export function exportToExcel(data, filename) {
  if (typeof XLSX === 'undefined') { console.error('XLSX not loaded'); return; }
  try { const ws = XLSX.utils.json_to_sheet(data); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Sheet1"); XLSX.writeFile(wb, filename || `export_${new Date().toISOString().slice(0,10)}.xlsx`); } catch (err) { console.error('[Excel] Export failed:', err); }
}
export function importFromFile(file) {
  return new Promise((resolve, reject) => {
    if (typeof XLSX === 'undefined') { reject(new Error('XLSX not loaded')); return; }
    const reader = new FileReader();
    reader.onload = (e) => { try { const wb = XLSX.read(e.target.result, { type: 'binary' }); const ws = wb.Sheets[wb.SheetNames[0]]; resolve(XLSX.utils.sheet_to_json(ws)); } catch (err) { reject(err); } };
    reader.readAsBinaryString(file);
  });
}
