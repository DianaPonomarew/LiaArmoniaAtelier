import { upload } from 'https://esm.sh/@vercel/blob@2.8.1/client';
import { BOOKING_TERMS_VERSION } from './venue-visualization-terms.js';

let sessionId = new URLSearchParams(window.location.search).get('session_id') || localStorage.getItem('lia-venue-brief');
const form = document.querySelector('#brief');
const statusEl = document.querySelector('.status');
const submitButton = document.querySelector('.submit');
const success = document.querySelector('.success');
const submittedSummary = document.querySelector('#submitted-summary');
const files = [];
const limits = { venue: 10, inspiration: 20, video: 2, plan: 1 };
const kindLabels = {
  venue: 'venue photos',
  inspiration: 'inspiration images',
  video: 'videos',
  plan: 'floor plan'
};

if (!sessionId) {
  submitButton.disabled = true;
  try {
  const response = await fetch('/api/venue-visualization-brief', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'create' }), signal: AbortSignal.timeout(20000) });
  const result = await response.json();
  if (!response.ok) {
    setTimeout(() => { statusEl.textContent = result.error || 'Your private draft could not be created. Please try again.'; }, 0);
    throw new Error(result.error);
  }
  sessionId = result.sessionId;
  localStorage.setItem('lia-venue-brief', sessionId);
  submitButton.disabled = false;
  } catch (error) {
    statusEl.textContent = 'Your private draft could not be opened. Please check your connection and reload.';
    throw error;
  }
}
history.replaceState(null, '', `?session_id=${encodeURIComponent(sessionId)}`);

const setStatus = message => {
  statusEl.textContent = message || '';
};

const isUploading = () => files.some(file => file.state?.startsWith('Uploading'));
const hasFailedUpload = () => files.some(file => file.state === 'Upload failed');

const formDataObject = () => {
  const data = Object.fromEntries(new FormData(form));
  data.sessionId = sessionId;
  data.files = files.map(({ preview, ...file }) => file);
  return data;
};

const escapeHtml = value => String(value || '').replace(/[&<>"']/g, character => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#039;'
})[character]);

function renderFiles() {
  for (const kind of Object.keys(limits)) {
    const list = document.querySelector(`[data-list="${kind}"]`);
    const matching = files.filter(file => file.kind === kind);
    list.innerHTML = matching.map(file => {
      const fileIndex = files.indexOf(file);
      const previewUrl = file.preview || (file.pathname && file.type?.startsWith('image/') ? `/api/venue-visualization-file?session_id=${encodeURIComponent(sessionId)}&path=${encodeURIComponent(file.pathname)}&preview=1` : '');
      const preview = previewUrl
        ? `<img src="${previewUrl}" alt="">`
        : `<span>${kind === 'video' ? 'Video' : kind === 'plan' ? 'File' : 'Image'}</span>`;
      const download = file.pathname
        ? `<a href="/api/venue-visualization-file?session_id=${encodeURIComponent(sessionId)}&path=${encodeURIComponent(file.pathname)}">Download</a>`
        : '';
      return `<li class="file-row">
        <div class="thumb">${preview}</div>
        <div>
          <span class="file-name">${escapeHtml(file.name)}</span>
          <span class="file-status">${escapeHtml(file.state || 'Uploaded')}</span>
        </div>
        <div class="file-actions">
          ${download}
          <button type="button" data-file-index="${fileIndex}">Remove</button>
        </div>
      </li>`;
    }).join('');
  }

  document.querySelectorAll('[data-file-index]').forEach(button => {
    button.onclick = () => {
      const removed = files.splice(Number(button.dataset.fileIndex), 1)[0];
      if (removed?.preview) URL.revokeObjectURL(removed.preview);
      renderFiles();
      scheduleDraft();
    };
  });
}

async function saveDraft() {
  if (isUploading()) return;
  try {
    const response = await fetch('/api/venue-visualization-brief', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...formDataObject(), draft: true }),
      signal: AbortSignal.timeout(20000)
    });
    if (!response.ok) throw new Error('Your draft could not be saved.');
    return true;
  } catch {
    setStatus('Your draft could not be saved. Please check your connection and try again.');
    return false;
  }
}

