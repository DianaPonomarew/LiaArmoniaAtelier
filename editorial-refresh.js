
(() => {
  const nav = document.querySelector('.er-nav');
  const toggle = document.querySelector('.er-menu');
  if (nav && toggle) {
    const setOpen = (open) => {
      nav.dataset.menuOpen = String(open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    };
    toggle.addEventListener('click', () => setOpen(nav.dataset.menuOpen !== 'true'));
    nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setOpen(false)));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
  }
  document.querySelectorAll('[data-er-year]').forEach(el => { el.textContent = new Date().getFullYear(); });
  const form = document.getElementById('er-finder-form');
  if (form) {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const destination = form.elements.destination.value;
      const architecture = form.elements.architecture.value;
      const guests = form.elements.guests.value;
      const subject = 'Private European venue discovery | LIA ARMONÍA';
      const body = [
        'Hello LIA ARMONÍA,', '',
        'I would love assistance finding a wedding venue.', '',
        'Preferred destination: ' + destination,
        'Architectural direction: ' + architecture,
        'Approximate guest count: ' + guests, '',
        'Preferred wedding date:', 'Approximate total wedding budget:', '',
        'Thank you!'
      ].join('\n');
      window.location.href = 'mailto:atelier@liaarmonia.com?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
    });
  }
})();
