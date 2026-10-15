import { briefUrl, readBrief, saveBrief, verifyVenueSession, sendJson } from './_venue-visualization.js';
import { readJsonBody } from './_design-edition-stripe.js';
import { randomBytes } from 'node:crypto';

const studioEmail = () => process.env.VENUE_VISUALIZATION_NOTIFY_TO || 'atelier@liaarmonia.com';
const esc = value => String(value || '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;' })[c]);
const fields = ['venue_area', 'wedding_date', 'guest_count', 'atmosphere_colours', 'include', 'decor_budget', 'inspiration_links', 'additional_notes'];
const rows = data => fields.filter(key => data[key]).map(key => `<tr><td style="padding:8px 16px 8px 0;color:#6b2638;vertical-align:top">${esc(key.replaceAll('_', ' '))}</td><td style="padding:8px 0;white-space:pre-wrap">${esc(data[key])}</td></tr>`).join('');
function bookingConditions(brief) {
  const terms = brief.termsAcceptance;
  if (!terms) return '';
  return `<hr><h2>Your agreed booking conditions</h2><p>Version ${esc(terms.version)}. Accepted ${esc(terms.acceptedAt)}.</p><p>${esc(terms.provider)}</p><h3>Your early-start request</h3><p>${esc(terms.earlyStartNotice)}</p>${terms.sections.map(([heading, text]) => `<h3>${esc(heading)}</h3><p>${esc(text)}</p>`).join('')}`;
}
async function email(payload, idempotencyKey) {
  if (!process.env.RESEND_API_KEY) return;
  const response = await fetch('https://api.resend.com/emails', { method:'POST', headers:{ Authorization:`Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type':'application/json', ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}) }, body:JSON.stringify(payload) });
  if (!response.ok) throw new Error('Confirmation email could not be sent.');
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const sessionId = req.query?.session_id || new URL(req.url, 'https://www.liaarmonia.com').searchParams.get('session_id');
      const session = await verifyVenueSession(sessionId);
      return sendJson(res, 200, { brief: await readBrief(session.id) });
    } catch (error) { return sendJson(res, error.statusCode || 500, { error: error.message || 'Your saved brief could not be loaded.' }); }
  }
  if (req.method !== 'POST') { res.setHeader('Allow','POST'); return sendJson(res,405,{error:'Method not allowed.'}); }
  try {
    const body = await readJsonBody(req);
    if (body.action === 'create') {
      const id = `brief_${randomBytes(32).toString('hex')}`;
      await saveBrief(id, { sessionId: id, status: 'draft', files: [], updatedAt: new Date().toISOString() });
      return sendJson(res, 200, { sessionId: id });
    }
    const session = await verifyVenueSession(body.sessionId);
    const existing = await readBrief(session.id);
    if (existing?.status === 'submitted' || existing?.status === 'awaiting_payment') return sendJson(res, 409, { error: 'This brief is already sent. Return from checkout to see your confirmation.' });
    const isDraft = Boolean(body.draft);
    if (!isDraft && session.payment_status !== 'paid') return sendJson(res, 402, { error: 'Complete payment to confirm your order.' });
    if (!isDraft) {
      const required = ['venue_area','wedding_date','guest_count','atmosphere_colours','include'];
      const missing = required.filter(key => !String(body[key] || '').trim());
      if (missing.length) return sendJson(res,400,{error:'Please complete the required questions before sending your brief.'});
    }
    if (!Array.isArray(body.files) || body.files.length > 33) return sendJson(res, 400, { error: 'Please check the uploaded files.' });
    const answers = Object.fromEntries(fields.map(key => [key, String(body[key] || '').slice(0, 10000)]));
    const payload = { ...answers, files: body.files, status: isDraft ? 'draft' : 'submitted', sessionId: session.id, customerEmail: session.customer_details?.email || session.customer_email || '', updatedAt:new Date().toISOString() };
    await saveBrief(session.id, payload);
    if (isDraft) return sendJson(res,200,{ok:true,draft:true});
    const link = briefUrl(req, session.id);
    const fileList = (body.files || []).map(file => `<li>${esc(file.name)} (${esc(file.kind)})</li>`).join('') || '<li>No files attached.</li>';
    const from = process.env.RESEND_FROM || 'Lia Armonia <onboarding@resend.dev>';
    const client = payload.customerEmail;
    const summary = `<table style="border-collapse:collapse;width:100%;font:15px/1.55 Arial,sans-serif">${rows(body)}</table><h3>Files received</h3><ul>${fileList}</ul>`;
    await email({ from, to:[studioEmail()], reply_to:client, subject:`Venue visualization brief · ${session.id}`, html:`<div style="max-width:720px;margin:auto;padding:32px;font-family:Arial,sans-serif"><p style="letter-spacing:.16em">LIA ARMONÍA</p><h1 style="font-family:Georgia,serif;font-weight:400">New Wedding Venue Visualization brief</h1>${summary}<p><a href="${link}">Open private brief and download original files</a></p></div>` });
    if (client) await email({ from, to:[client], reply_to:studioEmail(), subject:'Your Wedding Venue Visualization brief — LIA ARMONÍA', html:`<div style="max-width:720px;margin:auto;padding:32px;font-family:Arial,sans-serif"><p style="letter-spacing:.16em">LIA ARMONÍA</p><h1 style="font-family:Georgia,serif;font-weight:400">Your brief is with the atelier.</h1><p>Your first design images will arrive within seven calendar days. The seven days begin after confirmed payment and receipt of this complete brief. The two final videos are created once the image concept is approved.</p>${summary}<p><a href="${link}">Return to your private brief</a></p></div>` });
    return sendJson(res,200,{ok:true,message:'Your brief is with the atelier. Your first design images will arrive within seven calendar days.'});
  } catch (error) { return sendJson(res,error.statusCode || 500,{error:error.message || 'Your brief could not be sent.'}); }
}

export async function confirmPaidVenueBrief(session, req) {
  if (session.payment_status !== 'paid' || !session.metadata?.brief_id) return;
  const id = session.metadata.brief_id;
  const brief = await readBrief(id);
  if (!brief || brief.checkoutSessionId !== session.id) throw new Error('The paid order does not match its brief.');
  const client = session.customer_details?.email || session.customer_email;
  const paidAt = brief.paidAt || new Date().toISOString();
  const phone = session.customer_details?.phone || brief.customerPhone || '';
  const payload = { ...brief, status: 'submitted', customerEmail: client, customerPhone: phone, paidAt };
  await saveBrief(id, payload);
  const from = process.env.RESEND_FROM || 'Lia Armonia <onboarding@resend.dev>';
  const link = briefUrl(req, id);
  const summary = `<table>${rows(brief)}</table><h3>Files received</h3><ul>${(brief.files || []).map(file => `<li>${esc(file.name)} (${esc(file.kind)})</li>`).join('')}</ul>`;
  const timing = '<p>Your brief is with the atelier. Your five design images will arrive within seven calendar days of confirmed payment and receipt of the complete brief. Your two final videos are created after approval of the image concept.</p>';
  const delivery = '<p>The atelier will deliver your images and videos via WhatsApp, or send a download link by SMS to the mobile number provided at checkout.</p>';
  const contact = `<p>Customer email: ${esc(client)}</p><p>Delivery mobile number: ${esc(phone)}</p>${phone ? `<p><a href="https://wa.me/${phone.replace(/\D/g, '')}">Open WhatsApp</a></p>` : ''}`;
  const conditions = bookingConditions(brief);
  if (!process.env.RESEND_API_KEY) throw new Error('Confirmation email is not configured.');
  if (!brief.studioEmailSentAt) {
    await email({ from, to: [studioEmail()], ...(client ? { reply_to: client } : {}), subject: 'Paid Wedding Venue Visualization brief', html: `${timing}${contact}${summary}<p><a href="${link}">View brief and download original files</a></p>${conditions}` }, `venue-studio-${session.id}`);
    payload.studioEmailSentAt = new Date().toISOString();
    await saveBrief(id, payload);
  }
  if (client && !brief.customerEmailSentAt) {
    await email({ from, to: [client], reply_to: studioEmail(), subject: 'Your Wedding Venue Visualization - LIA ARMONIA', html: `<p>Thank you for your booking.</p>${timing}${delivery}${summary}<p>Your files have arrived.</p><p><a href="${link}">Your private brief</a></p>${conditions}` }, `venue-client-${session.id}`);
    payload.customerEmailSentAt = new Date().toISOString();
    await saveBrief(id, payload);
  }
}
