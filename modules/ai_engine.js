// CDL — modules/ai_engine.js
import { GEMINI_KEYS, GEMINI_MODEL_PRIMARY, GEMINI_MODEL_FALLBACK, OPENROUTER_API_KEY, OPENROUTER_MODEL } from "../config.js";
let keyIndex = 0;

export async function callAI(prompt, systemPrompt = "", retries = 3) {
  let lastError = "";
  for (let attempt = 0; attempt < retries; attempt++) {
    const key = GEMINI_KEYS[keyIndex % GEMINI_KEYS.length];
    try {
      const model = attempt === 0 ? GEMINI_MODEL_PRIMARY : GEMINI_MODEL_FALLBACK;
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ system_instruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined, contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { temperature: 0.7, maxOutputTokens: 2048 } }) });
      if (res.status === 429) { lastError = "Rate limited"; keyIndex++; await sleep(1000 * (attempt + 1)); continue; }
      if (!res.ok) { const errBody = await res.text().catch(() => ""); lastError = `Gemini ${res.status}: ${errBody.substring(0, 100)}`; throw new Error(lastError); }
      const data = await res.json(); const text = data.candidates?.[0]?.content?.parts?.[0]?.text; if (text) return text; lastError = "Empty response";
    } catch (err) { lastError = err.message; keyIndex++; if (attempt === retries - 1) { const orResult = await callOpenRouter(prompt, systemPrompt); if (orResult && orResult !== "AI unavailable." && !orResult.startsWith("AI services")) return orResult; return `⚠️ AI services are currently unavailable.\n\nError: ${lastError}`; } await sleep(1500 * (attempt + 1)); }
  }
}

async function callOpenRouter(prompt, systemPrompt) {
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", { method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${OPENROUTER_API_KEY}`, "HTTP-Referer": "https://cdl-management.netlify.app", "X-Title": "CDL Site Management" }, body: JSON.stringify({ model: OPENROUTER_MODEL, messages: [...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []), { role: "user", content: prompt }], max_tokens: 2048, temperature: 0.7 }) });
    if (!res.ok) { const errBody = await res.text().catch(() => ""); return `AI unavailable (OpenRouter ${res.status}). ${errBody.substring(0, 80)}`; }
    const data = await res.json(); if (data.error) return `AI error: ${data.error.message || "Unknown"}`; return data.choices?.[0]?.message?.content || "AI returned empty response.";
  } catch (err) { return `AI network error: ${err.message}. Check your internet connection.`; }
}

export async function callAIWithImages(prompt, imageBase64Array, systemPrompt = "") {
  const key = GEMINI_KEYS[keyIndex % GEMINI_KEYS.length];
  const parts = [...imageBase64Array.map(b64 => ({ inline_data: { mime_type: "image/jpeg", data: b64 } })), { text: prompt }];
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ system_instruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined, contents: [{ role: "user", parts }], generationConfig: { temperature: 0.2, maxOutputTokens: 4096 } }) });
    if (!res.ok) { keyIndex++; throw new Error("Vision API failed"); }
    const data = await res.json(); return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  } catch (err) { keyIndex++; return null; }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
