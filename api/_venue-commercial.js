import { createHash } from 'node:crypto';
import { VENUE_TERMS } from '../venue-partnership-terms-data.js';
import { INDIVIDUAL_VENUE_OFFERS } from './_venue-individual-offers.js';

export const COMMERCIAL_VERSION = VENUE_TERMS.version;
export const CATEGORY_DETAILS = {
  venue_hire: { key: 'venue_hire', label: 'Net venue hire', description: 'Your own separately identified event-space hire, after discounts and refunds.' },
  group_rooms: { key: 'group_rooms', label: 'Referred group accommodation', description: 'Net room revenue attributable to the registered referred group and project; unrelated individual stays are excluded.' },
  private_event_package: { key: 'private_event_package', label: 'Private event package or contracted food and beverage minimum', description: 'The agreed private-event package or contracted minimum actually received, counted once. Incidental guest spending and public restaurant sales are excluded.' }
};
const EXCLUSIONS = ['VAT / sales tax and tourist taxes', 'Service charges and gratuities', 'Refundable security deposits', 'Independent third-party supplier charges', 'Separately priced rooms, catering, food and beverage, equipment and planning unless expressly selected in your schedule', 'All revenue categories not expressly included in your schedule', 'Unrelated direct bookings, future events and incidental guest spending'];
const normal = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const text = (value, max) => String(value ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);
const fail = (message, status = 400) => { const error = new Error(message); error.status = status; throw error; };
export const sha256 = value => createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');
export const fullTermsText = terms => `${terms.version}\n${terms.intro}\n\n` + terms.sections.map((section, i) => `${i + 1}. ${section.title}\n${section.paragraphs.join('\n\n')}`).join('\n\n');

function individual(code) {
  if (!code) return null;
  const found = INDIVIDUAL_VENUE_OFFERS.find(offer => offer.code === code);
  if (!found) fail('This personal invitation was not found. Please ask the atelier for your current invitation link.', 404);
  return found;
}
export function venueOffer(code = '') {
  const special = individual(String(code));
  return {
    reference: special?.reference || 'STANDARD-VENUE-HIRE-10',
    property: special?.property || '',
    rate: special?.rate || 10,
    categories: (special?.categories || ['venue_hire']).map(key => CATEGORY_DETAILS[key]),
    exclusions: EXCLUSIONS,
    version: VENUE_TERMS.version,
    termsUrl: VENUE_TERMS.termsPath,
    termsPdfUrl: VENUE_TERMS.pdfPath,
    privacyUrl: VENUE_TERMS.privacyPath,
    termsHash: sha256(VENUE_TERMS),
    payment: 'Commission is invoiced proportionately after eligible client funds are received and retained, payable within 14 calendar days of a valid invoice.',
    attribution: 'A named client and project introduced by LIA, with a resulting booking signed within 12 months. Active prior enquiries should be flagged within five business days with reasonable evidence; genuine later evidence is considered fairly.',
    cancellation: 'Unpaid or refunded eligible revenue creates no commission. Eligible nonrefundable sums retained remain commissionable. Postponements are reconciled once.',
    freeProfile: 'No listing fee or exclusivity. Final profile approval is required before publication. Hosted stays and bespoke content need a separate written scope.'
  };
}

export function commercialDeclaration(body) {
  if (body.terms_version !== VENUE_TERMS.version) fail('The partnership terms have been updated. Please reload the form and review the current schedule before agreeing.', 409);
  if (body.terms_acceptance !== true) fail('Please read and expressly agree to your displayed commercial schedule and Venue Partnership Terms.');
  if (body.privacy_acknowledged !== true) fail('Please acknowledge the Venue Partner Privacy Notice.');
  const code = text(body.offer_code, 80), special = individual(code), offer = venueOffer(code);
  const property = normal(body.venue_name), domain = text(body.email, 200).toLowerCase().split('@')[1];
  if (special && !special.match.some(name => property.includes(name))) fail('This personal invitation is for ' + special.property + '. Please use the correct property name or contact the atelier.');
  if (!special && INDIVIDUAL_VENUE_OFFERS.some(item => item.match.some(name => property.includes(name)) || item.domains.includes(domain))) fail('Your property has an individual offer. Please use the personal invitation link from the atelier so your existing rate is preserved.', 409);
  const fields = {};
  for (const [key, max, min] of [['legal_operator', 200, 3], ['business_address', 650, 12], ['signatory_name', 150, 3], ['signatory_role', 150, 2]]) {
    if (String(body[key] || '').length > max) fail('Please shorten ' + key.replaceAll('_', ' ') + '.');
    fields[key] = text(body[key], max);
    if (fields[key].length < min) fail('Please provide the operator’s full legal name and address, and the authorized representative’s name and role.');
  }
  const currency = text(body.invoice_currency, 3).toUpperCase();
  if (!['EUR', 'USD', 'GBP', 'CHF', 'CAD', 'AUD', 'NZD', 'MXN', 'AED', 'INR', 'ZAR'].includes(currency)) fail('Please select an invoice currency.');
  const selected = body.eligible_categories;
  if (!Array.isArray(selected) || !selected.length || selected.length > offer.categories.length || selected.some(key => !offer.categories.some(category => category.key === key))) fail('Please select the eligible revenue categories shown in your individual offer.');
  const categories = [...new Set(selected)].sort();
  const schedule = {
    reference: offer.reference, property: text(body.venue_name, 150),
    ...fields, business_email: text(body.email, 200).toLowerCase(),
    rate: offer.rate, eligible_categories: categories.map(key => CATEGORY_DETAILS[key]),
    exclusions: EXCLUSIONS, invoice_currency: currency,
    payment: offer.payment, attribution: offer.attribution, cancellation: offer.cancellation,
    free_profile: offer.freeProfile,
    declaration: 'I am authorized to bind the legal operator named above. I have read and agree to the displayed ' + offer.rate + '% schedule, its selected eligible revenue categories and exclusions, and Venue Partnership Terms ' + VENUE_TERMS.version + '. By selecting Submit profile and agree to terms, I confirm this agreement on behalf of the business. No listing fee is charged; referral commission arises only on qualifying paid bookings.'
  };
  const snapshot = { terms: VENUE_TERMS, schedule };
  return { ...fields, invoice_currency: currency, privacy_acknowledged: true, terms_acceptance: true,
    commercial: { status: 'pending_completion', version: VENUE_TERMS.version, terms_sha256: sha256(VENUE_TERMS), snapshot_sha256: sha256(snapshot), ...snapshot } };
}

