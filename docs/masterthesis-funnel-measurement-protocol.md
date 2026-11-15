# LIA ARMONÍA — Masterthesis Measurement Protocol (Draft)
**14 November 2026** · For discussion with Jürgen / Prof. Schacht. Not an approved research design or a claim about outcomes.

## Working title
**Von KI-generierter Inspiration zu realen Vermittlungsbuchungen: Empirische Analyse der Customer Journey einer kuratierten digitalen Luxury-Wedding-Plattform am Beispiel von LIA ARMONÍA**

## Primary research question
**Wie entwickelt sich die Customer Journey von KI-generierter Social-Media-Aufmerksamkeit zu qualifizierten Vermittlungsanfragen und bestätigten Buchungen bei realen Luxury Wedding Plannern, und welche Prozessfaktoren sind mit dem Vermittlungserfolg verbunden?**

## Explicit scope
- Instagram: original *AI-generated inspirational* editorial content; distinguish formats and posting dates.
- Website: **real** planners and venues, authentic partner portfolios, and human-curated matching; not AI-generated renderings of partners.
- Outcome: true, verified planner booking, not just likes, impressions or an inquiry.
- Analytical focus: conversion, fit, trust, clarity of concierge value, responsiveness. The work examines the real company, not a hypothetical AI recommender or an invented automated design workflow.

## Candidate subquestions and hypotheses
- RQ1: What fraction of attributable Instagram-driven visits becomes inquiries and qualified referrals?
- RQ2: What proportion of introduced couples reaches consultation, proposal and confirmed booking?
- RQ3: What observable operational factors (planner fit, response time, process friction, clarity of trust messaging) accompany successful or unsuccessful progression?
- Exploratory proposition: AI-generated content is useful for reach, whereas a trustworthy and professionally staffed service is critical for conversion. This is **not** a finding until supported by data.

## Data dictionary and collection
| Entity / event | Definition | Data to retain for analysis |
|---|---|---|
| content post | Published editorial Instagram item | post ID, date, AI-created flag, format, aggregate reach/engagement from insights |
| source visit | Website visit with defensible campaign attribution | event date, non-identifying campaign/source, aggregate analytics; consider consent requirements |
| inquiry | Submitted planner introduction request | reference ID, timestamp, campaign code if present, status; private client fields outside thesis extract |
| qualified inquiry | Predefined eligibility criteria satisfied | reference ID, qualification flag and categorical reason if unqualified |
| introduction | Couple authorized introduction, partner actually contacted | reference ID, partner pseudonym, timestamp |
| consultation | Actual consultation with partner | confirmed status/date |
| proposal | Partner provided actual proposal | confirmed status/date |
| booking | Couple contracted real partner services | confirmation evidence type, date; no customer-identifiable details in research dataset |
| payment | Partner confirms qualifying payment, if available | verification/date and optional aggregate amount; don't assume from booking |

Use separate statuses for open, unknown, declined, lost, unqualified and booked. Do not count delayed conversions as lost prematurely. Maintain an audit trail for edits and events.

## Core ratios and caveats
- Inquiry conversion = inquiries / attributable landing visits *within a compatible tracking cohort*.
- Qualification = qualified inquiries / inquiries with a completed assessment.
- Intro rate = actual introductions / eligible and permitted inquiries.
- Booking rate = confirmed bookings / introductions with sufficiently matured follow-up.
- Display **n/N** and percentages; report *coverage* and cohort dates. Never divide unrelated Instagram reach by all bookings to imply causal conversion.
- Attribution is source-based (e.g. UTM or voluntary inquiry attribution); other touchpoints may influence a decision.

## Research method
1. **Pre-register definitions** with supervisor, including how bookings are verified and the observation window.
2. **Baseline observation**: collect process data over a defined fixed interval. Proposed **8–12 weeks** depending on actual lead volume, plus ongoing booking-status follow-up.
3. **Diagnosis**: identify the largest measurable bottleneck; optionally interview couples or use short voluntary anonymous trust/decision-friction surveys, with consent and no customer-identifying quotes.
4. **Intervention**: select **one** targeted measure (e.g. clearer concierge explanation, more prompt response, or better qualification), *after* the baseline. Record date and all concurrent changes.
5. **Evaluation**: compare matched cohorts before/after, or run a randomized A/B design only if operationally feasible. Highlight small samples, seasonality, traffic mix, planner availability and long luxury booking cycles. **A/B tests are not required.**
6. **Report**: funnel counts, conversions, completion times, confidence intervals where justifiable, missing data, limits of causal inference and real business recommendations.

## Privacy and ethics
- Keep raw client contact details and sensitive briefings in private production systems with least-privilege access. The thesis uses aggregated or de-identified research records and only public partner assets with permission.
- Public venue and portfolio photos being online does not automatically mean unrestricted reuse; confirm publication/academic permissions where needed.
- Only use legally appropriate consent and cookie tracking, including clear disclosure of analytics and intended study use where required; confirm with supervisor and applicable policy.
- No publication of partner-specific fees, customer budgets, signed agreements, or commercial confidential information without approval.
- Researcher is also business owner; disclose potential conflicts, measurement limitations and any intervention.

## Next academic conversation
Ask Jürgen to agree on the main research question, whether the target variable should be **confirmed planner bookings** or **qualified introductions** if booking counts are too small, duration/method, and how to document changes. Keep scope intentionally narrower than the entire digital platform.
