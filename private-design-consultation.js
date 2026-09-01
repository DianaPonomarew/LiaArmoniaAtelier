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
  'inquiry_id',
  'submitted_at',
  'names',
  'email',
  'phone',
  'season',
  'location',
  'guest_count',
  'couple_words',
  'feeling',
  'guest_memory',
  'environments',
  'support',
  'production_range',
  'preliminary_fee_guidance',
  'preferred_consultation_date',
  'preferred_consultation_time',
  'timezone',
  'alternative_consultation_time',
  'consultation_flexible',
  'call_note',
  'pricing_acknowledgement',
  'separate_costs_acknowledgement',
  'request_acknowledgement',
  'storage_consent'
];

function jsonPayload(status, payload) {
  return { status, payload };
}

function sendJson(result, response) {
  if (response && typeof response.status === 'function') {
    return response.status(result.status).json(result.payload);
  }
  return Response.json(result.payload, { status: result.status });
}

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
  return value || '';
}

async function readBody(request) {
  if (request.body && !(request.body instanceof ReadableStream)) {
    if (typeof request.body === 'string') {
      try {
        return JSON.parse(request.body);
      } catch {
        return Object.fromEntries(new URLSearchParams(request.body));
      }
    }
    return request.body;
  }

  const contentType = request.headers?.get?.('content-type') || request.headers?.['content-type'] || '';
  if (contentType.includes('application/json')) {
    try {
      return await request.json();
    } catch {
      return {};
    }
  }

  const text = await request.text();
  if (!text) return {};
  if (contentType.includes('application/x-www-form-urlencoded')) {
    return Object.fromEntries(new URLSearchParams(text));
  }
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

function createInquiryId(existingId) {
  if (existingId) return String(existingId);
  const year = new Date().getFullYear();
  const randomPart = Math.random().toString(36).replace(/[^a-z0-9]/gi, '').slice(2, 10).toUpperCase();
  return `LA-${year}-${randomPart}`;
}

function buildRows(body) {
  return FIELD_ORDER
    .filter(key => asDisplayValue(body[key]))
    .map(key => {
      const label = FIELD_LABELS[key] || key.replace(/_/g, ' ');
      const value = asDisplayValue(body[key]);
      return { label, value };
    });
}

function buildTextEmail(body) {
  return buildRows(body)
    .map(row => `${row.label}: ${row.value}`)
    .join('\n');
}

function buildHtmlEmail(body) {
  const rows = buildRows(body)
    .map(row => `
      <tr>
        <td style="padding:14px 18px;border-bottom:1px solid #2d261f;color:#bda07a;font:700 11px Arial,sans-serif;letter-spacing:.12em;text-transform:uppercase;vertical-align:top;width:220px;">${escapeHtml(row.label)}</td>
        <td style="padding:14px 18px;border-bottom:1px solid #2d261f;color:#f6efe4;font:400 15px/1.65 Arial,sans-serif;white-space:pre-wrap;">${escapeHtml(row.value)}</td>
      </tr>
    `)
    .join('');

  return `
    <div style="margin:0;padding:32px;background:#070706;color:#f6efe4;">
      <div style="max-width:760px;margin:0 auto;border:1px solid #3a3026;background:#0d0b09;">
        <div style="padding:34px 34px 24px;border-bottom:1px solid #3a3026;">
          <p style="margin:0 0 12px;color:#d8ba91;font:700 11px Arial,sans-serif;letter-spacing:.24em;text-transform:uppercase;">Private Design Consultation</p>
          <h1 style="margin:0;color:#f6efe4;font:300 38px/1.05 Georgia,serif;">New Lia Armonía inquiry</h1>
          <p style="margin:16px 0 0;color:#b9aa96;font:400 14px/1.7 Arial,sans-serif;">A prospective private client completed the guided consultation request.</p>
        </div>
        <table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;border-collapse:collapse;">
          ${rows}
        </table>
      </div>
    </div>
  `;
}

async function processSubmission(request) {
  if (request.method !== 'POST') {
    return jsonPayload(405, { ok: false, error: 'Method not allowed' });
  }

  const body = await readBody(request);

  if (body.website) {
    return jsonPayload(200, { ok: true });
  }

  const missingFields = REQUIRED_FIELDS.filter(field => !asDisplayValue(body[field]));
  if (missingFields.length) {
    return jsonPayload(400, { ok: false, error: 'Missing required fields', fields: missingFields });
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    return jsonPayload(500, { ok: false, error: 'Email service is not configured.' });
  }

  const inquiryId = createInquiryId(body.inquiry_id);
  const submittedAt = body.submitted_at || new Date().toISOString();
  const emailBody = {
    ...body,
    inquiry_id: inquiryId,
    submitted_at: submittedAt
  };
  const to = process.env.PRIVATE_INQUIRY_TO || 'atelier@liaarmonia.com';
  const from = process.env.RESEND_FROM || 'LIA Armonia <onboarding@resend.dev>';
  const replyTo = asDisplayValue(body.email);
  const subjectName = asDisplayValue(body.names) || 'Private Client';
  const subject = `NEW PRIVATE DESIGN INQUIRY - ${subjectName} - ${inquiryId}`;

  try {
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: replyTo,
        subject,
        html: buildHtmlEmail(emailBody),
        text: buildTextEmail(emailBody),
        tags: [{ name: 'source', value: 'private_design_consultation' }]
      })
    });

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text();
      console.error('Resend private consultation error:', errorText);
      return jsonPayload(502, { ok: false, error: 'Email delivery failed.' });
    }

    return jsonPayload(200, { ok: true, inquiryId });
  } catch (error) {
    console.error('Private consultation submission error:', error);
    return jsonPayload(500, { ok: false, error: 'Submission failed.' });
  }
}

export async function handler(request, response) {
  return sendJson(await processSubmission(request), response);
}

export default {
  async fetch(request) {
    return sendJson(await processSubmission(request));
  }
};
