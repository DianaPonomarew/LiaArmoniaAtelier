import { getSiteUrl, readJsonBody, sendJson, stripeRequest } from './_design-edition-stripe.js';

import { CINEMATIC_LINK_ID } from './_cinematic-save-date.js';
const PRICE_ID = 'price_1URYB3QvMYgiBRBO7cXXvRa9';
const clean = (value, limit) => String(value || '').trim().slice(0, limit);
const validEmail = value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export async function cinematicCheckoutHandler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendJson(res, 405, { error: 'Method not allowed.' });
  }
  try {
    const payload = await readJsonBody(req);
    const design = clean(payload.design, 30);
    const names = clean(payload.names, 90);
    const date = clean(payload.date, 10);
    const title = clean(payload.title, 50);
    const customText = clean(payload.customText, 180);
    const notes = clean(payload.notes, 850);
    const email = clean(payload.email, 200).toLowerCase();
    const phone = clean(payload.phone, 40);
    if (!['coastaldrive','yacht'].includes(design)) return sendJson(res, 400, {error:'Please choose a design.'});
    if (names.length < 3 || names.length > 90) return sendJson(res, 400, {error:'Please enter both names.'});
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date + 'T12:00:00Z')) || new Date(date + 'T12:00:00Z').toISOString().slice(0,10) !== date) return sendJson(res,400,{error:'Please enter a valid wedding date.'});
    if (!['Save the Date','We Are Getting Married','Wedding Announcement','Custom'].includes(title)) return sendJson(res,400,{error:'Please choose your film wording.'});
    if (title === 'Custom' && (customText.length < 2 || customText.length > 90)) return sendJson(res,400,{error:'Please enter your custom headline (up to 90 characters).'});
    if (!validEmail(email)) return sendJson(res,400,{error:'Please enter a valid email address.'});
    if (!/^\+?[0-9().\s-]{7,25}$/.test(phone)) return sendJson(res,400,{error:'Please enter a valid phone number including country code.'});
    if (payload.accepted !== true) return sendJson(res,400,{error:'Please accept the order and privacy terms.'});
    if (notes.length > 500) return sendJson(res,400,{error:'Please keep your additional notes under 500 characters.'});
    const site = getSiteUrl(req);
    const headline = title === 'Custom' ? customText : title;
    const params = new URLSearchParams({
      mode: 'payment',
      'managed_payments[enabled]':'false',
      'line_items[0][price]':PRICE_ID,
      'line_items[0][quantity]':'1',
      customer_email:email,
      success_url:`${site}/cinematic-save-the-date-thank-you.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:`${site}/cinematic-save-the-date.html#personalize`,
      'metadata[product]':'cinematic_save_the_date',
      'metadata[design]':design,
      'metadata[names]':names,
      'metadata[date]':date,
      'metadata[title]':headline,
      'metadata[notes]':notes,
      'metadata[email]':email,
      'metadata[phone]':phone,
      'payment_intent_data[metadata][product]':'cinematic_save_the_date',
      'payment_intent_data[metadata][design]':design,
      'payment_intent_data[metadata][names]':names,
      'payment_intent_data[metadata][date]':date,
      'payment_intent_data[metadata][email]':email,
      'customer_creation':'always',
      'payment_method_types[0]':'card'
    });
    const session = await stripeRequest('/v1/checkout/sessions',{method:'POST',body:params});
    if (!session?.url || !session.id) throw new Error('Checkout could not be opened.');
    return sendJson(res,200,{url:session.url});
  } catch(error) {
    return sendJson(res,error.statusCode || 500,{error:error.statusCode===503 ? 'Payments are temporarily unavailable. Please contact the atelier.' : error.message || 'Checkout could not be opened.'});
  }
}

export default async function handler(req,res){
  if (req.method!=='POST') {res.setHeader('Allow','POST');return sendJson(res,405,{error:'Method not allowed.'})}
  if (req.body?.product==='cinematic_save_the_date') return cinematicCheckoutHandler(req,res);
  return sendJson(res,200,{url:'https://buy.stripe.com/28E5kFbcwbBZ9lB0fNgfu06'});
}
