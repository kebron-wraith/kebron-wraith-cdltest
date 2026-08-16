# EmailJS Integration — Setup & Reference

## Current Status: ✅ Connected

## Configuration
In `config.js`:
```js
export const EMAILJS_SERVICE_ID  = "service_v1ur36h";
export const EMAILJS_TEMPLATE_ID = "template_ygjqjys";
export const EMAILJS_PUBLIC_KEY  = "ryd3W4j56HPHbiD09";
```

In `index.html` (lines 28-31):
```html
<script src="https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js"></script>
<script>
  if (window.emailjs) { emailjs.init("ryd3W4j56HPHbiD09"); }
</script>
```

## How It Works
1. EmailJS SDK loaded from CDN
2. Initialized with public key on page load
3. `modules/reports.js` uses `emailjs.send()` to send role-specific reports
4. Template variables: `{{to_name}}`, `{{to_email}}`, `{{subject}}`, `{{report_html}}`

## Email Reports (Monday morning, per role)
- **Owner**: Full company digest — all sites, anomalies, AI risk summary, procurement review
- **CEO**: Executive summary with top 5 alerts
- **Asset Manager**: Material trends, site comparisons, inefficiencies, delays, risks
- **Finance**: Budget vs actual, spend breakdown, supplier pricing
- **PM**: Site health, team stats, pending approvals
- **Store Manager**: GRN backlog, low stock alerts, verification queue

## Testing EmailJS
1. Login as any role with AI access
2. Navigate to Reports section
3. Click "Send Report" button
4. Check email inbox for the report
5. Verify EmailJS dashboard for sent count

## Troubleshooting
- If emails not sending: check browser console for EmailJS errors
- Verify template variables match in EmailJS dashboard
- Check service quota on free plan (200 emails/month)
