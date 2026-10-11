import { upload } from 'https://esm.sh/@vercel/blob@2.0.0/client';

const sessionId = new URLSearchParams(window.location.search).get('session_id');
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
  form.innerHTML = '<p>Your private brief link is missing. Please return from the payment confirmation email.</p>';
  throw new Error('Missing Checkout Session ID.');
}

const setStatus = message => {
  statusEl.textContent = message || '';
};

const isUploading = () => files.some(file => file.state === 'Uploading...');
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
      const preview = file.preview
        ? `<img src="${file.preview}" alt="">`
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
    await fetch('/api/venue-visualization-brief', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...formDataObject(), draft: true })
    });
  } catch {
    // Draft saving is helpful, but it should never interrupt the form flow.
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
    if (!response.ok || !data.brief) return;

    for (const [key, value] of Object.entries(data.brief)) {
      const field = form.elements.namedItem(key);
      if (field && typeof value === 'string') field.value = value;
    }

    if (Array.isArray(data.brief.files)) {
      files.splice(0, files.length, ...data.brief.files.map(file => ({ ...file, state: file.state || 'Uploaded' })));
      renderFiles();
    }

    setStatus(data.brief.status === 'submitted' ? 'Your submitted brief is loaded.' : 'Your saved draft is loaded.');
  } catch {
    setStatus('Your private brief is ready.');
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
        clientPayload: JSON.stringify({ sessionId, kind })
      });
      entry.url = blob.url;
      entry.pathname = blob.pathname;
      entry.state = 'Uploaded';
      setStatus(`${file.name} uploaded.`);
      scheduleDraft();
    } catch (error) {
      entry.state = 'Upload failed';
      entry.error = error.message;
      setStatus(`${file.name} could not be uploaded. Please remove or replace it.`);
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
  )).join('')}</dl>`;
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

  const data = formDataObject();
  renderSubmittedSummary(data);
  submitButton.disabled = true;
  setStatus('Sending your brief...');

  const response = await fetch('/api/venue-visualization-brief', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  const result = await response.json();

  if (!response.ok) {
    submitButton.disabled = false;
    setStatus(result.error || 'Your brief could not be sent.');
    return;
  }

  form.classList.add('hidden');
  success.classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

renderFiles();
loadSavedBrief();
