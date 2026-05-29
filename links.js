// Edit paths here. Each link is appended to the current tenant origin.
// e.g. origin "https://acme.sitecorecontenthub.cloud" + path "/en-us/sitecore/Users"
//
// An item's `path` can be either:
//   - a string: static link
//   - a function (ctx) => string | null: dynamic; hidden when it returns null
//
// `icon` refers to a key in ICONS (see icons.js).

// Operational audit is only valid for these entity definitions
const OPERATIONAL_AUDIT_DEFS = new Set([
  "M.Job", "M.Target", "M.JobDescription", "M.Agent", "M.AgentActivity",
]);

const SECTIONS = [
  {
    title: "Current entity",
    icon: "cube",
    defaultCollapsed: false,
    items: [
      { label: "Entity", icon: "cube", path: (c) => c.entityId ? `/api/entities/${c.entityId}` : null },
    ],
  },
  {
    title: "Current definition",
    icon: "schema",
    defaultCollapsed: false,
    items: [
      { label: "Definition by name",          icon: "schema", path: (c) => c.definitionName ? `/api/entitydefinitions/${c.definitionName}?includeConditionalMembers=true` : null },
      { label: "Entities of this definition", icon: "list",   path: (c) => c.definitionName ? `/api/entitydefinitions/${c.definitionName}/entities` : null },
    ],
  },
  {
    title: "Configurations",
    icon: "gear",
    defaultCollapsed: true,
    items: [
      { label: "Edit this page", icon: "pencil",   type: "action", actionName: "editThisPage" },
      { label: "Actions",        icon: "play",     path: "/en-us/admin/actions" },
      { label: "Scripts",        icon: "code",     path: "/en-us/admin/scripts" },
      { label: "Triggers",       icon: "zap",      path: "/en-us/admin/triggers" },
      { label: "Settings",       icon: "gear",     path: "/en-us/admin/settingmanagement" },
      { label: "Pages",          icon: "fileText", path: "/en-us/admin/page" },
      {
        label: "Clear all cache",
        icon: "trash",
        type: "action",
        actionName: "clearAllCache",
        confirm: "Clear the entire application cache?",
      },
    ],
  },
  {
    title: "Navigation",
    icon: "grid",
    defaultCollapsed: true,
    items: [
      { label: "My user details",             icon: "user",         path: (c) => c.userId ? `/en-us/admin/user/${c.userId}` : null },
      { label: "All users",                   icon: "users",        path: "/en-us/admin/usrmgt?tab9601=Users" },
      { label: "User groups",                 icon: "usersGroup",   path: "/en-us/admin/usrmgt?tab9601=Usergroups" },
      { label: "User logs",                   icon: "logTree",      path: "/en-us/admin/usrmgt?tab9601=Userlogs" },
      { label: "Raw audit page",              icon: "fileSearch",   path: "/en-us/admin/audit-raw" },
      { label: "Definition management",       icon: "schema",       path: "/en-us/admin/definitionmgmt" },
      { label: "Entity management",           icon: "grid",         path: "/en-us/admin/entitymgmt" },
      { label: "Import / Export",             icon: "arrowsUpDown", path: "/en-us/admin/importexport" },
      { label: "Login (form authentication)", icon: "key",          path: "/en-us/account?forcePassive=true" },
    ],
  },
  {
    title: "Current entity — audit",
    icon: "fileSearch",
    defaultCollapsed: true,
    items: [
      { label: "Raw audit (query)",    icon: "fileText",  path: (c) => c.entityId ? `/api/audit/raw/query/${c.entityId}` : null },
      { label: "Raw audit (scroll)",   icon: "fileText",  path: (c) => c.entityId ? `/api/audit/raw/scroll/${c.entityId}` : null },
      { label: "Operational (query)",  icon: "activity",  path: (c) => (c.entityId && c.definitionName && OPERATIONAL_AUDIT_DEFS.has(c.definitionName)) ? `/api/audit/raw/operational/query/${c.entityId}` : null },
      { label: "Operational (scroll)", icon: "activity",  path: (c) => (c.entityId && c.definitionName && OPERATIONAL_AUDIT_DEFS.has(c.definitionName)) ? `/api/audit/raw/operational/scroll/${c.entityId}` : null },
      { label: "Actions (query)",      icon: "play",      path: (c) => c.entityId ? `/api/audit/action/query/${c.entityId}` : null },
      { label: "Actions (scroll)",     icon: "play",      path: (c) => c.entityId ? `/api/audit/action/scroll/${c.entityId}` : null },
      { label: "Triggers (query)",     icon: "zap",       path: (c) => c.entityId ? `/api/audit/trigger/query/${c.entityId}` : null },
      { label: "Triggers (scroll)",    icon: "zap",       path: (c) => c.entityId ? `/api/audit/trigger/scroll/${c.entityId}` : null },
      { label: "Scripting (query)",    icon: "code",      path: (c) => c.entityId ? `/api/audit/scripting/query/${c.entityId}` : null },
      { label: "Scripting (scroll)",   icon: "code",      path: (c) => c.entityId ? `/api/audit/scripting/scroll/${c.entityId}` : null },
      { label: "Business (query)",     icon: "briefcase", path: (c) => c.entityId ? `/api/audit/business/query/${c.entityId}` : null },
      { label: "Business (scroll)",    icon: "briefcase", path: (c) => c.entityId ? `/api/audit/business/scroll/${c.entityId}` : null },
    ],
  },
  {
    title: "Status",
    icon: "heartPulse",
    defaultCollapsed: true,
    items: [
      { label: "Overview",       icon: "activity",   path: "/api/status" },
      { label: "Queues",         icon: "layers",     path: "/api/status/queues" },
      { label: "Jobs",           icon: "briefcase",  path: "/api/status/jobs" },
      { label: "Users",          icon: "users",      path: "/api/status/users" },
      { label: "License",        icon: "award",      path: "/api/status/license" },
      { label: "Data storage",   icon: "hardDrive",  path: "/api/status/datastorage" },
      { label: "Media storage",  icon: "image",      path: "/api/status/mediastorage" },
      { label: "Search",         icon: "search",     path: "/api/status/search" },
      { label: "Graph",          icon: "network",    path: "/api/status/graph" },
      { label: "Service status", icon: "heartPulse", path: "/api/status/servicestatus" },
      { label: "Publishing",     icon: "upload",     path: "/api/status/publishing" },
      { label: "Video indexing", icon: "video",      path: "/api/status/videoindexing" },
    ],
  },
  {
    title: "API Links (lists)",
    icon: "list",
    defaultCollapsed: true,
    items: [
      { label: "My profile",             icon: "userCircle", path: "/api/userProfile" },
      { label: "All entity definitions", icon: "schema",     path: "/api/entitydefinitions?includeConditionalMembers=true" },
      { label: "Option lists",           icon: "database",   path: "/api/datasources" },
      { label: "All download orders",    icon: "download",   path: "/api/downloadorders" },
      { label: "Graph rebuilds",         icon: "refresh",    path: "/api/graph/v1/rebuilds" },
      { label: "Renditions",             icon: "layers",     path: (c) => (c.entityId && c.isAsset) ? `/api/entities/${c.entityId}/v2.0/renditions` : null },
      { label: "Rendition count",        icon: "hash",       path: (c) => (c.entityId && c.isAsset) ? `/api/entities/${c.entityId}/v2.0/renditions/GetUserRenditionsCount` : null },
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
