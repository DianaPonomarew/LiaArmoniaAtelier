(() => {
  'use strict';
  const params = new URLSearchParams(location.search), loading = document.getElementById('loading');
  const id = params.get('id'), token = params.get('token');
  if (!/^[a-f0-9-]{36}$/.test(id || '') || !token) { loading.textContent = 'This private review link is invalid. Please use the link in your venue submission notification.'; return; }
  const endpoint = '/api/atelier-inquiry?venueReview=1&id=' + encodeURIComponent(id) + '&token=' + encodeURIComponent(token);
  function add(list, label, value, link = false) {
    if (value == null || value === '') return;
    const dt = document.createElement('dt'), dd = document.createElement('dd'); dt.textContent = label;
    if (link) {
      try { const url = new URL(value); if (url.protocol !== 'https:' || url.username || url.password) return; const a = document.createElement('a'); a.href = url.href; a.target = '_blank'; a.rel = 'noreferrer noopener'; a.textContent = label; dd.append(a); } catch { return; }
    } else dd.textContent = Array.isArray(value) ? value.join(' · ') : String(value);
    list.append(dt, dd);
  }
  const dialog = document.getElementById('photoDialog');
  document.getElementById('closePhoto').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  fetch(endpoint, { cache: 'no-store' }).then(async response => {
    const result = await response.json(); if (!response.ok || !result.ok) throw new Error(result.error || 'The submission could not be opened.'); if (result.receiptUrl) document.getElementById('submission').dataset.receiptUrl = result.receiptUrl; return result.profile;
  }).then(profile => {
    document.getElementById('venueTitle').textContent = profile.venue_name;
    loading.textContent = [profile.city, profile.region, profile.country].filter(Boolean).join(', ');
    document.getElementById('reviewMainImage').src = endpoint + '&action=photo&number=0';
    document.getElementById('reviewMainImage').alt = profile.venue_name + ' · main image';
    document.getElementById('reviewFeatureName').textContent = profile.venue_name;
    document.getElementById('reviewDestination').textContent = [profile.city, profile.country].filter(Boolean).join(' · ');
    document.getElementById('reviewShortIntro').textContent = profile.short_description || profile.description.slice(0, 160);
    document.getElementById('reviewMainCaption').textContent = 'Main image' + (profile.image_filenames?.[0] ? ' · ' + profile.image_filenames[0] : '');
    const property = document.getElementById('propertyFacts'), contact = document.getElementById('privateFacts');
    for (const [label, key] of [['Property type', 'venue_type'], ['Experiences', 'experiences'], ['Seated capacity', 'seated_capacity'], ['Standing capacity', 'standing_capacity'], ['Capacity notes', 'capacity_notes'], ['On-site rooms', 'rooms'], ['On-site guests', 'sleeps'], ['Accommodation', 'accommodation_notes'], ['Exclusive use', 'exclusive_use'], ['Seasonality & restrictions', 'seasonality'], ['Property story', 'description'], ['Signature spaces', 'highlights']]) add(property, label, profile[key]);
    for (const [label, key] of [['Contact name', 'contact_name'], ['Business email', 'email'], ['Phone / WhatsApp', 'phone'], ['Instagram', 'instagram'], ['Indicative pricing', 'pricing_notes']]) add(contact, label, profile[key]);
    add(contact, 'Pricing permission', profile.publish_pricing ? 'May be proposed for publication, subject to final approval' : 'Private only');
    add(contact, 'Property website', profile.website, true); add(contact, 'Brochure / floor plan', profile.brochure_url, true); add(contact, 'Additional images', profile.media_url, true);
    if (profile.commercial?.status === 'accepted') {
      const schedule = profile.commercial.schedule;
      add(contact, 'Commercial terms', schedule.rate + '% · ' + schedule.eligible_categories.map(item => item.label).join(' · '));
      for (const [label, key] of [['Legal operator', 'legal_operator'], ['Operator address', 'business_address'], ['Authorized signatory', 'signatory_name'], ['Signatory role', 'signatory_role'], ['Invoice currency', 'invoice_currency']]) add(contact, label, schedule[key]);
      add(contact, 'Agreement accepted at', profile.commercial.accepted_at); add(contact, 'Terms version', profile.commercial.version); add(contact, 'Agreement integrity hash', profile.commercial.snapshot_sha256);
      const receipt = document.getElementById('submission').dataset.receiptUrl;
      if (receipt) add(contact, 'Download agreement copy', new URL(receipt, location.origin).href, true);
      add(contact, 'Email confirmation', profile.partner_receipt_sent_at ? 'Receipt email sent' : 'Receipt email delivery pending; downloadable copy is available');
    } else add(contact, 'Commercial terms', 'Earlier editorial-only submission. No commercial acceptance has been inferred.');
    add(contact, 'Permissions', 'Property representation, image rights and editorial preparation confirmed. Final public presentation still requires approval.');
    document.getElementById('imageCredits').textContent = 'Photography credits: ' + profile.image_credit;
    const gallery = document.getElementById('reviewGallery');
    for (let i = 1; i < profile.image_count; i++) {
      const figure = document.createElement('figure'), link = document.createElement('a'), image = document.createElement('img'), caption = document.createElement('figcaption');
      const source = endpoint + '&action=photo&number=' + i; link.href = source; image.src = source; image.alt = profile.venue_name + ' · photograph ' + (i + 1); image.loading = 'lazy';
      link.addEventListener('click', event => { event.preventDefault(); document.getElementById('largePhoto').src = source; dialog.showModal(); });
      caption.textContent = 'Gallery image ' + i + (profile.image_filenames?.[i] ? ' · ' + profile.image_filenames[i] : ''); link.append(image); figure.append(link, caption); gallery.append(figure);
    }
    document.getElementById('submissionMeta').textContent = 'Reference: ' + profile.id + ' · Submitted: ' + new Date(profile.submitted_at).toLocaleString() + ' · Permissions version: ' + profile.permissions_version;
    document.getElementById('submission').hidden = false;
  }).catch(error => { loading.textContent = error.message; });
})();
