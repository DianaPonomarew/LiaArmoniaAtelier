import { readProtectedFile, sendJson, verifyEditionSession } from './_design-edition-stripe.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return sendJson(res, 405, { error: 'Method not allowed.' });
  }

  try {
    const url = new URL(req.url, 'https://www.liaarmonia.com');
    const sessionId = req.query?.session_id || url.searchParams.get('session_id');
    const asset = req.query?.asset || url.searchParams.get('asset');
    await verifyEditionSession(sessionId);
    const file = await readProtectedFile(asset);
    if (!file) return sendJson(res, 404, { error: 'Download not found.' });
    res.statusCode = 200;
    res.setHeader('Content-Type', file.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    res.setHeader('Cache-Control', 'private, no-store');
    res.end(file.body);
  } catch (error) {
    return sendJson(res, error.statusCode || 500, { error: error.message || 'Download could not be verified.' });
  }
}
