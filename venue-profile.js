(() => {
  'use strict';
  const form = document.getElementById('venueProfile');
  if (!form) return;
  const steps = [...form.querySelectorAll('.step')], status = document.getElementById('formStatus');
  const next = document.getElementById('next'), back = document.getElementById('back'), submit = document.getElementById('submit');
  const mainImage = document.getElementById('main_image'), photos = document.getElementById('gallery_images'), gallery = document.getElementById('photoGallery');
  const labels = ['Property', 'Experiences', 'Profile & images', 'Review'];
  const offerCode = new URLSearchParams(location.search).get('offer') || '';
  let commercialOffer = null;
  let step = 0, sending = false, submission = null, selectedPhotos = [];
  const previews = [];
  let mainPreviewUrl = '', galleryPreviewUrls = [];
  const imageFiles = () => [mainImage.files[0], ...photos.files].filter(Boolean);
  function show(focus = true) {
    steps.forEach((section, i) => { section.hidden = i !== step; });
    document.getElementById('stepLabel').textContent = 'Step ' + (step + 1) + ' of 4 · ' + labels[step];
    document.getElementById('progressFill').style.width = ((step + 1) * 25) + '%';
    document.querySelectorAll('.step-nav li').forEach((item, i) => { if (i === step) item.setAttribute('aria-current', 'step'); else item.removeAttribute('aria-current'); item.classList.toggle('complete', i < step); });
    document.querySelector('[role=progressbar]').setAttribute('aria-valuenow', String(step + 1));
    back.hidden = step === 0; next.hidden = step === 3; submit.hidden = step !== 3;
    status.textContent = '';
    if (step === 3) summary();
    if (focus) steps[step].querySelector('h2').focus();
  }
  function validate(index) {
    function focusInvalid(field, message) {
      if (step !== index) { step = index; show(); }
      for (let parent = field.parentElement; parent; parent = parent.parentElement) if (parent.tagName === 'DETAILS') parent.open = true;
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
      if (form.elements.short_description.value.trim().split(/\s+/).filter(Boolean).length > 25) { focusInvalid(form.elements.short_description, 'Please keep your introduction to one sentence and no more than 25 words.'); return false; }
      if (mainImage.files.length !== 1) { focusInvalid(mainImage, 'Please choose one main image for your profile.'); return false; }
      if (photos.files.length < 3 || photos.files.length > 6) { focusInvalid(photos, 'Please choose 3–6 additional gallery images.'); return false; }
      for (const file of imageFiles()) if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 20 * 1024 * 1024) { focusInvalid(photos, 'Please use JPEG, PNG or WebP images up to 20 MB each.'); return false; }
    }
    if (index === 3) {
      if (!commercialOffer) { status.textContent = 'Your commercial schedule could not be loaded. Please reload before agreeing.'; return false; }
      if (!form.querySelector('[name=eligible_categories][type=hidden]') && !form.querySelector('[name=eligible_categories]:checked')) { focusInvalid(document.getElementById('eligibleCategories').querySelector('input'), 'Please select at least one eligible revenue category in your offer.'); return false; }
    }
    return true;
  }
  async function loadOffer() {
    const note = document.getElementById('offerStatus');
    try {
      const response = await fetch('/api/atelier-inquiry?venueOffer=1' + (offerCode ? '&offer=' + encodeURIComponent(offerCode) : ''), { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || 'The commercial schedule could not be loaded.');
      const offer = data.offer;
      document.getElementById('offerOverviewRate').textContent = offer.rate + '% on ' + (offer.categories.length === 1 ? 'net venue hire' : 'expressly selected hospitality revenue');
      document.getElementById('offerOverviewScope').textContent = (offer.property ? 'Individual offer for ' + offer.property + '. ' : '') + 'No listing fee. Nonexclusive. Commission applies only to qualifying paid bookings.';
      document.getElementById('offerOverviewTerms').href = offer.termsUrl;
      document.getElementById('offerRate').textContent = offer.rate + '% success-based referral fee';
      document.getElementById('offerProperty').textContent = offer.property ? 'Your individual offer for ' + offer.property : 'Standard venue hire schedule for new partners';
      if (offer.property && !form.elements.venue_name.value) form.elements.venue_name.value = offer.property;
      const categories = document.getElementById('eligibleCategories'); categories.replaceChildren();
      for (const category of offer.categories) {
        const box = document.createElement('div'); box.className = 'eligible-category';
        const label = document.createElement('label'), input = document.createElement('input'), text = document.createElement('span');
        input.name = 'eligible_categories'; input.value = category.key; input.type = offer.categories.length === 1 ? 'hidden' : 'checkbox';
        text.textContent = category.label;
        label.className = 'consent'; label.append(input, text); box.append(label);
        const detail = document.createElement('p'); detail.className = 'hint'; detail.textContent = category.description; box.append(detail); categories.append(box);
      }
      const exclusions = document.getElementById('offerExclusions'); exclusions.replaceChildren();
      for (const value of offer.exclusions) { const item = document.createElement('li'); item.textContent = value; exclusions.append(item); }
      for (const [id, value] of [['offerPayment', offer.payment], ['offerAttribution', offer.attribution], ['offerCancellation', offer.cancellation], ['offerFreeProfile', offer.freeProfile]]) document.getElementById(id).textContent = value;
      document.getElementById('termsRead').href = offer.termsUrl; document.getElementById('termsDownload').href = offer.termsPdfUrl;
      document.getElementById('termsVersion').textContent = 'Terms version: ' + offer.version + ' · Offer: ' + offer.reference;
      document.getElementById('termsDeclaration').textContent = 'I am authorized to bind the legal operator named above. I have read and agree to the displayed ' + offer.rate + '% schedule, its selected eligible revenue categories and exclusions, and Venue Partnership Terms ' + offer.version + '. By selecting Submit profile and agree to terms, I confirm this agreement on behalf of the business. No listing fee is charged; referral commission arises only on qualifying paid bookings. *';
      commercialOffer = offer; note.textContent = 'Your exact rate and eligible revenue are set out below.';
      document.getElementById('commercialSchedule').hidden = false; form.elements.terms_acceptance.disabled = false; submit.disabled = false;
    } catch (error) { note.textContent = error.message + ' Please contact atelier@liaarmonia.com if you need a current invitation.'; document.getElementById('offerOverviewScope').textContent = 'Your individual schedule could not be loaded. Please contact the atelier before completing the profile.'; }
  }
  function summary() {
    const data = new FormData(form), list = document.getElementById('submissionSummary');
    list.replaceChildren();
    const rows = [['Property', data.get('venue_name')], ['Destination', [data.get('city'), data.get('region'), data.get('country')].filter(Boolean).join(', ')], ['Experiences', data.getAll('experiences').join(' · ')], ['Private contact', data.get('contact_name') + ' · ' + data.get('email')], ['Main image', mainImage.files[0]?.name || ''], ['Gallery images', photos.files.length + ' selected'], ['Pricing', data.get('publish_pricing') ? 'May be included in the proposed feature for your approval' : 'Private / on enquiry']];
    for (const [label, value] of rows) { const dt = document.createElement('dt'), dd = document.createElement('dd'); dt.textContent = label; dd.textContent = value; list.append(dt, dd); }
    document.getElementById('featureHero').src = mainPreviewUrl;
    document.getElementById('featureHero').alt = data.get('venue_name') + ' · main image';
    document.getElementById('featureName').textContent = data.get('venue_name');
    document.getElementById('featureLocation').textContent = [data.get('city'), data.get('country')].filter(Boolean).join(' · ');
    document.getElementById('featureIntro').textContent = data.get('short_description');
    document.getElementById('featureExperiences').textContent = data.getAll('experiences').join(' · ');
    const previewGallery = document.getElementById('featureGallery'); previewGallery.replaceChildren();
    galleryPreviewUrls.forEach((url, i) => { const img = document.createElement('img'); img.src = url; img.alt = 'Gallery photograph ' + (i + 1); previewGallery.append(img); });
  }
  next.addEventListener('click', () => { if (!sending && validate(step) && step < 3) { step++; show(); } });
  back.addEventListener('click', () => { if (!sending && step > 0) { step--; show(); } });
  form.addEventListener('keydown', event => { if (event.key === 'Enter' && event.target.tagName === 'INPUT' && !['checkbox', 'file'].includes(event.target.type) && step < 3) { event.preventDefault(); next.click(); } });
  form.elements.description.addEventListener('input', event => { document.getElementById('descriptionCount').textContent = event.target.value.length; });
  form.elements.short_description.addEventListener('input', event => { document.getElementById('introCount').textContent = event.target.value.length; document.getElementById('introWords').textContent = event.target.value.trim().split(/\s+/).filter(Boolean).length; });
  form.addEventListener('input', event => {
    if (!sending && event.target !== photos && event.target !== mainImage && submission) submission = null;
    if (['eligible_categories', 'legal_operator', 'business_address', 'signatory_name', 'signatory_role', 'invoice_currency', 'email', 'venue_name'].includes(event.target.name)) form.elements.terms_acceptance.checked = false;
  });
  function updateImages() {
    submission = null; selectedPhotos = [];
    previews.splice(0).forEach(url => URL.revokeObjectURL(url)); gallery.replaceChildren();
    const mainPreview = document.getElementById('mainImagePreview'); mainPreview.replaceChildren(); mainPreviewUrl = ''; galleryPreviewUrls = [];
    if (mainImage.files[0]) {
      const file = mainImage.files[0], img = document.createElement('img'), caption = document.createElement('p');
      mainPreviewUrl = URL.createObjectURL(file); previews.push(mainPreviewUrl); img.src = mainPreviewUrl; img.alt = 'Your selected main image'; caption.className = 'hint'; caption.textContent = file.name; mainPreview.append(img, caption);
    }
    [...photos.files].slice(0, 6).forEach((file, i) => {
      const figure = document.createElement('figure'), img = document.createElement('img'), caption = document.createElement('figcaption');
      const url = URL.createObjectURL(file); previews.push(url); galleryPreviewUrls.push(url); img.src = url; img.alt = 'Gallery photograph ' + (i + 1);
      caption.textContent = file.name; figure.append(img, caption); gallery.append(figure);
    });
  }
  mainImage.addEventListener('change', updateImages); photos.addEventListener('change', updateImages);
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
    body.experiences = data.getAll('experiences'); delete body.main_image; delete body.gallery_images;
    body.eligible_categories = data.getAll('eligible_categories'); body.offer_code = offerCode; body.terms_version = commercialOffer.version;
    body.image_layout = 'hero_and_gallery';
    const chosenImages = imageFiles();
    body.photo_names = chosenImages.map(file => file.name);
    for (const key of ['image_rights', 'editorial_consent', 'privacy_acknowledged', 'authorized_contact', 'publish_pricing', 'terms_acceptance']) body[key] = data.get(key) === 'on';
    const controls = [...form.querySelectorAll('input,textarea,select,button')]; controls.forEach(control => { control.disabled = true; });
    try {
      if (selectedPhotos.length !== chosenImages.length) {
        const prepared = [];
        for (const [i, file] of chosenImages.entries()) { status.textContent = 'Preparing image ' + (i + 1) + ' of ' + chosenImages.length + '…'; prepared.push(await jpeg(file)); }
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
      if (result.receiptUrl) { const copy = document.getElementById('agreementDownload'); copy.href = result.receiptUrl; copy.download = 'LIA_ARMONIA_Venue_Agreement.html'; copy.hidden = false; }
      if (result.partnerReceiptPending) { const note = document.getElementById('receiptNote'); note.hidden = false; note.textContent = 'Your agreement is recorded. Email delivery could not be confirmed, so please save the downloadable agreement copy and contact the atelier if you need another copy.'; }
      const done = document.getElementById('done'); done.hidden = false; done.focus();
    } catch (error) {
      status.textContent = error.message + ' If you need help, email atelier@liaarmonia.com.';
    } finally { sending = false; controls.forEach(control => { control.disabled = false; }); form.elements.terms_acceptance.disabled = !commercialOffer; submit.disabled = !commercialOffer; }
  });
  show(false);
  loadOffer();
})();
