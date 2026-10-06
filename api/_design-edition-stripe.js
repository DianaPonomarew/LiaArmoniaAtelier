import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const DESIGN_EDITION = {
  productSlug: 'burgundy-chartreuse',
  editionNumber: '01',
  priceUsd: 1200,
  priceLabel: '$1,200',
  productName: 'Burgundy + Chartreuse Ceremony Design Edition',
  fullTitle: 'Concept to Reality Burgundy + Chartreuse',
  subtitle: 'Ceremony Design Edition',
  label: 'Design Edition 01',
  studyLabel: 'Southern California coastal ceremony study',
  ctaLabel: 'Access the Ceremony Edition',
  heroImage: 'assets/design-edition-burgundy-chartreuse-center-aisle.png',
  gallery: [
    {
      src: 'assets/design-edition-burgundy-chartreuse-center-aisle.png',
      label: 'Aisle Composition'
    },
    {
      src: 'assets/design-edition-burgundy-chartreuse-chair-detail.png',
      label: 'Seating Detail'
    }
  ],
  includedSections: [
    'Ceremony Design Direction',
    'Spatial + Seating Logic',
    'Color + Material Language',
    'Floral + Candle Direction',
    'Verified Sourcing',
    'Scenic Fabrication Brief',
    'Ceremony Production Budget',
    'Production Handoff'
  ],
  scopeLine: 'This Design Edition covers the ceremony environment only. Reception, dinner and other wedding spaces are not included.',
  seo: {
    title: 'Burgundy + Chartreuse Ceremony Design Edition - LIA ARMONIA',
    description: 'Lia Armonia Design Edition 01: a ceremony-only Concept to Reality dossier with venue direction, seating logic, sourcing, scenic fabrication guidance and ceremony budget architecture.',
    ogTitle: 'Burgundy + Chartreuse Ceremony Design Edition - LIA ARMONIA',
    ogDescription: 'A ceremony-only Lia Armonia design dossier translated into practical production guidance.',
    ogImage: 'https://www.liaarmonia.com/assets/design-edition-burgundy-chartreuse-center-aisle.png'
  },
  priceEnv: 'STRIPE_PRICE_DESIGN_EDITION_01',
  notifyEnv: 'DESIGN_EDITION_NOTIFY_TO',
  paymentLinkId: 'plink_1UNezYQvMYgiBRBOGoAunLOr',
  paymentLinkUrl: 'https://buy.stripe.com/28E5kFbcwbBZ9lB0fNgfu06',
  protectedDir: path.join(process.cwd(), 'api', '_protected', 'design-editions', 'burgundy-chartreuse'),
  downloads: {
    'full-edition': {
      filename: 'LIA_ARMONIA_DESIGN_EDITION_01_BURGUNDY_CHARTREUSE.zip',
      contentType: 'application/zip'
    },
    dossier: {
      filename: '01_CONCEPT_TO_REALITY_DOSSIER.pdf',
      contentType: 'application/pdf'
    },
    'planner-brief': {
      filename: '02_PLANNER_PRODUCER_QUICK_BRIEF.pdf',
      contentType: 'application/pdf'
    },
    'digital-edition': {
      filename: '03_PRIVATE_DIGITAL_EDITION.html',
      contentType: 'text/html; charset=utf-8'
    }
  }
};

export function publicDesignEditionConfig() {
  return {
    products: {
      [DESIGN_EDITION.productSlug]: {
        slug: DESIGN_EDITION.productSlug,
        editionNumber: DESIGN_EDITION.editionNumber,
        label: DESIGN_EDITION.label,
        title: 'Burgundy + Chartreuse',
        fullTitle: DESIGN_EDITION.fullTitle,
        subtitle: DESIGN_EDITION.subtitle,
        studyLabel: DESIGN_EDITION.studyLabel,
        price: DESIGN_EDITION.priceUsd,
        priceLabel: DESIGN_EDITION.priceLabel,
        ctaLabel: DESIGN_EDITION.ctaLabel,
        scopeLine: DESIGN_EDITION.scopeLine,
        heroImage: DESIGN_EDITION.heroImage,
        gallery: DESIGN_EDITION.gallery,
        includedSections: DESIGN_EDITION.includedSections,
        seo: DESIGN_EDITION.seo
      }
    }
  };
}

