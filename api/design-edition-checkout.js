import { DESIGN_EDITION, getSiteUrl, readJsonBody, sendJson, stripeRequest } from './_design-edition-stripe.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendJson(res, 405, { error: 'Method not allowed.' });
  }

  try {
    const priceId = process.env[DESIGN_EDITION.priceEnv];
    if (!priceId) {
      return sendJson(res, 503, { error: 'Stripe price is not configured yet.' });
    }

    const body = await readJsonBody(req);
    const siteUrl = getSiteUrl(req);
    const params = new URLSearchParams();
    params.set('mode', 'payment');
    params.set('line_items[0][price]', priceId);
    params.set('line_items[0][quantity]', '1');
    params.set('allow_promotion_codes', 'true');
    params.set('success_url', `${siteUrl}/design-editions/burgundy-chartreuse/access?session_id={CHECKOUT_SESSION_ID}`);
    params.set('cancel_url', `${siteUrl}/design-editions/cancel?edition=${DESIGN_EDITION.productSlug}`);
    params.set('client_reference_id', `${DESIGN_EDITION.productSlug}-${DESIGN_EDITION.editionNumber}`);
    params.set('metadata[productSlug]', DESIGN_EDITION.productSlug);
    params.set('metadata[editionNumber]', DESIGN_EDITION.editionNumber);
    params.set('metadata[productType]', 'design-edition');
    params.set('metadata[scope]', 'ceremony-only');
    params.set('metadata[priceUsd]', String(DESIGN_EDITION.priceUsd));
    params.set('integration_identifier', 'lia_design_editions_burgundy_chartreuse_mrqtlena');
    if (body.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(body.email))) {
      params.set('customer_email', String(body.email).trim());
    }

    const session = await stripeRequest('/v1/checkout/sessions', {
      method: 'POST',
      body: params
    });

    return sendJson(res, 200, { url: session.url, sessionId: session.id });
  } catch (error) {
    return sendJson(res, error.statusCode || 500, { error: error.message || 'Could not create checkout.' });
  }
}
