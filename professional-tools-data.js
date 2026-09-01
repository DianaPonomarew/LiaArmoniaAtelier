const PUBLIC_LAUNCH_MODE = true;

const professionalTools = {
  "sicily-01-design-translation-system": {
    edition: "01",
    name: "Sicily 01",
    descriptor: "Stone / spatial / vendor translation",
    tagline: "A stone-world translation system for atmosphere, routes and vendor scope.",
    image: "../../assets/journal-gateway-detail-01.jpg",
    mood: "Stone light, carved texture, candle density and restrained floral weight.",
    routeA: "Custom limestone bars, sculptural candle fields and site-specific floral vessels.",
    routeB: "Rental plinths, modular stone wraps and scaled floral gestures.",
    routeC: "Freestanding candle clusters and fabric-safe tabletop translation.",
    related: ["scarlet-gate-01-design-translation-system", "chandelier-corridor-01-design-translation-system"]
  },
  "scarlet-gate-01-design-translation-system": {
    edition: "02",
    name: "Scarlet Gate 01",
    descriptor: "Textile / threshold / production translation",
    tagline: "A threshold system for transforming dramatic textile direction into buildable scope.",
    image: "../../assets/journal-veil-ceremony-01.jpg",
    mood: "Deep oxblood textile, monumental entry, candlelit stone and processional scale.",
    routeA: "Custom suspended velvet portals with concealed rigging and floral integration.",
    routeB: "Weighted textile frames with reduced height and modular candle lanes.",
    routeC: "Floor-based fabric gestures, freestanding plinths and venue-safe lighting.",
    related: ["sicily-01-design-translation-system", "desert-mirage-01-design-translation-system"]
  },
  "chandelier-corridor-01-design-translation-system": {
    edition: "03",
    name: "Chandelier Corridor 01",
    descriptor: "Overhead / rigging / lighting translation",
    tagline: "A luminous corridor system for overhead scale, lighting rhythm and guest flow.",
    image: "../../assets/world-chandelier-corridor.mp4",
    mood: "Ivory textile canopy, chandelier repetition, reflective floor and architectural axis.",
    routeA: "Full suspended chandelier corridor with rigging plan assumptions and power zones.",
    routeB: "Reduced canopy spans with selected chandelier clusters and repeated glow points.",
    routeC: "Freestanding lighting rhythm with no ceiling dependency.",
    related: ["sicily-01-design-translation-system", "desert-mirage-01-design-translation-system"]
  },
  "desert-mirage-01-design-translation-system": {
    edition: "04",
    name: "Desert Mirage 01",
    descriptor: "Experience / mirror / site translation",
    tagline: "A desert-site system for mirage surfaces, reception flow and environmental limits.",
    image: "../../assets/concept-05-burgundy-canyon-01.jpg",
    mood: "Mineral terrain, reflective thresholds, sunset glare and warm low lighting.",
    routeA: "Custom mirror planes, sculptural aisle frames and full environmental light story.",
    routeB: "Reduced reflective moments, modular frames and controlled guest pathing.",
    routeC: "Low-risk scenic accents with wind-aware, freestanding components.",
    related: ["scarlet-gate-01-design-translation-system", "chandelier-corridor-01-design-translation-system"]
  }
};

const stripeCheckoutLinks = {
  "collection-01": "",
  "sicily-01-design-translation-system": "",
  "scarlet-gate-01-design-translation-system": "",
  "chandelier-corridor-01-design-translation-system": "",
  "desert-mirage-01-design-translation-system": ""
};

const benefits = [
  ["Sell the vision", "Turn a visual concept into a client-facing design direction."],
  ["Test feasibility early", "Identify venue and production restrictions before the concept is treated as final."],
  ["Offer realistic alternatives", "Use Custom, Adapted and Venue-Safe routes without losing the design language."],
  ["Get cleaner vendor quotes", "Send the exact scope each creative partner needs."],
  ["Reduce re-explaining", "Reuse design IDs from presentation to approval to vendor briefing."],
  ["Reuse the framework", "Adapt the Clean Master for future client projects."]
];