export function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

export function getSiteUrl(req) {
  const configured = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || process.env.URL;
  if (configured) return configured.replace(/\/$/, '');
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'www.liaarmonia.com';
  return `${proto}://${host}`;
}

export function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(Buffer.from(chunk)));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export async function readJsonBody(req) {
  const raw = await readRawBody(req);
  if (!raw.length) return {};
  try {
    return JSON.parse(raw.toString('utf8'));
  } catch {
    const error = new Error('Invalid JSON body.');
    error.statusCode = 400;
    throw error;
  }
}

export async function stripeRequest(endpoint, { method = 'GET', body } = {}) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    const error = new Error('Stripe is not configured.');
    error.statusCode = 503;
    throw error;
  }

  const response = await fetch(`https://api.stripe.com${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Stripe-Version': '2026-08-26.dahlia',
      ...(body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {})
    },
    body
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload?.error?.message || 'Stripe request failed.');
    error.statusCode = response.status;
    error.stripe = payload;
    throw error;
  }
  return payload;
}

export async function verifyEditionSession(sessionId) {
  if (!sessionId || typeof sessionId !== 'string') {
    const error = new Error('Missing checkout session.');
    error.statusCode = 400;
    throw error;
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    const error = new Error('Purchase verification is not configured.');
    error.statusCode = 503;
    throw error;
  }

  const safeSessionId = encodeURIComponent(sessionId);
  const accessUrl = `https://cfgjluzj3mgsfn7c.private.blob.vercel-storage.com/design-editions/access/${safeSessionId}.json`;
  const response = await fetch(accessUrl, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store'
  });
  if (response.status === 404) {
    const error = new Error('This purchase is not paid or has not been confirmed yet.');
    error.statusCode = 402;
    throw error;
  }
  if (!response.ok) {
    const error = new Error('Purchase verification is temporarily unavailable.');
    error.statusCode = 502;
    throw error;
  }

  const record = await response.json();
  if (record.sessionId !== sessionId || record.paymentStatus !== 'paid'
      || record.paymentLink !== DESIGN_EDITION.paymentLinkId
      || record.productSlug !== DESIGN_EDITION.productSlug
      || record.editionNumber !== DESIGN_EDITION.editionNumber) {
    const error = new Error('This checkout session does not match this Design Edition.');
    error.statusCode = 403;
    throw error;
  }

  return { session: record };
}

export function verifyStripeSignature(rawBody, signatureHeader, endpointSecret) {
  if (!signatureHeader || !endpointSecret) return false;
  const parts = Object.fromEntries(signatureHeader.split(',').map(part => {
    const [key, value] = part.split('=');
    return [key, value];
  }));
  if (!parts.t || !parts.v1) return false;

  const signedPayload = `${parts.t}.${rawBody.toString('utf8')}`;
  const expected = crypto.createHmac('sha256', endpointSecret).update(signedPayload).digest('hex');
  const provided = Buffer.from(parts.v1, 'hex');
  const expectedBuffer = Buffer.from(expected, 'hex');
  return provided.length === expectedBuffer.length && crypto.timingSafeEqual(provided, expectedBuffer);
}

export function protectedFilePath(downloadKey) {
  const download = DESIGN_EDITION.downloads[downloadKey];
  if (!download) return null;
  const resolved = path.resolve(DESIGN_EDITION.protectedDir, download.filename);
  const protectedRoot = path.resolve(DESIGN_EDITION.protectedDir);
  if (!resolved.startsWith(protectedRoot)) return null;
  if (!fs.existsSync(resolved)) return null;
  return { ...download, path: resolved };
}

