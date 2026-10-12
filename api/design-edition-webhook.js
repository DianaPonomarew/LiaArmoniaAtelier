import { DESIGN_EDITION, readRawBody, sendJson, verifyStripeSignature } from './_design-edition-stripe.js';
import { put } from '@vercel/blob';
import { VENUE_VISUALIZATION } from './_venue-visualization.js';
import { confirmPaidVenueBrief } from './venue-visualization-brief.js';

export const config = { api: { bodyParser: false } };

async function grantEditionAccess(session) {
  const record = {
    sessionId: session.id,
    paymentStatus: session.payment_status,
    paymentLink: session.payment_link,
    productSlug: DESIGN_EDITION.productSlug,
    editionNumber: DESIGN_EDITION.editionNumber,
    paidAt: new Date().toISOString()
  };
  await put(`design-editions/access/${session.id}.json`, JSON.stringify(record), {
    access: 'private',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json',
    token: process.env.BLOB_READ_WRITE_TOKEN
  });
  return record;
}

async function recordVenueVisualizationPayment(session) {
  await put(`venue-visualizations/${session.id}/payment.json`, JSON.stringify({
    sessionId: session.id,
    paymentStatus: session.payment_status,
    product: VENUE_VISUALIZATION.product,
    paidAt: new Date().toISOString()
  }), { access: 'private', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json', token: process.env.BLOB_READ_WRITE_TOKEN });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendJson(res, 405, { error: 'Method not allowed.' });
  }

  try {
    const raw = await readRawBody(req);
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return sendJson(res, 503, { error: 'Stripe webhook is not configured.' });
    }
    if (!verifyStripeSignature(raw, req.headers['stripe-signature'], webhookSecret)) {
      return sendJson(res, 400, { error: 'Invalid Stripe signature.' });
    }

    const event = JSON.parse(raw.toString('utf8'));
    const paidCheckoutEvents = new Set([
      'checkout.session.completed',
      'checkout.session.async_payment_succeeded'
    ]);
    if (paidCheckoutEvents.has(event.type)) {
      const session = event.data?.object;
      const isPaidEdition = session?.payment_status === 'paid'
        && session?.payment_link === DESIGN_EDITION.paymentLinkId
        && session?.metadata?.product === 'design_edition_01'
        && session?.metadata?.edition === 'burgundy_chartreuse';
      if (isPaidEdition) {
        await grantEditionAccess(session);
      }
      if (session?.payment_status === 'paid' && session?.metadata?.product === VENUE_VISUALIZATION.product) {
        await recordVenueVisualizationPayment(session);
        await confirmPaidVenueBrief(session, req);
      }
    }

    return sendJson(res, 200, { received: true });
  } catch (error) {
    return sendJson(res, 400, { error: error.message || 'Webhook could not be processed.' });
  }
}
