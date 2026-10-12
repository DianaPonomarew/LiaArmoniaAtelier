import { upload } from '@vercel/blob/client';
import { readFile } from 'node:fs/promises';

const site = 'https://www.liaarmonia.com';
async function post(path, data) {
  const response = await fetch(site + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data), signal: AbortSignal.timeout(30000) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || `Request failed: ${response.status}`);
  return result;
}
try {
  const { sessionId } = await post('/api/venue-visualization-brief', { action: 'create' });
  const bytes = await readFile(new URL('../assets/favicon.png', import.meta.url));
  const files = [];
  for (let index = 1; index <= 3; index++) {
    const name = `qa-checkout-${index}.png`;
    const blob = await upload(`venue-visualizations/${sessionId}/venue/${name}`, new File([bytes], name, { type: 'image/png' }), {
      access: 'private', handleUploadUrl: site + '/api/venue-visualization-upload',
      clientPayload: JSON.stringify({ sessionId, kind: 'venue' }), abortSignal: AbortSignal.timeout(30000)
    });
    files.push({ name, kind: 'venue', type: 'image/png', pathname: blob.pathname, state: 'Uploaded' });
  }
  await post('/api/venue-visualization-brief', { sessionId, draft: true, venue_area: 'QA TEST ONLY - Paris, Dinner', wedding_date: '2027-06-01', guest_count: '80', atmosphere_colours: 'Bordeaux', include: 'Candles', files });
  const checkout = await post('/api/venue-visualization-checkout', { sessionId });
  console.log(JSON.stringify({ checkoutOpened: Boolean(checkout.url), url: checkout.url }));
} catch (error) {
  console.error('Checkout diagnosis:', error.message);
  process.exitCode = 1;
}
