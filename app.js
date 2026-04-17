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

  async function fetchJson(path) {
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Failed to load ${path} (${response.status})`);
    }
    return response.json();
  }

  async function loadPartyCharacters() {
    const data = await fetchJson(PATHS.party);
    state.partyCharacters = Array.isArray(data.partyCharacters) ? data.partyCharacters : [];
    return state.partyCharacters;
  }

  async function loadCharacters() {
    const data = await fetchJson(PATHS.characters);
    state.characters = Array.isArray(data.characters) ? data.characters : [];
    return state.characters;
  }

  async function loadCampaign() {
    const data = await fetchJson(PATHS.campaign);
    state.campaign = data.campaign || null;
    return state.campaign;
  }

  function qs(selector, root = document) {
    return root.querySelector(selector);
  }

  function formatModifier(value) {
    if (typeof value !== "number") return value ?? "—";
    return value > 0 ? `+${value}` : `${value}`;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function makeList(items, emptyText = "None listed.") {
    if (!items || !items.length) {
      return `<p class="muted">${escapeHtml(emptyText)}</p>`;
    }
    return `<ul class="clean-list stacked">` + items.map(item => `<li>${escapeHtml(item)}</li>`).join("") + `</ul>`;
  }

  function makeKeyValueList(items, emptyText = "None listed.") {
    if (!items || !items.length) {
      return `<p class="muted">${escapeHtml(emptyText)}</p>`;
    }
    return `
      <ul class="clean-list">
        ${items.map(item => `
          <li>
            <span>${escapeHtml(item.label)}</span>
            <strong>${escapeHtml(item.value)}</strong>
          </li>
        `).join("")}
      </ul>
    `;
  }

  function makeSkillGroups(skills) {
    const entries = Object.entries(skills || {});
    if (!entries.length) return `<p class="muted">No skills listed.</p>`;

    return entries.map(([group, items]) => `
      <section class="skill-group">
        <h4>${escapeHtml(group)}</h4>
        <ul class="clean-list">
          ${(items || []).map(skill => `
            <li>
              <span>${escapeHtml(skill.name)}</span>
              <strong>${escapeHtml(formatModifier(skill.rank))}</strong>
            </li>
          `).join("")}
        </ul>
      </section>
    `).join("");
  }

  function makeInventory(items) {
    if (!items || !items.length) return `<p class="muted">No items listed.</p>`;
    return `
      <ul class="inventory-list">
        ${items.map(item => `
          <li>
            <div class="inventory-top">
              <strong>${escapeHtml(item.name)}</strong>
              ${item.cost ? `<span class="item-cost">${escapeHtml(item.cost)}</span>` : ""}
            </div>
            ${item.description ? `<p>${escapeHtml(item.description)}</p>` : ""}
          </li>
        `).join("")}
      </ul>
    `;
  }

  function getCurrentId(paramName, fallbackId) {
    const params = new URLSearchParams(window.location.search);
    return (params.get(paramName) || fallbackId || "").toLowerCase();
  }

  function updateUrl(paramName, value) {
    const url = new URL(window.location.href);
    url.searchParams.set(paramName, value);
    window.history.replaceState({}, "", url);
  }

  function setActiveNav(pageName) {
    document.querySelectorAll("[data-nav]").forEach(link => {
      const isActive = link.dataset.nav === pageName;
      link.classList.toggle("active", isActive);
      link.setAttribute("aria-current", isActive ? "page" : "false");
    });
  }

  function renderCharacterDetails(character, options = {}) {
    const {
      root = document,
      sectionVisibility = null,
    } = options;

    qs("#name", root).textContent = character.name || "Unnamed Character";
    qs("#role", root).textContent = character.role || "";
    qs("#raceWrap", root).textContent = character.race ? `• ${character.race}` : "";
    qs("#portrait", root).src = character.portrait || "images/stub-portrait.svg";
    qs("#portrait", root).alt = `${character.name || "Character"} portrait`;
    qs("#health", root).textContent = `${character.health?.current ?? 0} / ${character.health?.max ?? 0}`;
    qs("#armour", root).textContent = `${character.armour?.current ?? 0} / ${character.armour?.max ?? 0}`;

    qs("#attributeCards", root).innerHTML = `
      <div class="attribute-card">
        <span>Physical</span>
        <strong>${escapeHtml(formatModifier(character.attributes?.physical))}</strong>
      </div>
      <div class="attribute-card">
        <span>Intellectual</span>
        <strong>${escapeHtml(formatModifier(character.attributes?.intellectual))}</strong>
      </div>
      <div class="attribute-card">
        <span>Social</span>
        <strong>${escapeHtml(formatModifier(character.attributes?.social))}</strong>
      </div>
    `;

    const resources = [
      ...(character.resources?.currency ? [{ label: "Currency", value: character.resources.currency }] : []),
      ...(character.resources?.crystals ? character.resources.crystals.map(c => ({ label: c.name, value: c.amount })) : []),
      ...(character.resources?.supplies ? character.resources.supplies.map(s => ({ label: "Supply", value: s })) : []),
    ];

    const sections = {
      attributes: qs('[data-section="attributes"]', root),
      skills: qs('[data-section="skills"]', root),
      combatNotes: qs('[data-section="combatNotes"]', root),
      inventory: qs('[data-section="inventory"]', root),
      resources: qs('[data-section="resources"]', root),
      notes: qs('[data-section="notes"]', root),
      backstory: qs('[data-section="backstory"]', root),
    };

    if (sections.combatNotes) qs("#combatNotes", root).innerHTML = makeList(character.combatNotes, "No combat notes listed.");
    if (sections.skills) qs("#skills", root).innerHTML = makeSkillGroups(character.skills);
    if (sections.inventory) qs("#inventory", root).innerHTML = makeInventory(character.inventory);
    if (sections.resources) qs("#resources", root).innerHTML = makeKeyValueList(resources, "No tracked resources.");
    if (sections.notes) qs("#notes", root).innerHTML = makeList(character.notes, "No notes listed.");
    if (sections.backstory) qs("#backstory", root).innerHTML = makeList(character.backstory, "No backstory details listed.");

    if (sectionVisibility) {
      Object.entries(sectionVisibility).forEach(([sectionName, config]) => {
        const sectionEl = sections[sectionName];
        if (!sectionEl) return;
        const visible = !!config?.visible;
        sectionEl.hidden = !visible;
      });
    }
  }

  async function initPartyPage() {
    setActiveNav("party");
    const characters = await loadPartyCharacters();
    if (!characters.length) {
      throw new Error("No party characters found in data/party.json");
    }

    const select = qs("#characterSelect");
    select.innerHTML = characters.map(character =>
      `<option value="${escapeHtml(character.id)}">${escapeHtml(character.name)}</option>`
    ).join("");

    const currentId = getCurrentId("character", characters[0].id);
    const current = characters.find(c => c.id === currentId) || characters[0];

    select.value = current.id;
    renderCharacterDetails(current);
    document.title = `${current.name} - Party Character`;

    select.addEventListener("change", () => {
      const selected = characters.find(c => c.id === select.value) || characters[0];
      updateUrl("character", selected.id);
      renderCharacterDetails(selected);
      document.title = `${selected.name} - Party Character`;
    });
  }

  async function initCharactersPage() {
    setActiveNav("characters");
    const characters = await loadCharacters();
    if (!characters.length) {
      throw new Error("No non-party characters found in data/characters.json");
    }

    const select = qs("#characterSelect");
    select.innerHTML = characters.map(character =>
      `<option value="${escapeHtml(character.id)}">${escapeHtml(character.name)}</option>`
    ).join("");

    const currentId = getCurrentId("character", characters[0].id);
    const current = characters.find(c => c.id === currentId) || characters[0];

    select.value = current.id;
    renderCharacterDetails(current, { sectionVisibility: current.sections || {} });
    document.title = `${current.name} - Character`;

    select.addEventListener("change", () => {
      const selected = characters.find(c => c.id === select.value) || characters[0];
      updateUrl("character", selected.id);
      renderCharacterDetails(selected, { sectionVisibility: selected.sections || {} });
      document.title = `${selected.name} - Character`;
    });
  }

  async function initCampaignPage() {
    setActiveNav("campaign");
    const campaign = await loadCampaign();
    document.title = `${campaign.title || "Campaign Notes"} - Campaign Notes`;

    qs("#campaignTitle").textContent = campaign.title || "Campaign Notes";
    qs("#campaignSummary").textContent = campaign.summary || "";

    const sectionsEl = qs("#campaignSections");
    const sections = Array.isArray(campaign.sections) ? campaign.sections : [];

    if (!sections.length) {
      sectionsEl.innerHTML = `<article class="card"><h3>No notes yet</h3><p class="muted">Add sections to data/campaign.json.</p></article>`;
      return;
    }

    sectionsEl.innerHTML = sections.map(section => `
      <article class="card">
        <h3>${escapeHtml(section.title)}</h3>
        ${makeList(section.entries, "No entries listed.")}
      </article>
    `).join("");
  }

  function showError(error) {
    const target = qs("#appError");
    if (target) {
      target.innerHTML = `
        <article class="card">
          <h3>Unable to load page data</h3>
          <p>${escapeHtml(error.message)}</p>
          <p class="muted">If you opened the HTML file directly, your browser may be blocking local JSON loading. Running a small local server usually fixes that.</p>
        </article>
      `;
      target.hidden = false;
    } else {
      console.error(error);
      alert(error.message);
    }
  }

  return {
    initPartyPage,
    initCharactersPage,
    initCampaignPage,
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
    }
  } catch (error) {
    App.showError(error);
  }
});