let draftTimer;
function scheduleDraft() {
  window.clearTimeout(draftTimer);
  draftTimer = window.setTimeout(saveDraft, 650);
}

async function loadSavedBrief() {
  try {
    const response = await fetch(`/api/venue-visualization-brief?session_id=${encodeURIComponent(sessionId)}`);
    const data = await response.json();
    if (!response.ok || !data.brief) {
      setStatus(data.error || 'Your saved brief could not be loaded. Please try again.');
      submitButton.disabled = true;
      return;
    }

    for (const [key, value] of Object.entries(data.brief)) {
      const field = form.elements.namedItem(key);
      if (field && typeof value === 'string') field.value = value;
    }

    if (Array.isArray(data.brief.files)) {
      files.splice(0, files.length, ...data.brief.files.map(file => ({ ...file, state: file.state || 'Uploaded' })));
      renderFiles();
    }

    if (data.brief.status === 'submitted') {
      renderSubmittedSummary(data.brief);
      form.classList.add('hidden');
      success.classList.remove('hidden');
    } else if (data.brief.status === 'awaiting_payment') {
      form.querySelectorAll('input, textarea, button').forEach(field => { field.disabled = true; });
      for (const name of ['terms_accepted', 'early_start']) {
        const field = form.elements.namedItem(name);
        field.disabled = false;
        field.checked = data.brief.termsAcceptance?.version === BOOKING_TERMS_VERSION;
      }
      submitButton.disabled = false;
      submitButton.textContent = 'Continue to payment - $299';
      setStatus('Your brief and files are saved. Complete payment to confirm your order.');
      if (sessionId.startsWith('cs_')) {
        submitButton.disabled = true;
        setStatus('Your payment is confirmed. Waiting for your order confirmation...');
        window.setTimeout(loadSavedBrief, 4000);
      }
    } else setStatus('Your saved draft is loaded.');
  } catch {
    setStatus('Your saved brief could not be loaded. Please check your connection and reload.');
    submitButton.disabled = true;
  }
}

async function addFiles(kind, chosenFiles) {
  const selected = Array.from(chosenFiles || []);
  if (!selected.length) return;

  const currentCount = files.filter(file => file.kind === kind).length;
  if (currentCount + selected.length > limits[kind]) {
    setStatus(`You can add up to ${limits[kind]} ${kindLabels[kind]}.`);
    return;
  }

  for (const file of selected) {
    const extensions = kind === 'video' ? /\.(mp4|mov|webm)$/i : kind === 'plan' ? /\.(pdf|jpe?g|png|webp|heic)$/i : /\.(jpe?g|png|webp|heic)$/i;
    if (!extensions.test(file.name)) {
      setStatus(`${file.name} is not a supported format. Please choose one of the formats listed above.`);
      continue;
    }
    const maxMb = kind === 'video' ? 200 : 20;
    if (file.size > maxMb * 1024 * 1024) {
      setStatus(`${file.name} is larger than the ${maxMb} MB limit.`);
      continue;
    }

    const entry = {
      kind,
      name: file.name,
      size: file.size,
      type: file.type,
      state: 'Uploading...',
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : ''
    };
    files.push(entry);
    renderFiles();
    submitButton.disabled = true;

    try {
      const safeName = file.name.replace(/[^a-z0-9._-]/gi, '-');
      const blob = await upload(`venue-visualizations/${sessionId}/${kind}/${Date.now()}-${safeName}`, file, {
        access: 'private',
        handleUploadUrl: '/api/venue-visualization-upload',
        clientPayload: JSON.stringify({ sessionId, kind }),
        multipart: kind === 'video',
        abortSignal: AbortSignal.timeout(kind === 'video' ? 180000 : 30000),
        onUploadProgress: ({ percentage }) => {
          entry.state = `Uploading ${Math.round(percentage)}%`;
          renderFiles();
        }
      });
      entry.url = blob.url;
      entry.pathname = blob.pathname;
      entry.state = 'Uploaded';
      setStatus(`${file.name} uploaded.`);
      scheduleDraft();
    } catch (error) {
      entry.state = 'Upload failed';
      entry.error = error.message;
      setStatus(`${file.name} could not be uploaded: ${error.name === 'TimeoutError' ? 'The connection took too long. Please try again.' : error.message || 'Please remove or replace it.'}`);
    } finally {
      submitButton.disabled = isUploading();
      renderFiles();
    }
  }
}