const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export function agreementText(agreement) {
  const s = agreement.schedule;
  return `LIA ARMONÍA VENUE PARTNERSHIP AGREEMENT\nReference: ${agreement.id}\nAccepted: ${agreement.accepted_at}\nVersion: ${agreement.version}\n\nOperator: ${s.legal_operator}\nAddress: ${s.business_address}\nProperty: ${s.property}\nRepresentative: ${s.signatory_name} (${s.signatory_role})\nBusiness email: ${s.business_email}\nOffer: ${s.reference}\nRate: ${s.rate}%\nEligible revenue: ${s.eligible_categories.map(x => x.label).join('; ')}\nInvoice currency: ${s.invoice_currency}\nExcluded: ${s.exclusions.join('; ')}\n\n${s.payment}\n${s.attribution}\n${s.cancellation}\n${s.free_profile}\n\nDeclaration accepted: ${s.declaration}\n\nIntegrity hash: ${agreement.snapshot_sha256}\n\n${fullTermsText(agreement.terms)}`;
}
export function agreementHtml(agreement) {
  const s = agreement.schedule;
  const pairs = [['Agreement reference', agreement.id], ['Accepted at UTC', agreement.accepted_at], ['Terms version', agreement.version], ['Legal operator', s.legal_operator], ['Operator address', s.business_address], ['Property', s.property], ['Authorized representative', `${s.signatory_name} · ${s.signatory_role}`], ['Business email', s.business_email], ['Individual offer', s.reference], ['Commission', s.rate + '%'], ['Eligible categories', s.eligible_categories.map(x => x.label).join(' · ')], ['Invoice currency', s.invoice_currency]];
  const body = `<p style="letter-spacing:.12em;color:#633841">LIA ARMONÍA</p><h1>Venue partnership agreement</h1><p>Your completed submission recorded the following schedule and express declaration. The editorial profile still needs your approval before publication.</p><dl>${pairs.map(([k, v]) => `<dt style="font-weight:bold;margin-top:12px">${escape(k)}</dt><dd style="margin:3px 0">${escape(v)}</dd>`).join('')}</dl><h2>Excluded revenue</h2><ul>${s.exclusions.map(t => `<li>${escape(t)}</li>`).join('')}</ul>${[s.payment, s.attribution, s.cancellation, s.free_profile, s.declaration].map(t => `<p>${escape(t)}</p>`).join('')}<p style="overflow-wrap:anywhere">Integrity hash: ${escape(agreement.snapshot_sha256)}</p><h2>Accepted terms ${escape(agreement.version)}</h2><p>${escape(agreement.terms.intro)}</p>${agreement.terms.sections.map((section, i) => `<section><h2>${i + 1}. ${escape(section.title)}</h2>${section.paragraphs.map(t => `<p>${escape(t)}</p>`).join('')}</section>`).join('')}<p>Privacy: https://www.liaarmonia.com/venue-partner-privacy.html<br>Contact: atelier@liaarmonia.com</p>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><title>Venue partnership agreement</title><style>body{font:16px/1.65 Arial,sans-serif;color:#302629;background:#fff;margin:32px auto;padding:0 24px;max-width:820px;overflow-wrap:anywhere}h1,h2{font-family:Georgia,serif;font-weight:400}h1{font-size:36px}h2{font-size:23px;margin-top:28px}@media print{body{margin:0;max-width:none}h2{break-after:avoid}p{orphans:3;widows:3}}</style></head><body>${body}</body></html>`;
}
