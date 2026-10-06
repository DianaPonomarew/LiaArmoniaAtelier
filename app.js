const hero = document.querySelector('.hero');
const venuePanorama = document.querySelector('.venue-panorama');
const roomButtons = [...document.querySelectorAll('.room-hotspots button')];
const roomName = document.getElementById('roomName');
let activeRoom = 0;
let roomTimer;
let roomMoveTimer;

const rooms = [
  { name: 'Vision', x: '50%', position: '50% 50%', image: "url('assets/lia-hero-vision-1000115928.png')" },
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
  form.addEventListener('submit', event => {
    event.preventDefault();
    const status = form.querySelector('.form-status');
    const styleOptions = form.querySelectorAll('input[name="style"]');
    if (styleOptions.length && ![...styleOptions].some(option => option.checked)) {
      if (status) status.textContent = 'Please choose at least one style direction.';
      return;
    }
    const button = form.querySelector('button[type="submit"]');
    const originalLabel = button?.textContent || 'Send';
    if (button) {
      button.disabled = true;
      button.textContent = 'Sending...';
    }
    if (status) status.textContent = 'Your note is being sent.';
    const payload = {};
    new FormData(form).forEach((value, key) => {
      if (payload[key]) payload[key] = Array.isArray(payload[key]) ? [...payload[key], value] : [payload[key], value];
      else payload[key] = value;
    });
    fetch(form.getAttribute('action') || '/api/atelier-inquiry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(async response => {
        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
          const error = new Error(result.error || 'Submission failed');
          error.status = response.status;
          throw error;
        }
        return result;
      })
      .then(() => {
        form.reset();
        if (button) button.textContent = 'Inquiry sent';
        if (status) status.textContent = 'Thank you. Your note has been sent to the atelier.';
      })
      .catch(error => {
        if (button) {
          button.disabled = false;
          button.textContent = originalLabel;
        }
        if (status) {
          if (error?.status === 404) {
            status.textContent = 'The email function is missing on Vercel. Deploy this folder with the api directory at the project root.';
          } else if (error?.message === 'Email service is not configured.') {
            status.textContent = 'Email delivery is not connected on Vercel yet. Add the Resend environment variables, then redeploy.';
          } else {
            status.textContent = 'The note could not be sent. Please try again or email atelier@liaarmonia.com.';
          }
        }
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
  if (conciergeNext) conciergeNext.style.display = conciergeIndex === conciergeQuestions.length - 1 ? 'none' : 'inline-flex';
  if (conciergeSubmit) conciergeSubmit.style.display = conciergeIndex === conciergeQuestions.length - 1 ? 'inline-flex' : 'none';
  conciergeActions?.classList.toggle('is-final-step', conciergeIndex === conciergeQuestions.length - 1);
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
conciergeForm?.addEventListener('submit', event => {
  event.preventDefault();
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
  payload.form_name = 'private-design-consultation';
  fetch('/api/private-design-consultation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
    .then(async response => {
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        const error = new Error(result.error || 'Submission failed');
        error.status = response.status;
        throw error;
      }
      return result;
    })
    .then(result => {
      const confirmedInquiryId = result.inquiryId || inquiryId;
      conciergeForm.classList.add('is-submitted');
      const success = conciergeForm.querySelector('[data-concierge-success]');
      const reference = conciergeForm.querySelector('[data-success-reference]');
      if (reference) reference.textContent = `Inquiry reference: ${confirmedInquiryId}`;
      if (success) success.hidden = false;
      success?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    })
    .catch(error => {
      if (conciergeSubmit) {
        conciergeSubmit.disabled = false;
        conciergeSubmit.textContent = 'Try again';
      }
      const note = conciergeForm.querySelector('.concierge-submit-note');
      if (note) {
        if (error?.status === 404) {
          note.textContent = 'The email function is missing on Vercel. Deploy this folder with the api directory at the project root, then the request will send automatically.';
        } else if (error?.message === 'Email service is not configured.') {
          note.textContent = 'Email delivery is not connected on Vercel yet. Add the Resend environment variables, redeploy, and this request will send automatically.';
        } else {
          note.textContent = 'Email delivery did not complete. Please try once more or email atelier@liaarmonia.com with your answers.';
        }
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

(() => {
  const checkoutButtons = document.querySelectorAll('[data-design-edition-checkout]');
  const checkoutStatus = document.querySelectorAll('[data-design-edition-status]');
  const accessRoot = document.querySelector('[data-design-edition-access]');
  let editionConfig = window.LIA_DESIGN_EDITIONS?.products?.['burgundy-chartreuse'];

  const trackEditionEvent = (name, params = {}) => {
    const payload = {
      design_edition_slug: 'burgundy-chartreuse',
      design_edition_number: '01',
      ...params
    };
    if (typeof window.gtag === 'function') window.gtag('event', name, payload);
    if (typeof window.plausible === 'function') window.plausible(name, { props: payload });
    window.dataLayer?.push?.({ event: name, ...payload });
  };

  const applyEditionConfig = config => {
    if (!config) return;
    editionConfig = config;
    document.querySelectorAll('[data-design-edition-price]').forEach(node => {
      node.textContent = editionConfig.priceLabel;
    });
    checkoutButtons.forEach(button => {
      button.textContent = button.dataset.designEditionCheckoutLabel === 'purchase'
        ? `Purchase Edition — ${editionConfig.priceLabel}`
        : editionConfig.ctaLabel;
    });
  };

  applyEditionConfig(editionConfig);

  if (checkoutButtons.length || accessRoot) {
    fetch('/api/design-edition-config')
      .then(response => (response.ok ? response.json() : null))
      .then(payload => applyEditionConfig(payload?.products?.['burgundy-chartreuse']))
      .catch(() => {});
  }

  if (document.body.classList.contains('de-product')) {
    trackEditionEvent('design_edition_view', {
      value: editionConfig?.price || 1200,
      currency: 'USD'
    });
  }

  const setEditionStatus = message => {
    checkoutStatus.forEach(node => {
      node.textContent = message;
    });
  };

  checkoutButtons.forEach(button => {
    button.addEventListener('click', async () => {
      button.disabled = true;
      setEditionStatus('Opening secure checkout...');
      trackEditionEvent('design_edition_checkout_started', {
        value: editionConfig?.price || 1200,
        currency: 'USD'
      });

      try {
        const response = await fetch('/api/design-edition-checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productSlug: 'burgundy-chartreuse' })
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload.url) {
          throw new Error(payload.error || 'Checkout could not be opened.');
        }
        window.location.assign(payload.url);
      } catch (error) {
        setEditionStatus(`${error.message} Please email atelier@liaarmonia.com if this continues.`);
        button.disabled = false;
      }
    });
  });

  if (!accessRoot) return;

  const escapeEditionHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[char]);

  const renderAccessError = message => {
    accessRoot.innerHTML = `
      <section class="de-access-loading de-access-denied">
        <p class="de-eyebrow">Private Access</p>
        <h1>We could not verify this purchase.</h1>
        <p>${escapeEditionHtml(message)}</p>
        <a class="de-primary-button" href="mailto:atelier@liaarmonia.com?subject=Design%20Edition%20Access%20Help">Email the Atelier</a>
      </section>
    `;
  };

  const renderProtectedEdition = (payload, sessionId) => {
    const sections = payload.edition?.sections || [];
    const downloads = payload.edition?.downloads || [];
    const gallery = payload.edition?.gallery || [];
    const title = payload.edition?.title || 'Burgundy + Chartreuse';
    const summary = payload.edition?.summary || '';

    accessRoot.innerHTML = `
      <section class="de-private-hero">
        <div>
          <p class="de-eyebrow">Design Edition 01</p>
          <h1>Your Design Edition is ready.</h1>
          <p class="de-private-subtitle">Welcome inside the ${escapeEditionHtml(title)} ceremony design direction.</p>
          <p>${escapeEditionHtml(summary)}</p>
          <small>Private access verified${payload.buyerEmail ? ` for ${escapeEditionHtml(payload.buyerEmail)}` : ''}.</small>
          <div class="de-action-row">
            <a class="de-primary-button" data-edition-pdf-open href="/api/design-edition-download?asset=dossier&session_id=${encodeURIComponent(sessionId)}">Open the Design Edition</a>
            <a class="de-secondary-button" data-edition-digital-open href="/api/design-edition-digital?session_id=${encodeURIComponent(sessionId)}">View Digital Edition</a>
          </div>
        </div>
        <figure><img src="assets/design-edition-burgundy-chartreuse-center-aisle.jpg" alt=""></figure>
      </section>

      <nav class="de-private-nav" aria-label="Edition sections">
        ${sections.map(section => `<a href="#${escapeEditionHtml(section.id)}">${escapeEditionHtml(section.number)} ${escapeEditionHtml(section.title)}</a>`).join('')}
      </nav>

      <section class="de-private-gallery" aria-label="Visual library">
        ${gallery.map((src, index) => `<figure><img src="${escapeEditionHtml(src)}" alt="Burgundy Chartreuse visual library ${index + 1}"></figure>`).join('')}
      </section>

      <section class="de-private-sections">
        ${sections.map(section => `
          <article id="${escapeEditionHtml(section.id)}">
            <span>${escapeEditionHtml(section.number)}</span>
            <h2>${escapeEditionHtml(section.title)}</h2>
            <p>${escapeEditionHtml(section.body)}</p>
          </article>
        `).join('')}
      </section>

      <section class="de-downloads">
        <div>
          <p class="de-eyebrow">Downloads</p>
          <h2>Your protected ceremony files.</h2>
          <p>The PDF dossier is the primary working file. Each link verifies the Stripe session before serving the protected asset.</p>
        </div>
        <div class="de-download-grid">
          ${downloads.map(download => `
            <a class="de-download-card" href="/api/design-edition-download?asset=${encodeURIComponent(download.key)}&session_id=${encodeURIComponent(sessionId)}">
              <span>${escapeEditionHtml(download.type)}</span>
              <strong>${escapeEditionHtml(download.label)}</strong>
              <em>Download →</em>
            </a>
          `).join('')}
        </div>
      </section>

      <section class="de-upsell">
        <div>
          <p class="de-eyebrow">Make This Design Yours</p>
          <h2>Adapt this edition to a real venue.</h2>
          <p>Share the setting, guest count and ceremony production range. The atelier can review whether this direction belongs in your space or should be adjusted before production begins.</p>
        </div>
        <form class="de-upsell-form" data-design-edition-upsell>
          <label>Venue name or link<input name="venue" placeholder="Venue, website or Google Maps link"></label>
          <label>Wedding location<input name="location" placeholder="Orange County / Italy / still searching"></label>
          <label>Date or season<input name="date" placeholder="September 2027 / Fall 2027"></label>
          <label>Guest count<input name="guestCount" placeholder="80"></label>
          <label>Approximate production budget<input name="productionBudget" placeholder="$15,000 - $29,000 / to be discussed"></label>
          <label>Your email<input name="email" type="email" placeholder="you@email.com" required></label>
          <label class="de-upsell-wide">What should the atelier know?<textarea name="message" rows="5" placeholder="Tell us about the venue, feeling, timing or what you want to adapt."></textarea></label>
          <button class="de-primary-button" type="submit">Adapt This Edition to My Venue</button>
          <p data-upsell-status></p>
        </form>
      </section>
    `;

    trackEditionEvent('design_edition_purchase_success');
    accessRoot.querySelector('[data-edition-pdf-open]')?.addEventListener('click', () => {
      trackEditionEvent('design_edition_pdf_opened');
    });
    accessRoot.querySelector('[data-edition-digital-open]')?.addEventListener('click', () => {
      trackEditionEvent('design_edition_digital_view_opened');
    });
    accessRoot.querySelectorAll('.de-download-card').forEach(link => {
      link.addEventListener('click', () => {
        if (link.href.includes('asset=dossier')) trackEditionEvent('design_edition_pdf_opened');
      });
    });

    accessRoot.querySelector('[data-design-edition-upsell]')?.addEventListener('submit', async event => {
      event.preventDefault();
      const form = event.currentTarget;
      const status = form.querySelector('[data-upsell-status]');
      const data = Object.fromEntries(new FormData(form).entries());
      status.textContent = 'Sending to the atelier...';

      try {
        const response = await fetch('/api/atelier-inquiry', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'Design Edition adaptation',
            subject: 'Design Edition Adaptation — Burgundy + Chartreuse',
            email: data.email,
            message: [
              'Design Edition adaptation request',
              `Venue: ${data.venue || 'Not provided'}`,
              `Location: ${data.location || 'Not provided'}`,
              `Date: ${data.date || 'Not provided'}`,
              `Guest count: ${data.guestCount || 'Not provided'}`,
              `Production budget: ${data.productionBudget || 'Not provided'}`,
              `Message: ${data.message || 'Not provided'}`
            ].join('\n')
          })
        });
        if (!response.ok) throw new Error('The request could not be sent.');
        status.textContent = 'Request sent. The atelier will review your venue direction.';
        form.reset();
      } catch {
        status.innerHTML = 'Please email <a href="mailto:atelier@liaarmonia.com">atelier@liaarmonia.com</a> with your venue details.';
      }
    });
  };

  const initDesignEditionAccess = async () => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');
    if (!sessionId) {
      renderAccessError('The private access link is missing its Stripe session.');
      return;
    }

    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        const response = await fetch(`/api/design-edition-access?session_id=${encodeURIComponent(sessionId)}`);
        const payload = await response.json().catch(() => ({}));
        if (response.ok) {
          renderProtectedEdition(payload, sessionId);
          return;
        }
        if (response.status !== 402 || attempt === 4) {
          throw new Error(payload.error || 'Purchase verification failed.');
        }
        await new Promise(resolve => window.setTimeout(resolve, 1200));
      } catch (error) {
        if (attempt === 4) renderAccessError(error.message);
      }
    }
  };

  initDesignEditionAccess();
})();

