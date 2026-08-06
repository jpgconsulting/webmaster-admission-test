# AGENTS.md — how to edit this site

This is a deliberately tiny, deterministic fixture site. Everything a visitor sees on the
home page comes from **one file**: [`content/site.json`](content/site.json).

Read this file before making any change.

## Repository map

| Path | What it is |
| --- | --- |
| `content/site.json` | **The only source of page content.** Headline, tagline, contact, hero image. |
| `public/` | Static files copied verbatim into the site. Uploaded images live under `public/assets/uploads/`. |
| `scripts/build.mjs` | The build. Renders `content/site.json` into `dist/`. Node built-ins only, no dependencies. |
| `vercel.json` | Pins the build command and output directory for the hosting provider. |
| `dist/` | Generated output. Git-ignored. **Never** commit it and never edit it. |

There is no CMS, no template directory, no CSS file and no second content file. If you are
asked to change page text, change `content/site.json` and nothing else.

## Content configuration (`content/site.json`)

```json
{
  "headline": "Webmaster admission test fixture",
  "tagline": "A deterministic fixture site for the website-agent live smoke.",
  "contact": "fixture@example.invalid",
  "hero": null,
  "buildMode": "ok"
}
```

- `headline` — rendered as the page `<h1>` and the `<title>`. This is "the home-page headline".
- `tagline` — a short line of text under the headline.
- `contact` — contact details shown on the home page.
- `hero` — `null`, or the home-page hero image (see below).
- `buildMode` — `"ok"` normally; `"broken"` is the broken-build operation (see below).

`headline`, `tagline` and `contact` must each be a non-empty string. Unknown extra keys are ignored.

## Asset configuration — where uploaded images go

This is the repository's asset configuration. Follow it exactly; do not invent another location.

1. A file the owner shares is staged at `.uploads/<sessionId>/<name>` and is **git-isolated
   temporary staging**. Never commit it and never reference it from the site.
2. Move it into the repository with the platform-managed import operation
   (`.chatinfra/import-upload.sh <staged-source> <repository-destination>`).
3. The destination is always:

   ```
   public/assets/uploads/<sha256>.<ext>
   ```

   where `<sha256>` is the **lowercase hex SHA-256 of the file's bytes** (`sha256sum <file>`)
   and `<ext>` is the file's existing extension (`png`, `jpg`, `svg`, …). Content-addressed
   names make the same image import to the same path every time.
4. The bytes are preserved exactly. Do not re-encode, resize, optimise or otherwise rewrite an
   uploaded image; this site's asset policy is byte-preserving.
5. Reference it from `content/site.json` by its **served** path — the `public/` prefix is
   dropped when the site is built:

   ```json
   "hero": {
     "src": "/assets/uploads/<sha256>.png",
     "alt": "Short, accurate description of the image",
     "width": 1200,
     "height": 630
   }
   ```

   - `src` is required and must start with `/`.
   - `alt` is required. A hero without alt text fails the build.
   - `width` and `height` are optional numbers; set them to reserve layout space. Reserve
     layout **here** — there is no stylesheet to edit, and touching any other file is wrong.

## The broken-build operation

This fixture can fail its own build on demand, so that a failing deployment can be exercised
end to end. That is the **broken-build operation**, and it is applied like this:

```json
"buildMode": "broken"
```

in `content/site.json`. Nothing else changes: the operation is exactly this one field.

- With `"buildMode": "broken"`, `scripts/build.mjs` exits non-zero, so the deployment for that
  commit **fails**. That failure is the intended, expected result — it is not a mistake to
  correct before pushing, and it is not a reason to refuse to commit or preview.
- It is confined to the draft. The broken-build operation cannot take the live site down: the
  build ignores `"buildMode": "broken"` on a production deployment, and production only ever
  changes through an owner-confirmed publication of a **successful** preview.
- Never publish it, and never leave it set once the exercise is finished. Setting the field
  back to `"ok"` restores a working build.

When a preview deployment fails, say so plainly and include, in your reply:

- the **deployment ID** the server reported,
- the exact **commit SHA** that was pushed to `draft`,
- that the deployment **failed** (use the word).

## Build and validation

- **Do not run install, package, or build scripts locally.** There is no local build boundary.
  Build validation comes only from the provider deployment for the exact pushed draft commit,
  through `/preview`.
- The provider runs `node scripts/build.mjs` and serves `dist/`.
- `dist/` is regenerated on every build and is git-ignored. It must never appear in a commit.

## Git rules

- Edit on `draft`. Commit only the site change itself.
- Push draft updates with `.chatinfra/push-draft.sh`. Never run `git push`, and never use
  `--force`, a ref delete, a reset, or any rewind of a remote ref.
- `main` is production. This runtime cannot change it. Publication happens only when the owner
  confirms it in the authenticated Panel chat.
- A commit that touches anything beyond the content file (and, for an image change, the
  imported asset) is wrong for this repository.
