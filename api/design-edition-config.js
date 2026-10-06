import { publicDesignEditionConfig, sendJson } from './_design-edition-stripe.js';

export default function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return sendJson(res, 405, { error: 'Method not allowed.' });
  }

  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300');
  return sendJson(res, 200, publicDesignEditionConfig());
}
