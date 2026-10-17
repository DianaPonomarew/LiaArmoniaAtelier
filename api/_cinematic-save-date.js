import { put } from '@vercel/blob';

export const CINEMATIC_LINK_ID = 'plink_1URYBZQvMYgiBRBOa57FgAWP';
const studioEmail = 'atelier@liaarmonia.com';
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

async function notify(message, idempotencyKey) {
  if (!process.env.RESEND_API_KEY) throw new Error('Email service is not configured.');
  const response = await fetch('https://api.resend.com/emails', {
    method:'POST',
    headers:{
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type':'application/json',
      'Idempotency-Key':idempotencyKey
    },
    body:JSON.stringify(message)
  });
  if (!response.ok) throw new Error(`Save the Date email delivery failed: ${response.status}`);
}

export async function confirmCinematicSaveDateOrder(session) {
  if (session?.payment_status !== 'paid' || session.metadata?.product !== 'cinematic_save_the_date') return false;
  const isLegacyLink = session.payment_link === CINEMATIC_LINK_ID;
  if (session.payment_link && !isLegacyLink) return false;
  const details = isLegacyLink
    ? Object.fromEntries((session.custom_fields || []).map(item => [item.key, item.dropdown?.value || item.text?.value || '']))
    : { design:session.metadata.design, names:session.metadata.names, date:session.metadata.date, title:session.metadata.title, notes:session.metadata.notes, phone:session.metadata.phone, email:session.metadata.email };
  if (!['coastaldrive','yacht'].includes(details.design) || !details.names || !details.date) {
    throw new Error('Paid Save the Date order is missing personalization details.');
  }
  const client = session.customer_details?.email || session.customer_email || details.email || '';
  const record = {
    sessionId:session.id, paymentStatus:'paid', product:'cinematic_save_the_date',
    design:details.design, coupleNames:details.names, weddingDate:details.date,
    headline: details.title || 'Save the Date', additionalNotes: details.notes || '', customerPhone: details.phone || '',
    customerEmail:client, paidAt:new Date().toISOString(),
    fulfillment:'awaiting_manual_render'
  };
  if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error('Private order storage is not configured.');
  await put(`cinematic-save-the-date/orders/${session.id}.json`, JSON.stringify(record), {
    access:'private', addRandomSuffix:false, allowOverwrite:true,
    contentType:'application/json', token:process.env.BLOB_READ_WRITE_TOKEN
  });
  const from = process.env.RESEND_FROM || 'Lia Armonia <atelier@liaarmonia.com>';
  const summary = `<p><b>Film:</b> ${escapeHtml(details.design === 'yacht'?'The Yacht':'The Coastal Drive')}<br><b>Names:</b> ${escapeHtml(details.names)}<br><b>Wedding date:</b> ${escapeHtml(details.date)}<br><b>Text:</b> ${escapeHtml(details.title || 'Save the Date')}<br><b>Notes:</b> ${escapeHtml(details.notes || 'None')}<br><b>Phone:</b> ${escapeHtml(details.phone || 'Not supplied')}</p>`;
  await notify({
    from,to:[studioEmail], ...(client?{reply_to:client}:{}),
    subject:'Paid Cinematic Save the Date · $29',
    html:`<div style="font:15px/1.7 Arial,sans-serif;max-width:620px;margin:auto"><h1>New paid Save the Date order</h1>${summary}<p>Customer email: ${escapeHtml(client)}</p><p>Stripe session: ${escapeHtml(session.id)}</p><p>Deliver personalized vertical MP4 by email within 48 hours.</p></div>`
  },`cinematic-owner-${session.id}`);
  if (client) await notify({
    from,to:[client],reply_to:studioEmail,
    subject:'Your Cinematic Save the Date — LIA ARMONÍA',
    html:`<div style="font:15px/1.7 Arial,sans-serif;max-width:620px;margin:auto"><p style="letter-spacing:.2em">LIA ARMONÍA</p><h1 style="font:400 42px Georgia,serif">Your film is with the atelier.</h1><p>Thank you for your order. We are preparing your personalized Save the Date.</p>${summary}<p>Your vertical MP4 film will be delivered to this email within 48 hours of confirmed payment and complete personalization details.</p><p>Noticed a spelling mistake? Reply to this email as soon as possible.</p><p>LIA ARMONÍA · Digital Atelier</p></div>`
  },`cinematic-client-${session.id}`);
  return true;
}
