# Vercel Email Setup

The private wedding design consultation form now submits to:

`/api/private-design-consultation`

This is a Vercel Serverless Function. It sends the completed consultation answers to:

`atelier@liaarmonia.com`

## Required Vercel Environment Variables

Add these in Vercel:

Project -> Settings -> Environment Variables

```txt
RESEND_API_KEY=your_resend_api_key
PRIVATE_INQUIRY_TO=atelier@liaarmonia.com
RESEND_FROM=LIA Armonia <atelier@liaarmonia.com>
```

## Important

`RESEND_FROM` must use a verified sending domain inside Resend before production delivery works from `atelier@liaarmonia.com`.

If the domain is not verified yet, Resend may reject the email. Verify `liaarmonia.com` in Resend, add the DNS records, then redeploy in Vercel.

## What the Form Does

- creates or receives an inquiry ID
- sends all consultation answers to the atelier email
- uses the client's email as reply-to
- shows an on-page success state after the email is accepted
- does not redirect to a separate success page
- does not require Netlify Forms or Formsubmit

Stripe keys are not needed for this consultation email flow.
