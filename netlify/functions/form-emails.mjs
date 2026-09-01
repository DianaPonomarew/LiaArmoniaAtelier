const STUDIO_EMAIL = "atelier@liaarmonia.com";

const FORM_RULES = {
  "private-design-consultation": {
    label: "PRIVATE DESIGN",
    subject: data => `NEW PRIVATE DESIGN INQUIRY · ${data.names || "Private client"}`,
    customerSubject: "We received your Private Design Inquiry — LIA ARMONÍA",
    required: ["names", "email", "season", "location", "guest_count", "environments", "support", "production_range", "preferred_consultation_date", "preferred_consultation_time", "timezone", "pricing_acknowledgement", "separate_costs_acknowledgement", "request_acknowledgement", "storage_consent"]
  },
  "collaboration-inquiry": {
    label: "COLLABORATIONS",
    subject: data => `NEW COLLABORATION INQUIRY · ${data.company || data.name || "Studio"}`,
    customerSubject: "We received your Collaboration Inquiry — LIA ARMONÍA",
    required: ["name", "company", "email", "project_type", "contribution"]
  },
  "atelier-inquiry": {
    label: "ATELIER INQUIRY",
    subject: () => "NEW ATELIER INQUIRY · LIA ARMONÍA",
    customerSubject: "We received your note — LIA ARMONÍA",
    required: ["email", "message"]
  }
};

function safe(value) {
  return String(value || "").replace(/[&<>\"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  })[character]);
}

async function sendEmail(apiKey, payload, idempotencyKey) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) throw new Error(`Resend ${response.status}: ${await response.text()}`);
}

async function submissionKey(data) {
  const input = new TextEncoder().encode(JSON.stringify(data));
  const digest = await crypto.subtle.digest("SHA-256", input);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("").slice(0, 20);
}

function assertRequired(data, required) {
  const missing = required.filter(field => !String(data[field] || "").trim());
  if (missing.length) throw new Error(`Required form fields missing: ${missing.join(", ")}`);
}

function customerConfirmation(label, firstName, inquiryId) {
  if (label === "PRIVATE DESIGN") {
    return `<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;padding:48px;color:#1a1816"><p style="letter-spacing:.2em;font-size:11px">LIA ARMONÍA</p><h1 style="font-family:Georgia,serif;font-weight:400">Thank you, ${safe(firstName)}.</h1><p style="line-height:1.7">I have received your Private Design Inquiry and will review your venue, vision and project details personally.</p><p style="line-height:1.7">Your preferred consultation time has also been received. Please note that this is a consultation request rather than a confirmed appointment.</p><p style="line-height:1.7">If the project feels aligned, I will be in touch personally to confirm your consultation or suggest an alternative time.</p><p style="margin-top:32px">Diana<br>Lia Armonía</p><small>Reference: ${safe(inquiryId)}</small></div>`;
  }
  const noun = label === "COLLABORATIONS" ? "collaboration inquiry" : "note";
  return `<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;padding:48px;color:#1a1816"><p style="letter-spacing:.2em;font-size:11px">LIA ARMONÍA</p><h1 style="font-family:Georgia,serif;font-weight:400">Thank you, ${safe(firstName)}.</h1><p style="line-height:1.7">Your ${noun} has reached the atelier and will be reviewed personally.</p><p style="line-height:1.7">I will be in touch by email if the project feels aligned.</p><p style="margin-top:32px">Diana<br>Lia Armonía</p><small>Reference: ${safe(inquiryId)}</small></div>`;
}

export default {
  async formSubmitted(event) {
    const data = event.data || {};
    const formName = data["form-name"];
    const rules = FORM_RULES[formName];
    if (!rules) return;
    assertRequired(data, rules.required);

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn("RESEND_API_KEY is missing. The Netlify submission remains stored, but automatic email was skipped.");
      return;
    }

    const fingerprint = await submissionKey(data);
    const inquiryId = data.inquiry_id || `LA-${new Date().getFullYear()}-${fingerprint.slice(0, 8).toUpperCase()}`;
    const names = data.names || data.name || data.company || "there";
    const customerEmail = data.email;
    const from = process.env.LIA_EMAIL_FROM || "Lia Armonía <atelier@liaarmonia.com>";
    const studioRows = Object.entries(data)
      .filter(([key]) => !["form-name", "website", "subject"].includes(key))
      .map(([key, value]) => `<tr><td style="padding:8px 20px 8px 0;color:#806f60;vertical-align:top">${safe(key.replaceAll("_", " ").toUpperCase())}</td><td style="padding:8px 0;color:#1a1816">${safe(value)}</td></tr>`)
      .join("");

    await sendEmail(apiKey, {
      from,
      to: STUDIO_EMAIL,
      reply_to: customerEmail,
      subject: rules.subject(data),
      html: `<div style="font-family:Arial,sans-serif;max-width:720px;margin:auto;padding:40px"><p style="letter-spacing:.2em;font-size:11px">LIA ARMONÍA · ${safe(rules.label)}</p><h1 style="font-family:Georgia,serif;font-weight:400">${safe(names)}</h1><p>Inquiry ${safe(inquiryId)}</p><table style="border-collapse:collapse;width:100%">${studioRows}</table></div>`
    }, `studio/${formName}/${fingerprint}`);

    if (!customerEmail) return;
    const firstName = names.split(/\s+|&/).find(Boolean) || "there";
    await sendEmail(apiKey, {
      from,
      to: customerEmail,
      reply_to: STUDIO_EMAIL,
      subject: rules.customerSubject,
      html: customerConfirmation(rules.label, firstName, inquiryId)
    }, `customer/${formName}/${fingerprint}`);
  }
};
