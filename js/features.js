// Renders the "Features" tab from a standalone JSON file (data/features.json)
// rather than a bundled JS module, so this reference content is fetched on
// demand the first time the tab is opened instead of loading with the rest
// of the app's JS.

let cachedData = null;
let inFlight = null;

async function loadData() {
  if (cachedData) return cachedData;
  if (!inFlight) {
    inFlight = fetch("data/features.json").then((res) => {
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      return res.json();
    });
  }
  cachedData = await inFlight;
  return cachedData;
}

function renderContent(container, data) {
  container.innerHTML = "";
  for (const section of data.sections) {
    const block = document.createElement("div");
    block.className = "features-section";

    const h3 = document.createElement("h3");
    h3.textContent = section.heading;
    block.appendChild(h3);

    for (const item of section.items) {
      const itemEl = document.createElement("div");
      itemEl.className = "features-item";
      const h4 = document.createElement("h4");
      h4.textContent = item.name;
      const p = document.createElement("p");
      p.textContent = item.description;
      itemEl.appendChild(h4);
      itemEl.appendChild(p);
      block.appendChild(itemEl);
    }

    container.appendChild(block);
  }
}

export async function renderFeaturesTab(container) {
  if (cachedData) {
    renderContent(container, cachedData);
    return;
  }

  container.innerHTML = '<p class="features-status">Loading…</p>';
  try {
    const data = await loadData();
    renderContent(container, data);
  } catch (err) {
    inFlight = null;
    container.innerHTML =
      '<p class="features-status error">Could not load this content. Check your connection and try again.</p>';
  }
}