const useCases = [
  ["Client design call", "Present the concept and agree on direction."],
  ["Venue review", "Capture restrictions before production is priced."],
  ["Vendor pricing", "Send florist, rentals, lighting and fabrication briefs."],
  ["Client approval", "Record approved decisions in one shared language."],
  ["Revision round", "Update affected IDs rather than rewriting the full project."]
];

const previewSteps = [
  ["01", "See the concept", "The completed example shows the design direction in context.", "concept"],
  ["02", "Make it practical", "Venue Reality turns atmosphere into constraints, assumptions and production questions.", "reality"],
  ["03", "Choose routes", "One visual direction is translated into Custom, Adapted and Venue-Safe possibilities.", "routes"],
  ["04", "Brief vendors", "Each creative partner receives the part of the design they own.", "vendor"],
  ["05", "Reuse the master", "The Clean Master gives you a repeatable structure for future client projects.", "master"]
];

function mediaFor(tool) {
  if (tool.image.endsWith(".mp4")) {
    return `<video autoplay muted loop playsinline controlslist="nodownload"><source src="${tool.image}" type="video/mp4"></video>`;
  }
  return `<img src="${tool.image}" alt="${tool.name} design translation preview">`;
}

function sheet(tool, type, index = "01") {
  const routes = [
    ["A", "CUSTOM", tool.routeA],
    ["B", "ADAPTED", tool.routeB],
    ["C", "VENUE-SAFE", tool.routeC]
  ];
  if (type === "routes") {
    return `<div class="system-sheet routes-sheet" aria-hidden="true"><small>${tool.name} / Route Logic</small><h4>Production Routes</h4><div>${routes.map(route => `<article><b>${route[0]}</b><span>${route[1]}</span><p>${route[2]}</p></article>`).join("")}</div></div>`;
  }
  if (type === "vendor") {
    return `<div class="system-sheet vendor-sheet" aria-hidden="true"><small>${tool.name} / Vendor Brief</small><h4>Scope Ownership</h4><dl><dt>Floral</dt><dd>Palette, density, vessels, installation zones.</dd><dt>Lighting</dt><dd>Candle rhythm, glow temperature, power questions.</dd><dt>Rentals</dt><dd>Forms, textile notes, material finish, quantities.</dd><dt>Venue</dt><dd>Restrictions, approval items, load-in sensitivity.</dd></dl></div>`;
  }
  if (type === "master") {
    return `<div class="system-sheet master-sheet" aria-hidden="true"><small>Clean Master / Reusable</small><h4>Blank Project Framework</h4><div class="sheet-lines"><i></i><i></i><i></i><i></i></div><p>Project ID, zone, visual intent, production assumption, owner, status.</p></div>`;
  }
  if (type === "reality") {
    return `<div class="system-sheet reality-sheet" aria-hidden="true"><small>${tool.name} / Venue Reality</small><h4>Constraints Before Commitment</h4><ul><li>Architecture and proportions</li><li>Attachment and rigging limits</li><li>Guest flow and service access</li><li>Lighting, weather and surface risk</li></ul></div>`;
  }
  return `<div class="system-sheet concept-sheet" aria-hidden="true"><small>${tool.name} / Page ${index}</small><h4>${tool.mood}</h4><div class="sheet-map"><span></span><span></span><span></span><span></span></div><p>Concept direction, atmosphere language and design IDs for production.</p></div>`;
}

function renderPreviewStory(tool) {
  return previewSteps.map(step => `
    <article class="preview-story-card">
      <div class="preview-story-copy"><span>${step[0]}</span><h3>${step[1]}</h3><p>${step[2]}</p></div>
      ${sheet(tool, step[3], step[0])}
    </article>`).join("");
}

function renderToggleGallery(tool, mode = "completed") {
  const completed = ["concept", "reality", "routes", "vendor", "concept", "routes"];
  const master = ["master", "master", "routes", "vendor"];
  const list = mode === "master" ? master : completed;
  return list.map((type, index) => sheet(tool, type, String(index + 1).padStart(2, "0"))).join("");
}

