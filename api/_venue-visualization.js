import { get, put } from '@vercel/blob';
import { getSiteUrl, sendJson, stripeRequest } from './_design-edition-stripe.js';

export const VENUE_VISUALIZATION = {
  product: 'wedding_venue_visualization',
  priceCents: 29900,
  currency: 'usd',
  name: 'Wedding Venue Visualization',
  recordPath: sessionId => `venue-visualizations/${sessionId}/brief.json`
};

export { getSiteUrl, sendJson };

export async function verifyVenueSession(sessionId) {
  if (/^brief_[a-f0-9]{64}$/.test(sessionId || '')) {
    const brief = await readBrief(sessionId);
    if (!brief) throw Object.assign(new Error('Your private brief could not be found.'), { statusCode: 404 });
    return { id: sessionId, payment_status: brief.status === 'submitted' ? 'paid' : 'unpaid', customer_email: brief.customerEmail };
  }
  if (!sessionId || typeof sessionId !== 'string') {
    const error = new Error('Your private brief link is missing.');
    error.statusCode = 400;
    throw error;
  }
  const session = await stripeRequest(`/v1/checkout/sessions/${encodeURIComponent(sessionId)}`);
  if (session.payment_status !== 'paid' || session.metadata?.product !== VENUE_VISUALIZATION.product) {
    const error = new Error('This brief is available once payment has been confirmed.');
    error.statusCode = 402;
    throw error;
  }
  return { ...session, id: session.metadata?.brief_id || session.id };
}

export async function saveBrief(sessionId, payload) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    const error = new Error('Private file storage is not configured.');
    error.statusCode = 503;
    throw error;
  }
  await put(VENUE_VISUALIZATION.recordPath(sessionId), JSON.stringify(payload), {
    access: 'private', addRandomSuffix: false, allowOverwrite: true,
    contentType: 'application/json', token: process.env.BLOB_READ_WRITE_TOKEN
  });
}

export async function readBrief(sessionId) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return null;
  const pathname = VENUE_VISUALIZATION.recordPath(sessionId);
  const blob = await get(pathname, { access: 'private', useCache: false, token: process.env.BLOB_READ_WRITE_TOKEN });
  if (!blob) return null;
  return new Response(blob.stream).json();
}

export function briefUrl(req, sessionId) {
  return `${getSiteUrl(req)}/venue-visualization-brief.html?session_id=${encodeURIComponent(sessionId)}`;
}
