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
    const result = await response.json(); if (!response.ok || !result.ok) throw new Error(result.error || 'The submission could not be opened.'); return result.profile;
  }).then(profile => {
    document.getElementById('venueTitle').textContent = profile.venue_name;
    loading.textContent = [profile.city, profile.region, profile.country].filter(Boolean).join(', ');
    const property = document.getElementById('propertyFacts'), contact = document.getElementById('privateFacts');
    for (const [label, key] of [['Property type', 'venue_type'], ['Experiences', 'experiences'], ['Seated capacity', 'seated_capacity'], ['Standing capacity', 'standing_capacity'], ['Capacity notes', 'capacity_notes'], ['On-site rooms', 'rooms'], ['On-site guests', 'sleeps'], ['Accommodation', 'accommodation_notes'], ['Exclusive use', 'exclusive_use'], ['Seasonality & restrictions', 'seasonality'], ['Property story', 'description'], ['Signature spaces', 'highlights']]) add(property, label, profile[key]);
    for (const [label, key] of [['Contact name', 'contact_name'], ['Business email', 'email'], ['Phone / WhatsApp', 'phone'], ['Instagram', 'instagram'], ['Indicative pricing', 'pricing_notes']]) add(contact, label, profile[key]);
    add(contact, 'Pricing permission', profile.publish_pricing ? 'May be proposed for publication, subject to final approval' : 'Private only');
    add(contact, 'Property website', profile.website, true); add(contact, 'Brochure / floor plan', profile.brochure_url, true); add(contact, 'Additional images', profile.media_url, true);
    add(contact, 'Commercial terms', 'To be confirmed separately. This submission accepts no referral commission.');
    add(contact, 'Permissions', 'Property representation, image rights, editorial preparation and privacy consent confirmed.');
    document.getElementById('imageCredits').textContent = 'Photography credits: ' + profile.image_credit;
    const gallery = document.getElementById('reviewGallery');
    for (let i = 0; i < profile.image_count; i++) {
      const figure = document.createElement('figure'), link = document.createElement('a'), image = document.createElement('img'), caption = document.createElement('figcaption');
      const source = endpoint + '&action=photo&number=' + i; link.href = source; image.src = source; image.alt = profile.venue_name + ' · photograph ' + (i + 1); image.loading = 'lazy';
      link.addEventListener('click', event => { event.preventDefault(); document.getElementById('largePhoto').src = source; dialog.showModal(); });
      caption.textContent = (i === 0 ? 'Proposed lead image' : 'Property image ' + (i + 1)) + (profile.image_filenames?.[i] ? ' · ' + profile.image_filenames[i] : ''); link.append(image); figure.append(link, caption); gallery.append(figure);
    }
    document.getElementById('submissionMeta').textContent = 'Reference: ' + profile.id + ' · Submitted: ' + new Date(profile.submitted_at).toLocaleString() + ' · Permissions version: ' + profile.permissions_version;
    document.getElementById('submission').hidden = false;
  }).catch(error => { loading.textContent = error.message; });
})();
