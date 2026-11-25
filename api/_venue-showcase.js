import { randomUUID, createHmac, timingSafeEqual } from 'node:crypto';
import { get, put, list } from '@vercel/blob';
import { commercialDeclaration, venueOffer, agreementHtml, agreementText } from './_venue-commercial.js';

const ORIGIN = 'https://www.liaarmonia.com';
const STUDIO = 'atelier@liaarmonia.com';
const TYPES = ['Villa or private estate', 'Hotel or resort', 'Historic property', 'Restaurant or beach club', 'Other distinctive setting'];
const EXPERIENCES = ['Wedding ceremony', 'Wedding reception', 'Welcome party', 'Cocktails', 'Private dinner', 'Guest accommodation', 'Intimate celebration'];
const secret = () => process.env.VENUE_EDITORIAL_SECRET || process.env.PLANNER_EDITORIAL_SECRET || '';
const blobToken = () => process.env.BLOB_READ_WRITE_TOKEN || '';
const validId = id => /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(String(id || ''));
const folder = id => 'venue-submissions/' + id + '/';
const details = id => folder(id) + 'details.json';
const agreementPath = id => folder(id) + 'agreement.json';
const clean = (value, max = 250) => String(value ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);
const html = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function tokenFor(purpose, id, seconds) {
  const expires = Math.floor(Date.now() / 1000) + seconds;
  return expires + '.' + createHmac('sha256', secret()).update('venue:' + purpose + ':' + id + ':' + expires).digest('hex');
}
function authorized(purpose, id, token) {
  if (!validId(id)) return false;
  const [expiry, signature, extra] = String(token || '').split('.');
  const expires = Number(expiry), now = Math.floor(Date.now() / 1000);
  if (extra || !/^\d+$/.test(expiry || '') || !Number.isSafeInteger(expires) || expires <= now || !/^[a-f0-9]{64}$/.test(signature || '')) return false;
  const expected = createHmac('sha256', secret()).update('venue:' + purpose + ':' + id + ':' + expires).digest();
  return timingSafeEqual(expected, Buffer.from(signature, 'hex'));
}
function url(value, label) {
  const raw = clean(value, 800);
  if (!raw) return '';
  try {
    const parsed = new URL(raw);
    if (parsed.protocol === 'https:' && !parsed.username && !parsed.password) return parsed.href;
  } catch { /* Report a field-specific validation error below. */ }
  throw new Error('Please use a complete https:// link for ' + label + '.');
}
function integer(value, label) {
  if (value === '' || value == null) return null;
  if (!/^\d{1,5}$/.test(String(value)) || Number(value) > 10000) throw new Error('Please check ' + label + '.');
  return Number(value);
}
function validate(b) {
  const data = {};
  for (const [name, limit] of Object.entries({ venue_name: 150, contact_name: 120, email: 200, phone: 70, venue_type: 90, country: 90, region: 120, city: 100, instagram: 160, capacity_notes: 450, accommodation_notes: 400, exclusive_use: 50, seasonality: 400, pricing_notes: 500, short_description: 160, description: 1200, highlights: 500, image_credit: 650 })) {
    if (String(b[name] ?? '').length > limit) throw new Error('Please shorten ' + name.replaceAll('_', ' ') + '.');
    data[name] = clean(b[name], limit);
  }
  if (!data.venue_name || !data.contact_name || !data.country || !data.city || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) throw new Error('Please complete the property, destination and contact details.');
  if (!TYPES.includes(data.venue_type)) throw new Error('Please select a property type.');
  if (!Array.isArray(b.experiences) || b.experiences.length < 1 || b.experiences.length > EXPERIENCES.length || b.experiences.some(x => !EXPERIENCES.includes(x))) throw new Error('Please select the experiences your property actually hosts.');
  data.experiences = [...new Set(b.experiences)];
  for (const key of ['seated_capacity', 'standing_capacity', 'rooms', 'sleeps']) data[key] = integer(b[key], key.replaceAll('_', ' '));
  if (!data.seated_capacity && !data.standing_capacity && data.capacity_notes.length < 5 && !data.experiences.includes('Guest accommodation')) throw new Error('Please add a capacity or a short capacity note.');
  if (!['Available', 'Partially available', 'Not available', 'Please discuss with us'].includes(data.exclusive_use)) throw new Error('Please select an exclusive-use option.');
  data.image_layout = b.image_layout === 'hero_and_gallery' ? 'hero_and_gallery' : 'legacy_gallery';
  if (data.image_layout === 'hero_and_gallery') {
    if (data.short_description.length < 20 || data.short_description.split(/\s+/).length > 25) throw new Error('Please introduce the property in one sentence, using 20–160 characters and no more than 25 words.');
  } else if (data.description.length < 50) throw new Error('Please tell us a little more about the property (at least 50 characters).');
  if (data.image_credit.length < 3) throw new Error('Please include the photography credits.');
  data.website = url(b.website, 'your website');
  data.brochure_url = url(b.brochure_url, 'your brochure or floor plan');
  data.media_url = url(b.media_url, 'your additional image folder');
  data.image_filenames = (Array.isArray(b.photo_names) ? b.photo_names : []).slice(0, 7).map(name => clean(name, 200));
  if (data.image_layout === 'hero_and_gallery') {
    if (!Array.isArray(b.photo_names) || b.photo_names.length < 4 || b.photo_names.length > 7 || data.image_filenames.some(name => !name)) throw new Error('Please select one main image and 3–6 separate gallery images.');
    data.main_image_filename = data.image_filenames[0];
    data.gallery_filenames = data.image_filenames.slice(1);
  }
  for (const key of ['image_rights', 'editorial_consent', 'authorized_contact']) {
    if (b[key] !== true) throw new Error('Please confirm the required permissions before submitting.');
    data[key] = true;
  }
  data.publish_pricing = b.publish_pricing === true;
  Object.assign(data, commercialDeclaration(b));
  // Checking a box is recorded as pending until every upload and the final submission succeeds.
  data.referral_status = 'pending_completed_submission';
  return data;
}
async function readJson(path) {
  try {
    const result = await get(path, { access: 'private', token: blobToken(), useCache: false });
    return result?.stream ? JSON.parse(await new Response(result.stream).text()) : null;
  } catch (error) {
    if (/not found|404|does not exist/i.test(String(error.message))) return null;
    throw error;
  }
}
async function save(record, overwrite = true) {
  await put(details(record.id), JSON.stringify(record), { access: 'private', addRandomSuffix: false, allowOverwrite: overwrite, contentType: 'application/json', token: blobToken() });
}
async function photosFor(id) {
  const result = await list({ prefix: folder(id) + 'photo-', limit: 10, token: blobToken() });
  return (result.blobs || []).filter(b => new RegExp('^venue-submissions/' + id + '/photo-[0-6]\\.jpg$').test(b.pathname)).map(b => Number(b.pathname.match(/photo-(\d)/)[1])).sort();
}
function headers(res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
}
function configured() { return !!secret() && !!blobToken(); }
async function notify(record) {
  if (!process.env.RESEND_API_KEY) return false;
  const link = ORIGIN + '/venue-review.html?id=' + encodeURIComponent(record.id) + '&token=' + encodeURIComponent(tokenFor('review', record.id, 30 * 86400));
  const commercial = record.commercial?.status === 'accepted' ? record.commercial.schedule.rate + '% · ' + record.commercial.schedule.eligible_categories.map(x => x.label).join(', ') + ' · Accepted ' + record.commercial.accepted_at + ' · ' + record.commercial.version : 'Legacy editorial-only submission. No new commercial terms accepted.';
  const body = '<div style="font:16px/1.7 Arial,sans-serif;color:#302522;max-width:680px"><h1 style="font:36px Georgia,serif">A new place for the Edit.</h1><p><strong>' + html(record.venue_name) + '</strong><br>' + html([record.city, record.region, record.country].filter(Boolean).join(', ')) + '</p><p>' + html(record.experiences.join(' · ')) + '</p><p>Contact: ' + html(record.contact_name) + ' · ' + html(record.email) + '</p><p>Commercial record: ' + html(commercial) + '</p><p><a href="' + html(link) + '">Open the private venue submission</a></p><p>The profile has not been published. This private review link expires in 30 days.</p></div>';
  const result = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: 'Bearer ' + process.env.RESEND_API_KEY, 'Content-Type': 'application/json', 'Idempotency-Key': 'venue-profile-' + record.id }, body: JSON.stringify({ from: process.env.RESEND_FROM || 'LIA ARMONÍA <onboarding@resend.dev>', to: [process.env.PRIVATE_INQUIRY_TO || STUDIO], reply_to: record.email, subject: 'VENUE PROFILE READY FOR REVIEW · ' + record.venue_name, html: body, text: record.venue_name + '\n' + record.email + '\nCommercial record: ' + commercial + '\nPrivate review: ' + link + '\nThe profile awaits approval before publication.' }) });
  return result.ok;
}

