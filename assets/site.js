const SITE_ORIGIN = "https://pcgsoft.co.uk";

const icon = `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 5h16v14H4z" stroke="currentColor" stroke-width="1.5"/><path d="m7 9 2 2-2 2M12 13h5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`;

function setMenu() {
  const toggle = document.querySelector("[data-menu-toggle]");
  const panel = document.querySelector("[data-mobile-nav]");
  if (!toggle || !panel) return;
  const close = () => {
    toggle.setAttribute("aria-expanded", "false");
    panel.classList.remove("is-open");
  };
  toggle.addEventListener("click", () => {
    const open = toggle.getAttribute("aria-expanded") !== "true";
    toggle.setAttribute("aria-expanded", String(open));
    panel.classList.toggle("is-open", open);
  });
  panel.querySelectorAll("a").forEach((link) => link.addEventListener("click", close));
  document.addEventListener("keydown", (event) => { if (event.key === "Escape") close(); });
}

function statusClass(status) {
  const value = status.toLowerCase();
  if (value.includes("live")) return "status-live";
  if (value.includes("active") || value.includes("production")) return "status-active";
  if (value.includes("early") || value.includes("research") || value.includes("provisional")) return "status-research";
  if (value.includes("prototype") || value.includes("construction") || value.includes("development") || value.includes("mvp")) return "status-development";
  return "status-neutral";
}

function publicRepositories(record) {
  if (Array.isArray(record.repositories)) return record.repositories.filter((item) => item?.visibility === "public" && item.url);
  return record.githubUrl ? [{ url: record.githubUrl, label: "Public repository" }] : [];
}

function liveSurfaces(record) {
  if (Array.isArray(record.liveUrls)) return record.liveUrls.filter(Boolean);
  return record.liveUrl ? [record.liveUrl] : [];
}

function card(record) {
  const accent = record.category === "creative" ? "card-accent-gold" : record.category === "open-source" ? "card-accent-green" : "card-accent";
  const source = publicRepositories(record)[0]?.url ? `<a class="text-link" href="${publicRepositories(record)[0].url}" target="_blank" rel="noopener noreferrer">Source ${icon}</a>` : "";
  const live = liveSurfaces(record)[0] ? `<a class="text-link" href="${liveSurfaces(record)[0]}" target="_blank" rel="noopener noreferrer">Live surface →</a>` : "";
  return `<article class="card project-card ${accent}" data-category="${record.category}" data-slug="${record.slug}">
    <div class="card-top"><span class="tag">${record.categoryLabel}</span><span class="status ${statusClass(record.status)}">${record.status}</span></div>
    <h3><a href="${record.sitePath}">${record.name}</a></h3>
    <p class="card-summary">${record.summary}</p>
    <div class="card-meta">${record.licence ? `<span class="small">${record.licence}</span>` : `<span class="small">${record.openSource ? "Public source" : "PCGsoft project"}</span>`}</div>
    <div class="card-links">${source}${live}</div>
  </article>`;
}

async function loadRegistry() {
  try {
    const response = await fetch("/data/projects.json", { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`Registry request failed: ${response.status}`);
    return await response.json();
  } catch (error) {
    document.querySelectorAll("[data-registry-error]").forEach((node) => { node.hidden = false; node.textContent = "The project registry could not be loaded. The static page content remains available."; });
    return [];
  }
}

function renderGrid(records) {
  document.querySelectorAll("[data-project-grid]").forEach((grid) => {
    const category = grid.dataset.category || "all";
    const featured = grid.dataset.featured === "true";
    const selected = records.filter((record) => (category === "all" || record.category === category) && (!featured || record.featured));
    const ordered = featured ? [...selected].sort((a, b) => (a.featuredRank ?? 99) - (b.featuredRank ?? 99)) : selected;
    const limit = Number(grid.dataset.limit || 0);
    grid.innerHTML = (limit ? ordered.slice(0, limit) : ordered).map(card).join("");
    if (!selected.length) grid.innerHTML = `<p class="empty-state">No public project is listed in this view yet.</p>`;
  });
}

function setupFilters(records) {
  const grid = document.querySelector("[data-filter-grid]");
  if (!grid) return;
  const buttons = [...document.querySelectorAll("[data-filter]")];
  const update = (category) => {
    buttons.forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.filter === category)));
    grid.innerHTML = records.filter((record) => category === "all" || record.category === category).map(card).join("");
    const count = document.querySelector("[data-filter-count]");
    if (count) count.textContent = `${records.filter((record) => category === "all" || record.category === category).length} projects shown`;
  };
  buttons.forEach((button) => button.addEventListener("click", () => update(button.dataset.filter)));
  update("all");
}

function renderRelated(records) {
  document.querySelectorAll("[data-related-projects]").forEach((node) => {
    const slugs = (node.dataset.relatedProjects || "").split(",").map((value) => value.trim()).filter(Boolean);
    node.innerHTML = records.filter((record) => slugs.includes(record.slug)).map(card).join("");
  });
}

function fillRegistryStats(records) {
  document.querySelectorAll("[data-registry-count]").forEach((node) => { node.textContent = String(records.length); });
  document.querySelectorAll("[data-public-source-count]").forEach((node) => { node.textContent = String(records.filter((record) => publicRepositories(record).length).length); });
  document.querySelectorAll("[data-live-count]").forEach((node) => { node.textContent = String(records.filter((record) => liveSurfaces(record).length).length); });
}

setMenu();
document.querySelectorAll("[data-year]").forEach((node) => { node.textContent = String(new Date().getFullYear()); });
loadRegistry().then((records) => {
  renderGrid(records);
  setupFilters(records);
  renderRelated(records);
  fillRegistryStats(records);
});
