/**
 * LIA ARMONIA — General Atelier Inquiry
 * Vercel Serverless Function using Resend.
 */

const STUDIO_FALLBACK = 'atelier@liaarmonia.com';

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function asValue(value) {
  if (Array.isArray(value)) return value.filter(Boolean).join(', ');
  return value === undefined || value === null ? '' : String(value).trim();
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  let raw = '';
  if (typeof req.body === 'string') raw = req.body;
  else if (Buffer.isBuffer(req.body)) raw = req.body.toString('utf8');
  else {
    raw = await new Promise(resolve => {
      let data = '';
      req.on('data', chunk => { data += chunk; });
      req.on('end', () => resolve(data));
      req.on('error', () => resolve(''));
    });
  }
  if (!raw) return {};
  const contentType = String(req.headers?.['content-type'] || '');
  if (contentType.includes('application/x-www-form-urlencoded')) return Object.fromEntries(new URLSearchParams(raw));
  try {
    return JSON.parse(raw);
  } catch {
    return Object.fromEntries(new URLSearchParams(raw));
  }
}

function createRows(body) {
  return Object.entries(body)
    .filter(([key, value]) => !['website'].includes(key) && asValue(value))
    .map(([key, value]) => ({
      label: key.replace(/[-_]/g, ' '),
      value: asValue(value)
    }));
}

function buildHtml(body) {
  const rows = createRows(body).map(row => `
    <tr>
      <td style="padding:13px 16px;border-bottom:1px solid #2d261f;color:#bda07a;font:700 11px Arial,sans-serif;letter-spacing:.12em;text-transform:uppercase;vertical-align:top;width:210px;">${escapeHtml(row.label)}</td>
      <td style="padding:13px 16px;border-bottom:1px solid #2d261f;color:#f6efe4;font:400 15px/1.65 Arial,sans-serif;white-space:pre-wrap;">${escapeHtml(row.value)}</td>
    </tr>`).join('');

  return `
    <div style="margin:0;padding:32px;background:#070706;color:#f6efe4;">
      <div style="max-width:760px;margin:0 auto;border:1px solid #3a3026;background:#0d0b09;">
        <div style="padding:32px 34px 24px;border-bottom:1px solid #3a3026;">
          <p style="margin:0 0 12px;color:#d8ba91;font:700 11px Arial,sans-serif;letter-spacing:.24em;text-transform:uppercase;">Lia Armonia Inquiry</p>
          <h1 style="margin:0;color:#f6efe4;font:300 36px/1.08 Georgia,serif;">New atelier note</h1>
        </div>
        <table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;border-collapse:collapse;">${rows}</table>
      </div>
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
    throw new Error(`Resend ${response.status}: ${detail}`);
  }
}

export async function processInquiry(body) {
  if (asValue(body.website)) return { status: 200, payload: { ok: true } };

  const email = asValue(body.email);
  const message = asValue(body.message || body.contribution || body.note);
  if (!email || !message) {
    return { status: 400, payload: { ok: false, error: 'Please add your email and note.' } };
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { status: 500, payload: { ok: false, error: 'Email service is not configured.' } };

  const to = process.env.PRIVATE_INQUIRY_TO || STUDIO_FALLBACK;
  const from = process.env.RESEND_FROM || 'Lia Armonia <onboarding@resend.dev>';
  const subject = asValue(body.subject) || 'New atelier inquiry - LIA ARMONIA';

  try {
    await sendViaResend(apiKey, {
      from,
      to: [to],
      reply_to: email,
      subject,
      html: buildHtml({ ...body, submitted_at: new Date().toISOString() }),
      text: createRows(body).map(row => `${row.label}: ${row.value}`).join('\n')
    });
  } catch (error) {
    console.error('Atelier inquiry email failed:', error.message);
    return { status: 502, payload: { ok: false, error: 'Email delivery failed.' } };
  }

  return { status: 200, payload: { ok: true } };
}


async function processFeedback(body) {
  const { put } = await import('@vercel/blob');
  const { randomUUID } = await import('node:crypto');
  const name=asValue(body.name).slice(0,80);
  const rating=Number(body.rating);
  const comment=asValue(body.comment).slice(0,1200);
  const sharePermission=body.sharePermission === true;
  if(!name || !Number.isInteger(rating) || rating<1 || rating>5)
    return {status:400,payload:{ok:false,error:'Please add your name and a rating.'}};
  if(!process.env.RESEND_API_KEY || !process.env.BLOB_READ_WRITE_TOKEN)
    return {status:503,payload:{ok:false,error:'Feedback service is temporarily unavailable.'}};
  const id=randomUUID();
  const saved={id,receivedAt:new Date().toISOString(),name,rating,comment,sharePermission,product:'Cinematic Save the Date — The Yacht'};
  try{
    await put(`atelier-feedback/${saved.receivedAt.slice(0,10)}/${id}.json`,JSON.stringify(saved),{
      access:'private',addRandomSuffix:false,allowOverwrite:false,
      contentType:'application/json',token:process.env.BLOB_READ_WRITE_TOKEN
    });
  }catch(error){
    console.error('Feedback backup failed:',error.message);
    return {status:503,payload:{ok:false,error:'Could not save feedback. Please try again.'}};
  }
  const permission=sharePermission?'YES — written review and first name may be shared':'NO — keep private';
  const rows={name, rating:rating+'/5',comment:comment||'(no written comment)',testimonial_permission:permission,submitted_at:saved.receivedAt,backup_id:id};
  try{
    await sendViaResend(process.env.RESEND_API_KEY,{
      from:process.env.RESEND_FROM||'LIA ARMONÍA <atelier@liaarmonia.com>',
      to:[STUDIO_FALLBACK],
      subject:`NEW FEEDBACK · ${rating}/5 · ${name}`,
      html:buildHtml(rows),
      text:createRows(rows).map(r=>r.label+': '+r.value).join('\n')
    });
  }catch(error){
    console.error('Feedback email notification failed:',error.message);
    return {status:502,payload:{ok:false,error:'Feedback saved but email notification could not be confirmed. Please contact atelier@liaarmonia.com.'}};
  }
  return {status:200,payload:{ok:true}};
}

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
  const body = await readBody(req);
  const result = body.formType === 'client_feedback' ? await processFeedback(body) : await processInquiry(body);
  return res.status(result.status).json(result.payload);
}
