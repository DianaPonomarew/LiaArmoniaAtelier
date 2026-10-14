import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

if (process.env.VERCEL_ENV !== 'production') {
  console.log('Booking email smoke test: skipped outside production.');
  process.exit(0);
}
assert.ok(process.env.RESEND_API_KEY?.trim(), 'RESEND_API_KEY is missing');
assert.match(process.env.RESEND_FROM || '', /<atelier@liaarmonia\.com>/, 'Unexpected booking sender');
const recipient = 'atelier@liaarmonia.com';
const briefId = 'brief_0e32865a143e95449077dd2766f88d92601e25d0acef1f07cffface6e8696dcc';
const sessionId = 'qa_booking_mail_20261015';
globalThis.bookingSmokeRecords = new Map();
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === '@vercel/blob') return { url: 'mock:booking-email-storage', shortCircuit: true };
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url !== 'mock:booking-email-storage') return nextLoad(url, context);
    return { format: 'module', shortCircuit: true, source: `
      export async function put(path, body) { globalThis.bookingSmokeRecords.set(path, body); }
      export async function get(path) { const body = globalThis.bookingSmokeRecords.get(path); return body ? {stream: new Response(body).body} : null; }
    ` };
  }
});
const originalFetch = globalThis.fetch;
const source = await originalFetch(`https://www.liaarmonia.com/api/venue-visualization-brief?session_id=${briefId}`, { signal: AbortSignal.timeout(30000) });
assert.ok(source.ok, 'QA brief could not be loaded');
const { brief } = await source.json();
assert.ok(brief?.files?.length, 'QA file references are missing');
globalThis.bookingSmokeRecords.set(`venue-visualizations/${briefId}/brief.json`, JSON.stringify({ ...brief, status: 'awaiting_payment', paidAt: undefined, studioEmailSentAt: undefined, customerEmailSentAt: undefined, checkoutSessionId: sessionId }));
process.env.VENUE_VISUALIZATION_NOTIFY_TO = recipient;
const sent = [];
globalThis.fetch = async (url, options) => {
  assert.equal(url, 'https://api.resend.com/emails');
  const payload = JSON.parse(options.body);
  assert.deepEqual(payload.to, [recipient], 'Test email must only go to the atelier');
  payload.subject = `[TEST - NO PAYMENT] ${payload.subject}`;
  payload.html = '<p><strong>TEST ONLY: No payment or customer booking was created.</strong></p>' + payload.html;
  const response = await originalFetch(url, { ...options, body: JSON.stringify(payload), signal: AbortSignal.timeout(30000) });
  const result = await response.clone().json();
  if (!response.ok) throw new Error(`Resend test rejected (${response.status}): ${result.name || 'unknown error'} / ${result.message || 'no details'}`);
  sent.push(result.id);
  console.log(`Booking email accepted: ${result.id}`);
  return response;
};
const { confirmPaidVenueBrief } = await import('../api/venue-visualization-brief.js');
const session = { id: sessionId, payment_status: 'paid', metadata: { brief_id: briefId }, customer_details: { email: recipient } };
await confirmPaidVenueBrief(session, { headers: { host: 'www.liaarmonia.com' } });
assert.equal(sent.length, 2);
await confirmPaidVenueBrief(session, { headers: { host: 'www.liaarmonia.com' } });
assert.equal(sent.length, 2, 'Repeated confirmation must not send duplicate emails');
console.log('BOOKING_EMAIL_SMOKE_OK: customer and studio confirmations accepted; production order storage was not modified.');
