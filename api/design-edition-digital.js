import { readProtectedFile, verifyEditionSession } from './_design-edition-stripe.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.statusCode = 405;
    res.end('Method not allowed.');
    return;
  }

  try {
    const url = new URL(req.url, 'https://www.liaarmonia.com');
    const sessionId = req.query?.session_id || url.searchParams.get('session_id');
    await verifyEditionSession(sessionId);
    const file = await readProtectedFile('digital-edition');
    if (!file) {
      res.statusCode = 404;
      res.end('Digital Edition not found.');
      return;
    }
    res.statusCode = 200;
    res.setHeader('Content-Type', file.contentType);
    res.setHeader('Cache-Control', 'private, no-store');
    res.end(file.body);
  } catch (error) {
    res.statusCode = error.statusCode || 500;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end(error.message || 'Digital Edition could not be verified.');
  }
}
