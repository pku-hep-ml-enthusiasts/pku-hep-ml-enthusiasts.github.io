let allCards = [];
let currentSearch = "";
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
      <div class="meta-row">
        <span class="badge">${card.tag}</span>
        <span class="badge category">${card.primary_category}</span>
        <span class="badge">${card.date}</span>
      </div>
      <div class="title-en">${escapeHtml(card.title_en)}</div>
      <div class="title-zh">${escapeHtml(card.title_zh)}</div>
      <div class="authors">${escapeHtml(card.authors_short)}</div>
      <div class="paper-links">
        <span class="paper-label">arXiv:${escapeHtml(card.id)}</span>
        <a class="paper-link" href="${card.abs_url}" target="_blank" title="${card.abs_url}" onclick="event.stopPropagation()">📄</a>
        <a class="paper-link" href="${alphaXivUrl(card.abs_url)}" target="_blank" title="${alphaXivUrl(card.abs_url)}" onclick="event.stopPropagation()">📚</a>
      </div>
      <div class="card-body">${renderMarkdown(card.ai_abstract)}</div>
    </article>
  `).join("");

  for (const cardEl of cardsRoot.querySelectorAll(".card")) {
    cardEl.addEventListener("click", () => openModal(cardEl.getAttribute("data-id")));
  }
}

function setTab(card, tabName) {
  for (const btn of document.querySelectorAll(".tabs button")) {
    btn.classList.toggle("active", btn.getAttribute("data-tab") === tabName);
  }
  document.getElementById("tabContent").innerHTML = renderMarkdown(card[tabName] || "");
}

function openModal(id) {
  const card = allCards.find((c) => c.id === id);
  if (!card) return;
  document.getElementById("modalHeader").innerHTML = `
    <div class="header-meta">
      <span class="badge">${card.tag}</span>
      <span class="badge category">${card.primary_category}</span>
      <span class="badge">${card.date}</span>
    </div>
    <div class="title-en">${escapeHtml(card.title_en)}</div>
    <div class="title-zh">${escapeHtml(card.title_zh)}</div>
    <div class="authors">${escapeHtml(card.authors_full)}</div>
    <div class="paper-links">
      <span class="paper-label">arXiv:${escapeHtml(card.id)}</span>
      <a class="paper-link" href="${card.abs_url}" target="_blank" title="${card.abs_url}" onclick="event.stopPropagation()">📄</a>
      <a class="paper-link" href="${alphaXivUrl(card.abs_url)}" target="_blank" title="${alphaXivUrl(card.abs_url)}" onclick="event.stopPropagation()">📚</a>
    </div>
  `;
  setTab(card, "ai_abstract");
  document.getElementById("fullContent").innerHTML = renderMarkdown(card.content || "");
  document.getElementById("modal").classList.remove("hidden");

  for (const btn of document.querySelectorAll(".tabs button")) {
    btn.onclick = () => setTab(card, btn.getAttribute("data-tab"));
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
