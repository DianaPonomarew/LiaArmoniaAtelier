import { VENUE_VISUALIZATION, getSiteUrl, sendJson, verifyVenueSession, readBrief, saveBrief } from './_venue-visualization.js';
import { stripeRequest, readJsonBody } from './_design-edition-stripe.js';
import { list } from '@vercel/blob';
import { BOOKING_TERMS_VERSION, BOOKING_TERMS, BOOKING_PROVIDER, EARLY_START_NOTICE } from '../venue-visualization-terms.js';

export default async function handler(req, res) {
  if (req.method === 'GET') return handleSuccess(req, res);
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
      success_url: `${site}/venue-visualization-success?session_id={CHECKOUT_SESSION_ID}`,
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

// The success page shares the checkout endpoint to stay within Hobby plan limits.

async function handleSuccess(req, res) {
  res.setHeader('Cache-Control', 'private, no-store, max-age=0');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.setHeader('Referrer-Policy', 'no-referrer');

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.statusCode = 405;
    return res.end('Method not allowed.');
  }

  const url = new URL(req.url, 'https://www.liaarmonia.com');
  const sessionId = url.searchParams.get('session_id') || '';
  if (!/^cs_(?:live|test)_[A-Za-z0-9]+$/.test(sessionId)) {
    res.statusCode = 400;
    return res.end('A valid checkout session is required.');
  }

  try {
    const session = await stripeRequest('/v1/checkout/sessions/' + encodeURIComponent(sessionId));
    if (session.metadata?.product !== VENUE_VISUALIZATION.product) {
      res.statusCode = 404;
      return res.end('This checkout does not match the requested service.');
    }
    if (session.payment_status !== 'paid') {
      res.statusCode = 302;
      res.setHeader('Location', '/venue-visualization-brief.html?session_id=' + encodeURIComponent(sessionId));
      return res.end();
    }

    const briefLink = '/venue-visualization-brief.html?session_id=' + encodeURIComponent(sessionId);
    const purchase = JSON.stringify({
      event: 'lia_venue_visualization_purchase',
      transaction_id: String(session.payment_intent || session.id),
      currency: 'USD',
      value: 299,
      product: 'Wedding Venue Visualization'
    }).replace(/</g, '\\u003c');

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.statusCode = 200;
    return res.end(`<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><meta name="theme-color" content="#201311">
<meta name="referrer" content="no-referrer">
<title>Booking Confirmed — LIA ARMONÍA</title>
<link rel="icon" href="/assets/favicon.png">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500&family=Inter:wght@300;400;500&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box}body{background:#201311;color:#f5eee7;margin:0;min-height:100vh;font-family:Inter,Arial,sans-serif}
body:before{content:"";pointer-events:none;position:fixed;inset:0;background:radial-gradient(ellipse at 50% 22%,rgba(108,43,57,.26),transparent 67%)}
header{position:relative;padding:32px 7vw}.brand{font-family:"Cormorant Garamond",Georgia,serif;letter-spacing:.24em;font-size:clamp(20px,3vw,29px);text-decoration:none;color:inherit}
main{position:relative;text-align:center;max-width:780px;margin:7vh auto;padding:32px 24px 70px}
.eyebrow{color:#c9aaa1;font-size:11px;letter-spacing:.22em;text-transform:uppercase}
h1{font:400 clamp(55px,9vw,104px)/.9 "Cormorant Garamond",Georgia,serif;margin:24px 0 30px}
h1 em{font-weight:300;color:#d5a6ab}.rule{height:1px;width:64px;margin:28px auto;background:#a7877f}
.lead{font-size:16px;line-height:1.85;color:#eadbd3;max-width:560px;margin:0 auto 26px}
.details{max-width:550px;margin:40px auto;padding:25px 30px;border:1px solid rgba(245,238,231,.2);text-align:left}
.details h2{font:400 32px "Cormorant Garamond",Georgia,serif;margin:0 0 12px}.details p{color:#ddcfc8;font-size:13px;line-height:1.8}
.cta{display:inline-block;margin:12px auto 0;padding:17px 25px;background:#713044;color:#fff;text-decoration:none;font-size:11px;letter-spacing:.14em;text-transform:uppercase}
footer{font-size:11px;color:#bfa9a0;margin-top:54px}
@media(max-width:600px){header{padding:22px 6vw}main{margin-top:3vh}h1{font-size:62px}.details{padding:20px}}
</style></head><body>
<header><a href="/" class="brand">LIA ARMONÍA</a></header>
<main><div class="eyebrow">Wedding Design Atelier · Private Commission</div>
<h1>Your vision,<br><em>in motion.</em></h1>
<div class="rule"></div>
<p class="lead">Thank you. Your $299 Wedding Venue Visualization payment is confirmed. Your personal design brief has been received.</p>
<div class="details"><h2>What happens next</h2>
<p>Our atelier will review your venue and references. Your five design images will arrive within seven calendar days after confirmed payment and receipt of a complete brief.</p>
<p>Your two cinematic videos follow once you approve the image direction. We’ll contact you using the details supplied at checkout.</p>
</div>
<a class="cta" href="${briefLink}">View my private design brief</a>
<footer>DESIGNED WITH INTENTION · LIA ARMONÍA</footer></main>
<script>window.dataLayer=window.dataLayer||[];window.dataLayer.push(${purchase});</script>
</body></html>`);
  } catch (error) {
    res.statusCode = error.statusCode || 503;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.end('Your payment confirmation could not be loaded. Please return to your order link or contact atelier@liaarmonia.com.');
  }
}
