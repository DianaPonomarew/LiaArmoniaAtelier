(() => {
  const nav = document.querySelector('.site-nav');
  const navToggle = document.querySelector('.nav-toggle');
  navToggle?.addEventListener('click', () => {
    const open = nav?.classList.toggle('menu-open') || false;
    navToggle.setAttribute('aria-expanded', String(open));
  });

  const quiz = document.querySelector('[data-direction-quiz]');
  const inquiry = document.querySelector('[data-design-inquiry]');
  let quizIndex = 0;
  let recommendation = '';

  const selected = (scope, name) => [...scope.querySelectorAll(`input[name="${name}"]:checked`)].map(input => input.value);
  const setChecked = (name, value) => {
    if (!inquiry) return;
    const field = [...inquiry.querySelectorAll(`input[name="${name}"]`)].find(input => input.value === value);
    if (field) field.checked = true;
  };

  if (quiz) {
    const form = quiz.querySelector('form');
    const steps = [...quiz.querySelectorAll('[data-quiz-step]')];
    const progress = quiz.querySelector('[data-quiz-progress]');
    const progressBar = quiz.querySelector('[data-quiz-progress-bar]');
    const back = quiz.querySelector('[data-quiz-back]');
    const next = quiz.querySelector('[data-quiz-next]');
    const error = quiz.querySelector('[data-quiz-error]');
    const result = quiz.querySelector('[data-quiz-result]');

    const showStep = index => {
      quizIndex = Math.max(0, Math.min(index, steps.length - 1));
      steps.forEach((step, stepIndex) => step.classList.toggle('active', stepIndex === quizIndex));
      progress.textContent = `${quizIndex + 1} of ${steps.length}`;
      progressBar.style.width = `${((quizIndex + 1) / steps.length) * 100}%`;
      back.disabled = quizIndex === 0;
      next.textContent = quizIndex === steps.length - 1 ? 'See My Direction' : 'Continue';
      error.textContent = '';
    };

    const validateStep = () => {
      const step = steps[quizIndex];
      const inputs = [...step.querySelectorAll('input')];
      if (!inputs.some(input => input.checked)) {
        error.textContent = 'Choose at least one answer to continue.';
        inputs[0]?.focus();
        return false;
      }
      return true;
    };

    const applyExclusiveUnsure = event => {
      const input = event.target;
      if (!(input instanceof HTMLInputElement) || input.type !== 'checkbox' || !input.checked) return;
      const peers = [...input.closest('.quiz-options').querySelectorAll('input[type="checkbox"]')];
      if (input.value === 'Not sure yet') peers.forEach(peer => { if (peer !== input) peer.checked = false; });
      else peers.forEach(peer => { if (peer.value === 'Not sure yet') peer.checked = false; });
    };

    const buildResult = () => {
      const moments = selected(form, 'quiz_moments');
      const venue = selected(form, 'quiz_venue')[0];
      const start = selected(form, 'quiz_start')[0];
      const clarity = selected(form, 'quiz_clarity')[0];
      const support = selected(form, 'quiz_support');
      const budget = selected(form, 'quiz_budget')[0];
      const knownMoments = moments.filter(item => item !== 'Not sure yet');
      const editionFit = start === 'Edition' && knownMoments.length === 1 && knownMoments[0] === 'Ceremony';
      const customFit = start === 'Custom' || knownMoments.length > 1 || !editionFit;
      recommendation = editionFit && !customFit ? 'Design Edition' : 'Private Wedding Design';

      const title = quiz.querySelector('[data-result-title]');
      const reason = quiz.querySelector('[data-result-reason]');
      const includes = quiz.querySelector('[data-result-includes]');
      const boundary = quiz.querySelector('[data-result-boundary]');
      const notes = quiz.querySelector('[data-result-notes]');
      title.textContent = recommendation;

      if (recommendation === 'Design Edition') {
        reason.textContent = 'You are focused on a ceremony and are open to an existing visual system, so a Design Edition is the clearest first route.';
        includes.innerHTML = '<li>A pre-developed ceremony concept</li><li>Visual direction and production logic</li><li>A protected design dossier after purchase</li>';
        boundary.textContent = 'A Design Edition is ceremony-only. Venue adaptation, broader wedding spaces and production support require a separate inquiry.';
      } else {
        const reasonLead = knownMoments.length > 1
          ? 'You want several connected moments to read as one world.'
          : start === 'Custom'
            ? 'You are looking for a direction developed specifically for your wedding.'
            : 'Your answers would benefit from a personally reviewed, flexible design scope.';
        reason.textContent = `${reasonLead} Private Wedding Design is the most relevant starting point.`;
        includes.innerHTML = '<li>Creative direction</li><li>Spatial design for the agreed environments</li><li>Visualisation before production</li><li>Design documentation for delivery teams</li>';
        boundary.textContent = 'Full wedding planning and third-party production are not automatically included. Additional sourcing or direction is confirmed in the proposal.';
      }

      const noteParts = [];
      if (venue === 'Searching' || venue === 'Not sure yet') noteParts.push('<p><b>Venue:</b> Your recommendation should also consider Venue Discovery support.</p>');
      if (support.includes('Production direction') || support.includes('On-site direction')) noteParts.push('<p><b>Production:</b> You asked for implementation support. Lia will review whether production or on-site direction fits the project.</p>');
      if (clarity === 'Open' || clarity === 'Not sure yet') noteParts.push('<p><b>Vision:</b> An open starting point is welcome; the first phase can establish the creative direction.</p>');
      noteParts.push(`<p><b>Production budget:</b> ${budget}. This is separate from Lia's design fee.</p>`);
      notes.innerHTML = noteParts.join('');

      const hiddenValues = { recommendation, venue, start, clarity };
      Object.entries(hiddenValues).forEach(([key, value]) => {
        const field = inquiry?.querySelector(`[data-quiz-field="${key}"]`);
        if (field) field.value = value || '';
      });
      result.hidden = false;
      form.hidden = true;
      result.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    form.addEventListener('change', applyExclusiveUnsure);
    back.addEventListener('click', () => showStep(quizIndex - 1));
    next.addEventListener('click', () => {
      if (!validateStep()) return;
      if (quizIndex < steps.length - 1) showStep(quizIndex + 1);
      else buildResult();
    });
    quiz.querySelector('[data-quiz-edit]').addEventListener('click', () => {
      result.hidden = true;
      form.hidden = false;
      showStep(0);
    });
    quiz.querySelector('[data-quiz-continue]').addEventListener('click', () => {
      const hiddenValues = {
        recommendation,
        venue: selected(form, 'quiz_venue')[0],
        start: selected(form, 'quiz_start')[0],
        clarity: selected(form, 'quiz_clarity')[0]
      };
      if (inquiry) {
        inquiry.elements.quiz_recommendation.value = hiddenValues.recommendation || '';
        inquiry.elements.quiz_venue_status.value = hiddenValues.venue || '';
        inquiry.elements.quiz_starting_point.value = hiddenValues.start || '';
        inquiry.elements.quiz_vision_clarity.value = hiddenValues.clarity || '';
      }
      const momentMap = {'Ceremony':'Ceremony','Cocktail hour':'Cocktail hour','Reception / dinner':'Reception','Arrival / lounge':'Arrival'};
      selected(form, 'quiz_moments').forEach(item => setChecked('environments', momentMap[item]));
      const venue = selected(form, 'quiz_venue')[0];
      if (venue === 'Searching' || venue === 'Not sure yet') setChecked('support', 'Venue Discovery');
      const supportMap = {
        'Creative direction':'Creative Direction + Visual Design',
        'Spatial design and visualisation':'Full Design Development',
        'Vendor sourcing':'Vendor / Specialist Sourcing',
        'Production direction':'Production Direction',
        'On-site direction':'On-Site Creative Direction',
        'Not sure yet':'Not sure yet'
      };
      selected(form, 'quiz_support').forEach(item => setChecked('support', supportMap[item]));
      setChecked('production_range', selected(form, 'quiz_budget')[0]);
      updateFeeGuidance();
    });
    showStep(0);
  }

  function formatUsd(amount) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
  }

  function updateFeeGuidance() {
    if (!inquiry) return;
    const total = inquiry.querySelector('[data-fee-total]');
    const summary = inquiry.querySelector('[data-fee-summary]');
    const breakdownNode = inquiry.querySelector('[data-fee-breakdown]');
    const environments = selected(inquiry, 'environments');
    const support = selected(inquiry, 'support');
    if (!environments.length) {
      total.textContent = 'Select the spaces and support above';
      summary.textContent = 'This uses Lia Armonía\'s published starting-point rules. Final scope is confirmed after review.';
      breakdownNode.innerHTML = '';
      return;
    }
    let estimate = environments.length <= 2 ? 3000 : environments.length <= 4 ? 4500 : 6000;
    const breakdown = [`Visual design for ${environments.length} ${environments.length === 1 ? 'environment' : 'environments'}: ${formatUsd(estimate)}`];
    if (support.includes('Full Design Development')) {
      estimate = Math.max(estimate, 7500);
      breakdown.push('Full design development: 10% of design-production investment, $7,500 minimum');
    }
    [
      ['Venue Discovery', 1500, 'Venue discovery'],
      ['Vendor / Specialist Sourcing', 1500, 'Vendor and specialist sourcing'],
      ['Production Direction', 2500, 'Production direction'],
      ['On-Site Creative Direction', 2500, 'On-site creative direction, first day']
    ].forEach(([value, amount, label]) => {
      if (!support.includes(value)) return;
      estimate += amount;
      breakdown.push(`${label}: +${formatUsd(amount)}`);
    });
    total.textContent = `Starting from ${formatUsd(estimate)}`;
    summary.textContent = support.includes('Full Design Development')
      ? 'Full design development is calculated from production scope and begins at the minimum shown.'
      : 'A preliminary indication based on the environments and support selected.';
    breakdownNode.innerHTML = breakdown.map(item => `<li>${item}</li>`).join('');
    let field = inquiry.querySelector('[name="preliminary_fee_guidance"]');
    if (!field) {
      field = document.createElement('input');
      field.type = 'hidden';
      field.name = 'preliminary_fee_guidance';
      inquiry.append(field);
    }
    field.value = `${formatUsd(estimate)} starting guidance`;
  }

  if (inquiry) {
    inquiry.addEventListener('change', event => {
      const input = event.target;
      if (!(input instanceof HTMLInputElement)) return;
      if (input.name === 'support' && input.type === 'checkbox' && input.checked) {
        const peers = [...inquiry.querySelectorAll('input[name="support"]')];
        if (input.value === 'Not sure yet') peers.forEach(peer => { if (peer !== input) peer.checked = false; });
        else peers.forEach(peer => { if (peer.value === 'Not sure yet') peer.checked = false; });
      }
      if (input.name === 'environments' || input.name === 'support') updateFeeGuidance();
    });

    inquiry.addEventListener('submit', async event => {
      event.preventDefault();
      const status = inquiry.querySelector('[data-form-status]');
      const missingGroup = [...inquiry.querySelectorAll('[data-form-group]')].find(group => !group.querySelector('input:checked'));
      if (missingGroup) {
        status.textContent = 'Please choose at least one design moment and one type of support.';
        missingGroup.scrollIntoView({ behavior: 'smooth', block: 'center' });
        missingGroup.querySelector('input')?.focus();
        return;
      }
      if (!inquiry.checkValidity()) {
        status.textContent = 'Please complete the required fields before sending.';
        inquiry.reportValidity();
        return;
      }
      if (['localhost', '127.0.0.1'].includes(window.location.hostname)) {
        status.textContent = 'Preview mode: validation passed. No real inquiry was sent.';
        return;
      }
      const submit = inquiry.querySelector('[type="submit"]');
      submit.disabled = true;
      submit.textContent = 'Sending request...';
      status.textContent = '';
      const year = new Date().getFullYear();
      const randomPart = (crypto.randomUUID?.() || String(Date.now())).replace(/[^a-z0-9]/gi, '').slice(0, 8).toUpperCase();
      const inquiryId = `LA-${year}-${randomPart}`;
      inquiry.querySelector('[data-inquiry-id]').value = inquiryId;
      inquiry.querySelector('[data-submitted-at]').value = new Date().toISOString();
      if (quiz) {
        inquiry.elements.quiz_recommendation.value = recommendation || '';
        inquiry.elements.quiz_venue_status.value = selected(quiz, 'quiz_venue')[0] || '';
        inquiry.elements.quiz_starting_point.value = selected(quiz, 'quiz_start')[0] || '';
        inquiry.elements.quiz_vision_clarity.value = selected(quiz, 'quiz_clarity')[0] || '';
      }
      const payload = {};
      new FormData(inquiry).forEach((value, key) => {
        payload[key] = payload[key] ? (Array.isArray(payload[key]) ? [...payload[key], value] : [payload[key], value]) : value;
      });
      if (quiz) {
        payload.quiz_recommendation = recommendation || '';
        payload.quiz_venue_status = selected(quiz, 'quiz_venue')[0] || '';
        payload.quiz_starting_point = selected(quiz, 'quiz_start')[0] || '';
        payload.quiz_vision_clarity = selected(quiz, 'quiz_clarity')[0] || '';
      }
      try {
        const response = await fetch('/api/private-design-consultation', {
          method: 'POST',
          headers: {'Content-Type':'application/json'},
          body: JSON.stringify(payload)
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || 'Submission failed');
        inquiry.querySelectorAll('fieldset,.review-box,.submit-button').forEach(node => node.hidden = true);
        const success = inquiry.querySelector('[data-inquiry-success]');
        success.hidden = false;
        inquiry.querySelector('[data-success-reference]').textContent = `Inquiry reference: ${result.inquiryId || inquiryId}`;
        success.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } catch {
        status.textContent = 'The inquiry was not sent. Please try again or email atelier@liaarmonia.com.';
        submit.disabled = false;
        submit.textContent = 'Try Again';
      }
    });
    updateFeeGuidance();
  }
})();
