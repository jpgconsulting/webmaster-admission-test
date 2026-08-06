# webmaster-admission-test

Fixture site for the website-agent binding admission check
(`openspec/changes/close-website-provider-and-browser-admission-checks`) and for the
website-agent live provider smoke (`openspec/changes/execute-website-agent-live-provider-smoke`).

- `main` is the production branch.
- `draft` is the branch the Webmaster edits; it must stay deployable on Vercel.
- `refs/tags/website-agent-fixture-v1` pins the baseline. The live-smoke lane resets `main` and
  `draft` to that tag before every run, so all three refs must agree.

**Editing this site? Read [`AGENTS.md`](AGENTS.md) first.**

## Why the site looks like this

The site exists to be edited by an agent and then asserted against, so it is deliberately
minimal and deterministic:

- **One content file.** `content/site.json` holds the headline, tagline, contact details and
  hero image. It is the only place page content lives, so an edit to the home-page headline
  changes exactly one path.
- **No dependencies.** `scripts/build.mjs` uses Node built-ins only and renders
  `content/site.json` into `dist/`. Nothing to install means nothing unrelated to the agent can
  break a run.
- **Content-addressed assets.** Uploaded images are committed to
  `public/assets/uploads/<sha256>.<ext>` with their bytes preserved, and referenced from
  `content/site.json` as `/assets/uploads/<sha256>.<ext>` with alt text.
- **A broken-build operation.** Setting `"buildMode": "broken"` in `content/site.json` makes the
  build exit non-zero, so a deployment fails on purpose. The build ignores it on a production
  deployment, so the operation cannot take the live site down.

## Layout

```
content/site.json     page content (the only content source)
public/               static files served as-is; uploads under public/assets/uploads/
scripts/build.mjs     the build: content/site.json -> dist/
vercel.json           build command and output directory
dist/                 generated output (git-ignored)
```

## Build

```sh
node scripts/build.mjs   # writes dist/
```

Vercel runs the same command and serves `dist/`. Node 22.
