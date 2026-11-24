import assert from 'node:assert/strict';
import { test } from 'node:test';
import handler from '../api/design-edition-checkout.js';

const request = body => ({ method: 'POST', headers: { host: 'www.liaarmonia.com' }, body });
const response = () => ({ setHeader() {}, end(body) { this.body = JSON.parse(body); } });
const film = { product: 'cinematic_save_the_date', design: 'yacht', names: 'Alex & Sam', date: '2027-08-18', title: 'Save the Date', email: 'review@example.com', phone: '+1 555 010 0100', accepted: true };

function mockCheckout(t) {
  // No Stripe request or payment is made by these regression checks.
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, 'https://api.stripe.com/v1/checkout/sessions');
    mockCheckout.params = new URLSearchParams(options.body);
    return { ok: true, json: async () => ({ id: 'cs_test_mock', url: 'https://checkout.stripe.com/mock' }) };
  });
  process.env.STRIPE_SECRET_KEY = 'sk_test_MockForLocalRegression';
}

test('collection checkout enforces the advertised amount and retains fulfillment metadata', async t => {
  mockCheckout(t);
  const res = response();
  await handler(request({ ...film, unit_amount: 1, price: 'old-price', quantity: 100 }), res);
  assert.equal(res.statusCode, 200);
  const p = mockCheckout.params;
  assert.equal(p.get('line_items[0][price_data][unit_amount]'), '14900');
  assert.equal(p.get('line_items[0][price_data][currency]'), 'usd');
  assert.equal(p.get('line_items[0][quantity]'), '1');
  assert.equal(p.get('metadata[product]'), 'cinematic_save_the_date');
  assert.equal(p.get('metadata[design]'), 'yacht');
  assert.equal(p.get('metadata[names]'), 'Alex & Sam');
  assert.match(p.get('success_url'), /cinematic-save-the-date-thank-you\.html\?session_id=/);
});

test('wedding planning checkout enforces $149 and retains the active 30-minute calendar', async t => {
  mockCheckout(t);
  const res = response();
  await handler(request({ product: 'wedding_planning_consultation', name: 'Alex', email: 'review@example.com', accepted: true, unit_amount: 1 }), res);
  assert.equal(res.statusCode, 200);
  const p = mockCheckout.params;
  assert.equal(p.get('line_items[0][price_data][unit_amount]'), '14900');
  assert.equal(p.get('metadata[product]'), 'wedding_planning_consultation');
  assert.equal(p.get('success_url'), 'https://calendly.com/atelier-liaarmonia/lia-armonia-destination-wedding-consultation');
  assert.match(p.get('cancel_url'), /\/consultation\.html$/);
});

test('missing consent and invalid film dates cannot open a checkout', async t => {
  const network = t.mock.method(globalThis, 'fetch', () => { throw Error('Unexpected network call'); });
  for (const body of [{ ...film, accepted: false }, { ...film, date: '2027-02-30' }, { product: 'wedding_planning_consultation', name: 'Alex', email: 'review@example.com', accepted: false }]) {
    const res = response();
    await handler(request(body), res);
    assert.equal(res.statusCode, 400);
  }
  assert.equal(network.mock.callCount(), 0);
});

test('non-POST requests are rejected and the existing Design Edition route is preserved', async () => {
  const res = response();
  await handler({ method: 'GET' }, res);
  assert.equal(res.statusCode, 405);
  const editionRes = response();
  await handler(request({}), editionRes);
  assert.equal(editionRes.body.url, 'https://buy.stripe.com/28E5kFbcwbBZ9lB0fNgfu06');
});


test('general service consultations cannot create a paid checkout', async t => {
  const network = t.mock.method(globalThis, 'fetch', () => { throw Error('Unexpected network call'); });
  const res = response();
  await handler(request({ product: 'private_design_consultation', name: 'Alex', email: 'review@example.com', accepted: true }), res);
  assert.equal(res.statusCode, 400);
  assert.match(res.body.error, /complimentary/);
  assert.equal(network.mock.callCount(), 0);
});
