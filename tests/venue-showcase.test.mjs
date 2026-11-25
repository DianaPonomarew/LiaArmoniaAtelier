import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { createHmac, randomUUID } from 'node:crypto';

const records = new Map(), messages = [];
globalThis.venueShowcaseRecords = records;
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === '@vercel/blob') return { url: 'mock:venue-showcase-blob', shortCircuit: true };
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url !== 'mock:venue-showcase-blob') return nextLoad(url, context);
    return { format: 'module', shortCircuit: true, source: `
      import assert from 'node:assert/strict';
      export async function put(path, value, options) {
        assert.equal(options.access, 'private');
        if (globalThis.venueFailSubmittedSave && path.endsWith('/details.json') && JSON.parse(String(value)).status === 'submitted') { globalThis.venueFailSubmittedSave = false; throw new Error('Temporary commit outage'); }
        if (!options.allowOverwrite && globalThis.venueShowcaseRecords.has(path)) throw new Error('Already exists');
        globalThis.venueShowcaseRecords.set(path, value);
      }
      export async function get(path, options) {
        assert.equal(options.access, 'private'); assert.equal(options.useCache, false);
        const value = globalThis.venueShowcaseRecords.get(path);
        return value == null ? null : { stream: new Response(value).body };
      }
      export async function list({ prefix }) { return { blobs: [...globalThis.venueShowcaseRecords.keys()].filter(path => path.startsWith(prefix)).map(pathname => ({ pathname })) }; }
    ` };
  }
});
process.env.PLANNER_EDITORIAL_SECRET = 'test-venue-signing-secret';
process.env.BLOB_READ_WRITE_TOKEN = 'test-private-blob';
process.env.RESEND_API_KEY = 'test-mail';
process.env.PRIVATE_INQUIRY_TO = 'atelier@liaarmonia.com';
globalThis.fetch = async (url, options) => {
  assert.equal(url, 'https://api.resend.com/emails');
  assert.match(options.headers['Idempotency-Key'], /^venue-profile-/);
  messages.push(JSON.parse(options.body));
  return Response.json({ id: 'test-message-' + messages.length });
};
const { default: intake, venueReview, venueCommercialOffer, venueAgreementReceipt } = await import('../api/_venue-showcase.js');
const { VENUE_TERMS } = await import('../venue-partnership-terms-data.js');
const { INDIVIDUAL_VENUE_OFFERS } = await import('../api/_venue-individual-offers.js');
const { sha256 } = await import('../api/_venue-commercial.js');
const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.alloc(150), Buffer.from([0xff, 0xd9])]).toString('base64');
const fixture = () => ({ action: 'create', venue_name: 'The Private Courtyard', venue_type: 'Hotel or resort', country: 'Portugal', city: 'Comporta', region: 'Alentejo', contact_name: 'Venue Team', email: 'venue@example.test', experiences: ['Private dinner', 'Guest accommodation'], seated_capacity: '40', rooms: '12', sleeps: '24', exclusive_use: 'Please discuss with us', description: 'A quiet architectural property welcoming private dinners and guests, with a courtyard and thoughtful contemporary interiors.', image_credit: 'Photographer One: terrace.jpg, dining.jpg, courtyard.jpg', photo_names: ['terrace.jpg', 'dining.jpg', 'courtyard.jpg'], website: 'https://example.test/property', brochure_url: 'https://example.test/brochure.pdf', pricing_notes: 'Private estimate; confirm individually', image_rights: true, editorial_consent: true, authorized_contact: true, privacy_acknowledged: true, terms_acceptance: true, terms_version: VENUE_TERMS.version, eligible_categories: ['venue_hire'], legal_operator: 'Courtyard Hospitality Lda', business_address: 'Rua da Praia 10, 7580 Comporta, Portugal', signatory_name: 'Alex Partner', signatory_role: 'Authorized manager', invoice_currency: 'EUR' });
async function call(handler, body = {}, method = 'POST', query = {}, origin = 'https://www.liaarmonia.com') {
  const headers = {}; let status, value;
  const response = { setHeader(key, val) { headers[key] = val; }, status(code) { status = code; return this; }, json(data) { value = data; return this; }, send(data) { value = data; return this; }, end() { return this; } };
  await handler({ method, body, query, headers: { origin } }, response);
  return { status, headers, value };
}
async function upload(created, number) { return call(intake, { action: 'photo', id: created.submissionId, uploadToken: created.uploadToken, number, base64: jpeg }); }
const complete = created => call(intake, { action: 'complete', id: created.submissionId, uploadToken: created.uploadToken });

