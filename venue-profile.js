(() => {
  'use strict';
  const form = document.getElementById('venueProfile');
  if (!form) return;
  const steps = [...form.querySelectorAll('.step')], status = document.getElementById('formStatus');
  const next = document.getElementById('next'), back = document.getElementById('back'), submit = document.getElementById('submit');
  const photos = document.getElementById('photos'), gallery = document.getElementById('photoGallery');
  const labels = ['Your property', 'The experiences', 'Your story & images', 'Your review'];
  let step = 0, sending = false, submission = null, selectedPhotos = [];
  const previews = [];
  function show(focus = true) {
    steps.forEach((section, i) => { section.hidden = i !== step; });
    document.getElementById('stepLabel').textContent = 'Step ' + (step + 1) + ' of 4 · ' + labels[step];
    document.getElementById('progressFill').style.width = ((step + 1) * 25) + '%';
    document.querySelector('[role=progressbar]').setAttribute('aria-valuenow', String(step + 1));
    back.hidden = step === 0; next.hidden = step === 3; submit.hidden = step !== 3;
    status.textContent = '';
    if (step === 3) summary();
    if (focus) steps[step].querySelector('h2').focus();
  }
  function validate(index) {
    function focusInvalid(field, message) {
      if (step !== index) { step = index; show(); }
      if (message) status.textContent = message;
      field.focus();
    }
    for (const field of steps[index].querySelectorAll('input,textarea,select')) {
      if (!field.checkValidity()) { focusInvalid(field); field.reportValidity(); return false; }
      if (field.type === 'url' && field.value) {
        const value = new URL(field.value);
        if (value.protocol !== 'https:' || value.username || value.password) { focusInvalid(field, 'Please use a complete https:// link without login credentials.'); return false; }
      }
    }
    if (index === 1) {
      const experiences = [...form.querySelectorAll('[name=experiences]:checked')].map(e => e.value);
      if (!experiences.length) { focusInvalid(document.getElementById('experiences').querySelector('input'), 'Please select at least one experience your property hosts.'); return false; }
      if (!Number(form.elements.seated_capacity.value) && !Number(form.elements.standing_capacity.value) && form.elements.capacity_notes.value.trim().length < 5 && !experiences.includes('Guest accommodation')) { focusInvalid(form.elements.capacity_notes, 'Please add a capacity or a short capacity note.'); return false; }
    }
    if (index === 2) {
      if (photos.files.length < 3 || photos.files.length > 6) { focusInvalid(photos, 'Please choose between 3 and 6 photographs.'); return false; }
      for (const file of photos.files) if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 20 * 1024 * 1024) { focusInvalid(photos, 'Please use JPEG, PNG or WebP images up to 20 MB each.'); return false; }
    }
    return true;
  }
  function summary() {
    const data = new FormData(form), list = document.getElementById('submissionSummary');
    list.replaceChildren();
    const rows = [['Property', data.get('venue_name')], ['Destination', [data.get('city'), data.get('region'), data.get('country')].filter(Boolean).join(', ')], ['Experiences', data.getAll('experiences').join(' · ')], ['Private contact', data.get('contact_name') + ' · ' + data.get('email')], ['Photographs', photos.files.length + ' selected'], ['Pricing', data.get('publish_pricing') ? 'May be included in the proposed feature for your approval' : 'Private / on enquiry']];
    for (const [label, value] of rows) { const dt = document.createElement('dt'), dd = document.createElement('dd'); dt.textContent = label; dd.textContent = value; list.append(dt, dd); }
  }
  next.addEventListener('click', () => { if (!sending && validate(step) && step < 3) { step++; show(); } });
  back.addEventListener('click', () => { if (!sending && step > 0) { step--; show(); } });
  form.addEventListener('keydown', event => { if (event.key === 'Enter' && event.target.tagName === 'INPUT' && !['checkbox', 'file'].includes(event.target.type) && step < 3) { event.preventDefault(); next.click(); } });
  form.elements.description.addEventListener('input', event => { document.getElementById('descriptionCount').textContent = event.target.value.length; });
  form.addEventListener('input', event => { if (!sending && event.target !== photos && submission) submission = null; });
  photos.addEventListener('change', () => {
    submission = null; selectedPhotos = [];
    previews.splice(0).forEach(url => URL.revokeObjectURL(url)); gallery.replaceChildren();
    [...photos.files].slice(0, 6).forEach((file, i) => {
      const figure = document.createElement('figure'), img = document.createElement('img'), caption = document.createElement('figcaption');
      const url = URL.createObjectURL(file); previews.push(url); img.src = url; img.alt = 'Selected property photograph ' + (i + 1);
      caption.textContent = (i === 0 ? 'Proposed cover · ' : '') + file.name; figure.append(img, caption); gallery.append(figure);
    });
  });
  async function jpeg(file) {
    const bitmap = await createImageBitmap(file);
    if (!bitmap.width || !bitmap.height || bitmap.width * bitmap.height > 80000000) { bitmap.close(); throw new Error('One image is too large to process. Please choose a smaller version.'); }
    const scale = Math.min(1, 1800 / Math.max(bitmap.width, bitmap.height)), canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d'); context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height); context.drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close();
    let blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', .82));
    if (blob?.size > 1000000) blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', .6));
    if (!blob || blob.size > 1000000) throw new Error('A photograph could not be prepared. Please choose a smaller version.');
    return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1]); reader.onerror = () => reject(new Error('A photograph could not be read.')); reader.readAsDataURL(blob); });
  }
  async function post(body) {
    const response = await fetch('/api/atelier-inquiry?venueOnboarding=1', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) throw new Error(result.error || 'This step could not be confirmed. Please try again.');
    return result;
  }
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (sending) return;
    for (let index = 0; index < 4; index++) if (!validate(index)) return;
    sending = true;
    // Keep the submitted information and selected files fixed while uploads are in progress.
    const data = new FormData(form), body = Object.fromEntries(data.entries());
    body.experiences = data.getAll('experiences'); delete body.photos;
    body.photo_names = [...photos.files].map(file => file.name);
    for (const key of ['image_rights', 'editorial_consent', 'privacy_consent', 'authorized_contact', 'publish_pricing']) body[key] = data.get(key) === 'on';
    const controls = [...form.querySelectorAll('input,textarea,select,button')]; controls.forEach(control => { control.disabled = true; });
    try {
      if (selectedPhotos.length !== photos.files.length) {
        const prepared = [];
        for (const [i, file] of [...photos.files].entries()) { status.textContent = 'Preparing photograph ' + (i + 1) + ' of ' + photos.files.length + '…'; prepared.push(await jpeg(file)); }
        selectedPhotos = prepared;
      }
      if (!submission) { status.textContent = 'Saving your property details…'; submission = await post({ ...body, action: 'create' }); }
      if (!submission.submissionId || !submission.uploadToken) throw new Error('Your submission could not be started. Please contact the atelier.');
      for (let i = submission.uploadedCount || 0; i < selectedPhotos.length; i++) { status.textContent = 'Uploading photograph ' + (i + 1) + ' of ' + selectedPhotos.length + '…'; await post({ action: 'photo', id: submission.submissionId, uploadToken: submission.uploadToken, number: i, base64: selectedPhotos[i] }); submission.uploadedCount = i + 1; }
      status.textContent = 'Completing your private submission…';
      const result = await post({ action: 'complete', id: submission.submissionId, uploadToken: submission.uploadToken });
      document.getElementById('wizard').hidden = true;
      document.getElementById('submissionReference').textContent = 'Submission reference: ' + result.submissionId;
      if (result.emailPending) { const note = document.getElementById('notificationNote'); note.hidden = false; note.textContent = 'Your profile is saved. Please email atelier@liaarmonia.com with this reference so we can confirm receipt with you.'; }
      const done = document.getElementById('done'); done.hidden = false; done.focus();
    } catch (error) {
      status.textContent = error.message + ' If you need help, email atelier@liaarmonia.com.';
    } finally { sending = false; controls.forEach(control => { control.disabled = false; }); }
  });
  show(false);
})();
