# Email + HTTPS Setup — Private Design Consultation

The concierge form on `wedding-design.html` POSTs its answers as JSON to:

```
/api/private-design-consultation
```

That endpoint sends the complete answers to **atelier@liaarmonia.com** via Resend,
and sends the client a short confirmation email. The page then shows an in-page
confirmation without leaving the consultation flow.

Works on Vercel through the root serverless functions in the `api` folder.

---

## 1. Environment variables

Vercel → Project → Settings → Environment Variables

```txt
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
PRIVATE_INQUIRY_TO=atelier@liaarmonia.com
RESEND_FROM=Lia Armonia <atelier@liaarmonia.com>
```

Set them for **Production, Preview and Development**, then **redeploy**.
Environment variables are only picked up by a new deployment.

## 2. Verify the sending domain in Resend

`RESEND_FROM` must use a domain verified inside Resend. Until `liaarmonia.com`
is verified, Resend rejects the send and the form shows an error.

1. Resend → Domains → Add `liaarmonia.com`
2. Add the SPF / DKIM DNS records at your registrar
3. Wait for the status to turn **Verified**

While testing before verification, you may temporarily use
`RESEND_FROM=Lia Armonia <onboarding@resend.dev>` — but note that in Resend's
unverified sandbox mode, delivery only works to the email address that owns the
Resend account.

## 3. Test

Submit the form on the deployed site. Then check:

- an email in `atelier@liaarmonia.com` with subject `NEW PRIVATE DESIGN INQUIRY - …`
- the reply-to is the client's address
- the client received the confirmation email
- the in-page confirmation appeared on the page
- Resend → Logs shows both sends

If it fails, open the browser devtools **Network** tab, click the
`private-design-consultation` request and read the JSON response:

| Response | Meaning |
|---|---|
| `Email service is not configured.` | `RESEND_API_KEY` missing, or you did not redeploy after adding it |
| `Email delivery failed.` | Resend rejected the send — almost always an unverified `RESEND_FROM` domain |
| `Missing required fields` | A required answer was empty |
| `405` / HTML instead of JSON | The function was not deployed — check the file sits at `api/private-design-consultation.js` |

---

## 4. "Not secure" in the browser

The site itself should contain **no** `http://` resources — there is no mixed-content
problem in the code. A "Not secure" warning therefore comes from the domain
setup, not the files. The usual causes:

1. **You opened `http://liaarmonia.com` instead of `https://`.**
   Type the `https://` version once and check whether the padlock appears.
2. **The TLS certificate is still being issued.** After pointing a custom domain
   at Vercel, certificate issuance takes a few minutes up to a few
   hours. Until then the domain is served over plain HTTP.
3. **DNS still points somewhere else** — an old host, a registrar parking page,
   or a domain-forwarding/redirect service. Domain forwarding at a registrar is
   the single most common cause: it serves the site over HTTP from the
   registrar's own server, so the host's certificate never applies.
   Use the real records shown inside Vercel → Domains. Usually this is
   `A` record `76.76.21.21` for the apex and `CNAME` → `cname.vercel-dns.com`
   for `www`, but always follow the current Vercel dashboard values.
4. **`www` vs apex mismatch.** If only one of the two is registered with the host,
   the other gets no certificate. Add both and set one to redirect to the other.

Check the deploy URL first: `your-project.vercel.app` always
has valid HTTPS. If **that** shows the padlock and your custom domain does not,
the problem is definitively DNS/domain configuration, not the site.

Once HTTPS works, the `Strict-Transport-Security` header in `vercel.json`
keeps browsers on HTTPS automatically.

Never commit `RESEND_API_KEY` to GitHub or paste it into client-side JavaScript.
