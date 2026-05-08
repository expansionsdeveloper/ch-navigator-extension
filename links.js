// Edit paths here. Each link is appended to the current tenant origin.
// e.g. origin "https://acme.sitecorecontenthub.cloud" + path "/en-us/sitecore/Users"
//
// An item's `path` can be either:
//   - a string: static link
//   - a function (ctx) => string | null: dynamic; hidden when it returns null

// Operational audit is only valid for these entity definitions
const OPERATIONAL_AUDIT_DEFS = new Set([
  "M.Job", "M.Target", "M.JobDescription", "M.Agent", "M.AgentActivity",
]);

const SECTIONS = [
  {
    title: "Current entity",
    color: "#16A34A",
    defaultCollapsed: false,
    items: [
      { label: "Entity (REST)",    path: (c) => c.entityId ? `/api/entities/${c.entityId}` : null },
      { label: "Renditions",       path: (c) => (c.entityId && c.isAsset) ? `/api/entities/${c.entityId}/v2.0/renditions` : null },
      { label: "Rendition count",  path: (c) => (c.entityId && c.isAsset) ? `/api/entities/${c.entityId}/v2.0/renditions/GetUserRenditionsCount` : null },
    ],
  },
  {
    title: "Current definition",
    color: "#0EA5E9",
    defaultCollapsed: false,
    items: [
      { label: "Definition by name (REST)",    path: (c) => c.definitionName ? `/api/entitydefinitions/${c.definitionName}` : null },
      { label: "Definition by name v2 (REST)", path: (c) => c.definitionName ? `/api/entitydefinitions/name/${c.definitionName}` : null },
      { label: "Entities of this definition",  path: (c) => c.definitionName ? `/api/entitydefinitions/${c.definitionName}/entities` : null },
    ],
  },
  {
    title: "Configurations",
    color: "#0659D4",
    defaultCollapsed: true,
    items: [
      { label: "Actions",  path: "/en-us/admin/actions" },
      { label: "Scripts",  path: "/en-us/admin/scripts" },
      { label: "Triggers", path: "/en-us/admin/triggers" },
      { label: "Settings", path: "/en-us/admin/settings" },
    ],
  },
  {
    title: "Current entity — audit",
    color: "#7C3AED",
    defaultCollapsed: true,
    items: [
      { label: "Raw audit (query)",         path: (c) => c.entityId ? `/api/audit/raw/query/${c.entityId}` : null },
      { label: "Raw audit (scroll)",        path: (c) => c.entityId ? `/api/audit/raw/scroll/${c.entityId}` : null },
      { label: "Operational (query)",       path: (c) => (c.entityId && c.definitionName && OPERATIONAL_AUDIT_DEFS.has(c.definitionName)) ? `/api/audit/raw/operational/query/${c.entityId}` : null },
      { label: "Operational (scroll)",      path: (c) => (c.entityId && c.definitionName && OPERATIONAL_AUDIT_DEFS.has(c.definitionName)) ? `/api/audit/raw/operational/scroll/${c.entityId}` : null },
      { label: "Actions (query)",           path: (c) => c.entityId ? `/api/audit/action/query/${c.entityId}` : null },
      { label: "Actions (scroll)",          path: (c) => c.entityId ? `/api/audit/action/scroll/${c.entityId}` : null },
      { label: "Triggers (query)",          path: (c) => c.entityId ? `/api/audit/trigger/query/${c.entityId}` : null },
      { label: "Triggers (scroll)",         path: (c) => c.entityId ? `/api/audit/trigger/scroll/${c.entityId}` : null },
      { label: "Scripting (query)",         path: (c) => c.entityId ? `/api/audit/scripting/query/${c.entityId}` : null },
      { label: "Scripting (scroll)",        path: (c) => c.entityId ? `/api/audit/scripting/scroll/${c.entityId}` : null },
      { label: "Business (query)",          path: (c) => c.entityId ? `/api/audit/business/query/${c.entityId}` : null },
      { label: "Business (scroll)",         path: (c) => c.entityId ? `/api/audit/business/scroll/${c.entityId}` : null },
    ],
  },
  {
    title: "Navigation",
    color: "#069BFE",
    defaultCollapsed: true,
    items: [
      { label: "My user details",       path: (c) => c.userId ? `/en-us/admin/user/${c.userId}` : null },
      { label: "All users",             path: "/en-us/admin/usrmgt?tab9601=Users" },
      { label: "User groups",           path: "/en-us/admin/usrmgt?tab9601=Usergroups" },
      { label: "User logs",             path: "/en-us/admin/usrmgt?tab9601=Userlogs" },
      { label: "Raw audit page",        path: "/en-us/admin/audit-raw" },
      { label: "Definition management", path: "/en-us/admin/definitionmgmt" },
      { label: "Entity management",     path: "/en-us/admin/entitymgmt" },
      { label: "Import / Export",       path: "/en-us/admin/import-export" },
      { label: "Login - Form",          path: "/en-us/login" },
    ],
  },
  {
    title: "Status",
    color: "#059669",
    defaultCollapsed: true,
    items: [
      { label: "Overview",      path: "/api/status" },
      { label: "Queues",        path: "/api/status/queues" },
      { label: "Jobs",          path: "/api/status/jobs" },
      { label: "Users",         path: "/api/status/users" },
      { label: "License",       path: "/api/status/license" },
      { label: "Data storage",  path: "/api/status/datastorage" },
      { label: "Media storage", path: "/api/status/mediastorage" },
      { label: "Search",        path: "/api/status/search" },
      { label: "Graph",         path: "/api/status/graph" },
      { label: "Service status",path: "/api/status/servicestatus" },
      { label: "Publishing",    path: "/api/status/publishing" },
      { label: "Video indexing",path: "/api/status/videoindexing" },
    ],
  },
  {
    title: "API Links (lists)",
    color: "#FF7401",
    defaultCollapsed: true,
    items: [
      { label: "My profile",               path: "/api/userProfile" },
      { label: "All entity definitions",   path: "/api/entitydefinitions" },
      { label: "All download orders",      path: "/api/downloadorders" },
      { label: "Graph rebuilds",           path: "/api/graph/v1/rebuilds" },
    ],
  },
];

// Pull IDs and context from the current URL.
function buildContext(url) {
  const ctx = { url, pathname: url.pathname, search: url.search, hash: url.hash };

  // Generic entity ID: last `/{digits}` segment in the path.
  const trailingId = url.pathname.match(/\/(\d+)(?:\/[^\/]*)?\/?$/);
  if (trailingId) ctx.entityId = trailingId[1];

  // Asset detection: CH renders asset detail pages at /en-us/asset/{id}
  ctx.isAsset = /\/en-us\/asset\/\d+/.test(url.pathname);
  if (ctx.isAsset) ctx.definitionName = "M.Asset";

  // Definition by name: /en-us/admin/schema/{name} or /api/entitydefinitions/{name}
  const defn = url.pathname.match(/\/(?:admin\/schema|entitydefinitions(?:\/name)?)\/([A-Za-z0-9._-]+)/i);
  if (defn) ctx.definitionName = defn[1];

  return ctx;
}

// Node.js / Jest compatibility
if (typeof module !== "undefined") {
  module.exports = { buildContext, SECTIONS, OPERATIONAL_AUDIT_DEFS };
}
