// CDL — modules/ai_engine.js
// AI calls are routed through the server-side Netlify function /.netlify/functions/ai-chat
// Keys are never exposed to the client browser.
import { supabase } from "../config.js";

async function getAuthHeader() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ? `Bearer ${session.access_token}` : null;
}

export async function callAI(prompt, systemPrompt = "", history = []) {
  const authHeader = await getAuthHeader();
  const res = await fetch("/.netlify/functions/ai-chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(authHeader ? { Authorization: authHeader } : {}),
    },
    body: JSON.stringify({ prompt, systemPrompt, history }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(`AI error ${res.status}: ${err.error || res.statusText}`);
  }
  const data = await res.json();
  return data.reply || "";
}

export async function callAIWithImages(prompt, images, systemPrompt = "") {
  // Images are base64 encoded; pass as part of prompt since server function
  // currently handles text. For image support extend ai-chat.js server-side.
  const imageNote = images && images.length
    ? `[User attached ${images.length} image(s) for analysis]`
    : "";
  return callAI(`${imageNote}\n${prompt}`, systemPrompt);
}
