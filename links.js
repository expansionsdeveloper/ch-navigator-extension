// Edit paths here. Each link is appended to the current tenant origin.
// e.g. origin "https://acme.sitecorecontenthub.cloud" + path "/en-us/sitecore/Users"
const SECTIONS = [
  {
    title: "Navigation",
    color: "#069BFE",
    items: [
      { label: "My user details",       path: "/en-us/my-details" },
      { label: "My usergroups",         path: "/en-us/my-details" },
      { label: "All users",             path: "/en-us/sitecore/Users" },
      { label: "Raw audit page",        path: "/en-us/sitecore/audits" },
      { label: "Definition management", path: "/en-us/sitecore/Schema" },
      { label: "Entity management",     path: "/en-us/sitecore/Entities" },
      { label: "Import / Export",       path: "/en-us/sitecore/ImportExport" },
      { label: "Login - Form",          path: "/en-us/sitecore/login" },
    ],
  },
  {
    title: "API Links",
    color: "#FF7401",
    items: [
      { label: "Entity (api)",            path: "/api/entities" },
      { label: "Entity definition (api)", path: "/api/entitydefinitions" },
      { label: "Option lists (api)",      path: "/api/optionlists" },
      { label: "Queues",                  path: "/en-us/sitecore/Queues" },
      { label: "Raw audit",               path: "/en-us/sitecore/audits" },
      { label: "Page component parent",   path: "/en-us/sitecore/PageComponentParent" },
    ],
  },
  {
    title: "Configurations",
    color: "#0659D4",
    items: [
      { label: "Actions",  path: "/en-us/sitecore/Actions" },
      { label: "Scripts",  path: "/en-us/sitecore/Scripts" },
      { label: "Triggers", path: "/en-us/sitecore/Triggers" },
      { label: "Settings", path: "/en-us/sitecore/Settings" },
    ],
  },
];

const CH_HOST_PATTERNS = [
  /\.sitecorecontenthub\.cloud$/i,
  /\.stylelabs\.cloud$/i,
  /\.stylelabs\.io$/i,
];
