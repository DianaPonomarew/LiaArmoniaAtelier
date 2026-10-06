const query = new URLSearchParams(window.location.search);
const mode = query.get("mode") || (query.has("demo") ? "demo" : "published");
const experience = document.querySelector("[data-classy-white]");
const scenes = [...document.querySelectorAll(".cw-scene")];
const progress = [...document.querySelectorAll(".cw-progress span")];
let sceneIndex = 0;
let audioElement;

function text(selector, value) {
  document.querySelectorAll(selector).forEach(node => {
    node.textContent = value;
  });
}

function setHidden(node, hidden) {
  if (node) node.hidden = hidden;
}

function renderCustomerMedia(config) {
  const slot = document.querySelector("[data-cw-media]");
  if (!slot) return;
  slot.innerHTML = "";
  const source = config.media.personalMediaDataUrl;
  if (!source) {
    const empty = document.createElement("span");
    empty.textContent = "Your image or film will appear here.";
    slot.append(empty);
    slot.classList.remove("has-media");
    return;
  }
  const media = document.createElement(config.media.personalMediaType?.startsWith("video/") ? "video" : "img");
  media.src = source;
  media.setAttribute("aria-label", config.media.personalMediaName || "Personal wedding media");
  if (media instanceof HTMLVideoElement) {
    media.muted = true;
    media.loop = true;
    media.playsInline = true;
    media.autoplay = true;
    media.play().catch(() => {});
  } else {
    media.alt = config.media.personalMediaName || "Personal wedding media";
  }
  slot.classList.add("has-media");
  slot.append(media);
}

function renderAudio(config) {
  const mount = document.querySelector("[data-cw-audio]");
  if (!mount) return;
  mount.innerHTML = "";
  const source = config.media.musicDataUrl;
  const link = config.media.musicLink;
  const label = config.media.musicName || config.media.musicMood || "Soundtrack";
  if (!source && !link) {
    setHidden(mount, true);
    return;
  }
  setHidden(mount, false);
  const button = document.createElement(source ? "button" : "a");
  button.className = "cw-audio-button";
  button.textContent = source ? `Play ${label}` : "Open soundtrack";
  if (source) {
    button.type = "button";
    audioElement = new Audio(source);
    audioElement.loop = true;
    button.addEventListener("click", async () => {
      if (!audioElement) return;
      if (audioElement.paused) {
        await audioElement.play().catch(() => {});
        button.textContent = `Pause ${label}`;
      } else {
        audioElement.pause();
        button.textContent = `Play ${label}`;
      }
    });
  } else {
    button.href = link;
    button.target = "_blank";
    button.rel = "noopener";
  }
  mount.append(button);
}

function applyInvitationData(config) {
  text('[data-cw="names"]', config.couple.displayNames);
  text('[data-cw="monogram"]', config.couple.monogram);
  text('[data-cw="date"]', config.wedding.dateDisplay);
  text('[data-cw="venue"]', config.wedding.venue);
  text('[data-cw="location"]', config.wedding.location);
  text('[data-cw="time"]', config.wedding.time ? ` · ${config.wedding.time}` : "");
  text('[data-cw="message"]', config.copy.storyMessage);
  text('[data-cw="story-heading"]', config.copy.storyHeading);
  text('[data-cw="invitation-message"]', config.copy.invitationMessage);
  document.title = `${config.couple.displayNames} — LIA ARMONÍA`;
  experience?.classList.add(`cw-mode-${config.mode || mode}`);
  experience?.classList.toggle("rsvp-disabled", !config.rsvp.enabled);
  renderCustomerMedia(config);
  renderAudio(config);

  const diningInput = document.querySelector("[data-cw-dining]");
  const diningOptions = config.rsvp.diningOptions || [];
  if (diningInput && diningOptions.length) diningInput.placeholder = diningOptions.join(", ");
  setHidden(document.querySelector("[data-cw-dining-label]"), !config.rsvp.enabled || diningOptions.length === 0);
  setHidden(document.querySelector("[data-cw-dietary-label]"), !config.rsvp.collectDietaryNotes);
  setHidden(document.querySelector("[data-cw-message-label]"), !config.rsvp.collectGuestMessage);
}

function setScene(nextIndex) {
  sceneIndex = Math.max(0, Math.min(nextIndex, scenes.length - 1));
  scenes.forEach((scene, index) => scene.classList.toggle("active", index === sceneIndex));
  progress.forEach((dot, index) => dot.classList.toggle("active", index === sceneIndex));
  experience?.classList.toggle("gate-open", sceneIndex > 0);
}

document.querySelectorAll("[data-cw-next]").forEach(button => {
  button.addEventListener("click", () => setScene(sceneIndex + 1));
});

document.querySelector("[data-cw-reset]")?.addEventListener("click", () => setScene(0));

document.querySelector(".cw-response-form")?.addEventListener("submit", event => {
  event.preventDefault();
  const button = event.currentTarget.querySelector("[data-cw-submit]");
  if (button) button.textContent = "Response received";
  setTimeout(() => setScene(6), 350);
});

document.addEventListener("keydown", event => {
  if (event.key === "ArrowRight" || event.key === "Enter") {
    const active = document.activeElement;
    if (active && ["INPUT", "TEXTAREA", "SELECT", "BUTTON", "A"].includes(active.tagName)) return;
    setScene(sceneIndex + 1);
  }
  if (event.key === "ArrowLeft") setScene(sceneIndex - 1);
  if (event.key === "Escape") location.href = "invitations.html";
});

const config = window.LiaInvitationConfig?.getConfigForMode(mode) || {};
applyInvitationData(window.LiaInvitationConfig?.normalizeConfig(config) || config);
setScene(0);
