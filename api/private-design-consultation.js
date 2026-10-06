/**
 * LIA ARMONÍA — Private Design Consultation
 * Vercel Serverless Function (Node.js runtime, ESM).
 *
 * Receives the completed concierge answers from wedding-design.html
 * and delivers them to the atelier inbox via Resend.
 *
 * Required environment variables (Vercel > Settings > Environment Variables):
 *   RESEND_API_KEY      re_xxxxxxxxxxxxxxxx
 *   PRIVATE_INQUIRY_TO  atelier@liaarmonia.com
 *   RESEND_FROM         Lia Armonia <atelier@liaarmonia.com>   (domain must be verified in Resend)
 */

const REQUIRED_FIELDS = ['names', 'email', 'season', 'location', 'preferred_consultation_date', 'preferred_consultation_time', 'timezone'];

const FIELD_LABELS = {
  inquiry_id: 'Inquiry ID',
  submitted_at: 'Submitted at',
  names: 'Names',
  email: 'Email',
  phone: 'Phone',
  season: 'Wedding date / season',
  location: 'Location / venue',
  guest_count: 'Guest count',
  couple_words: 'Couple words',
  feeling: 'Feeling',
  guest_memory: 'Guest memory',
  environments: 'Moments to design',
  support: 'Support requested',
  production_range: 'Production range',
  preliminary_fee_guidance: 'Preliminary design guidance',
  preferred_consultation_date: 'Preferred consultation date',
  preferred_consultation_time: 'Preferred consultation time',
  timezone: 'Timezone',
  alternative_consultation_time: 'Alternative date / time',
  consultation_flexible: 'Flexible timing',
  call_note: 'Final note',
  pricing_acknowledgement: 'Pricing acknowledgement',
  separate_costs_acknowledgement: 'Separate costs acknowledgement',
  request_acknowledgement: 'Request acknowledgement',
  storage_consent: 'Storage consent'
};

const FIELD_ORDER = [
  'inquiry_id', 'submitted_at', 'names', 'email', 'phone', 'season', 'location',
  'guest_count', 'couple_words', 'feeling', 'guest_memory', 'environments',
  'support', 'production_range', 'preliminary_fee_guidance',
  'preferred_consultation_date', 'preferred_consultation_time', 'timezone',
  'alternative_consultation_time', 'consultation_flexible', 'call_note',
  'pricing_acknowledgement', 'separate_costs_acknowledgement',
  'request_acknowledgement', 'storage_consent'
];

const STUDIO_FALLBACK = 'atelier@liaarmonia.com';

/* ---------------------------------------------------------------- helpers */

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function asDisplayValue(value) {
  if (Array.isArray(value)) return value.filter(Boolean).join(', ');
  return value === undefined || value === null ? '' : String(value).trim();
}

function createInquiryId(existingId) {
  if (existingId) return String(existingId);
  const year = new Date().getFullYear();
  const randomPart = Math.random().toString(36).replace(/[^a-z0-9]/gi, '').slice(0, 8).toUpperCase();
  return `LA-${year}-${randomPart.padEnd(8, 'X')}`;
}

function buildRows(body) {
  const known = FIELD_ORDER.filter(key => asDisplayValue(body[key]));
  const extra = Object.keys(body).filter(key =>
    !FIELD_ORDER.includes(key) &&
    !['form-name', 'form_name', 'website', 'subject'].includes(key) &&
    asDisplayValue(body[key])
  );
  return [...known, ...extra].map(key => ({
    label: FIELD_LABELS[key] || key.replace(/_/g, ' '),
    value: asDisplayValue(body[key])
  }));
}

function buildTextEmail(body) {
  return buildRows(body).map(row => `${row.label}: ${row.value}`).join('\n');
}

function buildStudioHtml(body) {
  const rows = buildRows(body).map(row => `
      <tr>
        <td style="padding:14px 18px;border-bottom:1px solid #2d261f;color:#bda07a;font:700 11px Arial,sans-serif;letter-spacing:.12em;text-transform:uppercase;vertical-align:top;width:220px;">${escapeHtml(row.label)}</td>
        <td style="padding:14px 18px;border-bottom:1px solid #2d261f;color:#f6efe4;font:400 15px/1.65 Arial,sans-serif;white-space:pre-wrap;">${escapeHtml(row.value)}</td>
      </tr>`).join('');

  return `
    <div style="margin:0;padding:32px;background:#070706;color:#f6efe4;">
      <div style="max-width:760px;margin:0 auto;border:1px solid #3a3026;background:#0d0b09;">
        <div style="padding:34px 34px 24px;border-bottom:1px solid #3a3026;">
          <p style="margin:0 0 12px;color:#d8ba91;font:700 11px Arial,sans-serif;letter-spacing:.24em;text-transform:uppercase;">Private Design Consultation</p>
          <h1 style="margin:0;color:#f6efe4;font:300 38px/1.05 Georgia,serif;">New Lia Armon&iacute;a inquiry</h1>
          <p style="margin:16px 0 0;color:#b9aa96;font:400 14px/1.7 Arial,sans-serif;">A prospective private client completed the guided consultation request.</p>
        </div>
        <table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;border-collapse:collapse;">${rows}</table>
      </div>
    </div>`;
}

