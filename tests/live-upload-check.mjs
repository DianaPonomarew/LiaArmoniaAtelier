import { upload } from '@vercel/blob/client';
import { readFile } from 'node:fs/promises';

const response = await fetch('https://www.liaarmonia.com/api/venue-visualization-brief', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'create' })
});
const draft = await response.json();
if (!response.ok) throw new Error(draft.error);
const image = new File([await readFile(new URL('../assets/favicon.png', import.meta.url))], 'qa-upload.png', { type: 'image/png' });
try {
  const blob = await upload(`venue-visualizations/${draft.sessionId}/venue/qa-upload.png`, image, {
    access: 'private',
    handleUploadUrl: 'https://www.liaarmonia.com/api/venue-visualization-upload',
    clientPayload: JSON.stringify({ sessionId: draft.sessionId, kind: 'venue' }),
    abortSignal: AbortSignal.timeout(30000)
  });
  console.log('Private original uploaded:', Boolean(blob.pathname));
} catch (error) {
  console.error('Upload diagnosis:', error.message);
  process.exitCode = 1;
}
