# LIA ARMONÍA — Luxury Planner Concierge Launch Blueprint
**Prepared:** 14 November 2026 · **Status:** draft for internal review; no live-site changes

## Real offer and boundaries
LIA ARMONÍA connects couples to **real, professional, selectively approved destination wedding planners and venues**, using the planners' authentic portfolios and verified information. Editorial, AI-generated wedding inspiration lives on Instagram only. Do **not** put those AI images into the planner/venue directory or imply they depict the partners' delivered work.

**Core promise:** A personal, curated introduction to experienced planners whose destinations, design sensibilities and practical requirements align with the couple's vision. No promised availability, pricing, preferred treatment or guaranteed booking. Be transparent that a partner referral fee may be received where contractually agreed; requesting an introduction is free.

## Current implementation already inspected
- `planners.html`: collection/search filters, private matching CTA, destination/date/budget/guests/vision/introduction form; consent and studio-first workflow.
- `api/atelier-inquiry.js`: private Vercel Blob storage for planner discovery requests, studio email notification if configured, minimum partner lead notices for eligible partners; partner does **not** receive the couple's private contact info automatically.
- `api/_planner-directory.js`: public founding collection scheduled for **15 January 2027**, and publication only for approved profiles with publication consent.
- Supabase already has partners, inquiries and referrals tables. These are **not proof** that website submissions are synced to all tables or that complete booking attribution exists.
- Commission terms are not uniform; preserve existing bespoke agreements unless explicitly changed in writing.

## Customer-facing website text proposal (English)
**Eyebrow:** THE PRIVATE PLANNER EDIT
**Heading:** A vision this personal deserves the right people.
**Body:** Discover a considered selection of established wedding planners with authentic portfolios, international expertise and distinct creative perspectives. Tell us where you dream of celebrating, your date, budget and priorities. Our atelier will review your request and help arrange a thoughtful introduction to a fitting professional.
**Primary CTA:** Request a Personal Introduction
**Supporting line:** Complimentary introduction request · Personally reviewed · No obligation to book
**Trust note:** Our curated partner profiles feature real work by the named studios. LIA ARMONÍA may receive a referral commission from some partners if a qualifying booking takes place; this does not guarantee availability or suitability.
**Process microcopy:**
1. Share your vision — date, destination, guest count, budget and preferences.
2. We review your request and identify suitable, approved planning partners.
3. With your permission, we introduce you and help coordinate the first conversation.
4. The planner handles pricing, availability, services and any booking directly.
**Follow-up disclosure:** LIA ARMONÍA provides a curated introduction, not the planning service itself, unless separately commissioned.

## Concierge operating procedure
1. **Intake**: generate reference ID; privately store consent, lead source and submission time. Respond with confirmation that it is a *request*, not a reservation.
2. **Review**: check destination, event date/season, guest count, overall budget band, planning needs, vision and language. Record missing details; do not require excessive personal details.
3. **Match**: shortlist 1–3 **approved** partners based on actual destinations, specialties, minimum budgets and capacity/availability **subject to partner confirmation**. Respect bespoke commission and agreement status.
4. **Permission**: request the couple's authorization for a named introduction before sharing personal contact details and private briefings.
5. **Partner contact**: ask the eligible partner about interest and availability, avoid promising acceptance. Where partner agreement is unresolved, keep the referral on hold.
6. **Introduction**: send only necessary information, note timestamp and specific partner.
7. **Follow-up**: internal reminders for unacknowledged leads; record whether consultation, proposal, signed booking and payment are *actually confirmed*.
8. **Close**: use reasons such as budget mismatch, destination mismatch, no response, deferred decision, booked elsewhere, unsuitable or unknown. No invented reasons.

## Operational response targets — proposed, not existing SLAs
- Atelier lead review: within **1 business day**.
- First concierge reply: within **2 business days** after required information is received.
- Planner status request: after couple permission, prompt partner; if no response within **2 business days**, follow up internally or choose an alternative partner.
Do not advertise these as guarantees until team capacity and process are tested.

## Website and technical acceptance tests
- [ ] Test mobile and desktop; keyboard and screen-reader labels; form submits when valid and provides actionable errors.
- [ ] Verify a test inquiry is saved privately, with unique ID; success receipt and studio notification tested independently.
- [ ] Verify consent and safe data handling; no private fields leaked in public index, cache or partner lead preview.
- [ ] Verify both referral arrangements: approved legacy partner uses own terms; new partner uses only its agreed terms.
- [ ] Verify a meaningful privacy notice/consent for attribution tracking.
- [ ] Confirm Instagram UTM/source is preserved to lead record, with "unknown" when unavailable; do not equate attribution with causal proof.
- [ ] Ensure every customer-facing booking outcome is manually or independently confirmed.
- [ ] Test operational fallback for email failure and staff notification; never silently discard submissions.
- [ ] Establish rollback plan and staging QA before any public deployment.

## Initial operating scorecard (weekly)
Traffic attributable to Instagram → requests → qualified requests → permission to introduce → introductions → consultations → proposals → confirmed bookings → confirmed payments. Report absolute values and rates with denominators. Show source unknown, missing status, and open leads separately. No private client details in the thesis export.

## Open decision points (not required before preparing this plan)
- Which destinations and minimum budget segments are priority at launch?
- Which planner partner response targets are actually feasible?
- Where to store authoritative funnel state (Vercel Blob and/or Supabase) and how to reconcile without duplicates.
- Final trust copy and fee disclosure approved by LIA ARMONÍA before publication.