function renderProduct() {
  const root = document.querySelector("[data-professional-tool]");
  if (!root) return;
  const slug = root.dataset.professionalTool;
  const tool = professionalTools[slug];
  if (!tool) return;
  if (PUBLIC_LAUNCH_MODE) {
    document.title = `${tool.name} — Coming Soon | LIA ARMONÍA`;
    root.innerHTML = `<section class="tool-launch-hold"><p class="eyebrow">LIA PROFESSIONAL TOOLS / ${tool.name}</p><h1>A professional design system in development.</h1><p>${tool.tagline} The release is being completed privately before purchase access opens.</p><span>Coming Soon</span><a href="../../collaborations.html">Discuss a collaboration →</a></section>`;
    return;
  }
  document.title = `${tool.name} Design Translation System | LIA ARMONÍA`;
  root.innerHTML = `
    <section class="tool-hero">
      <div>
        <p class="eyebrow">LIA PROFESSIONAL TOOLS / ${tool.name}</p>
        <h1>${tool.tagline}</h1>
        <p>A professional design communication system for planners and event designers who need one clear bridge between concept, venue reality, client approval and vendor scope.</p>
        <div class="tool-actions"><button type="button" data-tool-checkout="${slug}">Purchase — $189</button><a href="#preview">Preview the system</a></div>
        <small>One-time purchase · Professional-use license included · Digital delivery after payment</small>
      </div>
      <figure>${mediaFor(tool)}</figure>
    </section>
    <aside class="tool-purchase-rail"><b>${tool.name}</b><span>Design Translation System</span><strong>$189 USD</strong><small>Professional-use license · Digital delivery</small><button type="button" data-tool-checkout="${slug}">Purchase</button></aside>
    <section class="tool-preview" id="preview"><p class="eyebrow">Guided Preview</p><h2>See the system, not just the mood.</h2><div class="preview-story-grid">${renderPreviewStory(tool)}</div></section>
    <section class="tool-toggle" aria-label="Completed Example and Clean Master">
      <div class="tool-toggle-controls"><button class="active" type="button" data-tool-tab="completed">Completed Example</button><button type="button" data-tool-tab="master">Clean Master</button></div>
      <p data-tool-tab-copy>Completed pages show the system fully applied to a design concept.</p>
      <div class="tool-toggle-gallery" data-tool-toggle-gallery>${renderToggleGallery(tool)}</div>
    </section>
    <section class="tool-benefits"><h2>Design it once. Use it throughout the project.</h2><div>${benefits.map(item => `<article><h3>${item[0]}</h3><p>${item[1]}</p></article>`).join("")}</div></section>
    <section class="tool-usecases"><p class="eyebrow">Real-world use</p><div>${useCases.map(item => `<article><h3>${item[0]}</h3><p>${item[1]}</p></article>`).join("")}</div></section>
    <section class="tool-fit"><article><h2>Built for you if you...</h2><ul><li>Develop design concepts for clients</li><li>Present visual direction before production</li><li>Work with florists, rentals, lighting, scenic or fabrication partners</li><li>Need one design language across vendors</li><li>Want clearer vendor communication</li></ul></article><article><h2>Not designed for...</h2><ul><li>Basic coordination only</li><li>Budget tracking</li><li>Seating management</li><li>CRM or CAD</li><li>Engineering or technical drawings</li></ul></article></section>
    <section class="tool-workflow"><p class="eyebrow">System Workflow</p><h2>Creative Direction → Venue Reality → Zone Design → Alternative Routes → Client Approval → Master Specification → Vendor Briefs</h2><p>One structured design source can move from client presentation to approval to vendor communication.</p></section>
    <section class="tool-routes"><article><span>Route A</span><h3>Custom</h3><p>${tool.routeA}</p></article><article><span>Route B</span><h3>Adapted</h3><p>${tool.routeB}</p></article><article><span>Route C</span><h3>Venue-Safe</h3><p>${tool.routeC}</p></article></section>
    <section class="tool-receive"><h2>What you receive.</h2><div><p>Completed Demonstration</p><p>Editable Clean Master</p><p>Production Tools</p><p>Venue References</p><p>Quick Start + Professional License</p><p>PPTX + PDF</p></div></section>
    <section class="tool-boundary"><h2>Professional boundary.</h2><p>This system communicates design intent, planning assumptions and vendor scope. It does not replace venue approvals, technical drawings, engineering, rigging plans, electrical design, permits, code compliance, fire-safety requirements, environmental or land-use permissions, fixture-load calculations or final vendor measurements.</p></section>
    <section class="tool-purchase-block"><p class="eyebrow">${tool.name}</p><h2>Design Translation System</h2><strong>$189 USD</strong><p>One-time purchase. Professional-use license included. Digital delivery after successful payment.</p><button type="button" data-tool-checkout="${slug}">Purchase the system →</button><small>Secure checkout via Stripe.</small></section>
    <section class="tool-collection-upgrade"><h2>Prefer the complete collection?</h2><p>Four Design Translation Systems: Sicily 01 · Scarlet Gate 01 · Chandelier Corridor 01 · Desert Mirage 01.</p><strong>$599 USD</strong><a href="../collection-01/">View collection →</a></section>`;
}

