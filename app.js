const ATELIER_INBOX = 'atelier@liaarmonia.com';

const hero = document.querySelector('.hero');
const venuePanorama = document.querySelector('.venue-panorama');
const roomButtons = [...document.querySelectorAll('.room-hotspots button')];
const roomName = document.getElementById('roomName');
let activeRoom = 0;
let roomTimer;
let roomMoveTimer;

const rooms = [
  { name: 'Vision', x: '50%', position: '50% 42%', image: "url('assets/lia-atelier-colonnade.jpg')" },
  { name: 'Space', x: '50%', position: '50% 50%', image: "url('assets/lia-stone-arch.jpg')" },
  { name: 'Walkthrough', x: '50%', position: '50% 48%', image: "url('assets/journal-veil-dinner-01.jpg')" },
  { name: 'Production', x: '50%', position: '50% 55%', image: "url('assets/concept-detail.jpg')" }
];

function showRoom(index) {
  if (!venuePanorama || !rooms.length) return;
  activeRoom = (index + rooms.length) % rooms.length;
  roomButtons.forEach((button, buttonIndex) => {
    button.classList.toggle('active', buttonIndex === activeRoom);
  });
  venuePanorama.style.setProperty('--pan-x', rooms[activeRoom].x);
  venuePanorama.style.setProperty('--room-position', rooms[activeRoom].position);
  venuePanorama.style.setProperty('--room-image', rooms[activeRoom].image);
  if (roomName) roomName.textContent = rooms[activeRoom].name;
  hero?.style.setProperty('--room-index', activeRoom);
}

function restartRoomFilm() {
  clearInterval(roomTimer);
}

if (venuePanorama) {
  roomButtons.forEach(button => {
    button.addEventListener('click', () => {
      showRoom(Number(button.dataset.room || 0));
      restartRoomFilm();
    });
  });
  hero?.addEventListener('pointermove', event => {
    if (window.matchMedia('(max-width: 850px)').matches) return;
    const rect = hero.getBoundingClientRect();
    const mx = ((event.clientX - rect.left) / rect.width - .5) * 28;
    const my = ((event.clientY - rect.top) / rect.height - .5) * 18;
    hero.style.setProperty('--mx', `${mx}px`);
    hero.style.setProperty('--my', `${my}px`);
  });
  showRoom(0);
}