test('venue intake saves privately, supports dinner-only properties, and requires completed imagery before notifying', async () => {
  const created = (await call(intake, { ...fixture(), commission_rate: 15, referral_agreement: true })).value;
  assert.ok(created.ok); assert.ok(created.uploadToken); assert.equal(created.email, undefined); assert.equal(created.reviewToken, undefined);
  const saved = JSON.parse(records.get('venue-submissions/' + created.submissionId + '/details.json'));
  assert.deepEqual(saved.experiences, ['Private dinner', 'Guest accommodation']);
  assert.equal(saved.referral_status, 'pending_completed_submission');
  assert.equal(saved.commercial.schedule.rate, 10); assert.equal(saved.commercial.accepted_at, undefined);
  assert.equal(records.has('venue-submissions/' + created.submissionId + '/agreement.json'), false);
  assert.equal(saved.commission_rate, undefined); assert.equal(saved.referral_agreement, undefined); assert.equal(saved.publish_pricing, false);
  assert.equal((await call(venueReview, {}, 'GET', { id: created.submissionId })).status, 403);
  assert.equal((await call(venueReview, {}, 'GET', { id: created.submissionId, token: created.uploadToken })).status, 403);
  assert.equal((await call(intake, { action: 'photo', id: randomUUID(), uploadToken: created.uploadToken, number: 0, base64: jpeg })).status, 403);
  assert.equal((await call(intake, { action: 'photo', id: created.submissionId, uploadToken: created.uploadToken, number: 0, base64: Buffer.from('not a photograph').toString('base64') })).status, 400);
  assert.equal((await upload(created, 6)).status, 400);
  assert.equal((await upload(created, 0)).status, 200);
  assert.equal((await upload(created, 1)).status, 200);
  const mailCount = messages.length;
  assert.equal((await complete(created)).status, 400); assert.equal(messages.length, mailCount);
  assert.equal((await upload(created, 2)).status, 200);
  const finished = await complete(created);
  assert.equal(finished.status, 200); assert.equal(finished.value.stored, true); assert.equal(finished.value.emailPending, false);
  assert.equal(messages.length, mailCount + 2); const ownerMessage = messages.find(m => m.subject.includes(fixture().venue_name) && m.to[0] === 'atelier@liaarmonia.com' && m.text.includes(created.submissionId)); assert.deepEqual(ownerMessage.to, ['atelier@liaarmonia.com']);
  const review = new URL(ownerMessage.text.match(/https:\/\/www\.liaarmonia\.com\/venue-review\.html\?[^\n]+/)[0]);
  const query = Object.fromEntries(review.searchParams);
  const privateView = await call(venueReview, {}, 'GET', query);
  assert.equal(privateView.status, 200); assert.equal(privateView.value.profile.email, 'venue@example.test');
  assert.deepEqual(privateView.value.profile.image_filenames, ['terrace.jpg', 'dining.jpg', 'courtyard.jpg']);
  assert.equal(privateView.headers['Cache-Control'], 'no-store'); assert.equal(privateView.headers['Referrer-Policy'], 'no-referrer');
  assert.equal((await call(venueReview, {}, 'GET', { ...query, id: randomUUID() })).status, 403);
  const image = await call(venueReview, {}, 'GET', { ...query, action: 'photo', number: '0' });
  assert.equal(image.status, 200); assert.equal(image.headers['Content-Type'], 'image/jpeg'); assert.deepEqual(image.value, Buffer.from(jpeg, 'base64'));
  assert.equal((await call(venueReview, {}, 'GET', { ...query, action: 'photo', number: '../details' })).status, 400);
  assert.equal((await complete(created)).status, 200); assert.equal(messages.length, mailCount + 2);
  assert.equal((await upload(created, 0)).status, 409);
});

test('required permissions, safe links and accurate experience categories are enforced before storage', async () => {
  const originalSize = records.size;
  for (const invalid of [{ privacy_acknowledged: false }, { terms_acceptance: false }, { legal_operator: '' }, { business_address: 'Short' }, { signatory_name: '' }, { signatory_role: '' }, { invoice_currency: 'INVALID' }, { eligible_categories: [] }, { eligible_categories: ['group_rooms'] }, { image_rights: false }, { authorized_contact: false }, { editorial_consent: false }, { email: 'invalid' }, { website: 'javascript:alert(1)' }, { brochure_url: 'https://name:password@example.test/file.pdf' }, { experiences: ['Not a real category'] }, { experiences: [] }, { seated_capacity: '-1' }, { description: 'Too short' }]) {
    assert.equal((await call(intake, { ...fixture(), ...invalid })).status, 400);
  }
  assert.equal(records.size, originalSize);
  assert.equal((await call(intake, fixture(), 'POST', {}, 'https://unrelated.example')).status, 403);
  assert.equal((await call(intake, fixture(), 'GET')).status, 405);
});