function renderCollection() {
  const root = document.querySelector("[data-professional-collection]");
  if (!root) return;
  if (PUBLIC_LAUNCH_MODE) {
    document.title = "Lia Professional Tools — Coming Soon | LIA ARMONÍA";
    root.innerHTML = `<section class="tool-launch-hold"><p class="eyebrow">LIA PROFESSIONAL TOOLS</p><h1>Four design systems.<br>One methodology.</h1><p>The professional collection for planners and event designers is currently being prepared for release.</p><span>Coming Soon</span><a href="../../collaborations.html">Discuss a collaboration →</a></section>`;
    return;
  }
  document.title = "Lia Professional Tools — Collection 01 | LIA ARMONÍA";
  const cards = Object.entries(professionalTools).map(([slug, tool]) => `<a class="tool-card" href="../${slug}/"><span>${tool.edition}</span><h3>${tool.name}</h3><small>${tool.descriptor}</small><p>$189 USD</p><b>View system →</b></a>`).join("");
  root.innerHTML = `<section class="professional-tools collection-page"><p class="eyebrow">LIA PROFESSIONAL TOOLS</p><h1>Four design systems.<br>One methodology.</h1><p>Created for planners and event designers working between concept and production.</p><div class="tools-grid">${cards}</div><section class="tool-purchase-block collection-purchase"><p class="eyebrow">Collection 01</p><h2>Lia Professional Tools — Collection 01</h2><p>Sicily 01 · Scarlet Gate 01 · Chandelier Corridor 01 · Desert Mirage 01</p><strong>$599 USD</strong><p>$756 when purchased individually.</p><button type="button" data-tool-checkout="collection-01">Purchase collection →</button><small>Secure checkout via Stripe.</small></section></section>`;
}

document.addEventListener("click", event => {
  const trigger = event.target.closest("[data-tool-checkout]");
  if (!trigger) return;
  event.preventDefault();
  const slug = trigger.dataset.toolCheckout;
  if (stripeCheckoutLinks[slug]) {
    window.location.href = stripeCheckoutLinks[slug];
    return;
  }
  const subject = slug === "collection-01" ? "Purchase Collection 01" : `Purchase ${professionalTools[slug]?.name || "Professional Tool"}`;
  window.location.href = `mailto:atelier@liaarmonia.com?subject=${encodeURIComponent(subject)}`;
});

document.addEventListener("click", event => {
  const tab = event.target.closest("[data-tool-tab]");
  if (!tab) return;
  const wrap = tab.closest(".tool-toggle");
  const root = document.querySelector("[data-professional-tool]");
  const tool = root ? professionalTools[root.dataset.professionalTool] : null;
  if (!wrap || !tool) return;
  wrap.querySelectorAll("[data-tool-tab]").forEach(button => button.classList.toggle("active", button === tab));
  const mode = tab.dataset.toolTab;
  const copy = wrap.querySelector("[data-tool-tab-copy]");
  const gallery = wrap.querySelector("[data-tool-toggle-gallery]");
  if (copy) {
    copy.textContent = mode === "master"
      ? "Clean Master pages show the reusable blank framework you can adapt for future client projects."
      : "Completed pages show the system fully applied to a design concept.";
  }
  if (gallery) gallery.innerHTML = renderToggleGallery(tool, mode);
});

renderProduct();
renderCollection();