document.querySelectorAll('.atelier-inquiry-form').forEach(form => {
  const successPage = form.dataset.successPage || 'thankyou.html';
  form.addEventListener('submit', event => {
    const status = form.querySelector('.form-status');
    const styleOptions = form.querySelectorAll('input[name="style"]');
    if (styleOptions.length && ![...styleOptions].some(option => option.checked)) {
      event.preventDefault();
      if (status) status.textContent = 'Please choose at least one style direction.';
      return;
    }

    event.preventDefault();
    const button = form.querySelector('button[type="submit"]');
    if (button) { button.disabled = true; button.textContent = 'Sending...'; }
    if (status) status.textContent = 'Your note is being sent.';

    const payload = {};
    new FormData(form).forEach((value, key) => {
      if (payload[key]) {
        payload[key] = Array.isArray(payload[key]) ? [...payload[key], value] : [payload[key], value];
      } else {
        payload[key] = value;
      }
    });

    // Honeypot: a filled hidden field means a bot. Pretend success, send nothing.
    if (String(payload.website || '').trim()) {
      window.location.href = successPage;
      return;
    }
    delete payload.website;

    payload._subject = payload.subject || `NEW INQUIRY - ${payload.name || payload.company || payload.email || 'Lia Armonia'}`;
    payload._replyto = payload.email || '';
    payload._template = 'table';
    payload._captcha = 'false';
    delete payload.subject;

    fetch(`https://formsubmit.co/ajax/${ATELIER_INBOX}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(async response => {
        const result = await response.json().catch(() => ({}));
        if (!response.ok || String(result.success) !== 'true') throw new Error('failed');
        window.location.href = successPage;
      })
      .catch(() => {
        if (button) { button.disabled = false; button.textContent = 'Try again'; }
        if (status) status.textContent = `Could not send. Please email ${ATELIER_INBOX} directly.`;
      });
  });
});

document.querySelectorAll('.inquiry-panel').forEach(panel => {
  panel.addEventListener('toggle', () => {
    if (!panel.open) return;
    document.querySelectorAll('.inquiry-panel[open]').forEach(openPanel => {
      if (openPanel !== panel) openPanel.open = false;
    });
  });
});

const conciergeQuestions = [...document.querySelectorAll('.concierge-question')];
const conciergeSteps = [...document.querySelectorAll('[data-concierge-step]')];
const conciergePrev = document.querySelector('[data-concierge-prev]');
const conciergeNext = document.querySelector('[data-concierge-next]');
const conciergeSubmit = document.querySelector('[data-concierge-submit]');
const finalConfirm = document.querySelector('.final-confirm input[type="checkbox"]');

function syncFinalConfirm() {
  if (!conciergeSubmit || !finalConfirm) return;
  conciergeSubmit.disabled = !finalConfirm.checked;
}
finalConfirm?.addEventListener('change', syncFinalConfirm);
const conciergeForm = document.querySelector('.one-question-concierge');
const conciergeActions = document.querySelector('.concierge-actions');
let conciergeIndex = 0;

function selectedValues(name) {
  if (!conciergeForm) return [];
  return [...conciergeForm.querySelectorAll(`input[name="${name}"]:checked`)].map(field => field.value);
}

function formatUsd(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(amount);
}

function updatePricingGuidance() {
  if (!conciergeForm) return;
  const totalNode = conciergeForm.querySelector('[data-pricing-total]');
  const summaryNode = conciergeForm.querySelector('[data-pricing-summary]');
  const breakdownNode = conciergeForm.querySelector('[data-pricing-breakdown]');
  if (!totalNode || !summaryNode || !breakdownNode) return;

  const environments = selectedValues('environments');
  const support = selectedValues('support');
  const environmentCount = environments.length;
  let estimate = environmentCount <= 2 ? 3000 : environmentCount <= 4 ? 4500 : 6000;
  const breakdown = [];

  if (!environmentCount) {
    totalNode.textContent = 'Select your design scope';
    summaryNode.textContent = 'Choose at least one environment to reveal the closest published starting point.';
    breakdownNode.innerHTML = '';
  } else {
    breakdown.push(`Visual design for ${environmentCount} ${environmentCount === 1 ? 'environment' : 'environments'}: ${formatUsd(estimate)}`);

    if (support.includes('Full Design Development')) {
      estimate = Math.max(estimate, 7500);
      breakdown.push('Full design development: 10% of design-production investment, $7,500 minimum');
    }
    const addOns = [
      ['Venue Discovery', 1500, 'Venue discovery'],
      ['Vendor / Specialist Sourcing', 1500, 'Vendor and specialist sourcing'],
      ['Production Direction', 2500, 'Production direction'],
      ['On-Site Creative Direction', 2500, 'On-site creative direction, first day']
    ];
    addOns.forEach(([value, amount, label]) => {
      if (!support.includes(value)) return;
      estimate += amount;
      breakdown.push(`${label}: +${formatUsd(amount)}`);
    });

    totalNode.textContent = `Starting from ${formatUsd(estimate)}`;
    summaryNode.textContent = support.includes('Full Design Development')
      ? 'Full design development is calculated from production scope and begins at the minimum shown.'
      : 'A preliminary design-fee indication based on the environments and support selected.';
    breakdownNode.innerHTML = breakdown.map(item => `<li>${item}</li>`).join('');
  }

  let estimateField = conciergeForm.querySelector('[name="preliminary_fee_guidance"]');
  if (!estimateField) {
    estimateField = document.createElement('input');
    estimateField.type = 'hidden';
    estimateField.name = 'preliminary_fee_guidance';
    conciergeForm.append(estimateField);
  }
  estimateField.value = environmentCount ? `${formatUsd(estimate)} starting guidance` : 'Scope not completed';
}

function setConciergeStep(index) {
  if (!conciergeQuestions.length) return;
  conciergeIndex = Math.max(0, Math.min(index, conciergeQuestions.length - 1));
  conciergeQuestions.forEach((question, questionIndex) => {
    question.classList.toggle('active', questionIndex === conciergeIndex);
  });
  const activeChapter = Number(conciergeQuestions[conciergeIndex]?.dataset.chapter || 0);
  conciergeSteps.forEach((step, stepIndex) => {
    step.classList.toggle('active', stepIndex === activeChapter);
  });
  if (conciergePrev) conciergePrev.style.visibility = conciergeIndex === 0 ? 'hidden' : 'visible';
  const isFinalStep = conciergeIndex === conciergeQuestions.length - 1;
  if (conciergeNext) conciergeNext.hidden = isFinalStep;
  if (conciergeSubmit) conciergeSubmit.hidden = !isFinalStep;
  if (isFinalStep) syncFinalConfirm();
  conciergeActions?.classList.toggle('is-final-step', conciergeIndex === conciergeQuestions.length - 1);
  const rail = document.querySelector('[data-concierge-rail]');
  if (rail) {
    const progress = ((conciergeIndex + 1) / conciergeQuestions.length) * 100;
    rail.style.width = `${progress}%`;
  }
}

function canLeaveConciergeStep() {
  const question = conciergeQuestions[conciergeIndex];
  if (!question) return true;
  const missingCustomGroup = [...question.querySelectorAll('[data-required-group]')].find(group => {
    return !group.querySelector('input:checked');
  });
  if (missingCustomGroup) {
    missingCustomGroup.classList.add('needs-answer');
    missingCustomGroup.querySelector('input')?.focus();
    setTimeout(() => missingCustomGroup.classList.remove('needs-answer'), 520);
    return false;
  }
  const required = [...question.querySelectorAll('[required]')];
  const requiredNames = [...new Set(required.map(field => field.name).filter(Boolean))];
  const firstMissingGroup = requiredNames.find(name => {
    const group = [...question.querySelectorAll('input, select, textarea')].filter(field => field.name === name);
    if (group.some(field => field.type === 'radio' || field.type === 'checkbox')) {
      return !group.some(field => field.checked);
    }
    return group.some(field => !String(field.value || '').trim());
  });
  const firstMissing = firstMissingGroup
    ? required.find(field => field.name === firstMissingGroup)
    : required.find(field => field.type === 'checkbox' ? !field.checked : !String(field.value || '').trim());
  if (firstMissing) {
    firstMissing.focus();
    question.classList.add('needs-answer');
    setTimeout(() => question.classList.remove('needs-answer'), 420);
    return false;
  }
  return true;
}

conciergeSteps.forEach((step, index) => {
  step.addEventListener('click', () => {
    const targetIndex = conciergeQuestions.findIndex(question => Number(question.dataset.chapter || 0) === index);
    if (targetIndex < 0) return;
    if (targetIndex > conciergeIndex && !canLeaveConciergeStep()) return;
    setConciergeStep(targetIndex);
  });
});
conciergePrev?.addEventListener('click', () => setConciergeStep(conciergeIndex - 1));
conciergeNext?.addEventListener('click', () => {
  if (!canLeaveConciergeStep()) return;
  setConciergeStep(conciergeIndex + 1);
});
conciergeForm?.addEventListener('keydown', event => {
  if (event.key !== 'Enter') return;
  const target = event.target;
  if (target instanceof HTMLTextAreaElement) return;
  if (target instanceof HTMLButtonElement) return;
  event.preventDefault();
  if (conciergeIndex >= conciergeQuestions.length - 1) return;
  if (!canLeaveConciergeStep()) return;
  setConciergeStep(conciergeIndex + 1);
});
conciergeForm?.addEventListener('change', event => {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) return;
  if (target.name === 'support') {
    const supportFields = [...conciergeForm.querySelectorAll('input[name="support"]')];
    if (target.value === 'Not sure yet' && target.checked) {
      supportFields.forEach(field => {
        if (field !== target) field.checked = false;
      });
    } else if (target.checked) {
      const unsure = supportFields.find(field => field.value === 'Not sure yet');
      if (unsure) unsure.checked = false;
    }
  }
  if (target.name === 'environments' || target.name === 'support') updatePricingGuidance();
});
/* ---------------------------------- Concierge confirmation modal --------- */
const conciergeModal = document.querySelector('[data-concierge-modal]');
let conciergeModalReturnFocus = null;

function closeConciergeModal() {
  if (!conciergeModal || conciergeModal.hidden) return;
  conciergeModal.hidden = true;
  document.body.classList.remove('concierge-modal-open');
  conciergeModalReturnFocus?.focus?.();
  conciergeModalReturnFocus = null;
}

function openConciergeModal(inquiryId) {
  if (!conciergeModal) return;
  const reference = conciergeModal.querySelector('[data-concierge-modal-reference]');
  if (reference) reference.textContent = inquiryId ? `Inquiry reference: ${inquiryId}` : '';
  conciergeModalReturnFocus = document.activeElement;
  conciergeModal.hidden = false;
  document.body.classList.add('concierge-modal-open');
  conciergeModal.querySelector('.concierge-modal-button')?.focus();
}

conciergeModal?.querySelectorAll('[data-concierge-modal-close]').forEach(node => {
  node.addEventListener('click', closeConciergeModal);
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') closeConciergeModal();
});

conciergeForm?.addEventListener('submit', event => {
  event.preventDefault();
  if (finalConfirm && !finalConfirm.checked) {
    finalConfirm.closest('.check')?.classList.add('needs-attention');
    return;
  }
  if (!canLeaveConciergeStep()) return;
  const invalidGroupIndex = conciergeQuestions.findIndex(question => {
    return [...question.querySelectorAll('[data-required-group]')].some(group => !group.querySelector('input:checked'));
  });
  if (invalidGroupIndex >= 0) {
    setConciergeStep(invalidGroupIndex);
    canLeaveConciergeStep();
    return;
  }
  const year = new Date().getFullYear();
  const randomPart = (crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`)
    .replace(/[^a-z0-9]/gi, '')
    .slice(0, 8)
    .toUpperCase();
  const inquiryId = `LA-${year}-${randomPart}`;
  const submittedAt = new Date().toISOString();
  const idField = conciergeForm.querySelector('[data-inquiry-id]');
  const timestampField = conciergeForm.querySelector('[data-submitted-at]');
  if (idField) idField.value = inquiryId;
  if (timestampField) timestampField.value = submittedAt;
  localStorage.setItem('lia-last-inquiry-id', inquiryId);
  localStorage.setItem('lia-last-inquiry-name', conciergeForm.elements.names?.value || '');
  const submitNote = conciergeForm.querySelector('.concierge-submit-note');
  submitNote?.classList.remove('is-visible');
  if (conciergeSubmit) {
    conciergeSubmit.disabled = true;
    conciergeSubmit.textContent = 'Sending request...';
  }
  const formData = new FormData(conciergeForm);
  const payload = {};
  formData.forEach((value, key) => {
    if (payload[key]) {
      payload[key] = Array.isArray(payload[key]) ? [...payload[key], value] : [payload[key], value];
    } else {
      payload[key] = value;
    }
  });
  // --- Delivery -----------------------------------------------------------
  // FormSubmit forwards the submission straight to the atelier inbox.
  // No account, no API key, no server code. The very first submission
  // triggers a one-time confirmation email that must be clicked once.
  payload._subject = `NEW PRIVATE DESIGN INQUIRY - ${payload.names || 'Private client'} - ${inquiryId}`;
  payload._replyto = payload.email || '';
  payload._template = 'table';
  payload._captcha = 'false';
  delete payload.website;
  delete payload['form-name'];
  delete payload.subject;

  fetch(`https://formsubmit.co/ajax/${ATELIER_INBOX}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload)
  })
    .then(async response => {
      const result = await response.json().catch(() => ({}));
      if (!response.ok || String(result.success) !== 'true') {
        throw new Error(result.message || 'Submission failed');
      }
      return result;
    })
    .then(() => {
      conciergeForm.classList.add('is-submitted');
      const success = conciergeForm.querySelector('[data-concierge-success]');
      const reference = conciergeForm.querySelector('[data-success-reference]');
      if (reference) reference.textContent = `Inquiry reference: ${inquiryId}`;
      if (success) success.hidden = false;
      openConciergeModal(inquiryId);
      success?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    })
    .catch(() => {
      if (conciergeSubmit) {
        conciergeSubmit.disabled = false;
        conciergeSubmit.textContent = 'Try again';
      }
      const note = conciergeForm.querySelector('.concierge-submit-note');
      if (note) {
        note.textContent = `The request could not be sent. Please email ${ATELIER_INBOX} directly and include your answers.`;
        note.classList.add('is-visible');
      }
    });
});
updatePricingGuidance();
setConciergeStep(0);

const inquiryReference = document.querySelector('[data-inquiry-reference]');
if (inquiryReference) {
  const storedReference = localStorage.getItem('lia-last-inquiry-id');
  inquiryReference.textContent = storedReference ? `Inquiry reference: ${storedReference}` : '';
}

const invitationFlow = document.querySelector('.invitation-flow');
const invitationSteps = [...document.querySelectorAll('.invitation-flow .invitation-step')];
const invitationProgress = [...document.querySelectorAll('[data-invitation-step]')];
const invitationPrev = document.querySelector('[data-invitation-prev]');
const invitationNext = document.querySelector('[data-invitation-next]');
const invitationPreviewModules = document.querySelector('[data-preview-modules]');
const invitationReviewModules = document.querySelector('[data-review-modules]');
const invitationPreviewLanguage = document.querySelector('[data-preview-language]');
const invitationReviewLanguage = document.querySelector('[data-review-language]');
const invitationPersonalPreview = document.querySelector('[data-personal-preview]');
const invitationPreviewMedia = document.querySelector('[data-preview-media]');
const invitationPreviewMusic = document.querySelector('[data-preview-music]');
const invitationPreviewMonogram = document.querySelector('[data-preview-monogram]');
const invitationPreviewPhoneDate = document.querySelector('[data-preview-phone-date]');
const invitationPreviewPhoneNames = document.querySelector('[data-preview-phone-names]');
let invitationStepIndex = 0;
let invitationMediaObjectUrl;
let invitationDraft = window.LiaInvitationConfig?.readDraft?.() || {};

function hydrateInvitationForm() {
  if (!invitationFlow || !window.LiaInvitationConfig) return;
  const draft = window.LiaInvitationConfig.normalizeConfig(invitationDraft);
  const setValue = (name, newValue, neutralValue = '') => {
    const field = invitationFlow.elements[name];
    const value = String(newValue || '');
    if (field && value && value !== neutralValue) field.value = value;
  };
  setValue('names', draft.couple.displayNames, 'Your Names');
  setValue('wedding_date', draft.wedding.date);
  setValue('ceremony_time', draft.wedding.time);
  setValue('venue_or_maps_link', draft.wedding.venue, 'Your Venue');
  setValue('welcome_message', draft.copy.storyMessage, 'Your story note will appear here.');
  setValue('primary_language', draft.presentation.language);
  setValue('music_mood', draft.media.musicMood);
  setValue('music_link', draft.media.musicLink);
  setValue('image_direction', draft.media.imageDirection);
  setValue('dining_options', draft.rsvp.diningOptions?.join(', '));
  const selected = new Set(draft.presentation.modules || []);
  invitationFlow.querySelectorAll('.rich-modules input').forEach(input => {
    input.checked = selected.has(input.value);
    input.closest('label')?.classList.toggle('selected', input.checked);
  });
}

function saveInvitationDraft() {
  if (!invitationFlow || !window.LiaInvitationConfig) return invitationDraft;
  invitationDraft = window.LiaInvitationConfig.buildFromForm(invitationFlow, invitationDraft);
  window.LiaInvitationConfig.writeDraft(invitationDraft);
  return invitationDraft;
}

function setInvitationStep(index) {
  if (!invitationFlow || !invitationSteps.length) return;
  invitationStepIndex = Math.max(0, Math.min(index, invitationSteps.length - 1));
  invitationSteps.forEach((step, stepIndex) => {
    step.classList.toggle('active', stepIndex === invitationStepIndex);
  });
  invitationProgress.forEach(button => {
    button.classList.toggle('active', Number(button.dataset.invitationStep) === invitationStepIndex);
  });
  if (invitationPrev) invitationPrev.style.visibility = invitationStepIndex === 0 ? 'hidden' : 'visible';
  if (invitationNext) invitationNext.textContent = invitationStepIndex === invitationSteps.length - 1 ? 'Send inquiry' : 'Continue';
}

function canLeaveInvitationStep(index) {
  const currentStep = invitationSteps[index];
  if (!currentStep) return true;
  const requiredFields = [...currentStep.querySelectorAll('[required]')];
  const status = currentStep.querySelector('.builder-status');
  const isComplete = requiredFields.every(field => String(field.value || '').trim());
  if (!isComplete && status) status.textContent = 'Please add your names, date and venue to continue.';
  if (isComplete && status) status.textContent = '';
  return isComplete;
}

function updateInvitationSummary() {
  const draft = saveInvitationDraft();
  const selectedModules = [...document.querySelectorAll('.rich-modules input:checked')]
    .map(input => input.value);
  const modulesText = draft.presentation?.modules?.length ? draft.presentation.modules.join(' · ') : (selectedModules.length ? selectedModules.join(' · ') : 'Guest Response');
  const language = draft.presentation?.language || document.querySelector('[name="primary_language"]')?.value || 'English';
  const mediaFile = document.querySelector('[data-media-upload]')?.files?.[0];
  const musicFile = document.querySelector('[data-music-upload]')?.files?.[0];
  const musicLink = document.querySelector('[data-music-link]')?.value?.trim();
  const musicMood = document.querySelector('[name="music_mood"]')?.value?.trim();
  if (invitationPreviewModules) invitationPreviewModules.textContent = modulesText;
  if (invitationReviewModules) invitationReviewModules.textContent = modulesText;
  if (invitationPreviewLanguage) invitationPreviewLanguage.textContent = language;
  if (invitationReviewLanguage) invitationReviewLanguage.textContent = language;
  if (invitationPreviewMedia) invitationPreviewMedia.textContent = draft.media?.personalMediaName ? draft.media.personalMediaName.replace(/\.[^.]+$/, '') : (mediaFile ? mediaFile.name.replace(/\.[^.]+$/, '') : 'Atelier visual');
  if (invitationPreviewMusic) invitationPreviewMusic.textContent = draft.media?.musicName ? draft.media.musicName.replace(/\.[^.]+$/, '') : (musicFile ? musicFile.name.replace(/\.[^.]+$/, '') : (musicLink || musicMood || 'Optional'));
  if (invitationPreviewMonogram) invitationPreviewMonogram.textContent = draft.couple?.monogram || 'L | A';
  if (invitationPreviewPhoneDate) invitationPreviewPhoneDate.textContent = draft.wedding?.dateDisplay && draft.wedding.dateDisplay !== 'Your Date' ? draft.wedding.dateDisplay : '';
  if (invitationPreviewPhoneNames) invitationPreviewPhoneNames.textContent = draft.couple?.displayNames && draft.couple.displayNames !== 'Your Names' ? draft.couple.displayNames : 'Enter';
}

async function updatePersonalMediaPreview(file) {
  if (!invitationPersonalPreview) return;
  if (invitationMediaObjectUrl) URL.revokeObjectURL(invitationMediaObjectUrl);
  invitationPersonalPreview.innerHTML = '';
  invitationPersonalPreview.classList.toggle('is-visible', Boolean(file));
  if (!file) {
    invitationDraft.media = { ...(invitationDraft.media || {}), personalMediaDataUrl: '', personalMediaType: '', personalMediaName: '' };
    window.LiaInvitationConfig?.writeDraft?.(invitationDraft);
    updateInvitationSummary();
    return;
  }
  invitationMediaObjectUrl = URL.createObjectURL(file);
  const media = document.createElement(file.type.startsWith('video/') ? 'video' : 'img');
  media.src = invitationMediaObjectUrl;
  if (media instanceof HTMLVideoElement) {
    media.muted = true;
    media.loop = true;
    media.playsInline = true;
    media.autoplay = true;
    media.play().catch(() => {});
  }
  invitationPersonalPreview.append(media);
  if (window.LiaInvitationConfig) {
    const result = await window.LiaInvitationConfig.readFileAsDataUrl(file).catch(() => ({ dataUrl: '', type: file.type, name: file.name, error: 'read-failed' }));
    invitationDraft.media = {
      ...(invitationDraft.media || {}),
      personalMediaDataUrl: result.dataUrl,
      personalMediaType: result.type || file.type,
      personalMediaName: result.name || file.name,
      personalMediaError: result.error || ''
    };
    window.LiaInvitationConfig.writeDraft(invitationDraft);
  }
  updateInvitationSummary();
}

async function updatePersonalMusicPreview(file) {
  if (!window.LiaInvitationConfig || !file) {
    updateInvitationSummary();
    return;
  }
  const result = await window.LiaInvitationConfig.readFileAsDataUrl(file).catch(() => ({ dataUrl: '', type: file.type, name: file.name, error: 'read-failed' }));
  invitationDraft.media = {
    ...(invitationDraft.media || {}),
    musicDataUrl: result.dataUrl,
    musicName: result.name || file.name,
    musicType: result.type || file.type,
    musicError: result.error || ''
  };
  window.LiaInvitationConfig.writeDraft(invitationDraft);
  updateInvitationSummary();
}

function openInvitationFlow(index = 0) {
  if (!invitationFlow) return;
  invitationFlow.classList.add('is-open');
  invitationFlow.setAttribute('aria-hidden', 'false');
  document.body.classList.add('invitation-flow-open');
  setInvitationStep(index);
}

function closeInvitationFlow() {
  if (!invitationFlow) return;
  invitationFlow.classList.remove('is-open');
  invitationFlow.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('invitation-flow-open');
}

document.querySelectorAll('[data-invitation-open]').forEach(trigger => {
  trigger.addEventListener('click', event => {
    event.preventDefault();
    openInvitationFlow(Number(trigger.dataset.step || 0));
  });
});

document.querySelector('[data-invitation-close]')?.addEventListener('click', closeInvitationFlow);

invitationProgress.forEach(button => {
  button.addEventListener('click', () => {
    const targetStep = Number(button.dataset.invitationStep || 0);
    if (targetStep > invitationStepIndex && !canLeaveInvitationStep(invitationStepIndex)) return;
    setInvitationStep(targetStep);
  });
});

invitationPrev?.addEventListener('click', () => setInvitationStep(invitationStepIndex - 1));
invitationNext?.addEventListener('click', () => {
  if (invitationStepIndex === invitationSteps.length - 1) {
    invitationFlow?.requestSubmit();
    return;
  }
  if (!canLeaveInvitationStep(invitationStepIndex)) return;
  setInvitationStep(invitationStepIndex + 1);
});

document.querySelectorAll('[data-invitation-skip]').forEach(trigger => {
  trigger.addEventListener('click', () => setInvitationStep(Number(trigger.dataset.invitationSkip || 0)));
});

document.querySelectorAll('.rich-modules input').forEach(input => {
  input.addEventListener('change', () => {
    input.closest('label')?.classList.toggle('selected', input.checked);
    updateInvitationSummary();
  });
});

document.querySelectorAll('.invitation-flow input, .invitation-flow textarea, .invitation-flow select').forEach(field => {
  field.addEventListener('input', updateInvitationSummary);
  field.addEventListener('change', updateInvitationSummary);
});
document.querySelector('[data-media-upload]')?.addEventListener('change', event => {
  updatePersonalMediaPreview(event.currentTarget.files?.[0]);
});
document.querySelector('[data-music-upload]')?.addEventListener('change', event => {
  updatePersonalMusicPreview(event.currentTarget.files?.[0]);
});
hydrateInvitationForm();
updateInvitationSummary();

document.querySelectorAll('.video-cover video').forEach(video => {
  const cover = video.closest('.video-cover');
  video.pause();
  cover?.addEventListener('pointerenter', () => {
    cover.classList.add('is-playing');
    video.play().catch(() => {});
  });
  cover?.addEventListener('pointerleave', () => {
    cover.classList.remove('is-playing');
    video.pause();
    video.currentTime = 0;
  });
  cover?.addEventListener('focusin', () => {
    cover.classList.add('is-playing');
    video.play().catch(() => {});
  });
  cover?.addEventListener('focusout', () => {
    cover.classList.remove('is-playing');
    video.pause();
    video.currentTime = 0;
  });
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && invitationFlow?.classList.contains('is-open')) closeInvitationFlow();
});




/* ============================================================
   Collapsible sections — click a heading to reveal its text.
   Any element marked data-collapse becomes an accordion whose
   first heading is the trigger and whose remaining children are
   the panel. Open by default on the first item of each group.
   ============================================================ */
(function initCollapsibles(){
  document.querySelectorAll('[data-collapse]').forEach((block, index) => {
    const heading = block.querySelector('h2, h3, h4, .collapse-title');
    if (!heading) return;

    const panel = document.createElement('div');
    panel.className = 'collapse-panel';
    while (heading.nextSibling) panel.appendChild(heading.nextSibling);
    block.appendChild(panel);

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'collapse-trigger';
    button.setAttribute('aria-expanded', 'false');
    heading.parentNode.insertBefore(button, heading);
    button.appendChild(heading);

    const mark = document.createElement('span');
    mark.className = 'collapse-mark';
    mark.setAttribute('aria-hidden', 'true');
    button.appendChild(mark);

    const setOpen = open => {
      block.classList.toggle('is-open', open);
      button.setAttribute('aria-expanded', String(open));
      panel.style.maxHeight = open ? panel.scrollHeight + 'px' : '0px';
    };

    button.addEventListener('click', () => setOpen(!block.classList.contains('is-open')));
    setOpen(index === 0 && block.hasAttribute('data-collapse-open'));
    window.addEventListener('resize', () => {
      if (block.classList.contains('is-open')) panel.style.maxHeight = panel.scrollHeight + 'px';
    });
  });
})();


