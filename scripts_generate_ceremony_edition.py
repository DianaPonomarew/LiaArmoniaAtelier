from pathlib import Path
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    PageTemplate,
    Paragraph,
    Spacer,
    Image,
    Table,
    TableStyle,
    PageBreak,
    KeepTogether,
)
from reportlab.pdfbase.pdfmetrics import stringWidth

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "api" / "_protected" / "design-editions" / "burgundy-chartreuse"
ASSETS = ROOT / "assets"
OUT.mkdir(parents=True, exist_ok=True)

PAGE_W, PAGE_H = letter
MARGIN = 0.62 * inch
IVORY = colors.HexColor("#F4EADC")
STONE = colors.HexColor("#C8B8A5")
BRONZE = colors.HexColor("#C69B6A")
BURGUNDY = colors.HexColor("#4B0F14")
INK = colors.HexColor("#080604")
LINE = colors.Color(0.86, 0.74, 0.58, alpha=0.35)


def draw_bg(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(INK)
    canvas.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    canvas.setStrokeColor(LINE)
    canvas.setLineWidth(0.45)
    canvas.line(MARGIN, 0.48 * inch, PAGE_W - MARGIN, 0.48 * inch)
    canvas.setFillColor(STONE)
    canvas.setFont("Helvetica", 6.5)
    canvas.drawString(MARGIN, 0.28 * inch, "CONCEPT TO REALITY")
    page = str(canvas.getPageNumber()).zfill(2)
    canvas.drawRightString(PAGE_W - MARGIN, 0.28 * inch, f"LIA ARMONIA / {page}")
    canvas.restoreState()


styles = getSampleStyleSheet()
styles.add(ParagraphStyle(
    name="Eyebrow",
    parent=styles["Normal"],
    fontName="Helvetica-Bold",
    fontSize=7.5,
    leading=10,
    textColor=BRONZE,
    uppercase=True,
    tracking=1.8,
    spaceAfter=10,
))
styles.add(ParagraphStyle(
    name="LiaTitle",
    parent=styles["Normal"],
    fontName="Times-Roman",
    fontSize=39,
    leading=41,
    textColor=IVORY,
    spaceAfter=16,
))
styles.add(ParagraphStyle(
    name="LiaH1",
    parent=styles["Normal"],
    fontName="Times-Roman",
    fontSize=27,
    leading=31,
    textColor=IVORY,
    spaceAfter=14,
))
styles.add(ParagraphStyle(
    name="LiaH2",
    parent=styles["Normal"],
    fontName="Times-Roman",
    fontSize=19,
    leading=22,
    textColor=IVORY,
    spaceAfter=8,
))
styles.add(ParagraphStyle(
    name="Body",
    parent=styles["Normal"],
    fontName="Helvetica",
    fontSize=9.3,
    leading=14.6,
    textColor=STONE,
    spaceAfter=8,
))
styles.add(ParagraphStyle(
    name="Small",
    parent=styles["Normal"],
    fontName="Helvetica",
    fontSize=7.4,
    leading=11,
    textColor=colors.HexColor("#A99682"),
    spaceAfter=6,
))


def p(text, style="Body"):
    return Paragraph(text, styles[style])


def fit_image(path, width, height):
    img = Image(str(path))
    iw, ih = img.imageWidth, img.imageHeight
    scale = min(width / iw, height / ih)
    img.drawWidth = iw * scale
    img.drawHeight = ih * scale
    return img


def page_doc(path):
    doc = BaseDocTemplate(
        str(path),
        pagesize=letter,
        leftMargin=MARGIN,
        rightMargin=MARGIN,
        topMargin=0.72 * inch,
        bottomMargin=0.72 * inch,
    )
    frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="main")
    doc.addPageTemplates([PageTemplate(id="main", frames=[frame], onPage=draw_bg)])
    return doc


def section(num, title, body):
    return [
        p(f"{num} / {title.upper()}", "Eyebrow"),
        p(title, "LiaH1"),
        p(body),
    ]


