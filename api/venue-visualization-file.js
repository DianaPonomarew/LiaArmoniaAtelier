import { list } from '@vercel/blob';
import { verifyVenueSession, sendJson } from './_venue-visualization.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return sendJson(res, 405, { error: 'Method not allowed.' }); }
  try {
    const url = new URL(req.url, 'https://www.liaarmonia.com');
    const sessionId = req.query?.session_id || url.searchParams.get('session_id');
    const pathname = req.query?.path || url.searchParams.get('path');
    const session = await verifyVenueSession(sessionId);
    const prefix = `venue-visualizations/${session.id}/`;
    if (!pathname || typeof pathname !== 'string' || !pathname.startsWith(prefix)) return sendJson(res, 403, { error: 'This file does not belong to your brief.' });
    const found = await list({ prefix: pathname, limit: 1, token: process.env.BLOB_READ_WRITE_TOKEN });
    const blob = found.blobs?.find(item => item.pathname === pathname);
    if (!blob) return sendJson(res, 404, { error: 'The file could not be found.' });
    const response = await fetch(blob.url, { headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` } });
    if (!response.ok) return sendJson(res, response.status === 404 ? 404 : 502, { error: 'The file could not be loaded.' });
    res.statusCode = 200;
    res.setHeader('Content-Type', response.headers.get('content-type') || 'application/octet-stream');
    const disposition = url.searchParams.get('preview') === '1' && response.headers.get('content-type')?.startsWith('image/') ? 'inline' : 'attachment';
    res.setHeader('Content-Disposition', `${disposition}; filename="${(pathname.split('/').pop() || 'file').replace(/["\\]/g, '')}"`);
    res.setHeader('Cache-Control', 'private, no-store');
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) { return sendJson(res, error.statusCode || 500, { error: error.message || 'The file could not be loaded.' }); }
}