async function acceptCompletedAgreement(record) {
  if (!record.commercial) return null; // Earlier submissions are never converted into agreements.
  let agreement = await readJson(agreementPath(record.id));
  if (!agreement) {
    agreement = { id: record.id, ...record.commercial, status: 'declaration_snapshot', declaration_recorded_at: new Date().toISOString(), acceptance_method: 'explicit_portal_checkbox_and_completed_submission', signatory_email_verified: false };
    try {
      await put(agreementPath(record.id), JSON.stringify(agreement), { access: 'private', addRandomSuffix: false, allowOverwrite: false, contentType: 'application/json', token: blobToken() });
    } catch (error) {
      const existing = await readJson(agreementPath(record.id));
      if (!existing) throw error;
      agreement = existing;
    }
  }
  if (agreement.snapshot_sha256 !== record.commercial.snapshot_sha256) throw new Error('Agreement snapshot mismatch');
  return agreement;
}
async function notifyPartner(record, agreement) {
  if (!process.env.RESEND_API_KEY || !agreement) return false;
  const response = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: 'Bearer ' + process.env.RESEND_API_KEY, 'Content-Type': 'application/json', 'Idempotency-Key': 'venue-profile-receipt-' + record.id }, body: JSON.stringify({ from: process.env.RESEND_FROM || 'LIA ARMONÍA <onboarding@resend.dev>', to: [record.email], reply_to: STUDIO, subject: 'Your venue partnership agreement · ' + record.venue_name, html: agreementHtml(agreement), text: agreementText(agreement) }) });
  return response.ok;
}

