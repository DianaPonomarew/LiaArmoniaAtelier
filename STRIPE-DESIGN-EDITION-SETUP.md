# Stripe setup for Design Edition 01

This package contains the live-ready code path for:

Customer clicks **Access the Design Edition**
→ Vercel creates a Stripe Checkout Session
→ Stripe redirects back with `{CHECKOUT_SESSION_ID}`
→ the private access page verifies the paid session server-side
→ protected PDF/ZIP downloads are served only after verification
→ the optional private digital edition is served only after verification
→ the customer receives an access email through Resend when the webhook fires.

## 1. Create the Stripe price

In Stripe Dashboard, create one product:

- Product name: `Design Edition 01 — Burgundy + Chartreuse`
- Price type: one-time
- Currency: choose the final launch currency
- Amount: owner-confirmed launch price

Copy the resulting Stripe Price ID. It starts with `price_`.

## 2. Add Vercel environment variables

Set these in Vercel for Production:

```text
SITE_URL=https://www.liaarmonia.com
STRIPE_SECRET_KEY=rk_live_...
STRIPE_PRICE_DESIGN_EDITION_01=price_...
STRIPE_WEBHOOK_SECRET=whsec_...
RESEND_API_KEY=re_...
RESEND_FROM=Lia Armonia <atelier@liaarmonia.com>
DESIGN_EDITION_NOTIFY_TO=atelier@liaarmonia.com
```

Use a restricted Stripe key if possible. It must be able to create Checkout Sessions and read Checkout Sessions and line items. A standard `sk_live_...` secret key also works, but grants broader access than this integration needs.

`RESEND_FROM` must use a verified sending domain in Resend. If the domain is not verified, customer delivery emails will fail.

## 3. Add the Stripe webhook

In Stripe Dashboard, add an endpoint:

```text
https://www.liaarmonia.com/api/design-edition-webhook
```

Subscribe to:

```text
checkout.session.completed
checkout.session.async_payment_succeeded
```

Copy the webhook signing secret into:

```text
STRIPE_WEBHOOK_SECRET
```

## 4. Deploy

After adding the environment variables, redeploy on Vercel.

## 5. Test

Use Stripe test mode first on a preview deployment if possible:

- button opens Stripe Checkout
- Checkout shows the Stripe Price configured in `STRIPE_PRICE_DESIGN_EDITION_01`
- success redirects to `/design-editions/burgundy-chartreuse/access?session_id=...`
- private access renders the purchased edition
- `View Digital Edition` opens only with the verified Stripe session
- all three protected downloads work
- customer receives the access email
- `atelier@liaarmonia.com` receives the owner notification.
