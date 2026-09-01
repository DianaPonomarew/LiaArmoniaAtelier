# Lia Armonia Public Launch Checklist

## Public routes

- `index.html`: live
- `designs.html`: selected work live; Professional Tools marked Coming Soon
- `atelier.html`: live
- `services.html`: Private Design and Collaborations live; Digital Atelier marked Coming Soon
- `wedding-design.html`: live inquiry, design-fee indication and consultation request
- `collaborations.html`: live inquiry
- `inquiries.html`: live general inquiry
- `invitations.html`: Coming Soon

## Netlify Forms

1. In Netlify, enable form detection for the site and redeploy.
2. Confirm that these forms appear under Forms:
   - `private-design-consultation`
   - `collaboration-inquiry`
   - `atelier-inquiry`
3. Add a Netlify form notification to `atelier@liaarmonia.com` as an operational fallback.
4. Submit one real test from the deployed `liaarmonia.com` site and confirm the submission is stored before deleting it.

## Branded email

1. Verify `liaarmonia.com` with Resend.
2. Add `RESEND_API_KEY` in Netlify Site configuration > Environment variables.
3. Optional: set `LIA_EMAIL_FROM` to `Lia Armonia <atelier@liaarmonia.com>`.
4. Redeploy after adding environment variables.
5. Test the studio notification, Reply-To behavior and customer receipt.

Never place secret API keys in public JavaScript, GitHub files, screenshots or chat messages.

## Consultation behavior

- The website provides a non-binding design-fee indication before the request.
- The client proposes a date, time and timezone.
- No calendar appointment is confirmed automatically.
- Diana reviews the inquiry and confirms or proposes another time personally.
