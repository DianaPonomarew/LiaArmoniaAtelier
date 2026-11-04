(() => {
  document.querySelectorAll('[data-la4-year]').forEach(el => { el.textContent = new Date().getFullYear(); });
  const f = document.getElementById('la4-venue-form');
  if (f) f.addEventListener('submit', e => {
    e.preventDefault();
    const v = f.elements;
    const subject = 'Venue Discovery Inquiry — LIA ARMONÍA';
    const body = [
      'Hello Lia Armonía,',
      '',
      'I would like to explore European wedding venue options.',
      'Destination: ' + v.destination.value,
      'Architecture: ' + v.architecture.value,
      'Guest count: ' + v.guests.value,
      '',
      'Preferred wedding date:',
      'Approximate budget:',
      '',
      'Thank you.'
    ].join('\n');
    location.href='mailto:atelier@liaarmonia.com?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body);
  });
})();