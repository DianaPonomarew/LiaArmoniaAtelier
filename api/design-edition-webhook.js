import { DESIGN_EDITION, getSiteUrl, readRawBody, sendJson, verifyStripeSignature } from './_design-edition-stripe.js';

async function sendAccessEmail({ to, accessUrl }) {
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM || !to) return { skipped: true };

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM,
      to,
      subject: 'Your Lia Armonía Ceremony Design Edition',
      html: `
        <div style="font-family:Georgia,serif;color:#17110d;line-height:1.7">
          <p>Your Lia Armonía Burgundy + Chartreuse Ceremony Design Edition is ready.</p>
          <p><a href="${accessUrl}" style="color:#17110d">Open the Ceremony Edition</a></p>
          <p>The PDF dossier is the primary working file. You may share it with your planner, venue, florist and production vendors solely to execute one private ceremony.</p>
          <p>Please keep this access link private. For custom adaptation or production development, contact atelier@liaarmonia.com.</p>
        </div>
      `,
      text: `Your Lia Armonía Burgundy + Chartreuse Ceremony Design Edition is ready:\n${accessUrl}\n\nThe PDF dossier is the primary working file. You may share it with your planner, venue, florist and production vendors solely to execute one private ceremony.\n\nPlease keep this access link private. For custom adaptation or production development, contact atelier@liaarmonia.com.`
    })
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    const error = new Error(`Access email could not be sent. ${detail}`.trim());
    error.statusCode = response.status;
    throw error;
  }

  return { skipped: false };
}

async function sendOwnerNotification({ buyerEmail, accessUrl, sessionId }) {
  const to = process.env[DESIGN_EDITION.notifyEnv];
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM || !to) return { skipped: true };

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM,
      to,
      subject: 'New Ceremony Design Edition purchase — Burgundy + Chartreuse',
      html: `
        <div style="font-family:Arial,sans-serif;color:#17110d;line-height:1.7">
          <h1 style="font-family:Georgia,serif;font-weight:400">New Ceremony Design Edition purchase</h1>
          <p><strong>Product:</strong> Design Edition 01 — Burgundy + Chartreuse Ceremony Edition</p>
          <p><strong>Price:</strong> ${DESIGN_EDITION.priceLabel}</p>
          <p><strong>Buyer:</strong> ${buyerEmail || 'Not provided'}</p>
          <p><strong>Stripe session:</strong> ${sessionId}</p>
          <p><a href="${accessUrl}" style="color:#17110d">Customer access link</a></p>
        </div>
      `,
      text: [
        'New Ceremony Design Edition purchase',
        'Product: Design Edition 01 — Burgundy + Chartreuse Ceremony Edition',
        `Price: ${DESIGN_EDITION.priceLabel}`,
        `Buyer: ${buyerEmail || 'Not provided'}`,
        `Stripe session: ${sessionId}`,
        `Customer access link: ${accessUrl}`
      ].join('\n')
    })
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    const error = new Error(`Owner notification could not be sent. ${detail}`.trim());
    error.statusCode = response.status;
    throw error;
  }

  return { skipped: false };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendJson(res, 405, { error: 'Method not allowed.' });
  }

  try {
    const raw = await readRawBody(req);
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return sendJson(res, 503, { error: 'Stripe webhook is not configured.' });
    }
    if (!verifyStripeSignature(raw, req.headers['stripe-signature'], webhookSecret)) {
      return sendJson(res, 400, { error: 'Invalid Stripe signature.' });
    }

    const event = JSON.parse(raw.toString('utf8'));
    const paidCheckoutEvents = new Set([
      'checkout.session.completed',
      'checkout.session.async_payment_succeeded'
    ]);
    if (paidCheckoutEvents.has(event.type)) {
      const session = event.data?.object;
      const isPaidEdition = session?.payment_status === 'paid'
        && session?.metadata?.productSlug === DESIGN_EDITION.productSlug
        && session?.metadata?.editionNumber === DESIGN_EDITION.editionNumber;
      if (isPaidEdition) {
        const siteUrl = getSiteUrl(req);
        const accessUrl = `${siteUrl}/design-editions/burgundy-chartreuse/access?session_id=${encodeURIComponent(session.id)}`;
        const buyerEmail = session.customer_details?.email || session.customer_email;
        await sendAccessEmail({ to: buyerEmail, accessUrl });
        await sendOwnerNotification({ buyerEmail, accessUrl, sessionId: session.id });
      }
    }

    return sendJson(res, 200, { received: true });
  } catch (error) {
    return sendJson(res, 400, { error: error.message || 'Webhook could not be processed.' });
  }
}