function buildClientHtml(firstName, inquiryId) {
  return `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:620px;margin:0 auto;padding:48px 40px;color:#1a1816;background:#fbf8f3;">
      <p style="margin:0 0 26px;letter-spacing:.24em;font-size:11px;color:#8a745c;text-transform:uppercase;">Lia Armon&iacute;a &middot; Wedding Design Atelier</p>
      <h1 style="margin:0 0 22px;font-family:Georgia,serif;font-weight:400;font-size:34px;line-height:1.15;">Thank you, ${escapeHtml(firstName)}.</h1>
      <p style="margin:0 0 18px;line-height:1.75;font-size:15px;">Your private design inquiry has reached the atelier. Every request is reviewed personally rather than processed automatically.</p>
      <p style="margin:0 0 18px;line-height:1.75;font-size:15px;">Your preferred consultation time has been received as a <em>request</em> — not yet a confirmed appointment. If the project feels aligned, Diana will reply personally to confirm the time or propose an alternative.</p>
      <p style="margin:32px 0 0;line-height:1.7;font-size:15px;">Diana<br><span style="color:#8a745c;">Lia Armon&iacute;a</span></p>
      <p style="margin:28px 0 0;font-size:11px;letter-spacing:.14em;color:#9a8a76;text-transform:uppercase;">Reference: ${escapeHtml(inquiryId)}</p>
    </div>`;
}

async function sendViaResend(apiKey, payload) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const detail = await response.text();
    const error = new Error(`Resend ${response.status}: ${detail}`);
    error.status = response.status;
    error.detail = detail;
    throw error;
  }
  return response.json().catch(() => ({}));
}

/** Works with an already-parsed body (Vercel) or a raw stream. */
async function readBody(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;

  let raw = '';
  if (typeof req.body === 'string') {
    raw = req.body;
  } else if (Buffer.isBuffer(req.body)) {
    raw = req.body.toString('utf8');
  } else {
    raw = await new Promise(resolve => {
      let data = '';
      req.on('data', chunk => { data += chunk; });
      req.on('end', () => resolve(data));
      req.on('error', () => resolve(''));
    });
  }

  if (!raw) return {};
  const contentType = String(req.headers?.['content-type'] || '');
  if (contentType.includes('application/x-www-form-urlencoded')) {
    return Object.fromEntries(new URLSearchParams(raw));
  }
  try {
    return JSON.parse(raw);
  } catch {
    return Object.fromEntries(new URLSearchParams(raw));
  }
}

/* ------------------------------------------------------------- core logic */

export async function processSubmission(body) {
  // Honeypot — silently accept, send nothing.
  if (asDisplayValue(body.website)) {
    return { status: 200, payload: { ok: true } };
  }

  const missingFields = REQUIRED_FIELDS.filter(field => !asDisplayValue(body[field]));
  if (missingFields.length) {
    return { status: 400, payload: { ok: false, error: 'Missing required fields', fields: missingFields } };
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    return { status: 500, payload: { ok: false, error: 'Email service is not configured.' } };
  }

  const inquiryId = createInquiryId(body.inquiry_id);
  const submittedAt = body.submitted_at || new Date().toISOString();
  const emailBody = { ...body, inquiry_id: inquiryId, submitted_at: submittedAt };

  const to = process.env.PRIVATE_INQUIRY_TO || STUDIO_FALLBACK;
  const from = process.env.RESEND_FROM || 'Lia Armonia <onboarding@resend.dev>';
  const clientEmail = asDisplayValue(body.email);
  const subjectName = asDisplayValue(body.names) || 'Private Client';

  try {
    // 1. Studio notification — this one must succeed.
    await sendViaResend(resendApiKey, {
      from,
      to: [to],
      reply_to: clientEmail || undefined,
      subject: `NEW PRIVATE DESIGN INQUIRY - ${subjectName} - ${inquiryId}`,
      html: buildStudioHtml(emailBody),
      text: buildTextEmail(emailBody)
    });
  } catch (error) {
    console.error('Resend studio notification failed:', error.detail || error.message);
    return { status: 502, payload: { ok: false, error: 'Email delivery failed.' } };
  }

  // 2. Client confirmation — best effort, never blocks the success state.
  if (clientEmail) {
    try {
      const firstName = subjectName.split(/[\s&,]+/).find(Boolean) || 'there';
      await sendViaResend(resendApiKey, {
        from,
        to: [clientEmail],
        reply_to: to,
        subject: 'We have received your private design inquiry — Lia Armonía',
        html: buildClientHtml(firstName, inquiryId)
      });
    } catch (error) {
      console.warn('Client confirmation email failed:', error.detail || error.message);
    }
  }

  return { status: 200, payload: { ok: true, inquiryId } };
}

/* --------------------------------------------------- Vercel Node.js entry */

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  let body = {};
  try {
    body = await readBody(req);
  } catch (error) {
    console.error('Body parsing failed:', error);
    return res.status(400).json({ ok: false, error: 'Invalid request body.' });
  }

  const result = await processSubmission(body);
  return res.status(result.status).json(result.payload);
}