test('notification outages retain the accepted agreement and downloadable copy without duplicate receipt emails', async () => {
  const created = (await call(intake, fixture())).value;
  for (let i = 0; i < 3; i++) await upload(created, i);
  const mailCount = messages.length;
  delete process.env.RESEND_API_KEY;
  const pending = await complete(created);
  assert.equal(pending.value.stored, true); assert.equal(pending.value.emailPending, true); assert.equal(messages.length, mailCount);
  assert.equal(JSON.parse(records.get('venue-submissions/' + created.submissionId + '/details.json')).status, 'submitted');
  process.env.RESEND_API_KEY = 'test-mail';
  assert.equal((await complete(created)).value.emailPending, false);
  assert.equal((await complete(created)).value.emailPending, false);
  assert.equal(messages.length, mailCount + 2);
});

test('expired review links and unconfigured storage fail without exposing private details', async () => {
  const id = randomUUID(), expired = Math.floor(Date.now() / 1000) - 30;
  const signature = createHmac('sha256', process.env.PLANNER_EDITORIAL_SECRET).update('venue:review:' + id + ':' + expired).digest('hex');
  assert.equal((await call(venueReview, {}, 'GET', { id, token: expired + '.' + signature })).status, 403);
  const storedToken = process.env.BLOB_READ_WRITE_TOKEN; delete process.env.BLOB_READ_WRITE_TOKEN;
  assert.equal((await call(intake, fixture())).status, 503);
  process.env.BLOB_READ_WRITE_TOKEN = storedToken;
});

test('showcase profiles keep the chosen main image, separate gallery and short introduction together', async () => {
  const profile = { ...fixture(), image_layout: 'hero_and_gallery', short_description: 'A coastal courtyard hotel in Comporta, with contemporary architecture and intimate spaces for private celebrations.', description: '', photo_names: ['main.jpg', 'terrace.jpg', 'dining.jpg', 'courtyard.jpg'] };
  for (const invalid of [{ short_description: '' }, { short_description: 'word '.repeat(26).trim() }, { short_description: 'x'.repeat(161) }, { photo_names: ['a.jpg', 'b.jpg', 'c.jpg'] }, { photo_names: Array(8).fill('image.jpg') }]) assert.equal((await call(intake, { ...profile, ...invalid })).status, 400);
  const created = (await call(intake, profile)).value;
  for (const number of [1, 2, 3]) assert.equal((await upload(created, number)).status, 200);
  assert.equal((await complete(created)).status, 400, 'Gallery images cannot replace the main image');
  assert.equal((await upload(created, 0)).status, 200);
  assert.equal((await complete(created)).status, 200);
  const saved = JSON.parse(records.get('venue-submissions/' + created.submissionId + '/details.json'));
  assert.equal(saved.short_description, profile.short_description);
  assert.equal(saved.main_image_filename, 'main.jpg');
  assert.deepEqual(saved.gallery_filenames, ['terrace.jpg', 'dining.jpg', 'courtyard.jpg']);
  assert.equal(saved.main_image_uploaded, true); assert.equal(saved.gallery_image_count, 3); assert.equal(saved.image_count, 4);
});

test('one main image and the full six-image gallery can be uploaded and reviewed', async () => {
  const created = (await call(intake, { ...fixture(), image_layout: 'hero_and_gallery', short_description: 'A private hotel with a courtyard for intimate celebrations and carefully considered guest accommodation.', photo_names: ['main.jpg', ...Array.from({ length: 6 }, (_, i) => 'gallery-' + i + '.jpg')] })).value;
  for (let i = 0; i < 7; i++) assert.equal((await upload(created, i)).status, 200);
  assert.equal((await upload(created, 7)).status, 400);
  assert.equal((await complete(created)).status, 200);
  const saved = JSON.parse(records.get('venue-submissions/' + created.submissionId + '/details.json'));
  assert.equal(saved.gallery_image_count, 6); assert.equal(saved.image_count, 7);
});

