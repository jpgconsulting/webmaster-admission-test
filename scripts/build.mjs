// Renders content/site.json into dist/. No dependencies: Node built-ins only.
//
// Contract (see AGENTS.md):
//   - content/site.json is the only source of page content.
//   - dist/ is generated output. It is git-ignored and must never be committed.
//   - "buildMode": "broken" is the fixture's broken-build operation. It makes this
//     script exit non-zero so a preview deployment fails on purpose. It is ignored
//     on a production deployment, so it cannot take production down.

import { readFile, mkdir, rm, cp, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";

const root = new URL("../", import.meta.url);
const outputDir = new URL("dist/", root);
const publicDir = new URL("public/", root);

function fail(message) {
  console.error(`build failed: ${message}`);
  process.exit(1);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function requireString(value, field) {
  if (typeof value !== "string" || value.trim() === "") {
    fail(`content/site.json: "${field}" must be a non-empty string`);
  }
  return value;
}

let site;
try {
  site = JSON.parse(await readFile(new URL("content/site.json", root), "utf8"));
} catch (error) {
  fail(`content/site.json is not readable JSON (${error.message})`);
}

// --- The fixture's broken-build operation -----------------------------------
const buildMode = site.buildMode ?? "ok";
if (buildMode !== "ok" && buildMode !== "broken") {
  fail(`content/site.json: "buildMode" must be "ok" or "broken", got ${JSON.stringify(site.buildMode)}`);
}
const isProductionDeployment = process.env.VERCEL_ENV === "production";
if (buildMode === "broken" && !isProductionDeployment) {
  fail(
    'content/site.json requests the fixture broken-build operation ("buildMode": "broken"). ' +
      "This build is expected to fail. Set it back to \"ok\" to build again.",
  );
}
// ---------------------------------------------------------------------------

const headline = requireString(site.headline, "headline");
const tagline = requireString(site.tagline, "tagline");
const contact = requireString(site.contact, "contact");

let heroHtml = "";
if (site.hero !== null && site.hero !== undefined) {
  // Canonical shape is {"src": "/assets/uploads/<sha256>.png", "alt": "..."}.
  // A bare string is accepted with a top-level "heroAlt"; a few field aliases are
  // accepted so a small naming difference does not fail an otherwise correct edit.
  const hero = typeof site.hero === "string" ? { src: site.hero, alt: site.heroAlt } : site.hero;
  if (typeof hero !== "object" || Array.isArray(hero)) {
    fail('content/site.json: "hero" must be null, or an object with "src" and "alt"');
  }
  const src = requireString(hero.src ?? hero.image ?? hero.path ?? hero.url, "hero.src");
  const alt = requireString(hero.alt ?? hero.altText ?? site.heroAlt, "hero.alt");
  if (!src.startsWith("/")) {
    fail(`content/site.json: "hero.src" must be a site-absolute path starting with "/", got ${JSON.stringify(src)}`);
  }
  const size = ["width", "height"]
    .filter((key) => Number.isFinite(hero[key]))
    .map((key) => ` ${key}="${hero[key]}"`)
    .join("");
  heroHtml =
    `\n<figure data-fixture="home-hero">` +
    `<img data-fixture="home-hero-image" src="${escapeHtml(src)}" alt="${escapeHtml(alt)}"${size}>` +
    `<figcaption data-fixture="home-hero-alt">${escapeHtml(alt)}</figcaption>` +
    `</figure>`;
}

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });

// Static assets (including uploaded images) ship as-is, byte for byte.
if (existsSync(publicDir)) {
  await cp(publicDir, outputDir, { recursive: true });
}

await writeFile(
  new URL("index.html", outputDir),
  `<!doctype html>
<html lang="en">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(headline)}</title>
<h1 data-fixture="home-headline">${escapeHtml(headline)}</h1>
<p data-fixture="home-tagline">${escapeHtml(tagline)}</p>${heroHtml}
<p data-fixture="contact-details">${escapeHtml(contact)}</p>
</html>
`,
);

await writeFile(
  new URL("feed.xml", outputDir),
  `<?xml version="1.0" encoding="utf-8"?>\n<feed><title>${escapeHtml(headline)}</title></feed>\n`,
);
await writeFile(
  new URL("sitemap.xml", outputDir),
  `<?xml version="1.0" encoding="utf-8"?>\n<urlset><url><loc>/</loc></url></urlset>\n`,
);
await writeFile(new URL("robots.txt", outputDir), "User-agent: *\nAllow: /\n");

console.log(`built dist/ from content/site.json (headline: ${headline})`);
