import { briefUrl, readBrief, saveBrief, verifyVenueSession, sendJson } from './_venue-visualization.js';
import { readJsonBody } from './_design-edition-stripe.js';

const studioEmail = () => process.env.VENUE_VISUALIZATION_NOTIFY_TO || 'atelier@liaarmonia.com';
const esc = value => String(value || '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;' })[c]);
const rows = data => Object.entries(data).filter(([key, value]) => !['files', 'sessionId'].includes(key) && value).map(([key, value]) => `<tr><td style="padding:8px 16px 8px 0;color:#6b2638;vertical-align:top">${esc(key.replaceAll('_', ' '))}</td><td style="padding:8px 0;white-space:pre-wrap">${esc(value)}</td></tr>`).join('');
async function email(payload) {
  if (!process.env.RESEND_API_KEY) return;
  const response = await fetch('https://api.resend.com/emails', { method:'POST', headers:{ Authorization:`Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type':'application/json' }, body:JSON.stringify(payload) });
  if (!response.ok) throw new Error('Confirmation email could not be sent.');
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const sessionId = req.query?.session_id || new URL(req.url, 'https://www.liaarmonia.com').searchParams.get('session_id');
      await verifyVenueSession(sessionId);
      return sendJson(res, 200, { brief: await readBrief(sessionId) });
    } catch (error) { return sendJson(res, error.statusCode || 500, { error: error.message || 'Your saved brief could not be loaded.' }); }
  }
  if (req.method !== 'POST') { res.setHeader('Allow','POST'); return sendJson(res,405,{error:'Method not allowed.'}); }
  try {
    const body = await readJsonBody(req);
    const session = await verifyVenueSession(body.sessionId);
    const isDraft = Boolean(body.draft);
    if (!isDraft) {
      const required = ['venue_area','wedding_date','guest_count','atmosphere_colours','include'];
      const missing = required.filter(key => !String(body[key] || '').trim());
      if (missing.length) return sendJson(res,400,{error:'Please complete the required questions before sending your brief.'});
    }
    const payload = { ...body, draft: undefined, status: isDraft ? 'draft' : 'submitted', sessionId: session.id, customerEmail: session.customer_details?.email || session.customer_email || '', updatedAt:new Date().toISOString() };
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
