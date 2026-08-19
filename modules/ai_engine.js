// CDL — modules/ai_engine.js
import { GEMINI_KEYS, GEMINI_MODEL_PRIMARY, GEMINI_MODEL_FALLBACK } from "../config.js";
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
    } catch (err) { lastError = err.message; keyIndex++; if (attempt === retries - 1) throw new Error(`AI error after ${retries} retries: ${lastError}`); await sleep(1500 * (attempt + 1)); }
  }
}


export async function callAIWithImages(prompt, images, systemPrompt = "", retries = 3) {
  let lastError = "";
  for (let attempt = 0; attempt < retries; attempt++) {
    const key = GEMINI_KEYS[keyIndex % GEMINI_KEYS.length];
    try {
      const model = attempt === 0 ? GEMINI_MODEL_PRIMARY : GEMINI_MODEL_FALLBACK;
      const parts = [
        { text: prompt },
        ...images.map(b64 => ({ inline_data: { mime_type: "image/jpeg", data: b64 } }))
      ];
      const body = {
        contents: [{ role: "user", parts }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 4096 }
      };
      if (systemPrompt) body.system_instruction = { parts: [{ text: systemPrompt }] };
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
      );
      if (res.status === 429) { lastError = "Rate limited"; keyIndex++; await sleep(1000 * (attempt + 1)); continue; }
      if (!res.ok) { const errBody = await res.text().catch(() => ""); lastError = `Gemini ${res.status}: ${errBody.substring(0, 100)}`; throw new Error(lastError); }
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return text;
      lastError = "Empty response";
    } catch (err) { lastError = err.message; keyIndex++; if (attempt === retries - 1) throw new Error(`AI error after ${retries} retries: ${lastError}`); await sleep(1500 * (attempt + 1)); }
  }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }