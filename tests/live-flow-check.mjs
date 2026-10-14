import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { upload } from '@vercel/blob/client';

const site = 'https://www.liaarmonia.com';
async function request(path, data) {
  return fetch(site + path, { ...(data ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) } : {}), signal: AbortSignal.timeout(30000) });
}
async function post(path, data) {
  const response = await request(path, data);
  const result = await response.json();
  assert.equal(response.status, 200, JSON.stringify(result));
  return result;
}
const { sessionId } = await post('/api/venue-visualization-brief', { action: 'create' });
const { sessionId: otherId } = await post('/api/venue-visualization-brief', { action: 'create' });
assert.equal((await request('/api/venue-visualization-checkout', { sessionId })).status, 400);
const files = [];
const samples = [
  ['venue', 'qa-angle-1.png', 'image/png', 'favicon.png'],
  ['venue', 'qa-angle-2.png', 'image/png', 'favicon.png'],
  ['venue', 'qa-angle-3.png', 'image/png', 'favicon.png'],
  ['inspiration', 'qa-inspiration.png', 'image/png', 'favicon.png'],
  ['plan', 'qa-floor-plan.pdf', 'application/pdf', 'burgundy-chartreuse-example-planner-brief.pdf'],
  ['video', 'qa-walkthrough.mp4', 'video/mp4', 'world-salt-atrium.mp4']
];
for (const [kind, name, type, asset] of samples) {
  const bytes = await readFile(new URL(`../assets/${asset}`, import.meta.url));
  const blob = await upload(`venue-visualizations/${sessionId}/${kind}/${name}`, new File([bytes], name, { type }), {
    access: 'private', handleUploadUrl: site + '/api/venue-visualization-upload',
    clientPayload: JSON.stringify({ sessionId, kind }), multipart: kind === 'video', abortSignal: AbortSignal.timeout(180000)
  });
  const path = `/api/venue-visualization-file?session_id=${sessionId}&path=${encodeURIComponent(blob.pathname)}`;
  const download = await request(path);
  assert.equal(download.status, 200);
  assert.deepEqual(Buffer.from(await download.arrayBuffer()), bytes);
  assert.equal(download.headers.get('cache-control'), 'private, no-store');
  assert.equal((await request(path.replace(sessionId, otherId))).status, 403);
  const direct = await fetch(blob.url, { signal: AbortSignal.timeout(30000) });
  assert.ok(!direct.ok, 'Original must not be publicly accessible');
  files.push({ name, kind, type, pathname: blob.pathname, state: 'Uploaded' });
  console.log(`${kind}: private upload, original download and cross-order protection passed`);
}
const draft = { sessionId, draft: true, venue_area: 'QA TEST ONLY, Paris, Dinner', wedding_date: '2027-06-01', guest_count: '80', atmosphere_colours: 'Bordeaux', include: 'Candles', files };
await post('/api/venue-visualization-brief', draft);
const saved = await (await request(`/api/venue-visualization-brief?session_id=${sessionId}`)).json();
assert.equal(saved.brief.files.length, 6);
assert.equal(saved.brief.venue_area, draft.venue_area);
await post('/api/venue-visualization-brief', { ...draft, files: files.filter(file => file.kind !== 'inspiration') });
const changed = await (await request(`/api/venue-visualization-brief?session_id=${sessionId}`)).json();
assert.equal(changed.brief.files.length, 5);
const checkout = await post('/api/venue-visualization-checkout', { sessionId });
assert.match(checkout.url, /^https:\/\/checkout.stripe.com\//);
assert.equal((await post('/api/venue-visualization-checkout', { sessionId })).url, checkout.url);
const unpaid = await (await request(`/api/venue-visualization-brief?session_id=${sessionId}`)).json();
assert.equal(unpaid.brief.status, 'awaiting_payment');
const fake = await request('/api/design-edition-webhook', { type: 'checkout.session.completed', data: { object: { payment_status: 'paid' } } });
assert.equal(fake.status, 400);
console.log(JSON.stringify({ draftSavedAndResumed: true, fileRemovalSaved: true, checkoutCreatedAndReused: true, unpaidNotConfirmed: true, unsignedWebhookRejected: true, briefUrl: `${site}/venue-visualization-brief.html?session_id=${sessionId}` }));
