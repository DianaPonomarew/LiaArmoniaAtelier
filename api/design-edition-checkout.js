import { DESIGN_EDITION, sendJson } from './_design-edition-stripe.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendJson(res, 405, { error: 'Method not allowed.' });
  }

  return sendJson(res, 200, { url: DESIGN_EDITION.paymentLinkUrl });
}

