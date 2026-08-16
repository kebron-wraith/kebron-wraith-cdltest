// CDL — modules/ai_roles.js
export function getSystemPrompt(user) {
  const role = user.role || "engineer";
  const name = user.name || "User";
  return `You are CDL AI, an intelligent assistant for Canaan Developers Ltd's Site Management System. You help ${name} (${role}) with construction site operations, material tracking, procurement, and reporting. Be concise, professional, and use KES currency. Current date: ${new Date().toLocaleDateString("en-KE")}.`;
}

export function getGRNExtractionPrompt() {
  return `Extract all data from this delivery note/invoice image. Return ONLY valid JSON in this exact format:
{
  "grn_number": "string or null",
  "invoice_number": "string or null",
  "supplier": "string or null",
  "date": "YYYY-MM-DD or null",
  "items": [
    {
      "name": "material name",
      "quantity": number,
      "unit": "Pcs/Kgs/Bags/etc",
      "unit_price": number
    }
  ],
  "notes": "any additional notes"
}
If you cannot read the image, return {"error": "Could not read image"}. Return ONLY the JSON, no markdown.`;
}