def build_dossier():
    doc = page_doc(OUT / "01_CONCEPT_TO_REALITY_DOSSIER.pdf")
    story = []

    cover = ASSETS / "design-edition-burgundy-chartreuse-cover.jpg"
    if cover.exists():
        story.append(fit_image(cover, doc.width, 4.7 * inch))
        story.append(Spacer(1, 20))
    story += [
        p("LIA ARMONIA", "Eyebrow"),
        p("Concept to Reality<br/>Burgundy + Chartreuse<br/>Ceremony Design Edition", "LiaTitle"),
        p("Production sourcing and feasibility dossier", "LiaH2"),
        p("Southern California sourcing edition - September 2026", "Small"),
        PageBreak(),
    ]

    story += section(
        "01",
        "Ceremony Design At A Glance",
        "A coastal ceremony direction built from oxblood burgundy, acidic chartreuse, warm ivory, soft stone, candlelight and coastal sunset. The architecture stays visible. Color, floral gesture, seating and scenic form carry the mood without turning the event into decoration."
    )
    data = [
        ["Element", "Execution Route", "Planning Note"],
        ["Burgundy ceremony chairs", "Rental, upholstery or silhouette reference", "Preserve the low, upholstered visual weight."],
        ["White ceremony plinths", "Event rental", "Use varied heights around the ceremony focal point."],
        ["Ceremony candles / hurricanes", "Rental or retail", "Cluster along aisle and focal zone only."],
        ["Chartreuse + burgundy florals", "Floral production", "Keep color concentrated and architectural."],
        ["Burgundy sculptural wall", "Custom scenic fabrication", "Requires venue-specific sizing, ballast and wind review."],
    ]
    story.append(make_table(data, [1.6 * inch, 1.85 * inch, 2.45 * inch]))
    story.append(PageBreak())

    story += section(
        "02",
        "Ceremony Reality Check",
        "Most visible ceremony pieces can be sourced through existing event rental, upholstery or floral channels. The true custom element is the burgundy scenic wall, because its scale, curve, finish and outdoor stability determine whether the concept feels architectural rather than themed."
    )
    story.append(bullets([
        "Do not purchase 80 retail chairs blindly. Use the chair as a silhouette reference for a rental house or upholsterer.",
        "Confirm candle policy, open-flame rules, flooring protection and load-in route before final sourcing.",
        "Treat scenic wall allowances as planning references, not final fabricator quotes.",
    ]))
    story.append(PageBreak())

    story += section(
        "03",
        "Verified Sourcing - Ceremony Seating",
        "The closest burgundy chair references should be used to communicate silhouette, depth and upholstered color. For a real event, the stronger route is usually rental-house sourcing, slipcover development or custom upholstery rather than buying retail inventory."
    )
    story.append(bullets([
        "Target look: burgundy upholstered ceremony seating with sculptural restraint.",
        "Planning proxy: 80 chairs can move materially depending on rental market, delivery and upholstery route.",
        "Keep aisle clearances compliant with venue rules and guest accessibility.",
    ]))
    story.append(PageBreak())

    story += section(
        "04",
        "Plinths + Ceremony Objects",
        "White cylinder plinths remain relevant because they support the ceremony floral architecture without adding visual noise. Use them near the focal point and aisle threshold rather than as reception props."
    )
    story.append(bullets([
        "Use three to five heights for depth.",
        "Keep finishes matte or softly reflective, never glossy plastic.",
        "Confirm stability, sandbagging and flooring protection for outdoor conditions.",
    ]))
    story.append(PageBreak())

    story += section(
        "05",
        "Ceremony Candlelight + Floral Production",
        "Candlelight belongs to the aisle rhythm, plinth clusters and scenic focal zone. Floral production should hold burgundy depth and chartreuse tension in controlled gestures, keeping the stone and negative space visible."
    )
    story.append(bullets([
        "Dense candle clusters at the aisle and focal point, not table styling.",
        "Florals: burgundy mass, chartreuse interruption, restrained branch or stem movement.",
        "Confirm flame rules, LED alternatives and wind shielding with the venue.",
    ]))
    story.append(PageBreak())

    wall = ASSETS / "design-edition-burgundy-chartreuse-hero.png"
    if wall.exists():
        story.append(fit_image(wall, doc.width, 3.4 * inch))
        story.append(Spacer(1, 16))
    story += section(
        "06",
        "Custom Scenic Fabrication",
        "The burgundy sculptural ceremony wall is the core custom element. Suitable routes include scenic flats with bendable plywood, EPS foam with hardcoat, GRG or reinforced gypsum, or a textile skin on a curved frame. Outdoor use requires rear bracing, ballast and venue-specific engineering review."
    )
    story.append(make_table([
        ["Route", "Use When", "Planning Caveat"],
        ["Scenic frame + flexible skin", "Fastest theatrical build", "Needs clean finish and bracing."],
        ["EPS foam + hardcoat", "Organic curve needed", "Confirm durability and transport."],
        ["GRG / reinforced gypsum", "Higher finish quality", "Heavier and engineering-sensitive."],
        ["Textile skin on frame", "Softest interpretation", "Less monolithic than plaster-effect scenic."],
    ], [1.65 * inch, 2.1 * inch, 2.15 * inch]))
    story.append(PageBreak())

    story += section(
        "07",
        "Production Team / Quote Targets",
        "Send quote requests to scenic fabricators, production rental houses and floral teams with the same concise brief. These are quote targets, not Lia Armonia partners or endorsements unless separately confirmed."
    )
    story.append(bullets([
        "Send: reference visuals, venue, indoor/outdoor status, desired dimensions, matte burgundy finish and install/strike window.",
        "Ask for: line-item quote, delivery, labor, ballast, engineering needs, weather policy and revision timeline.",
        "Confirm: insurance, access, candle rules, floor protection and venue approval process.",
    ]))
    story.append(PageBreak())

    story += section(
        "08",
        "Ceremony Budget Architecture",
        "This planning range covers the visible ceremony environment only. It excludes reception, dinner, lounge, bar, catering, photography, planning, entertainment, permits, extraordinary rigging and venue costs."
    )
    story.append(make_table([
        ["Ceremony Element", "Planning Range"],
        ["Custom burgundy scenic wall", "$3,500-$8,000"],
        ["Stage / steps, if required", "$500-$1,200"],
        ["80 burgundy ceremony seats", "$3,600 rental proxy / up to $12,000 retail proxy"],
        ["White ceremony plinths", "$300-$600"],
        ["Ceremony candles / cylinders", "$450-$900"],
        ["Ceremony florals", "$2,500-$5,000"],
        ["Ceremony lighting, if required", "$500-$1,500"],
        ["Delivery / install / strike", "$1,500-$3,000"],
        ["Indicative ceremony environment", "$12,000-$24,000"],
    ], [3.35 * inch, 2.55 * inch]))
    story.append(PageBreak())

    story += section(
        "09",
        "Production Handoff",
        "Move from concept to event through a clear sequence: lock the venue requirements, request quotes, approve samples, technicalize dimensions and engineering, install and style the ceremony, then strike and return rentals."
    )
    story.append(bullets([
        "Lock venue requirements: power, access, candle policy, loading, floor protection and outdoor wind requirements.",
        "Request quotes: rental houses, florist and scenic fabricators receive the same visual and quantity brief.",
        "Approve samples: burgundy paint, upholstery direction, candle vessel and floral color before production.",
        "Technicalize: final scenic dimensions, ballast, stage details and lighting positions become venue-specific.",
    ]))
    story.append(PageBreak())

    story += section(
        "10",
        "Source Index + Purchaser Use",
        "Source references are planning resources only. Final pricing, delivery, tax and inventory depend on event date, venue, quantity and vendor availability."
    )
    story.append(p("Purchaser use: this dossier may be shared with the purchaser's planner, venue, florist and production vendors solely to execute one private ceremony. It may not be resold, redistributed, republished as a template, or presented as the purchaser's own design work. Design concept, creative direction and production sourcing dossier by Lia Armonia. For custom adaptation or production development: atelier@liaarmonia.com."))
    doc.build(story)


