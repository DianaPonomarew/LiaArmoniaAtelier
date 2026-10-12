import { handleUpload } from '@vercel/blob/client';
import { verifyVenueSession, readBrief, sendJson } from './_venue-visualization.js';
import { readJsonBody } from './_design-edition-stripe.js';

const imageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
const videoTypes = ['video/mp4', 'video/quicktime', 'video/webm'];
const planTypes = ['application/pdf', ...imageTypes];

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return sendJson(res, 405, { error: 'Method not allowed.' }); }
  try {
    const body = await readJsonBody(req);
    const result = await handleUpload({
      body, request: req,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const payload = JSON.parse(clientPayload || '{}');
        const session = await verifyVenueSession(payload.sessionId);
        const brief = await readBrief(session.id);
        if (brief?.status !== 'draft') throw new Error('Files cannot be changed after your brief is sent for payment.');
        const kind = payload.kind;
        if (!['venue', 'video', 'plan', 'inspiration'].includes(kind)) throw new Error('This upload category is not supported.');
        const prefix = `venue-visualizations/${session.id}/${kind}/`;
        if (!pathname.startsWith(prefix)) throw new Error('This file cannot be attached to this order.');
        const allowedContentTypes = kind === 'video' ? videoTypes : kind === 'plan' ? planTypes : imageTypes;
        return {
          allowedContentTypes,
          maximumSizeInBytes: kind === 'video' ? 200 * 1024 * 1024 : 20 * 1024 * 1024,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ sessionId: session.id, kind })
        };
      }
    });
    return sendJson(res, 200, result);
  } catch (error) { return sendJson(res, error.statusCode || 400, { error: error.message || 'Upload could not be prepared.' }); }
}
