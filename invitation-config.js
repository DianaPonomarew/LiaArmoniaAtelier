(function () {
  const DRAFT_KEY = "lia-armonia-invitation-draft-v1";
  const MEDIA_SIZE_LIMIT = 7 * 1024 * 1024;

  const neutralConfig = {
    id: "",
    status: "draft",
    collection: "classy-white",
    mode: "preview",
    couple: {
      personOne: "",
      personTwo: "",
      displayNames: "Your Names",
      monogram: "L | A"
    },
    wedding: {
      date: "",
      dateDisplay: "Your Date",
      time: "",
      venue: "Your Venue",
      location: "Your Location"
    },
    copy: {
      storyHeading: "Our Story",
      storyMessage: "Your story note will appear here.",
      invitationMessage: "request the pleasure of your company",
      confirmationMessage: "Your response has been received."
    },
    media: {
      mode: "atelier",
      personalMediaDataUrl: "",
      personalMediaType: "",
      personalMediaName: "",
      musicDataUrl: "",
      musicName: "",
      musicLink: "",
      musicMood: "",
      imageDirection: ""
    },
    rsvp: {
      enabled: true,
      attendanceOptions: ["Joyfully accept", "Regretfully decline"],
      diningOptions: [],
      allowAdditionalGuests: false,
      collectDietaryNotes: true,
      collectGuestMessage: true
    },
    presentation: {
      collectionVariant: "Oxblood",
      language: "English",
      modules: ["Guest Response"]
    }
  };

  const explicitDemoConfig = {
    ...neutralConfig,
    mode: "demo",
    couple: {
      personOne: "Elena",
      personTwo: "Valentino",
      displayNames: "Elena & Valentino",
      monogram: "E | V"
    },
    wedding: {
      date: "2027-10-25",
      dateDisplay: "25 October 2027",
      time: "",
      venue: "Villa Giardino",
      location: "Lake Como, Italy"
    },
    copy: {
      storyHeading: "Our Story",
      storyMessage: "We cannot wait to share this chapter with you.",
      invitationMessage: "request the pleasure of your company",
      confirmationMessage: "Your response has been received."
    }
  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function clean(value) {
    return String(value || "").trim();
  }

  function splitNames(names) {
    const cleaned = clean(names);
    if (!cleaned) return { personOne: "", personTwo: "", displayNames: neutralConfig.couple.displayNames };
    const parts = cleaned.split(/\s+(?:&|\+|and|und)\s+/i).map(clean).filter(Boolean);
    if (parts.length >= 2) {
      return { personOne: parts[0], personTwo: parts.slice(1).join(" & "), displayNames: `${parts[0]} & ${parts.slice(1).join(" & ")}` };
    }
    return { personOne: cleaned, personTwo: "", displayNames: cleaned };
  }

  function initial(value) {
    const match = clean(value).match(/[A-Za-zÀ-ž]/);
    return match ? match[0].toUpperCase() : "";
  }

  function makeMonogram(personOne, personTwo) {
    const first = initial(personOne);
    const second = initial(personTwo);
    if (first && second) return `${first} | ${second}`;
    if (first) return first;
    return neutralConfig.couple.monogram;
  }

  function formatDateDisplay(value) {
    const cleaned = clean(value);
    if (!cleaned) return neutralConfig.wedding.dateDisplay;
    const date = new Date(`${cleaned}T00:00:00`);
    if (Number.isNaN(date.getTime())) return cleaned;
    return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "long", year: "numeric" }).format(date).toUpperCase();
  }

  function checkedValues(form, name) {
    return [...form.querySelectorAll(`[name="${name}"]:checked`)].map(input => input.value);
  }

  function value(form, name) {
    return clean(form.elements[name]?.value);
  }

  function listFromText(text) {
    return clean(text)
      .split(/,|\n/)
      .map(clean)
      .filter(Boolean);
  }

  function normalizeConfig(input = {}) {
    const config = clone(neutralConfig);
    const source = input || {};
    config.id = clean(source.id);
    config.status = clean(source.status) || "draft";
    config.collection = clean(source.collection) || "classy-white";
    config.mode = clean(source.mode) || "preview";
    config.couple = { ...config.couple, ...(source.couple || {}) };
    config.wedding = { ...config.wedding, ...(source.wedding || {}) };
    config.copy = { ...config.copy, ...(source.copy || {}) };
    config.media = { ...config.media, ...(source.media || {}) };
    config.rsvp = { ...config.rsvp, ...(source.rsvp || {}) };
    config.presentation = { ...config.presentation, ...(source.presentation || {}) };
    config.couple.displayNames = clean(config.couple.displayNames) || neutralConfig.couple.displayNames;
    config.couple.monogram = clean(config.couple.monogram) || makeMonogram(config.couple.personOne, config.couple.personTwo);
    config.wedding.dateDisplay = clean(config.wedding.dateDisplay) || formatDateDisplay(config.wedding.date);
    config.wedding.venue = clean(config.wedding.venue) || neutralConfig.wedding.venue;
    config.wedding.location = clean(config.wedding.location) || neutralConfig.wedding.location;
    config.copy.storyMessage = clean(config.copy.storyMessage) || neutralConfig.copy.storyMessage;
    config.copy.invitationMessage = clean(config.copy.invitationMessage) || neutralConfig.copy.invitationMessage;
    if (!Array.isArray(config.presentation.modules)) config.presentation.modules = [];
    if (!Array.isArray(config.rsvp.diningOptions)) config.rsvp.diningOptions = [];
    return config;
  }

  function buildFromForm(form, previous = {}) {
    const names = splitNames(value(form, "names"));
    const date = value(form, "wedding_date");
    const modules = checkedValues(form, "modules");
    const extras = checkedValues(form, "extras");
    const media = { ...(previous.media || {}) };
    media.musicLink = value(form, "music_link");
    media.musicMood = value(form, "music_mood");
    media.imageDirection = value(form, "image_direction");

    return normalizeConfig({
      ...previous,
      mode: "preview",
      couple: {
        personOne: names.personOne,
        personTwo: names.personTwo,
        displayNames: names.displayNames,
        monogram: makeMonogram(names.personOne, names.personTwo)
      },
      wedding: {
        date,
        dateDisplay: formatDateDisplay(date),
        time: value(form, "ceremony_time"),
        venue: value(form, "venue_or_maps_link"),
        location: value(form, "location") || value(form, "venue_or_maps_link")
      },
      copy: {
        storyHeading: "Our Story",
        storyMessage: value(form, "welcome_message"),
        invitationMessage: "request the pleasure of your company",
        confirmationMessage: "Your response has been received."
      },
      media,
      rsvp: {
        enabled: value(form, "guest_response") !== "Off",
        attendanceOptions: ["Joyfully accept", "Regretfully decline"],
        diningOptions: listFromText(value(form, "dining_options")),
        allowAdditionalGuests: value(form, "plus_one") === "Allowed",
        collectDietaryNotes: true,
        collectGuestMessage: value(form, "guest_message") !== "Off"
      },
      presentation: {
        collectionVariant: "Oxblood",
        language: value(form, "primary_language") || "English",
        modules: [...new Set(["Guest Response", ...modules, ...extras])]
      }
    });
  }

  function readDraft() {
    try {
      return normalizeConfig(JSON.parse(localStorage.getItem(DRAFT_KEY) || "null"));
    } catch {
      return normalizeConfig();
    }
  }

  function writeDraft(config) {
    const normalized = normalizeConfig(config);
    localStorage.setItem(DRAFT_KEY, JSON.stringify(normalized));
    return normalized;
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      if (!file) {
        resolve({ dataUrl: "", type: "", name: "", error: "" });
        return;
      }
      if (file.size > MEDIA_SIZE_LIMIT) {
        resolve({ dataUrl: "", type: file.type, name: file.name, error: "large-file" });
        return;
      }
      const reader = new FileReader();
      reader.onload = () => resolve({ dataUrl: String(reader.result || ""), type: file.type, name: file.name, error: "" });
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  function getConfigForMode(mode) {
    if (mode === "demo") return normalizeConfig(explicitDemoConfig);
    if (window.__PUBLISHED_INVITATION__) return normalizeConfig(window.__PUBLISHED_INVITATION__);
    return readDraft();
  }

  window.LiaInvitationConfig = {
    DRAFT_KEY,
    MEDIA_SIZE_LIMIT,
    neutralConfig,
    explicitDemoConfig,
    buildFromForm,
    formatDateDisplay,
    getConfigForMode,
    normalizeConfig,
    readDraft,
    readFileAsDataUrl,
    writeDraft
  };
})();