def build_brief():
    doc = page_doc(OUT / "02_PLANNER_PRODUCER_QUICK_BRIEF.pdf")
    story = [
        p("LIA ARMONIA / PLANNER PRODUCER BRIEF", "Eyebrow"),
        p("Burgundy + Chartreuse<br/>Ceremony Design Edition", "LiaTitle"),
        p("Use this brief to request venue, rental, floral and scenic quotes for the ceremony environment only.", "Body"),
        make_table([
            ["Priority", "Brief"],
            ["Scope", "Ceremony environment only. Reception, dinner, lounge and bar are excluded."],
            ["Venue Fit", "Coastal, quarry, museum, hotel or private-estate architecture with vertical proportion and a strong ceremony axis."],
            ["Custom Element", "Burgundy sculptural wall. Requires dimensions, bracing, ballast and outdoor wind review."],
            ["Seating", "Burgundy upholstered ceremony chairs or an approved rental/upholstery interpretation."],
            ["Florals", "Burgundy mass with chartreuse accents, held in controlled architectural gestures."],
            ["Candlelight", "Aisle and focal-zone rhythm only, subject to venue flame rules."],
            ["Budget", "Indicative ceremony environment: $12,000-$24,000, excluding venue and non-ceremony production."],
        ], [1.55 * inch, 4.35 * inch]),
        Spacer(1, 18),
        p("Quote request checklist", "LiaH1"),
        bullets([
            "Reference visuals and desired final dimensions.",
            "Indoor/outdoor status, load-in access, install window and strike time.",
            "Exact burgundy finish target and matte plaster-effect direction.",
            "Line-item delivery, labor, ballast, engineering and weather policies.",
            "Rental versus purchase preference for seating and ceremony objects.",
        ]),
        Spacer(1, 18),
        p("Purchaser use", "LiaH1"),
        p("This brief may be shared with the purchaser's planner, venue, florist and production vendors solely to execute one private ceremony. It may not be resold, redistributed, republished as a template or presented as the purchaser's own design work."),
    ]
    doc.build(story)


def make_table(data, widths):
    table_data = [[Paragraph(str(cell), styles["Small"] if r else styles["Eyebrow"]) for cell in row] for r, row in enumerate(data)]
    table = Table(table_data, colWidths=widths, hAlign="LEFT", repeatRows=1)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.Color(0.30, 0.06, 0.08, alpha=0.88)),
        ("TEXTCOLOR", (0, 0), (-1, -1), STONE),
        ("GRID", (0, 0), (-1, -1), 0.35, colors.Color(0.86, 0.74, 0.58, alpha=0.28)),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    return table


def bullets(items):
    rows = []
    for item in items:
        rows.append([Paragraph("-", styles["Body"]), Paragraph(item, styles["Body"])])
    table = Table(rows, colWidths=[0.22 * inch, 5.7 * inch], hAlign="LEFT")
    table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 2),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
    ]))
    return table


if __name__ == "__main__":
    build_dossier()
    build_brief()
