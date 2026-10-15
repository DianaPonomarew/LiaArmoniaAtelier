import { VENUE_VISUALIZATION, getSiteUrl, sendJson, verifyVenueSession, readBrief, saveBrief } from './_venue-visualization.js';
import { stripeRequest, readJsonBody } from './_design-edition-stripe.js';
import { list } from '@vercel/blob';
import { BOOKING_TERMS_VERSION, BOOKING_TERMS, BOOKING_PROVIDER, EARLY_START_NOTICE } from '../venue-visualization-terms.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return sendJson(res, 405, { error: 'Method not allowed.' }); }
  try {
    const body = await readJsonBody(req);
    const owner = await verifyVenueSession(body.sessionId);
    const brief = await readBrief(owner.id);
    if (!brief || brief.status === 'submitted') return sendJson(res, 409, { error: 'This brief has already been confirmed.' });
    if (body.termsVersion !== BOOKING_TERMS_VERSION || body.termsAccepted !== true || body.earlyStart !== true) return sendJson(res, 400, { error: 'Please review the booking conditions and expressly request the early production start before payment.' });
    const required = ['venue_area', 'wedding_date', 'guest_count', 'atmosphere_colours', 'include'];
    if (required.some(key => !String(brief[key] || '').trim())) return sendJson(res, 400, { error: 'Please complete the five questions before continuing.' });
    const files = brief.files || [];
    if (files.filter(file => file.kind === 'venue').length < 3) return sendJson(res, 400, { error: 'Please add at least three venue photos.' });
    const limits = { venue: 10, video: 2, plan: 1, inspiration: 20 };
    for (const [kind, limit] of Object.entries(limits)) {
      if (files.filter(file => file.kind === kind).length > limit) return sendJson(res, 400, { error: 'Too many files in this category.' });
    }
    for (const file of files) {
      if (!limits[file.kind] || !file.pathname?.startsWith(`venue-visualizations/${owner.id}/${file.kind}/`)) return sendJson(res, 400, { error: 'A file does not belong to this brief.' });
      const found = await list({ prefix: file.pathname, limit: 1 });
      if (!found.blobs.some(blob => blob.pathname === file.pathname)) return sendJson(res, 400, { error: 'Please finish every upload before paying.' });
    }
    const termsAcceptance = brief.termsAcceptance?.version === BOOKING_TERMS_VERSION ? brief.termsAcceptance : {
      version: BOOKING_TERMS_VERSION,
      acceptedAt: new Date().toISOString(),
      earlyStartRequested: true,
      earlyStartNotice: EARLY_START_NOTICE,
      provider: BOOKING_PROVIDER,
      sections: BOOKING_TERMS
    };
    if (brief.checkoutSessionId) {
      const previous = await stripeRequest(`/v1/checkout/sessions/${encodeURIComponent(brief.checkoutSessionId)}`);
      if (previous.status === 'open') {
        await saveBrief(owner.id, { ...brief, termsAcceptance });
        return sendJson(res, 200, { url: previous.url });
      }
      if (previous.status === 'complete') return sendJson(res, 409, { error: 'Your payment is already being confirmed.' });
    }
    const site = getSiteUrl(req);
    const params = new URLSearchParams({
      mode: 'payment',
      'managed_payments[enabled]': 'false',
      'phone_number_collection[enabled]': 'true',
      'custom_text[submit][message]': 'Please provide your mobile number so the atelier can deliver your design images and videos via WhatsApp or send a download link by SMS.',
      success_url: `${site}/venue-visualization-brief.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${site}/venue-visualization-brief.html?session_id=${encodeURIComponent(owner.id)}`,
      'line_items[0][price_data][currency]': VENUE_VISUALIZATION.currency,
      'line_items[0][price_data][unit_amount]': String(VENUE_VISUALIZATION.priceCents),
      'line_items[0][price_data][product_data][name]': VENUE_VISUALIZATION.name,
      'line_items[0][quantity]': '1',
      'metadata[product]': VENUE_VISUALIZATION.product,
      'metadata[brief_id]': owner.id,
      'metadata[terms_version]': BOOKING_TERMS_VERSION,
      client_reference_id: owner.id,
      'payment_intent_data[metadata][product]': VENUE_VISUALIZATION.product,
      customer_creation: 'always',
      integration_identifier: 'lia_venue_visualization_qxjrwkde'
    });
    const session = await stripeRequest('/v1/checkout/sessions', { method: 'POST', body: params });
    await saveBrief(owner.id, { ...brief, termsAcceptance, status: 'awaiting_payment', checkoutSessionId: session.id });
    return sendJson(res, 200, { url: session.url });
  } catch (error) { return sendJson(res, error.statusCode || 500, { error: error.message || 'Checkout could not be opened.' }); }
}
