import { put } from '@vercel/blob';
import { randomUUID } from 'node:crypto';

const STUDIO_EMAIL = 'atelier@liaarmonia.com';

function clean(value, maxLength = 1500) {
  return String(value ?? '').trim().slice(0, maxLength);
}

function escapeHtml(value) {
  return clean(value, 2000).replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[character]));
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed.' });
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  if (clean(body.website)) return res.status(200).json({ ok: true }); // spam honeypot

  const name = clean(body.name, 80);
  const rating = Number(body.rating);
  const comment = clean(body.comment, 1200);
  const sharePermission = body.sharePermission === true;
  const product = clean(body.product || 'Cinematic Save the Date', 80);

  if (!name || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({ ok: false, error: 'Please add your name and choose a star rating.' });
  }
  if (String(body.name || '').length > 80 || String(body.comment || '').length > 1200) {
    return res.status(400).json({ ok: false, error: 'Your response is too long.' });
  }

  const resendKey = process.env.RESEND_API_KEY;
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (!resendKey || !blobToken) {
    return res.status(503).json({ ok: false, error: 'Feedback service is temporarily unavailable. Please email atelier@liaarmonia.com.' });
  }

  const id = randomUUID();
  const submission = {
    id, receivedAt: new Date().toISOString(), name, rating, comment,
    sharePermission, product
  };

  try {
    // Back up every real submission privately before sending the email notification.
    await put(`atelier-feedback/${submission.receivedAt.slice(0, 10)}/${id}.json`,
      JSON.stringify(submission), {
        access: 'private', addRandomSuffix: false, allowOverwrite: false,
        contentType: 'application/json', token: blobToken
      });
  } catch (error) {
    console.error('Feedback backup failed:', error.message);
    return res.status(503).json({ ok: false, error: 'Could not save your feedback. Please try again.' });
  }

  const permissionLabel = sharePermission ? 'YES — may share as testimonial' : 'NO — private feedback only';
  const html = `<div style="background:#f6f2eb;padding:32px;font:15px/1.7 Arial,sans-serif;color:#281b1b"><div style="margin:auto;max-width:620px;background:#fff;padding:32px;border:1px solid #dfd5c9"><p style="font-size:11px;letter-spacing:.25em;color:#6a2833">LIA ARMONÍA · DIGITAL ATELIER</p><h1 style="font:normal 32px Georgia,serif">New client feedback</h1><p><b>From:</b> ${escapeHtml(name)}</p><p><b>Service:</b> ${escapeHtml(product)}</p><p><b>Rating:</b> ${rating} / 5 stars</p><p><b>Review:</b><br>${escapeHtml(comment || '(No written comment)').replace(/\n/g, '<br>')}</p><p><b>Permission to publish:</b><br>${escapeHtml(permissionLabel)}</p><hr><p style="font-size:11px;color:#867b75">Received ${escapeHtml(submission.receivedAt)}<br>Private backup ID: ${id}</p></div></div>`;
  const plain = [
    'NEW CLIENT FEEDBACK — LIA ARMONÍA', 'From: ' + name,
    'Service: ' + product, 'Rating: ' + rating + '/5',
    'Review: ' + (comment || '(No written comment)'),
    'Publish permission: ' + permissionLabel,
    'Submission ID: ' + id
  ].join('\n\n');

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': `atelier-feedback-${id}`
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM || 'LIA ARMONÍA <atelier@liaarmonia.com>',
        to: [STUDIO_EMAIL],
        subject: `NEW FEEDBACK · ${rating}/5 · ${name}`,
        html, text: plain
      })
    });
    if (!response.ok) throw new Error('Resend status: ' + response.status);
  } catch (error) {
    console.error('Feedback email notification failed:', error.message);
    return res.status(502).json({
      ok: false,
      error: 'Your feedback was saved, but the email notification could not be confirmed. Please email atelier@liaarmonia.com.'
    });
  }

  return res.status(200).json({ ok: true });
}
