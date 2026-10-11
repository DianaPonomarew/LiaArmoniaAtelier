import { VENUE_VISUALIZATION, getSiteUrl, sendJson } from './_venue-visualization.js';
import { stripeRequest } from './_design-edition-stripe.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return sendJson(res, 405, { error: 'Method not allowed.' }); }
  try {
    const site = getSiteUrl(req);
    const params = new URLSearchParams({
      mode: 'payment',
      success_url: `${site}/venue-visualization-brief.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${site}/venue-visualization.html`,
      'line_items[0][price_data][currency]': VENUE_VISUALIZATION.currency,
      'line_items[0][price_data][unit_amount]': String(VENUE_VISUALIZATION.priceCents),
      'line_items[0][price_data][product_data][name]': VENUE_VISUALIZATION.name,
      'line_items[0][quantity]': '1',
      'metadata[product]': VENUE_VISUALIZATION.product,
      'payment_intent_data[metadata][product]': VENUE_VISUALIZATION.product,
      customer_creation: 'always',
      integration_identifier: 'lia_venue_visualization_qxjrwkde'
    });
    const session = await stripeRequest('/v1/checkout/sessions', { method: 'POST', body: params });
    return sendJson(res, 200, { url: session.url });
  } catch (error) { return sendJson(res, error.statusCode || 500, { error: error.message || 'Checkout could not be opened.' }); }
}
