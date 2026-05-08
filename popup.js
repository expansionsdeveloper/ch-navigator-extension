// Cache in chrome.storage.local (survives service-worker restarts; requires "storage" permission).
// TTL prevents serving indefinitely stale data across long sessions.
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

const _local = chrome.storage?.local;

async function getPageCache(tabId, tabUrl) {
  if (!_local) return null;
  try {
    const key = `cache_${tabId}`;
    const res = await _local.get(key);
    const cached = res[key];
    if (!cached) return null;
    if (cached.url !== tabUrl) return null;
    if (Date.now() - cached.cachedAt > CACHE_TTL_MS) return null;
    return cached;
  } catch { return null; }
}

function setPageCache(tabId, tabUrl, data) {
  if (!_local) return;
  // Fire-and-forget so a popup-closes race can't skip the write.
  _local
    .set({ [`cache_${tabId}`]: { url: tabUrl, cachedAt: Date.now(), ...data } })
    .catch(() => { /* non-fatal */ });
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function openInNewTab(url, opener) {
  const opts = { url };
  if (opener) {
    opts.index = opener.index + 1;
    opts.openerTabId = opener.id;
    if (opener.windowId !== undefined) opts.windowId = opener.windowId;
  }
  chrome.tabs.create(opts);
}

async function fetchStatus(tabId) {
  try {
    const [res] = await chrome.scripting.executeScript({
      target: { tabId },
      func: async () => {
        try {
          const r = await fetch("/api/status", { credentials: "include" });
          if (!r.ok) return null;
          return await r.json();
        } catch { return null; }
      },
    });
    return res?.result || null;
  } catch { return null; }
}

async function fetchUserProfile(tabId) {
  try {
    const [res] = await chrome.scripting.executeScript({
      target: { tabId },
      func: async () => {
        try {
          const r = await fetch("/api/userProfile", { credentials: "include" });
          if (!r.ok) return null;
          return await r.json();
        } catch { return null; }
      },
    });
    return res?.result || null;
  } catch { return null; }
}

async function fetchEntityDefinitionName(tabId, entityId) {
  try {
    const [res] = await chrome.scripting.executeScript({
      target: { tabId },
      func: async (id) => {
        try {
          const r = await fetch(`/api/entities/${id}`, { credentials: "include" });
          if (!r.ok) return null;
          const data = await r.json();
          // entitydefinition.href is like "/api/entitydefinitions/M.Asset"
          const href = data?.entitydefinition?.href;
          if (!href) return null;
          const match = href.match(/\/([^/]+)$/);
          return match ? match[1] : null;
        } catch { return null; }
      },
      args: [entityId],
    });
    return res?.result || null;
  } catch { return null; }
}

function resolvePath(path, ctx) {
  if (typeof path === "function") {
    try { return path(ctx); } catch { return null; }
  }
  return path;
}

const CARET_SVG =
  '<svg class="icon section-caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>';

function sectionIconHTML(name) {
  const path = (typeof ICONS !== "undefined" && ICONS[name]) ? ICONS[name] : null;
  if (!path) return '';
  return `<svg class="icon section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
}

function itemIconHTML(name) {
  const path = (typeof ICONS !== "undefined" && ICONS[name]) ? ICONS[name] : null;
  if (!path) return '';
  return `<svg class="icon item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
}

function renderSections(origin, ctx, opener) {
  const root = document.getElementById("sections");
  root.innerHTML = "";

  for (const section of SECTIONS) {
    const resolved = section.items
      .map((it) => ({ label: it.label, icon: it.icon, path: resolvePath(it.path, ctx) }))
      .filter((it) => it.path);

    if (resolved.length === 0) continue;

    const wrap = document.createElement("section");
    wrap.className = section.defaultCollapsed ? "section collapsed" : "section";

    const header = document.createElement("button");
    header.className = "section-header";
    header.innerHTML = `${sectionIconHTML(section.icon)}<span class="section-title">${section.title}</span>${CARET_SVG}`;
    header.addEventListener("click", () => wrap.classList.toggle("collapsed"));
    wrap.appendChild(header);

    const body = document.createElement("div");
    body.className = "section-body";
    for (const item of resolved) {
      const btn = document.createElement("button");
      btn.className = "item";
      btn.innerHTML = `${itemIconHTML(item.icon)}<span class="item-text"><span class="item-label">${item.label}</span><span class="path">${item.path}</span></span>`;
      btn.addEventListener("click", () => openInNewTab(origin + item.path, opener));
      body.appendChild(btn);
    }
    wrap.appendChild(body);
    root.appendChild(wrap);
  }
}

function renderStatusBar(statusData, definitionName) {
  const bar = document.getElementById("status-bar");
  if (!bar || !statusData) return;

  const label = statusData.aggregated_service_status_label || "Unknown";
  const version = (statusData.product_version || "").slice(0, 7);
  const buildDate = statusData.build_date
    ? new Date(statusData.build_date).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
    : "";

  const dotColors = { Green: "#16A34A", Red: "#DC2626", Orange: "#EA580C", Yellow: "#CA8A04" };
  const dotColor = dotColors[label] || "#888";
  const tooltip = `System status: ${label}. Aggregated from all service health checks (queues, jobs, storage, search, graph, publishing, and more).`;

  bar.innerHTML = `
    <span class="status-dot" style="background:${dotColor}" title="${tooltip}"></span>
    <span class="status-label" title="${tooltip}">System status</span>
    ${definitionName ? `<span class="status-sep">·</span><span class="status-meta">Entity Definition: ${definitionName}</span>` : ""}
    ${buildDate ? `<span class="status-sep">·</span><span class="status-meta">Build Date: ${buildDate}</span>` : ""}
  `;
  bar.classList.remove("hidden");
}

function buildTenantLabel(ctx) {
  return ctx.username ? `Current user: ${ctx.username}` : null;
}

async function init() {
  const tab = await getActiveTab();
  const tenantEl = document.getElementById("tenant");
  const sectionsEl = document.getElementById("sections");
  const notCh = document.getElementById("not-ch");

  let url;
  try { url = new URL(tab?.url || ""); } catch { url = null; }

  if (!url || !/^https?:$/.test(url.protocol)) {
    sectionsEl.classList.add("hidden");
    tenantEl.classList.add("hidden");
    notCh.classList.remove("hidden");
    notCh.textContent = "This extension only works with your Sitecore Content Hub instance. Open it on your Content Hub URL to get started.";
    return;
  }

  tenantEl.textContent = "Loading…";

  try {
    // Serve from cache if the tab URL hasn't changed
    const cached = await getPageCache(tab.id, tab.url);
    if (cached) {
      if (!cached.isCH) {
        sectionsEl.classList.add("hidden");
        tenantEl.classList.add("hidden");
        notCh.classList.remove("hidden");
        notCh.textContent = "This extension is not compatible with this website. It only works with your Sitecore Content Hub instance.";
        return;
      }
      const ctx = buildContext(url);
      if (cached.profile) { ctx.userId = cached.profile.user_id; ctx.username = cached.profile.username; }
      if (cached.definitionName) ctx.definitionName = cached.definitionName;
      if (cached.isAsset) ctx.isAsset = true;
      renderStatusBar(cached.statusData, ctx.definitionName);
      const cachedLabel = buildTenantLabel(ctx);
      if (cachedLabel) { tenantEl.textContent = cachedLabel; } else { tenantEl.classList.add("hidden"); }
      renderSections(url.origin, ctx, tab);
      if (typeof renderBanners === "function") renderBanners();
      return;
    }

    // Fresh fetch — status and profile in parallel
    const [statusData, profile] = await Promise.all([
      fetchStatus(tab.id),
      fetchUserProfile(tab.id),
    ]);

    const isCH = !!(statusData && statusData.product_version);

    if (!isCH) {
      sectionsEl.classList.add("hidden");
      tenantEl.classList.add("hidden");
      notCh.classList.remove("hidden");
      notCh.textContent = "This extension is not compatible with this website. It only works with your Sitecore Content Hub instance.";
      setPageCache(tab.id, tab.url, { isCH: false, statusData: null });
      return;
    }

    const ctx = buildContext(url);
    if (profile) { ctx.userId = profile.user_id; ctx.username = profile.username; }

    if (ctx.entityId && !ctx.definitionName) {
      const defName = await fetchEntityDefinitionName(tab.id, ctx.entityId);
      if (defName) {
        ctx.definitionName = defName;
        if (defName === "M.Asset") ctx.isAsset = true;
      }
    }

    // Write cache before rendering — fire-and-forget so popup close can't race the write.
    setPageCache(tab.id, tab.url, {
      isCH: true,
      statusData,
      profile: profile ? { user_id: ctx.userId, username: ctx.username } : null,
      definitionName: ctx.definitionName || null,
      isAsset: ctx.isAsset || false,
    });

    renderStatusBar(statusData, ctx.definitionName);
    const freshLabel = buildTenantLabel(ctx);
    if (freshLabel) { tenantEl.textContent = freshLabel; } else { tenantEl.classList.add("hidden"); }
    renderSections(url.origin, ctx, tab);
    if (typeof renderBanners === "function") renderBanners();

  } catch (err) {
    // Surface errors instead of silently staying on "loading…"
    tenantEl.textContent = url.hostname;
    notCh.classList.remove("hidden");
    notCh.textContent = `Extension error: ${err && err.message ? err.message : String(err)}`;
  }
}

document.addEventListener("DOMContentLoaded", init);
