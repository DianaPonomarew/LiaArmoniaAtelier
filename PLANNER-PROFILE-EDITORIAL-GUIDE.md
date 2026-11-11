# LIA ARMONÍA — Wedding Planner Directory | Editorial Intake

**Status:** Founding collection. No studios are automatically published. Invitation, approval and a signed referral agreement are independent steps.

## Request from interested wedding planners (sent by email after they opt in)

- Studio trading name, legal entity and key contact (private email for operations)
- Website, Instagram, home city, all countries/regions served, and languages
- Planning services: full planning, partial planning, coordination, destination/production, etc.
- Typical guest count and indicative starting planning fee or budget range (optional; confirm currency and tax basis)
- A concise studio biography (up to 120 words), approach, signature style and 3–5 specialties
- Three to six high-quality horizontal or portrait images (e.g. weddings they actually planned), with precise photographer credits and **written rights/permission to publish on LIA's website**
- Optional client testimonials or external review page URL. Display a score only with a verifiable source, explicit rights and a current review count; no synthetic stars or fabricated reviews
- The client's preferred contact process, acceptance restrictions and availability / response expectations
- Written editorial approval of final profile, image rights, permission for each destination claimed and permission to display indicative pricing
- **Separate signed referral agreement** for the proposed 15% of net planning-service fees actually received from attributable new Lia introductions, excluding taxes and pass-through/third-party costs; agree lead acknowledgment, prior-lead disputes, attribution window, proof of booking, payment timing, cancellation and required disclosures
- Optional offer of LIA creative-direction / visualization services at case-specific partner pricing; no obligation to purchase them

## Published profile schema

All fields in **planner-profiles.json** are public once uploaded to the site. Never place private contact information or unsigned agreements in it.

Example structure (not an actual partner, and **do not publish**):

```json
{
  "id": "verified-studio-slug",
  "status": "approved",
  "publication_consent": true,
  "studio_name": "Studio name",
  "short_description": "Approved editorial description",
  "countries": ["Italy", "France"],
  "regions": ["Tuscany", "Provence"],
  "city": "Florence",
  "languages": ["English", "Italian"],
  "services": ["Full Planning", "Destination Weddings"],
  "styles": ["Editorial", "Modern romantic"],
  "starting_fee": "From €5,000",
  "website": "https://example.com",
  "instagram": "https://instagram.com/example",
  "image": "https://approved-cdn.example.com/photo.jpg",
  "image_credit": "© Authorized photographer",
  "rating": {
    "score": 4.9,
    "count": 26,
    "source_url": "https://verifiable-review-source.example.com",
    "verified": true
  }
}
```

Use one approved profile per item in `profiles`. Filters are generated dynamically from approved `countries`, `regions`, `services` and `languages`. Unknown fields are ignored by the interface.

## How referrals are tracked

1. Couple selects a published studio or asks Lia to find a match on **/planners.html**.
2. A client-initiated inquiry goes to **/api/atelier-inquiry** as `planner_discovery_request`. The server returns `PD-YYYY-...`, stores a private submission in Blob, and emails the studio inbox.
3. Lia reviews needs, checks partner agreement, validates that this is a new lead and gets the couple's consent before any partner introductions.
4. Lia sends the mutually acknowledged referral ID to the planner and tracks accepted / not accepted status.
5. Only if a qualifying booking is signed and planning fees are received does the separately signed commission arrangement determine invoicing. The site itself does **not** calculate, bill or collect commission, or claim the referral is accepted.
6. If no eligible partner is available, offer manual concierge matching. Do not invent planner profiles, ratings or availability.

The venue collection remains a separate section. Both discovery sections are linked from **/discover.html**.