document.querySelectorAll('.drop').forEach(drop => {
  const input = drop.querySelector('input');
  const button = drop.querySelector('button');
  const kind = drop.dataset.kind;

  button.onclick = () => input.click();
  input.onchange = () => {
    addFiles(kind, input.files);
    input.value = '';
  };

  for (const eventName of ['dragenter', 'dragover']) {
    drop.addEventListener(eventName, event => {
      event.preventDefault();
      drop.classList.add('drag');
    });
  }

  for (const eventName of ['dragleave', 'drop']) {
    drop.addEventListener(eventName, event => {
      event.preventDefault();
      drop.classList.remove('drag');
    });
  }

  drop.addEventListener('drop', event => addFiles(kind, event.dataTransfer.files));
});

form.addEventListener('input', scheduleDraft);

function renderSubmittedSummary(data) {
  const rows = [
    ['Venue and area', data.venue_area],
    ['Wedding date', data.wedding_date],
    ['Guest count', data.guest_count],
    ['Atmosphere and colours', data.atmosphere_colours],
    ['Included details', data.include],
    ['Decor budget', data.decor_budget],
    ['Inspiration links', data.inspiration_links],
    ['Additional notes', data.additional_notes],
    ['Files received', files.map(file => `${file.name} (${kindLabels[file.kind]})`).join('\n')]
  ].filter(([, value]) => String(value || '').trim());

  submittedSummary.innerHTML = `<dl>${rows.map(([label, value]) => (
    `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`
  )).join('')}</dl><ul>${files.filter(file => file.pathname).map(file => {
    const url = `/api/venue-visualization-file?session_id=${encodeURIComponent(sessionId)}&path=${encodeURIComponent(file.pathname)}`;
    return `<li>${escapeHtml(file.name)} <a href="${url}">Download original</a>${file.type?.startsWith('image/') ? ` · <a href="${url}&preview=1" target="_blank" rel="noopener">View image</a>` : ''}</li>`;
  }).join('')}</ul>`;
}

form.onsubmit = async event => {
  event.preventDefault();
  if (isUploading()) {
    setStatus('Please wait for every file to finish uploading.');
    return;
  }
  if (hasFailedUpload()) {
    setStatus('Please remove or replace files that did not upload.');
    return;
  }
  if (files.filter(file => file.kind === 'venue').length < 3) {
    setStatus('Please add at least three venue photos.');
    return;
  }

  submitButton.disabled = true;
  window.clearTimeout(draftTimer);
  setStatus('Saving your brief and opening secure payment...');
  try {
  const loaded = await fetch(`/api/venue-visualization-brief?session_id=${encodeURIComponent(sessionId)}`).then(response => response.json());
  if (loaded.brief?.status !== 'awaiting_payment' && !await saveDraft()) throw new Error('Please save your brief before continuing.');
  const response = await fetch('/api/venue-visualization-checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, termsVersion: BOOKING_TERMS_VERSION, termsAccepted: form.elements.namedItem('terms_accepted').checked, earlyStart: form.elements.namedItem('early_start').checked }),
    signal: AbortSignal.timeout(25000)
  });
  const result = await response.json();

  if (!response.ok) {
    submitButton.disabled = false;
    setStatus(response.status === 503 ? 'Secure payment is temporarily unavailable. Your brief is saved. Please try again later.' : result.error || 'Your brief could not be sent.');
    return;
  }

  window.location.assign(result.url);
  } catch (error) {
    submitButton.disabled = false;
    setStatus(error.name === 'TimeoutError' ? 'Payment took too long to open. Your brief is saved. Please try again.' : error.message);
  }
};

renderFiles();
loadSavedBrief();