test('offers disclose a server-controlled rate, exact categories, exclusions and current downloadable terms', async () => {
  const standard = await call(venueCommercialOffer, {}, 'GET');
  assert.equal(standard.status, 200); assert.equal(standard.value.offer.rate, 10);
  assert.deepEqual(standard.value.offer.categories.map(x => x.key), ['venue_hire']);
  assert.equal(standard.value.offer.version, VENUE_TERMS.version);
  assert.match(standard.value.offer.termsPdfUrl, /v2\.pdf$/);
  assert.match(standard.value.offer.exclusions.join(' '), /tax.*Service charges.*Refundable.*third-party/);
  assert.equal((await call(venueCommercialOffer, {}, 'POST')).status, 405);
  assert.equal((await call(venueCommercialOffer, {}, 'GET', { offer: 'invented-5-percent' })).status, 404);
  for (const special of INDIVIDUAL_VENUE_OFFERS) {
    const result = await call(venueCommercialOffer, {}, 'GET', { offer: special.code });
    assert.equal(result.value.offer.rate, 5); assert.equal(result.value.offer.property, special.property);
    assert.equal(result.value.offer.code, undefined); assert.equal(result.value.offer.domains, undefined);
  }
});

test('named five-percent offers retain their rate and prevent standard or arbitrary fee-base substitution', async () => {
  const bella = INDIVIDUAL_VENUE_OFFERS.find(x => x.reference === 'BV-2026-5');
  const alma = INDIVIDUAL_VENUE_OFFERS.find(x => x.reference === 'AC-2026-5');
  const count = records.size;
  assert.equal((await call(intake, { ...fixture(), terms_version: 'VP-old' })).status, 409);
  assert.equal((await call(intake, { ...fixture(), terms_version: undefined })).status, 409);
  assert.equal((await call(intake, { ...fixture(), venue_name: bella.property })).status, 409);
  assert.equal((await call(intake, { ...fixture(), email: 'office@quintadabellavista.com' })).status, 409);
  assert.equal((await call(intake, { ...fixture(), offer_code: bella.code })).status, 400);
  assert.equal((await call(intake, { ...fixture(), venue_name: alma.property, offer_code: alma.code, eligible_categories: ['venue_hire'] })).status, 400);
  assert.equal((await call(intake, { ...fixture(), venue_name: alma.property, offer_code: alma.code, eligible_categories: [] })).status, 400);
  assert.equal(records.size, count);
  const created = (await call(intake, { ...fixture(), venue_name: alma.property, offer_code: alma.code, eligible_categories: ['group_rooms', 'private_event_package'], commission_rate: 0, terms_sha256: 'fake' })).value;
  const saved = JSON.parse(records.get('venue-submissions/' + created.submissionId + '/details.json'));
  assert.equal(saved.commercial.schedule.rate, 5);
  assert.deepEqual(saved.commercial.schedule.eligible_categories.map(x => x.key), ['group_rooms', 'private_event_package']);
  assert.equal(saved.commercial.terms_sha256, sha256(VENUE_TERMS));
  assert.equal(saved.commercial.snapshot_sha256, sha256({ terms: VENUE_TERMS, schedule: saved.commercial.schedule }));
});