export function venueCommercialOffer(req, res) {
  headers(res);
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).json({ ok: false, error: 'Method not allowed' }); }
  try { return res.status(200).json({ ok: true, offer: venueOffer(req.query?.offer || '') }); }
  catch (error) { return res.status(error.status || 400).json({ ok: false, error: error.message }); }
}

export async function venueAgreementReceipt(req, res) {
  headers(res);
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).json({ ok: false, error: 'Method not allowed' }); }
  if (!configured()) return res.status(503).json({ ok: false, error: 'Agreement receipts are temporarily unavailable.' });
  const id = String(req.query?.id || ''), token = String(req.query?.token || '');
  if (!authorized('agreement', id, token)) return res.status(403).json({ ok: false, error: 'This private agreement link is invalid or expired.' });
  try {
    const agreement = await readJson(agreementPath(id));
    const record = await readJson(details(id));
    if (!agreement || agreement.status !== 'declaration_snapshot' || record?.status !== 'submitted' || record.commercial?.status !== 'accepted' || record.commercial?.snapshot_sha256 !== agreement.snapshot_sha256) return res.status(404).json({ ok: false, error: 'No completed agreement was found.' });
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="LIA_ARMONIA_Venue_Agreement_' + id + '.html"');
    res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'");
    return res.status(200).send(agreementHtml({ ...agreement, status: 'accepted', accepted_at: record.commercial.accepted_at }));
  } catch { return res.status(503).json({ ok: false, error: 'The private agreement could not be loaded. Please retry.' }); }
}

