import { DESIGN_EDITION, sendJson, verifyEditionSession } from './_design-edition-stripe.js';

const purchasedEdition = {
  title: 'Burgundy + Chartreuse',
  eyebrow: 'Design Edition 01',
  subtitle: 'Ceremony Design Edition',
  summary: 'Your private Lia Armonía ceremony dossier: design direction, venue fit, seating logic, ceremony aisle rhythm, scenic wall routes, sourcing, floral and candle guidance, budget architecture and planner hand-off.',
  gallery: [
    'assets/design-edition-burgundy-chartreuse-center-aisle.jpg',
    'assets/design-edition-burgundy-chartreuse-chair-detail.jpg'
  ],
  sections: [
    {
      id: 'overview',
      number: '01',
      title: 'Ceremony Design At A Glance',
      body: 'A coastal ceremony design system translated beyond the image: venue direction, guest seating logic, aisle composition, scenic-build routes, planner hand-off and a working ceremony production range.'
    },
    {
      id: 'visual-library',
      number: '02',
      title: 'Ceremony Visual Library',
      body: 'Selected views document the ceremony world: cover composition, architectural focal point, aisle rhythm and chair detail. Reception, dinner and lounge imagery are intentionally excluded from the paid product scope.',
      gallery: [
        'assets/design-edition-burgundy-chartreuse-center-aisle.jpg',
        'assets/design-edition-burgundy-chartreuse-chair-detail.jpg'
      ]
    },
    {
      id: 'venue-fit',
      number: '03',
      title: 'Venue Fit',
      body: 'Best suited to coastal, quarry, museum, hotel or private-estate architecture with strong vertical proportion, neutral stone or concrete texture, controlled access and enough scale for a singular entrance axis.'
    },
    {
      id: 'seating',
      number: '04',
      title: 'Ceremony Seating + Aisle',
      body: 'The edition frames individual burgundy chairs, bench interpretations and aisle spacing as ceremony decisions, so the visual intention can adapt to guest count, access, comfort and venue restrictions.'
    },
    {
      id: 'scenic-wall',
      number: '05',
      title: 'Scenic Ceremony Wall',
      body: 'Construction routes include scenic frame with bendable plywood, EPS foam with hardcoat, GRG / reinforced gypsum and a textile skin on curved frame. Solid ordinary plaster alone is not treated as an outdoor structural solution.'
    },
    {
      id: 'materials',
      number: '06',
      title: 'Color + Materials',
      body: 'The ceremony material language balances pale stone, burgundy textile, chartreuse botanical notes, candlelight, warm metal and sculptural softness.'
    },
    {
      id: 'sourcing',
      number: '07',
      title: 'Ceremony Sourcing',
      body: 'Sourcing is organized by ceremony category: seating, scenic surface, ceremony plinths, candlelight, floral production and fabrication targets. Links and references are planning resources, not guaranteed vendor relationships.'
    },
    {
      id: 'production',
      number: '08',
      title: 'Production Team',
      body: 'Potential ceremony production and scenic fabrication resources are identified from published capabilities. If Lia Armonía is engaged separately, the edition can be adapted to the selected venue and coordinated with local teams.'
    },
    {
      id: 'budget',
      number: '09',
      title: 'Ceremony Budget',
      body: 'The ceremony-only interpretation is approximately USD 12,000–24,000 for an 80-guest planning model. This excludes reception, dinner, lounge, bar, catering, photography, planning and venue costs.'
    },
    {
      id: 'planner-brief',
      number: '10',
      title: 'Production Handoff',
      body: 'The included planner / producer brief condenses the ceremony intent, production questions and hand-off logic into a practical document for review and coordination.'
    }
  ],
  downloads: [
    { key: 'planner-brief', type: 'PDF', label: 'Download Planner / Producer Brief' },
    { key: 'dossier', type: 'PDF', label: 'Download Ceremony Dossier' },
    { key: 'full-edition', type: 'ZIP', label: 'Download Ceremony Edition Files' }
  ]
};

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return sendJson(res, 405, { error: 'Method not allowed.' });
  }

  try {
    const sessionId = req.query?.session_id || new URL(req.url, 'https://www.liaarmonia.com').searchParams.get('session_id');
    const { session } = await verifyEditionSession(sessionId);
    return sendJson(res, 200, {
      productSlug: DESIGN_EDITION.productSlug,
      editionNumber: DESIGN_EDITION.editionNumber,
      buyerEmail: session.customerEmail || '',
      edition: purchasedEdition
    });
  } catch (error) {
    return sendJson(res, error.statusCode || 500, { error: error.message || 'Access could not be verified.' });
  }
}
