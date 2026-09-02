# Email setup — nothing to configure

The concierge form on `wedding-design.html` posts directly to FormSubmit, which
forwards every submission to `atelier@liaarmonia.com`.

No account. No API key. No environment variables. No serverless functions.
The site is pure static files again and works on any host.

## The only thing you have to do, once

Submit the form once on the live site. FormSubmit will send a confirmation email
to `atelier@liaarmonia.com` with a link. Click it. From that moment on, every
submission arrives in your inbox.

Until you click that link, nothing is delivered — that is the activation step,
and it happens exactly once per email address.

## Clean up in Vercel

You can delete these — they are no longer used:

- `PRIVATE_INQUIRY_TO`
- `RESEND_FROM`
- any `RESEND_API_KEY` / `GMAIL_*` variables

Leaving them costs nothing, but they do nothing either.

## What the email looks like

Subject: `NEW PRIVATE DESIGN INQUIRY - <names> - LA-2026-XXXXXXXX`
Reply-To is set to the client's address, so hitting Reply writes to them directly.
All thirteen answers arrive as a table, plus the inquiry reference and timestamp.

## Changing the recipient

One place: the `ATELIER_INBOX` constant near the top of the concierge section in
`app.js`, plus the `action` attribute on the form in `wedding-design.html`.
A new address needs the one-time confirmation click again.

## Trade-offs, honestly

**Your email address is visible in the page source.** Anyone who opens devtools
can read it. It is already published on the contact page, so this changes little,
but scrapers will find it. If that becomes a spam problem, FormSubmit gives you a
hashed endpoint string after activation — replace the address in both places with
that string and the address disappears from the source.

**No dashboard, no stored submissions.** If an email is lost, it is lost. For a
low-volume private atelier this is fine. If you later want stored submissions,
spam filtering or a Slack notification, that is the point to move to a paid form
service or back to a small serverless function.

**Spam.** `_captcha` is disabled for a smooth flow. If bots find the form,
set it back to `true` in `app.js` and FormSubmit will show a captcha step.
