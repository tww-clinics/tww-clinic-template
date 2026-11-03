# The Wellness Way — Clinic Site Template

A ready-to-launch clinic website. One markdown file drives the entire site, and
clinic staff edit it themselves through a browser admin panel — change the phone
number once and it updates the nav, the footer, the contact page, and the
structured data Google reads.

**Stack:** [Astro](https://astro.build) 5 · [Decap CMS](https://decapcms.org) · Netlify

---

## Launch a new clinic

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/tww-clinics/tww-clinic-template)

### 1. Deploy

The button copies this template into a new GitHub repo, creates a Netlify site,
and deploys it. Give the repo a clinic-specific name, e.g. `tww-appleton`.

### 2. Create the site in DecapBridge

At [decapbridge.com](https://decapbridge.com), add a site:

| Field | Value |
| :---- | :---- |
| GitHub repository | `tww-clinics/tww-appleton` — must be `owner/repo` |
| Decap CMS login URL | `https://<your-site>/admin/` — keep the trailing slash |
| GitHub token | A token with **Contents: Read and write** |

> The token needs **write** access. A read-only token lets staff log in and edit
> perfectly, then fails only when they press Publish — with an error that says
> nothing about permissions. Scope the token to all clinic repos so this is a
> one-time setup rather than a per-clinic step.

### 3. Add the site id to Netlify

Copy the site id out of the URLs DecapBridge generates — the UUID in
`/sites/<site-id>/pkce` — and in Netlify add it as an environment variable:

```
DECAP_SITE_ID = <site-id>
BRAND_URL     = https://<brand-site>/brand.json
```

`BRAND_URL` points the clinic at the franchise brand feed served by the
[tww-brand](https://github.com/tww-clinics/tww-brand) repo. Without it the site
falls back to the branding bundled in `src/brand/defaults.json` and will not
receive HQ changes.

Then redeploy. **No code changes are needed**: `/admin/config.yml` is generated
at build time from this variable plus `REPOSITORY_URL`, which Netlify sets
itself. See `src/pages/admin/config.yml.ts`.

If you skip this, the CMS config is still served but carries a plain-English
warning at the top saying exactly what is missing.

### 4. Invite the clinic's staff

In DecapBridge, invite them by email. They sign in with a password, Google or
Microsoft — no GitHub account required.

Then hand them `https://<your-site>/admin/`.

> **Why not Netlify Identity?** Netlify has
> [deprecated Git Gateway](https://docs.netlify.com/manage/security/secure-access-to-sites/git-gateway/)
> and no longer fixes bugs in it. It also stored the target repository as hidden
> internal state, which meant a CMS could silently start reading the wrong repo
> after a rename, with no error at all. DecapBridge names the repo in
> `config.yml`, so that failure cannot happen.

---

## Filling in a new site

Every field starts as a placeholder. Working through the admin panel top to
bottom covers it, but these are the ones that cause real problems when missed:

| Field | What happens if you leave it |
| :---- | :--------------------------- |
| **Scheduling → NEO URL** | Every "Schedule Appointment" button silently falls back to the contact page or a phone link. Nothing errors — the CTAs just quietly stop reaching your booking system. |
| **Address → Latitude / Longitude** | Default `0, 0` places the clinic in the Atlantic Ocean in the structured data Google reads. |
| **Tracking → GA4 / Meta Pixel** | Left blank, no analytics tags are output at all. |
| **Hero → Background Image** | Also used as the social share image. Without it, shares fall back to the logo. |

---

## How the content works

All content lives in **one file**: `src/content/clinic/clinic.md`.

Its shape is enforced by a Zod schema in `src/content/config.ts`. If a required
field is missing, **the build fails** rather than deploying a broken page — a
deliberate guardrail, since non-technical staff edit this directly. A failed
build never takes the live site down; Netlify keeps serving the last good deploy.

The admin panel's fields are defined separately in `src/cms/collections.yml`,
which is appended verbatim to the generated backend block to produce
`/admin/config.yml`.

> ⚠️ **Keep those two files in sync.** `config.ts` decides what is valid;
> `collections.yml` decides what staff can enter. Add a required field to the
> schema without adding it to the CMS and staff cannot produce a valid site.

The collection is deliberately single-entry — one repo and one Netlify site per
clinic. `create: false` stops staff adding a second one.

### Landing pages

Each entry under **Landing Pages** generates a page at `/lp/<slug>`, rendered by
`src/pages/lp/[slug].astro`. Slugs are normalized automatically
(`Neuropathy Relief` → `neuropathy-relief`); blank and duplicate slugs are
skipped rather than failing the build. `/new-patient` is a fixed landing page
using the same layout.

---

## Local development

```bash
npm install
```

```bash
npm run dev
```

Runs at `http://localhost:4321`.

| Command | Action |
| :------ | :----- |
| `npm install` | Install dependencies |
| `npm run dev` | Dev server at `localhost:4321` |
| `npm run build` | Production build to `./dist/` |
| `npm run preview` | Preview the production build |

**On Windows:** stop the dev server before switching git branches. Astro's file
watcher holds directory handles, and Windows refuses to delete a directory that
any process has open — branch switches that add or remove folders will fail.

**Local `/admin`:** use `http://localhost:4321/admin/index.html`. Astro's dev
server does not resolve the bare `/admin` directory index; Netlify does in
production. You cannot log in locally: the generated config has no repo or site
id outside a Netlify build, and says so at the top of the served file.

---

## Project structure

```text
public/
  admin/          Decap CMS shell (index.html only — config is generated)
  images/clinic/  CMS-uploaded media
  _headers        Security headers applied by Netlify
src/
  cms/
    collections.yml   The admin panel's fields, authored as plain YAML
  components/     Nav, Footer, LandingPage, RichText, BioModal
  content/
    clinic/       ← the single content file that drives the whole site
    config.ts     Zod schema validating that file
  layouts/        BaseLayout — meta tags, schema.org, analytics
  pages/
    admin/config.yml.ts   Generates the CMS config per site at build time
    ...           One file per route
  styles/         global.css — design tokens and shared classes
netlify.toml      Build settings (overrides the Netlify UI)
```

Canonical, Open Graph and schema.org URLs derive from `process.env.URL`, which
Netlify sets per site at build time — so each clinic gets correct absolute URLs
with no configuration. Local builds fall back to `http://localhost:4321`.