export default async function venueOnboarding(req, res) {
  headers(res);
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ ok: false, error: 'Method not allowed' }); }
  if (req.headers.origin && ![ORIGIN, 'https://liaarmonia.com'].includes(req.headers.origin)) return res.status(403).json({ ok: false, error: 'Origin not allowed' });
  if (!configured()) return res.status(503).json({ ok: false, error: 'The venue profile service is temporarily unavailable. Please email ' + STUDIO + '.' });
  let b;
  try { b = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}; } catch { return res.status(400).json({ ok: false, error: 'Invalid submission' }); }
  if (b.website_confirm) return res.status(200).json({ ok: true });
  try {
    if (b.action === 'create') {
      let data;
      try { data = validate(b); } catch (error) { return res.status(error.status || 400).json({ ok: false, error: error.message }); }
      const now = new Date().toISOString();
      const record = { id: randomUUID(), ...data, status: 'uploading', created_at: now, updated_at: now, permissions_version: 'venue-profile-2026-11-25-v2', permissions_accepted_at: now };
      await save(record, false);
      return res.status(200).json({ ok: true, submissionId: record.id, uploadToken: tokenFor('upload', record.id, 48 * 3600) });
    }
    if (!['photo', 'complete'].includes(b.action)) return res.status(400).json({ ok: false, error: 'Unknown action' });
    const id = String(b.id || '');
    if (!authorized('upload', id, b.uploadToken)) return res.status(403).json({ ok: false, error: 'Your submission session is invalid or expired.' });
    let record = await readJson(details(id));
    if (!record) return res.status(404).json({ ok: false, error: 'Submission not found' });
    if (b.action === 'photo') {
      if (record.status !== 'uploading') return res.status(409).json({ ok: false, error: 'This submission has already been finalized.' });
      const limit = record.image_layout === 'hero_and_gallery' ? record.image_filenames.length : 6;
      if (!Number.isInteger(b.number) || b.number < 0 || b.number >= limit) return res.status(400).json({ ok: false, error: 'Please check your main image and gallery selection.' });
      const base64 = String(b.base64 || '');
      if (base64.length > 1350000) return res.status(413).json({ ok: false, error: 'The compressed photograph is too large.' });
      if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64) || base64.length % 4 !== 0) return res.status(400).json({ ok: false, error: 'Invalid photograph.' });
      const bytes = Buffer.from(base64, 'base64');
      if (bytes.length < 100 || bytes.length > 1000000 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff || bytes.at(-2) !== 0xff || bytes.at(-1) !== 0xd9) return res.status(400).json({ ok: false, error: 'Please upload a JPEG, PNG or WebP photograph using the form.' });
      await put(folder(id) + 'photo-' + b.number + '.jpg', bytes, { access: 'private', addRandomSuffix: false, allowOverwrite: true, contentType: 'image/jpeg', token: blobToken() });
      return res.status(200).json({ ok: true, number: b.number });
    }
    if (!['uploading', 'submitted'].includes(record.status)) return res.status(409).json({ ok: false, error: 'This submission cannot be changed.' });
    const photos = await photosFor(id);
    const separateImages = record.image_layout === 'hero_and_gallery';
    if (photos.length < (separateImages ? 4 : 3) || photos.length > (separateImages ? 7 : 6) || (separateImages && photos.length !== record.image_filenames.length) || photos.some((number, index) => number !== index)) return res.status(400).json({ ok: false, error: separateImages ? 'Please finish uploading your main image and all 3–6 gallery images.' : 'Please finish uploading 3 to 6 photographs, including the lead image.' });
    const agreement = await acceptCompletedAgreement(record);
    const finalizedAt = record.status === 'submitted' ? record.submitted_at : new Date().toISOString();
    if (agreement) {
      record.commercial = { ...record.commercial, status: 'accepted', accepted_at: record.commercial.accepted_at || finalizedAt };
      record.referral_status = 'expressly_accepted_displayed_schedule';
    }
    if (record.status === 'uploading') {
      record = { ...record, status: 'submitted', image_count: photos.length, main_image_uploaded: true, gallery_image_count: photos.length - 1, submitted_at: finalizedAt, updated_at: finalizedAt };
      await save(record);
    }
    if (!record.notification_sent_at) {
      let sent = false;
      try { sent = await notify(record); } catch { console.error('Venue profile notification could not be confirmed', id); }
      if (sent) {
        record.notification_sent_at = new Date().toISOString();
        try { await save(record); } catch { console.error('Venue profile notification receipt could not be saved', id); }
      }
    }
    if (agreement && !record.partner_receipt_sent_at) {
      let sent = false;
      try { sent = await notifyPartner(record, { ...agreement, status: 'accepted', accepted_at: record.commercial.accepted_at }); } catch { console.error('Venue agreement receipt delivery could not be confirmed', id); }
      if (sent) {
        record.partner_receipt_sent_at = new Date().toISOString();
        try { await save(record); } catch { console.error('Venue agreement receipt delivery record could not be saved', id); }
      }
    }
    const receiptUrl = agreement ? '/api/atelier-inquiry?venueAgreement=1&id=' + encodeURIComponent(id) + '&token=' + encodeURIComponent(tokenFor('agreement', id, 30 * 86400)) : null;
    return res.status(200).json({ ok: true, stored: true, submissionId: id, emailPending: !record.notification_sent_at, agreementAccepted: !!agreement, receiptUrl, partnerReceiptPending: !!agreement && !record.partner_receipt_sent_at });
  } catch {
    console.error('Venue profile storage request failed');
    return res.status(503).json({ ok: false, error: 'We could not complete this step. Please retry, or email ' + STUDIO + '.' });
  }
}

