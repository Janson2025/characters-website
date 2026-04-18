const App = (() => {
  const PATHS = {
    party: "data/party.json",
    characters: "data/characters.json",
    campaign: "data/campaign.json",
  };

  const state = {
    partyCharacters: [],
    characters: [],
    campaign: null,
  };

  // ======================
  // DATA LOADING
  // ======================

  async function fetchJson(path) {
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Failed to load ${path} (${response.status})`);
    }
    return response.json();
  }

  async function loadPartyCharacters() {
    const data = await fetchJson(PATHS.party);
    state.partyCharacters = data.partyCharacters || [];
    return state.partyCharacters;
  }

  async function loadCharacters() {
    const data = await fetchJson(PATHS.characters);
    state.characters = data.characters || [];
    return state.characters;
  }

  async function loadCampaign() {
    const data = await fetchJson(PATHS.campaign);
    state.campaign = data.campaign || {};
    return state.campaign;
  }

  // ======================
  // HELPERS
  // ======================

  function qs(selector, root = document) {
    return root.querySelector(selector);
  }

  function formatModifier(value) {
    if (typeof value !== "number") return value ?? "—";
    return value > 0 ? `+${value}` : `${value}`;
  }

  function escapeHtml(str) {
    return String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }

  function makeList(items, empty = "None listed.") {
    if (!items || items.length === 0) {
      return `<p class="muted">${empty}</p>`;
    }
    return `<ul class="clean-list stacked">
      ${items.map(i => `<li>${escapeHtml(i)}</li>`).join("")}
    </ul>`;
  }

  function makeSkillGroups(skills) {
    if (!skills) return `<p class="muted">No skills listed.</p>`;

    return Object.entries(skills).map(([group, list]) => `
      <section class="skill-group">
        <h4>${escapeHtml(group)}</h4>
        <ul class="clean-list">
          ${list.map(s => `
            <li>
              <span>${escapeHtml(s.name)}</span>
              <strong>${formatModifier(s.rank)}</strong>
            </li>
          `).join("")}
        </ul>
      </section>
    `).join("");
  }

  function makeInventory(items) {
    if (!items || items.length === 0) {
      return `<p class="muted">No items listed.</p>`;
    }

    return `<ul class="inventory-list">
      ${items.map(i => `
        <li>
          <div class="inventory-top">
            <strong>${escapeHtml(i.name)}</strong>
            ${i.cost ? `<span class="item-cost">${escapeHtml(i.cost)}</span>` : ""}
          </div>
          ${i.description ? `<p>${escapeHtml(i.description)}</p>` : ""}
        </li>
      `).join("")}
    </ul>`;
  }

  function getCurrentId(param, fallback) {
    const params = new URLSearchParams(window.location.search);
    return (params.get(param) || fallback).toLowerCase();
  }

  function updateUrl(param, value) {
    const url = new URL(window.location);
    url.searchParams.set(param, value);
    window.history.replaceState({}, "", url);
  }

  function setActiveNav(page) {
    document.querySelectorAll("[data-nav]").forEach(link => {
      const active = link.dataset.nav === page;
      link.classList.toggle("active", active);
    });
  }

  // ======================
  // RENDER CHARACTER
  // ======================

  function renderCharacter(character, visibility = null) {
    qs("#name").textContent = character.name;
    qs("#role").textContent = character.role || "";
    qs("#raceWrap").textContent = character.race ? `• ${character.race}` : "";

    qs("#portrait").src = character.portrait || "images/stub-portrait.png";

    qs("#health").textContent =
      `${character.health?.current ?? 0} / ${character.health?.max ?? 0}`;

    qs("#armour").textContent =
      `${character.armour?.current ?? 0} / ${character.armour?.max ?? 0}`;

    qs("#attributeCards").innerHTML = `
      <div class="attribute-card">
        <span>Physical</span>
        <strong>${formatModifier(character.attributes?.physical)}</strong>
      </div>
      <div class="attribute-card">
        <span>Intellectual</span>
        <strong>${formatModifier(character.attributes?.intellectual)}</strong>
      </div>
      <div class="attribute-card">
        <span>Social</span>
        <strong>${formatModifier(character.attributes?.social)}</strong>
      </div>
    `;

    qs("#skills").innerHTML = makeSkillGroups(character.skills);
    qs("#inventory").innerHTML = makeInventory(character.inventory);
    qs("#combatNotes").innerHTML = makeList(character.combatNotes);
    qs("#notes").innerHTML = makeList(character.notes);
    qs("#backstory").innerHTML = makeList(character.backstory);

    const resources = [
      ...(character.resources?.currency
        ? [`Currency: ${character.resources.currency}`]
        : []),
      ...(character.resources?.crystals || []).map(
        c => `${c.name}: ${c.amount}`
      ),
    ];

    qs("#resources").innerHTML = makeList(resources);

    // Visibility control (for NPCs)
    if (visibility) {
      Object.entries(visibility).forEach(([section, config]) => {
        const el = document.querySelector(`[data-section="${section}"]`);
        if (el) el.hidden = !config.visible;
      });
    }
  }

  // ======================
  // PAGE INITIALIZERS
  // ======================

  async function initPartyPage() {
    setActiveNav("party");

    const chars = await loadPartyCharacters();
    const select = qs("#characterSelect");

    select.innerHTML = chars.map(c =>
      `<option value="${c.id}">${c.name}</option>`
    ).join("");

    const currentId = getCurrentId("character", chars[0].id);
    let current = chars.find(c => c.id === currentId) || chars[0];

    select.value = current.id;
    renderCharacter(current);

    select.addEventListener("change", () => {
      const selected = chars.find(c => c.id === select.value);
      updateUrl("character", selected.id);
      renderCharacter(selected);
    });
  }

  async function initCharactersPage() {
    setActiveNav("characters");

    const chars = await loadCharacters();
    const select = qs("#characterSelect");

    select.innerHTML = chars.map(c =>
      `<option value="${c.id}">${c.name}</option>`
    ).join("");

    const currentId = getCurrentId("character", chars[0].id);
    let current = chars.find(c => c.id === currentId) || chars[0];

    select.value = current.id;
    renderCharacter(current, current.sections);

    select.addEventListener("change", () => {
      const selected = chars.find(c => c.id === select.value);
      updateUrl("character", selected.id);
      renderCharacter(selected, selected.sections);
    });
  }

  async function initCampaignPage() {
    setActiveNav("campaign");

    const campaign = await loadCampaign();

    qs("#campaignTitle").textContent = campaign.title || "Campaign";
    qs("#campaignSummary").textContent = campaign.summary || "";

    const container = qs("#campaignSections");

    container.innerHTML = campaign.sections.map(section => `
      <article class="card">
        <h3>${section.title}</h3>
        ${makeList(section.entries)}
      </article>
    `).join("");
  }

  function initCombatPage() {
    setActiveNav("combat");
  }

  function showError(err) {
    console.error(err);
    alert(err.message);
  }

  return {
    initPartyPage,
    initCharactersPage,
    initCampaignPage,
    initCombatPage,
    showError,
  };
})();

document.addEventListener("DOMContentLoaded", async () => {
  const page = document.body.dataset.page;

  try {
    if (page === "party") {
      await App.initPartyPage();
    } else if (page === "characters") {
      await App.initCharactersPage();
    } else if (page === "campaign") {
      await App.initCampaignPage();
    } else if (page === "combat") {
      App.initCombatPage();
    }
  } catch (err) {
    App.showError(err);
  }
});