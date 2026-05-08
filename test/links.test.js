const { buildContext, SECTIONS, OPERATIONAL_AUDIT_DEFS } = require("../links.js");

function url(href) { return new URL(href); }

function resolveItems(section, ctx) {
  return section.items
    .map((it) => {
      const path = typeof it.path === "function" ? it.path(ctx) : it.path;
      return path ? it.label : null;
    })
    .filter(Boolean);
}

function sectionByTitle(title) {
  return SECTIONS.find((s) => s.title === title);
}

// ─── buildContext ────────────────────────────────────────────────────────────

describe("buildContext — asset URL", () => {
  const ctx = buildContext(url("https://acme.sitecorecontenthub.cloud/en-us/asset/39752"));

  test("sets entityId", () => expect(ctx.entityId).toBe("39752"));
  test("sets isAsset", () => expect(ctx.isAsset).toBe(true));
  test("sets definitionName to M.Asset", () => expect(ctx.definitionName).toBe("M.Asset"));
});

describe("buildContext — entity management URL (non-asset)", () => {
  const ctx = buildContext(url("https://acme.sitecorecontenthub.cloud/en-us/admin/entitymgmt/12345"));

  test("sets entityId", () => expect(ctx.entityId).toBe("12345"));
  test("isAsset is false", () => expect(ctx.isAsset).toBe(false));
  test("definitionName is undefined (requires API fetch)", () => expect(ctx.definitionName).toBeUndefined());
});

describe("buildContext — schema admin URL", () => {
  const ctx = buildContext(url("https://acme.sitecorecontenthub.cloud/en-us/admin/schema/M.Job"));

  test("sets definitionName", () => expect(ctx.definitionName).toBe("M.Job"));
  test("no entityId", () => expect(ctx.entityId).toBeUndefined());
  test("isAsset is false", () => expect(ctx.isAsset).toBe(false));
});

describe("buildContext — entity definitions API URL", () => {
  const ctx = buildContext(url("https://acme.sitecorecontenthub.cloud/api/entitydefinitions/M.Target"));

  test("sets definitionName", () => expect(ctx.definitionName).toBe("M.Target"));
});

describe("buildContext — non-CH URL", () => {
  const ctx = buildContext(url("https://example.com/some/page"));

  test("no entityId", () => expect(ctx.entityId).toBeUndefined());
  test("isAsset is false", () => expect(ctx.isAsset).toBe(false));
  test("no definitionName", () => expect(ctx.definitionName).toBeUndefined());
});

// ─── Current entity section ──────────────────────────────────────────────────

describe("Current entity — no entity on page", () => {
  const ctx = buildContext(url("https://acme.sitecorecontenthub.cloud/en-us/admin/schema"));
  const visible = resolveItems(sectionByTitle("Current entity"), ctx);

  test("no items visible", () => expect(visible).toHaveLength(0));
});

describe("Current entity — non-asset entity", () => {
  const ctx = { entityId: "100", isAsset: false, definitionName: "M.Job" };
  const visible = resolveItems(sectionByTitle("Current entity"), ctx);

  test("Entity (REST) is visible", () => expect(visible).toContain("Entity (REST)"));
  test("Renditions not visible", () => expect(visible).not.toContain("Renditions"));
  test("Rendition count not visible", () => expect(visible).not.toContain("Rendition count"));
});

describe("Current entity — asset entity", () => {
  const ctx = { entityId: "200", isAsset: true, definitionName: "M.Asset" };
  const visible = resolveItems(sectionByTitle("Current entity"), ctx);

  test("Entity (REST) is visible", () => expect(visible).toContain("Entity (REST)"));
  test("Renditions is visible", () => expect(visible).toContain("Renditions"));
  test("Rendition count is visible", () => expect(visible).toContain("Rendition count"));
});

// ─── Audit section — operational audit gate ──────────────────────────────────

describe("Current entity audit — operational audit hidden for generic entities", () => {
  const ctx = { entityId: "300", definitionName: "M.Asset" };
  const visible = resolveItems(sectionByTitle("Current entity — audit"), ctx);

  test("Operational (query) not visible for M.Asset", () => expect(visible).not.toContain("Operational (query)"));
  test("Operational (scroll) not visible for M.Asset", () => expect(visible).not.toContain("Operational (scroll)"));
  test("Raw audit (query) is visible", () => expect(visible).toContain("Raw audit (query)"));
});

describe("Current entity audit — operational audit visible for M.Job", () => {
  const ctx = { entityId: "400", definitionName: "M.Job" };
  const visible = resolveItems(sectionByTitle("Current entity — audit"), ctx);

  test("Operational (query) visible", () => expect(visible).toContain("Operational (query)"));
  test("Operational (scroll) visible", () => expect(visible).toContain("Operational (scroll)"));
});

test.each([...OPERATIONAL_AUDIT_DEFS])(
  "Operational audit is visible for %s",
  (defName) => {
    const ctx = { entityId: "1", definitionName: defName };
    const visible = resolveItems(sectionByTitle("Current entity — audit"), ctx);
    expect(visible).toContain("Operational (query)");
  }
);

describe("Current entity audit — no entityId", () => {
  const ctx = { entityId: undefined, definitionName: "M.Job" };
  const visible = resolveItems(sectionByTitle("Current entity — audit"), ctx);

  test("no audit items visible without entityId", () => expect(visible).toHaveLength(0));
});

// ─── Current definition section ──────────────────────────────────────────────

describe("Current definition — visible when definitionName is set", () => {
  const ctx = { definitionName: "M.Asset" };
  const visible = resolveItems(sectionByTitle("Current definition"), ctx);

  test("shows definition links", () => expect(visible.length).toBeGreaterThan(0));
  test("contains Definition by name", () => expect(visible).toContain("Definition by name (REST)"));
});

describe("Current definition — hidden without definitionName", () => {
  const ctx = { entityId: "500" };
  const visible = resolveItems(sectionByTitle("Current definition"), ctx);

  test("no items visible", () => expect(visible).toHaveLength(0));
});

// ─── Status section ──────────────────────────────────────────────────────────

describe("Status section — always visible (static paths)", () => {
  const ctx = {};
  const visible = resolveItems(sectionByTitle("Status"), ctx);

  test("Overview is visible", () => expect(visible).toContain("Overview"));
  test("Queues is visible", () => expect(visible).toContain("Queues"));
  test("Jobs is visible", () => expect(visible).toContain("Jobs"));
  test("all 12 items present", () => expect(visible).toHaveLength(12));
});

// ─── Navigation section ──────────────────────────────────────────────────────

describe("Navigation — My user details requires userId", () => {
  test("hidden without userId", () => {
    const ctx = {};
    const visible = resolveItems(sectionByTitle("Navigation"), ctx);
    expect(visible).not.toContain("My user details");
  });

  test("visible with userId", () => {
    const ctx = { userId: 42 };
    const visible = resolveItems(sectionByTitle("Navigation"), ctx);
    expect(visible).toContain("My user details");
  });
});
