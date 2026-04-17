let allCards = [];
let currentSearch = "";
let selectedVersions = {};
let md = window.markdownit({
  html: false,
  linkify: true,
  breaks: true,
  typographer: false,
});
if (window.texmath && window.katex) {
  md = md.use(window.texmath, {
    engine: window.katex,
    delimiters: "dollars",
    katexOptions: { throwOnError: false },
  });
}

function daysBetween(a, b) {
  return Math.floor((a - b) / (1000 * 60 * 60 * 24));
}

function escapeHtml(str) {
  return (str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function renderMarkdown(markdown) {
  return `<div class="markdown-body">${md.render(markdown || "")}</div>`;
}

function alphaXivUrl(absUrl) {
  return (absUrl || "").replace("arxiv.org", "alphaxiv.org");
}

function getSelectedVersion(card) {
  const selectedId = selectedVersions[card.id] || card.latest_version_id;
  return (
    card.versions.find((version) => version.id === selectedId) ||
    card.versions[card.versions.length - 1]
  );
}

function renderVersionButtons(card, selectedVersionId) {
  if (card.versions.length <= 1) {
    return "";
  }
  return `
    <div class="version-switcher">
      ${card.versions.map((version) => `
        <button
          class="version-btn ${version.id === selectedVersionId ? "active" : ""}"
          data-card-id="${card.id}"
          data-version-id="${version.id}"
          onclick="event.stopPropagation()"
        >v${version.version_number}</button>
      `).join("")}
    </div>
  `;
}

function renderCards() {
  const cardsRoot = document.getElementById("cards");
  const dayValue = Number(document.querySelector('input[name="dateFilter"]:checked').value);
  const now = new Date();
  const filtered = allCards.filter((card) => {
    const cardDate = new Date(card.date + "T00:00:00");
    const byDate = daysBetween(now, cardDate) <= dayValue;
    const byText = !currentSearch || card.search_text.includes(currentSearch.toLowerCase());
    return byDate && byText;
  });

  document.getElementById("cardCount").textContent = `当前展示 ${filtered.length} / 总计 ${allCards.length}`;
  cardsRoot.innerHTML = filtered.map((card) => `
    <article class="card" data-id="${card.id}">
      ${(() => {
        const version = getSelectedVersion(card);
        return `
      <div class="meta-row">
        <span class="badge">${version.tag}</span>
        <span class="badge category">${version.primary_category}</span>
        <span class="badge">${card.date}</span>
      </div>
      <div class="title-en">${escapeHtml(version.title_en)}</div>
      <div class="title-zh">${escapeHtml(version.title_zh)}</div>
      <div class="authors">${escapeHtml(version.authors_short)}</div>
      <div class="paper-links">
        <span class="paper-label">arXiv:${escapeHtml(version.id)}</span>
        <a class="paper-link" href="${version.abs_url}" target="_blank" title="${version.abs_url}" onclick="event.stopPropagation()">📄</a>
        <a class="paper-link" href="${alphaXivUrl(version.abs_url)}" target="_blank" title="${alphaXivUrl(version.abs_url)}" onclick="event.stopPropagation()">📚</a>
      </div>
      ${renderVersionButtons(card, version.id)}
      <div class="card-body">${renderMarkdown(version.ai_abstract)}</div>
      `;
      })()}
    </article>
  `).join("");

  for (const cardEl of cardsRoot.querySelectorAll(".card")) {
    cardEl.addEventListener("click", () => openModal(cardEl.getAttribute("data-id")));
  }
  for (const button of cardsRoot.querySelectorAll(".version-btn")) {
    button.addEventListener("click", () => {
      selectedVersions[button.dataset.cardId] = button.dataset.versionId;
      renderCards();
    });
  }
}

function setTab(card, version, tabName) {
  for (const btn of document.querySelectorAll(".tabs button")) {
    btn.classList.toggle("active", btn.getAttribute("data-tab") === tabName);
  }
  document.getElementById("tabContent").innerHTML = renderMarkdown(version[tabName] || "");
}

function openModal(id) {
  const card = allCards.find((c) => c.id === id);
  if (!card) return;
  const version = getSelectedVersion(card);
  document.getElementById("modalHeader").innerHTML = `
    <div class="header-meta">
      <span class="badge">${version.tag}</span>
      <span class="badge category">${version.primary_category}</span>
      <span class="badge">${card.date}</span>
    </div>
    <div class="title-en">${escapeHtml(version.title_en)}</div>
    <div class="title-zh">${escapeHtml(version.title_zh)}</div>
    <div class="authors">${escapeHtml(version.authors_full)}</div>
    <div class="paper-links">
      <span class="paper-label">arXiv:${escapeHtml(version.id)}</span>
      <a class="paper-link" href="${version.abs_url}" target="_blank" title="${version.abs_url}" onclick="event.stopPropagation()">📄</a>
      <a class="paper-link" href="${alphaXivUrl(version.abs_url)}" target="_blank" title="${alphaXivUrl(version.abs_url)}" onclick="event.stopPropagation()">📚</a>
    </div>
    ${renderVersionButtons(card, version.id)}
  `;
  setTab(card, version, "ai_abstract");
  document.getElementById("fullContent").innerHTML = renderMarkdown(version.content || "");
  document.getElementById("modal").classList.remove("hidden");

  for (const btn of document.querySelectorAll(".tabs button")) {
    btn.onclick = () => {
      const currentVersion = getSelectedVersion(card);
      setTab(card, currentVersion, btn.getAttribute("data-tab"));
    };
  }
  for (const button of document.getElementById("modalHeader").querySelectorAll(".version-btn")) {
    button.addEventListener("click", () => {
      selectedVersions[button.dataset.cardId] = button.dataset.versionId;
      openModal(card.id);
    });
  }
}

async function init() {
  const resp = await fetch("data/cards.json", { cache: "no-cache" });
  allCards = await resp.json();
  renderCards();

  document.getElementById("closeModal").addEventListener("click", () => {
    document.getElementById("modal").classList.add("hidden");
  });
  document.getElementById("searchInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      currentSearch = e.target.value.trim();
      renderCards();
    }
  });
  for (const radio of document.querySelectorAll('input[name="dateFilter"]')) {
    radio.addEventListener("change", renderCards);
  }
}

init();
