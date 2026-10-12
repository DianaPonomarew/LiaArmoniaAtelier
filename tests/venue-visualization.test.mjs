import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

const records = new Map();
globalThis.venueTestRecords = records;
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === '@vercel/blob') return { url: 'mock:venue-blob', shortCircuit: true };
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url !== 'mock:venue-blob') return nextLoad(url, context);
    return { format: 'module', shortCircuit: true, source: `
      export async function put(path, body) { globalThis.venueTestRecords.set(path, body); }
      export async function get(path, options) { if (options.useCache !== false) throw new Error('Mutable briefs must bypass cache'); const body = globalThis.venueTestRecords.get(path); return body ? {stream: new Response(body).body} : null; }
      export async function list({prefix}) { return {blobs: [...globalThis.venueTestRecords.keys()].filter(path => path.startsWith(prefix)).map(path => ({pathname:path,url:'https://files.test/'+path}))}; }
    ` };
  }
});

const sessions = new Map();
const emails = [];
let checkoutParameters;
process.env.BLOB_READ_WRITE_TOKEN = 'test-storage';
process.env.STRIPE_SECRET_KEY = 'test-stripe';
process.env.RESEND_API_KEY = 'test-mail';
globalThis.fetch = async (url, options = {}) => {
  if (url.startsWith('https://files.test/')) return new Response(records.get(url.slice('https://files.test/'.length)), { status: 200 });
  if (url === 'https://api.resend.com/emails') { emails.push(JSON.parse(options.body)); return Response.json({ id: `email-${emails.length}` }); }
  if (url === 'https://api.stripe.com/v1/checkout/sessions' && options.method === 'POST') {
    checkoutParameters = options.body;
    const session = { id: 'cs_test_order', url: 'https://checkout.stripe.com/test', status: 'open', payment_status: 'unpaid', metadata: { product: 'wedding_venue_visualization', brief_id: options.body.get('metadata[brief_id]') } };
    sessions.set(session.id, session);
    return Response.json(session);
  }
  const id = String(url).split('/').pop();
  if (sessions.has(id)) return Response.json(sessions.get(id));
  throw new Error(`Unexpected test request: ${url}`);
};

const { default: briefHandler, confirmPaidVenueBrief } = await import('../api/venue-visualization-brief.js');
const { default: checkoutHandler } = await import('../api/venue-visualization-checkout.js');
const { default: fileHandler } = await import('../api/venue-visualization-file.js');
const { readBrief } = await import('../api/_venue-visualization.js');
async function call(handler, body, method = 'POST', query = {}) {
  let result;
  const res = { setHeader() {}, end(value) { result = JSON.parse(value); } };
  await handler({ method, body, query, url: '/api/test', headers: { host: 'www.liaarmonia.com' } }, res);
  return { status: res.statusCode, ...result };
}

test('private brief is saved before payment and confirmed only after paid checkout', async () => {
  const created = await call(briefHandler, { action: 'create' });
  assert.equal(created.status, 200);
  assert.match(created.sessionId, /^brief_[a-f0-9]{64}$/);
  const id = created.sessionId;
  const draft = { sessionId: id, draft: true, venue_area: 'Venue, Paris, Dinner', wedding_date: '2027-04-03', guest_count: '80', atmosphere_colours: 'Bordeaux', include: 'Candles', files: [] };
  assert.equal((await call(briefHandler, draft)).status, 200);
  assert.equal(emails.length, 0);
  assert.equal((await call(checkoutHandler, { sessionId: id })).status, 400);
  assert.equal((await call(briefHandler, { ...draft, draft: false })).status, 402);
  const photos = [1, 2, 3].map(index => ({ kind: 'venue', name: `${index}.jpg`, type: 'image/jpeg', pathname: `venue-visualizations/${id}/venue/${index}.jpg`, state: 'Uploaded' }));
  photos.forEach(file => records.set(file.pathname, 'original-image'));
  await call(briefHandler, { ...draft, files: [{ ...photos[0], pathname: 'another-order/photo.jpg' }, ...photos.slice(1)] });
  assert.equal((await call(checkoutHandler, { sessionId: id })).status, 400);
  await call(briefHandler, { ...draft, files: photos });
  const checkout = await call(checkoutHandler, { sessionId: id });
  assert.equal(checkout.status, 200);
  assert.equal(checkoutParameters.get('line_items[0][price_data][unit_amount]'), '29900');
  assert.equal(checkoutParameters.get('metadata[brief_id]'), id);
  assert.equal(checkoutParameters.has('payment_method_types'), false);
  assert.ok(checkoutParameters.get('cancel_url').includes(id));
  assert.equal((await readBrief(id)).status, 'awaiting_payment');
  assert.equal((await call(briefHandler, draft)).status, 409);
  assert.equal((await call(checkoutHandler, { sessionId: id })).url, checkout.url);
  const session = sessions.get('cs_test_order');
  await confirmPaidVenueBrief(session, { headers: { host: 'www.liaarmonia.com' } });
  assert.equal(emails.length, 0);
  session.payment_status = 'paid';
  session.status = 'complete';
  session.customer_details = { email: 'customer@example.test' };
  await confirmPaidVenueBrief(session, { headers: { host: 'www.liaarmonia.com' } });
  assert.equal((await readBrief(id)).status, 'submitted');
  assert.equal(emails.length, 2);
  assert.match(emails[1].html, /five design images/);
  assert.match(emails[1].html, /two final videos/);
  assert.match(emails[1].html, /1.jpg/);
  await confirmPaidVenueBrief(session, { headers: { host: 'www.liaarmonia.com' } });
  assert.equal(emails.length, 2);
  assert.equal((await call(briefHandler, {}, 'GET', { session_id: session.id })).brief.sessionId, id);
  assert.equal((await call(fileHandler, {}, 'GET', { session_id: id, path: 'another-order/photo.jpg' })).status, 403);
});
