// CDL — modules/ai_grn.js
import { callAIWithImages } from "./ai_engine.js";
import { getGRNExtractionPrompt } from "./ai_roles.js";
import { showToast } from "../app.js";

export async function scanGRN(files) {
  if (!files || !files.length) return { error: "No files provided" };
  const images = [];
  for (const file of Array.from(files)) {
    const base64 = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result.split(",")[1]);
      reader.readAsDataURL(file);
    });
    images.push(base64);
  }
  try {
    const result = await callAIWithImages("Extract all data from this delivery/invoice. Return ONLY valid JSON per the spec.", images, getGRNExtractionPrompt());
    if (!result) return { error: "AI could not read the image" };
    const cleaned = result.replace(/```json?\n?|```/g, "").trim();
    return JSON.parse(cleaned);
  } catch (err) { return { error: `Parse failed: ${err.message}` }; }
}

export function renderGRNPreview(data, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  if (data.error) { container.innerHTML = `<div style="color:var(--red);padding:12px;">⚠️ ${data.error}</div>`; return; }
  const items = Array.isArray(data.items) ? data.items : [];
  container.innerHTML = `<div style="background:var(--bg-700);border-radius:8px;padding:12px;margin-top:8px;"><div style="font-weight:600;color:var(--text-100);margin-bottom:8px;">📄 ${data.grn_number||"GRN"} · ${data.supplier||"Unknown supplier"}</div>${items.length ? `<table style="width:100%;font-size:12px;border-collapse:collapse;"><thead><tr style="border-bottom:1px solid var(--border);">${["Item","Qty","Unit","Price"].map(h=>`<th style="text-align:left;padding:4px;color:var(--text-300);">${h}</th>`).join("")}</tr></thead><tbody>${items.map(i=>`<tr style="border-bottom:1px solid rgba(30,35,48,0.3);"><td style="padding:4px;color:var(--text-100);">${i.name||"—"}</td><td style="padding:4px;">${i.quantity||"—"}</td><td style="padding:4px;color:var(--text-200);">${i.unit||"—"}</td><td style="padding:4px;">${i.unit_price?`KES ${Number(i.unit_price).toLocaleString()}`:"—"}</td></tr>`).join("")}</tbody></table>` : '<p style="color:var(--text-300);font-size:12px;">No items detected</p>'}</div>`;
}
