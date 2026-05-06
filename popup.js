async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function isContentHubHost(hostname) {
  return CH_HOST_PATTERNS.some((re) => re.test(hostname));
}

function openInNewTab(url) {
  chrome.tabs.create({ url });
}

function renderSections(origin) {
  const root = document.getElementById("sections");
  root.innerHTML = "";

  for (const section of SECTIONS) {
    const wrap = document.createElement("section");
    wrap.className = "section";

    const header = document.createElement("button");
    header.className = "section-header";
    header.style.setProperty("--bg", section.color);
    header.innerHTML = `<span>${section.title}</span><span>▾</span>`;
    header.addEventListener("click", () => wrap.classList.toggle("collapsed"));
    wrap.appendChild(header);

    const body = document.createElement("div");
    body.className = "section-body";
    for (const item of section.items) {
      const btn = document.createElement("button");
      btn.className = "item";
      btn.innerHTML = `${item.label}<span class="path">${item.path}</span>`;
      btn.addEventListener("click", () => openInNewTab(origin + item.path));
      body.appendChild(btn);
    }
    wrap.appendChild(body);
    root.appendChild(wrap);
  }
}

async function init() {
  const tab = await getActiveTab();
  const tenantEl = document.getElementById("tenant");
  const sectionsEl = document.getElementById("sections");
  const notCh = document.getElementById("not-ch");

  let url;
  try { url = new URL(tab?.url || ""); } catch { url = null; }

  if (!url || !isContentHubHost(url.hostname)) {
    sectionsEl.classList.add("hidden");
    notCh.classList.remove("hidden");
    tenantEl.textContent = url ? url.hostname : "(no active tab)";
    return;
  }

  tenantEl.textContent = url.hostname;
  renderSections(url.origin);

  if (typeof renderBanners === "function") renderBanners();
}

document.addEventListener("DOMContentLoaded", init);
