// Cache in chrome.storage.local (survives service-worker restarts; requires "storage" permission).
// TTL prevents serving indefinitely stale data across long sessions.
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const FAV_KEY = "favorites_v1";

const _local = chrome.storage?.local;

async function getFavorites() {
  if (!_local) return new Set();
  try {
    const res = await _local.get(FAV_KEY);
    return new Set(res[FAV_KEY] || []);
  } catch { return new Set(); }
}

function saveFavorites(set) {
  if (!_local) return;
  _local.set({ [FAV_KEY]: [...set] }).catch(() => { /* non-fatal */ });
}

function slugify(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
function itemId(sectionTitle, label) {
  return `${slugify(sectionTitle)}:${slugify(label)}`;
}

function buildFavoritesSection(favorites) {
  const items = [];
  for (const section of SECTIONS) {
    for (const item of section.items) {
      const id = itemId(section.title, item.label);
      if (favorites.has(id)) items.push(item);
    }
  }
  return {
    title: "Favourites",
    icon: "star",
    defaultCollapsed: false,
    isFavorites: true,
    items,
  };
}

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

// Named action handlers. Action items in links.js reference these by actionName,
// so links.js stays pure data (no chrome.* calls; remains testable in Jest).
const ACTIONS = {
  async editThisPage(tab, origin, opener) {
    let id = null;
    try {
      const [res] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const w = window;
          const fromReact = w.PAGE_OPTIONS && w.PAGE_OPTIONS.id;
          if (fromReact != null) return String(fromReact);
          const fromKnockout = (w.Page && w.Page.options && w.Page.options.id) || (w.Page && w.Page.id);
          if (fromKnockout != null) return String(fromKnockout);
          for (const s of Array.from(document.scripts)) {
            const src = s.innerHTML || "";
            const hasMarker =
              src.indexOf("window.PAGE_OPTIONS") > -1 ||
              src.indexOf("window.Page = (window.api") > -1 ||
              src.indexOf("var options =") > -1;
            if (!hasMarker) continue;
            const m = src.match(/["']?\bid["']?\s*:\s*["']?([A-Za-z0-9_-]+)["']?/);
            if (m) return m[1];
          }
          return null;
        },
      });
      id = res && res.result;
    } catch { /* fall through */ }
    if (!id) {
      return { success: false, message: "Could not determine the current page id. Are you on a Content Hub page?" };
    }
    openInNewTab(`${origin}/en-us/admin/page/${id}`, opener);
    return { success: true, message: `Opening page ${id}…` };
  },

  async clearAllCache(tab) {
    let ok = false;
    try {
      const [res] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: async () => {
          try {
            const tokenEl = document.getElementsByName("__RequestVerificationToken")[0];
            const token = tokenEl && tokenEl.defaultValue;
            const r = await fetch("/api/cache/all", {
              method: "DELETE",
              credentials: "include",
              headers: token ? { "x-requested-by": token } : undefined,
            });
            return r.ok;
          } catch { return false; }
        },
      });
      ok = !!(res && res.result);
    } catch { /* fall through */ }
    return ok
      ? { success: true, message: "The application cache was cleared successfully." }
      : { success: false, message: "Failed to clear the cache." };
  },
};

let _toastTimer = null;
function showToast(result) {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = result.message;
  el.className = `toast ${result.success ? "success" : "error"}`;
  el.classList.remove("hidden");
  if (_toastTimer) window.clearTimeout(_toastTimer);
  _toastTimer = window.setTimeout(() => {
    el.classList.add("hidden");
    _toastTimer = null;
  }, 4000);
}