test('only complete submissions accept terms, with an immutable snapshot, protected receipt and durable email copy', async () => {
  const created = (await call(intake, { ...fixture(), legal_operator: 'Courtyard <script>alert(1)</script> Ltd' })).value;
  assert.equal(records.has('venue-submissions/' + created.submissionId + '/agreement.json'), false);
  await upload(created, 0); await upload(created, 1);
  assert.equal((await complete(created)).status, 400);
  assert.equal(records.has('venue-submissions/' + created.submissionId + '/agreement.json'), false);
  await upload(created, 2);
  const completeResult = await complete(created), reference = completeResult.value;
  assert.equal(reference.agreementAccepted, true); assert.equal(reference.partnerReceiptPending, false);
  const archivePath = 'venue-submissions/' + created.submissionId + '/agreement.json';
  const originalArchive = records.get(archivePath), archive = JSON.parse(originalArchive);
  assert.equal(archive.status, 'declaration_snapshot'); assert.equal(archive.signatory_email_verified, false);
  assert.ok(archive.declaration_recorded_at); assert.equal(archive.schedule.rate, 10);
  assert.equal(JSON.parse(records.get('venue-submissions/' + created.submissionId + '/details.json')).commercial.status, 'accepted');
  assert.equal(archive.version, VENUE_TERMS.version); assert.equal(archive.terms.version, VENUE_TERMS.version);
  const query = Object.fromEntries(new URL(reference.receiptUrl, 'https://www.liaarmonia.com').searchParams);
  const receipt = await call(venueAgreementReceipt, {}, 'GET', query);
  assert.equal(receipt.status, 200); assert.match(receipt.value, /&lt;script&gt;/); assert.doesNotMatch(receipt.value, /<script>/);
  assert.match(receipt.value, /Courtyard Hospitality|Courtyard &lt;script/); assert.match(receipt.value, /Net venue hire/);
  assert.equal(receipt.headers['Referrer-Policy'], 'no-referrer'); assert.match(receipt.headers['Content-Disposition'], /attachment/);
  assert.equal((await call(venueAgreementReceipt, {}, 'GET', { ...query, token: created.uploadToken })).status, 403);
  assert.equal((await call(venueAgreementReceipt, {}, 'GET', { ...query, id: randomUUID() })).status, 403);
  assert.equal((await call(venueAgreementReceipt, {}, 'POST', query)).status, 405);
  const mail = messages.find(m => m.to[0] === fixture().email && m.text.includes(created.submissionId));
  assert.ok(mail); assert.match(mail.text, /Declaration accepted/); assert.match(mail.text, /German law governs/); assert.match(mail.html, /Accepted terms/);
  await complete(created); assert.equal(records.get(archivePath), originalArchive);
  assert.equal(messages.filter(m => m.to[0] === fixture().email && m.text.includes(created.submissionId)).length, 1);
});

test('earlier pending editorial records can finish without creating or implying a new commercial agreement', async () => {
  const id = randomUUID(), expires = Math.floor(Date.now() / 1000) + 1000;
  const uploadToken = expires + '.' + createHmac('sha256', process.env.PLANNER_EDITORIAL_SECRET).update('venue:upload:' + id + ':' + expires).digest('hex');
  const legacy = { id, ...fixture(), status: 'uploading', image_layout: 'legacy_gallery', image_filenames: fixture().photo_names, permissions_version: 'venue-profile-2026-11-24', referral_status: 'individual_terms_to_be_confirmed_separately' };
  for (const key of ['terms_acceptance', 'terms_version', 'eligible_categories', 'legal_operator', 'business_address', 'signatory_name', 'signatory_role', 'invoice_currency']) delete legacy[key];
  records.set('venue-submissions/' + id + '/details.json', JSON.stringify(legacy));
  const created = { submissionId: id, uploadToken };
  for (let i = 0; i < 3; i++) await upload(created, i);
  const result = await complete(created); assert.equal(result.status, 200);
  assert.equal(result.value.agreementAccepted, false); assert.equal(result.value.receiptUrl, null);
  assert.equal(records.has('venue-submissions/' + id + '/agreement.json'), false);
  assert.equal(JSON.parse(records.get('venue-submissions/' + id + '/details.json')).referral_status, 'individual_terms_to_be_confirmed_separately');
});

test('a failed final save does not expose a confirmed agreement or send confirmations before a successful retry', async () => {
  const created = (await call(intake, fixture())).value;
  for (let i = 0; i < 3; i++) await upload(created, i);
  const mailCount = messages.length; globalThis.venueFailSubmittedSave = true;
  assert.equal((await complete(created)).status, 503);
  assert.equal(messages.length, mailCount);
  const stored = JSON.parse(records.get('venue-submissions/' + created.submissionId + '/details.json'));
  assert.equal(stored.status, 'uploading'); assert.equal(stored.commercial.status, 'pending_completion');
  const expires = Math.floor(Date.now() / 1000) + 1000;
  const signature = createHmac('sha256', process.env.PLANNER_EDITORIAL_SECRET).update('venue:agreement:' + created.submissionId + ':' + expires).digest('hex');
  const query = { id: created.submissionId, token: expires + '.' + signature };
  assert.equal((await call(venueAgreementReceipt, {}, 'GET', query)).status, 404);
  const archive = records.get('venue-submissions/' + created.submissionId + '/agreement.json');
  assert.equal((await complete(created)).value.agreementAccepted, true);
  assert.equal((await call(venueAgreementReceipt, {}, 'GET', query)).status, 200);
  assert.equal(records.get('venue-submissions/' + created.submissionId + '/agreement.json'), archive);
  assert.equal(messages.length, mailCount + 2);
});