export async function venueReview(req, res) {
  headers(res);
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).json({ ok: false, error: 'Method not allowed' }); }
  if (!configured()) return res.status(503).json({ ok: false, error: 'Private review is temporarily unavailable.' });
  const id = String(req.query?.id || ''), token = String(req.query?.token || '');
  if (!authorized('review', id, token)) return res.status(403).json({ ok: false, error: 'This private review link is invalid or expired.' });
  try {
    const record = await readJson(details(id));
    if (!record || record.status === 'uploading') return res.status(404).json({ ok: false, error: 'A completed venue submission was not found.' });
    if (req.query.action === 'photo') {
      const number = Number(req.query.number);
      if (!Number.isInteger(number) || number < 0 || number >= record.image_count) return res.status(400).json({ ok: false, error: 'Invalid photograph.' });
      const image = await get(folder(id) + 'photo-' + number + '.jpg', { access: 'private', token: blobToken(), useCache: false });
      if (!image?.stream) return res.status(404).end();
      res.setHeader('Content-Type', 'image/jpeg');
      return res.status(200).send(Buffer.from(await new Response(image.stream).arrayBuffer()));
    }
    const receiptUrl = record.commercial?.status === 'accepted' ? '/api/atelier-inquiry?venueAgreement=1&id=' + encodeURIComponent(id) + '&token=' + encodeURIComponent(tokenFor('agreement', id, 30 * 86400)) : null;
    return res.status(200).json({ ok: true, profile: record, receiptUrl });
  } catch {
    return res.status(503).json({ ok: false, error: 'This private submission could not be loaded. Please retry.' });
  }
}