async function runItemAction(item, tab, origin, opener) {
  const handler = ACTIONS[item.actionName];
  if (!handler) {
    showToast({ success: false, message: `Unknown action: ${item.actionName}` });
    return;
  }
  if (item.confirm && !window.confirm(item.confirm)) return;
  try {
    const r = await handler(tab, origin, opener);
    showToast(r);
  } catch (err) {
    showToast({ success: false, message: err && err.message ? err.message : String(err) });
  }
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

function starButtonHTML(id, starred) {
  const cls = starred ? "star starred" : "star";
  const aria = starred ? "Remove from favourites" : "Add to favourites";
  return `<button class="${cls}" data-fav-id="${id}" aria-label="${aria}" title="${aria}">${iconSVG("star")}</button>`;
}

function captureCollapsed() {
  const state = {};
  for (const sec of document.querySelectorAll("#sections .section")) {
    const t = sec.dataset.title;
    if (t) state[t] = sec.classList.contains("collapsed");
  }
  return state;
}

let _renderState = null; // { origin, ctx, opener, favorites }

function renderSections(origin, ctx, opener, favorites) {
  _renderState = { origin, ctx, opener, favorites };
  const prevCollapsed = captureCollapsed();
  const root = document.getElementById("sections");
  root.innerHTML = "";

  const favSection = buildFavoritesSection(favorites);
  const sectionsToRender = [favSection, ...SECTIONS];

  // Pass 1: resolve every section so we know which are actually visible.
  const visibleSections = [];
  for (const section of sectionsToRender) {
    const resolved = [];
    for (const it of section.items) {
      const id = itemId(section.isFavorites ? findOriginSectionTitle(it) : section.title, it.label);
      if (it.type === "action") {
        resolved.push({ id, label: it.label, icon: it.icon, type: "action", actionName: it.actionName, confirm: it.confirm });
        continue;
      }
      const path = resolvePath(it.path, ctx);
      if (path) resolved.push({ id, label: it.label, icon: it.icon, path });
    }
    if (resolved.length === 0) continue;
    visibleSections.push({ section, resolved });
  }

  // Pass 2: assign default open/collapsed state by *visible position*.
  // - Favourites (when visible): open. All other sections: collapsed.
  // - No favourites: first 2 visible non-favourite sections open, rest collapsed.
  // The user's manual toggles within this session still win (prevCollapsed) below.
  const hasVisibleFavs = visibleSections.some((v) => v.section.isFavorites);
  let openedNonFav = 0;
  for (const entry of visibleSections) {
    if (entry.section.isFavorites) {
      entry.collapsedByDefault = false;
    } else if (hasVisibleFavs) {
      entry.collapsedByDefault = true;
    } else if (openedNonFav < 2) {
      entry.collapsedByDefault = false;
      openedNonFav++;
    } else {
      entry.collapsedByDefault = true;
    }
  }

  // Pass 3: render.
  for (const { section, resolved, collapsedByDefault } of visibleSections) {
    const wrap = document.createElement("section");
    const collapsed = (section.title in prevCollapsed) ? prevCollapsed[section.title] : collapsedByDefault;
    wrap.className = collapsed ? "section collapsed" : "section";
    wrap.dataset.title = section.title;

    const header = document.createElement("button");
    header.className = "section-header";
    header.innerHTML = `${sectionIconHTML(section.icon)}<span class="section-title">${section.title}</span>${CARET_SVG}`;
    header.addEventListener("click", () => wrap.classList.toggle("collapsed"));
    wrap.appendChild(header);

    const body = document.createElement("div");
    body.className = "section-body";
    for (const item of resolved) {
      const row = document.createElement("div");
      row.className = "item-row";

      const btn = document.createElement("button");
      btn.className = "item";
      btn.innerHTML = `${itemIconHTML(item.icon)}<span class="item-text"><span class="item-label">${item.label}</span></span>`;
      if (item.type === "action") {
        btn.addEventListener("click", () => runItemAction(item, opener, origin, opener));
      } else {
        btn.addEventListener("click", () => openInNewTab(origin + item.path, opener));
      }
      row.appendChild(btn);

      row.insertAdjacentHTML("beforeend", starButtonHTML(item.id, favorites.has(item.id)));
      const starEl = row.lastElementChild;
      starEl.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleFavorite(item.id);
      });

      body.appendChild(row);
    }
    wrap.appendChild(body);
    root.appendChild(wrap);
  }
}

// Used by the synthetic Favourites section to preserve a stable id that maps
// back to the original section/label.
function findOriginSectionTitle(item) {
  for (const section of SECTIONS) {
    if (section.items.includes(item)) return section.title;
  }
  return "Favourites";
}

function toggleFavorite(id) {
  if (!_renderState) return;
  const { origin, ctx, opener, favorites } = _renderState;
  if (favorites.has(id)) favorites.delete(id); else favorites.add(id);
  saveFavorites(favorites);
  renderSections(origin, ctx, opener, favorites);
}

function renderStatusBar(statusData, definitionName) {
  const bar = document.getElementById("status-bar");
  if (!bar || !statusData) return;

  const label = statusData.aggregated_service_status_label || "Unknown";
  const buildDate = statusData.build_date
    ? new Date(statusData.build_date).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
    : "";

  const dotColors = { Green: "#16A34A", Red: "#DC2626", Orange: "#EA580C", Yellow: "#CA8A04" };
  const dotColor = dotColors[label] || "#888";

  const tooltip = `
    <div class="tt-title">System status — currently <span style="color:${dotColor}">${label}</span></div>
    <div class="tt-body">
      Aggregated from individual service health checks. The dot shows the
      <em>worst</em> status across all tracked services.
    </div>
    <ul class="tt-legend">
      <li><span class="tt-dot" style="background:#16A34A"></span><b>Green</b> — Healthy</li>
      <li><span class="tt-dot" style="background:#CA8A04"></span><b>Yellow</b> — Warnings</li>
      <li><span class="tt-dot" style="background:#EA580C"></span><b>Orange</b> — Degraded</li>
      <li><span class="tt-dot" style="background:#DC2626"></span><b>Red</b> — Critical</li>
    </ul>
    <div class="tt-foot">Tracked: queues · jobs · data/media storage · search · graph · publishing · video indexing.</div>
  `;

  bar.innerHTML = `
    <span class="status-info" tabindex="0" aria-describedby="status-tooltip">
      <span class="status-dot" style="background:${dotColor}"></span>
      <span class="status-label">System status</span>
      <span id="status-tooltip" role="tooltip" class="status-tooltip">${tooltip}</span>
    </span>
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

  const favorites = await getFavorites();

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
      if (!cached.profile) {
        sectionsEl.classList.add("hidden");
        tenantEl.classList.add("hidden");
        if (typeof renderBanners === "function") renderBanners();
        return;
      }
      const cachedLabel = buildTenantLabel(ctx);
      if (cachedLabel) { tenantEl.textContent = cachedLabel; } else { tenantEl.classList.add("hidden"); }
      renderSections(url.origin, ctx, tab, favorites);
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
    if (!profile) {
      sectionsEl.classList.add("hidden");
      tenantEl.classList.add("hidden");
      if (typeof renderBanners === "function") renderBanners();
      return;
    }
    const freshLabel = buildTenantLabel(ctx);
    if (freshLabel) { tenantEl.textContent = freshLabel; } else { tenantEl.classList.add("hidden"); }
    renderSections(url.origin, ctx, tab, favorites);
    if (typeof renderBanners === "function") renderBanners();

  } catch (err) {
    // Surface errors instead of silently staying on "loading…"
    tenantEl.textContent = url.hostname;
    notCh.classList.remove("hidden");
    notCh.textContent = `Extension error: ${err && err.message ? err.message : String(err)}`;
  }
}

document.addEventListener("DOMContentLoaded", init);
