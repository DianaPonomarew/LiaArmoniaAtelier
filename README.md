# LIA ARMONÍA — Wedding Design Atelier


## Documentation

| File | Purpose |
|---|---|
| `GIT-UPLOAD.md` | Push to GitHub and connect to Vercel — step by step |
| `MAIL-SETUP.md` | Email delivery, environment variables, and the "Not secure" / HTTPS checklist |
| `docs/PUBLIC_LAUNCH_CHECKLIST.md` | Pre-launch route and form checklist |

## Structure

```
index.html …                 Public pages
styles.css                   Single stylesheet (cache-busted via ?v=)
app.js                       Site behaviour incl. the private concierge flow
assets/                      Images and video (~32 MB)
robots.txt / sitemap.xml     Search indexing
404.html                     Not-found page
```

## Private Design Concierge

`wedding-design.html` runs a 13-question, 4-chapter intake. On submit it POSTs
to `/api/private-design-consultation`, which emails the complete answers to
`atelier@liaarmonia.com` (reply-to set to the client), sends the client a
confirmation email, and opens an on-page thank-you modal.

Requires `RESEND_API_KEY`, `PRIVATE_INQUIRY_TO` and `RESEND_FROM` as environment
variables, plus a verified sending domain in Resend. See `MAIL-SETUP.md`.

## Local preview

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>. The form submits to FormSubmit over HTTPS, so
it works from a local server too — just be aware that test submissions land in
the real inbox.

## Asset versioning

Every page loads `styles.css?v=20260902` and `app.js?v=20260902`. When you change
either file, bump that string across all HTML files in the same commit, otherwise
returning visitors keep the cached old version.

## Direction

Not a shop, package menu or planner funnel. Scope, timing and deliverables are
handled privately after fit is clear.

Instagram: <https://www.instagram.com/lia_armonia/>
