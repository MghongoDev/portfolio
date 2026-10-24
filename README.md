# Portfolio

Personal site of David Mwandairo at [dmwandairo.vercel.app](https://dmwandairo.vercel.app): a Next.js site presenting data engineering, analytics engineering, and ML work as case studies. Content lives as Markdown in this repo: no CMS, no database.

## Stack

- [Next.js](https://nextjs.org) (App Router, static generation) + TypeScript
- Tailwind CSS v4 with a custom dark "data-made-visible" design system
- Case studies compile at build time (remark/rehype, GFM tables, Shiki highlighting)
- Vercel Web Analytics; auto-deploys from `main`

## Local development

```bash
npm install
npm run dev         # http://localhost:3000
npm run build       # production build
npm test            # content pipeline tests (vitest)
npm run test:routes # build, serve, and check every route over HTTP
npm run test:smoke  # check every route against a server that is already running
```

## Hero guards

Three scripts measure the rendered hero through headless Chrome and fail the
build when it regresses: the editorial type scale, the grain texture, and the
chart receding behind the name.

The scale and grain cycles prove their guard can go red, not only that it is
green today: each takes a baseline, breaks the thing it guards, then restores.
The chart guard has no break flag yet, so its cycle takes the baseline only and
says so, rather than implying a proof it cannot give.

Run a guard, or a cycle, with:

```bash
node scripts/hero-harness.mjs scripts/check-hero-scale.mjs
node scripts/verify-hero-harness.mjs
```

`scripts/hero-harness.mjs` starts Chrome and the production server on ports it
is given, waits for both to answer, runs the script against them, and tears both
down whatever the verdict is. A service that never comes up fails the run and
names itself, with its own log tail, instead of surfacing as a hero that never
rendered. Two runs coexist by taking different ports.

Every hero script takes the same two arguments: the base URL first, then
`--cdp`. The harness supplies both, so a caller only ever passes the guard's own
break flags, and the shape is learned once.

This is a Node script rather than a composite GitHub Action. The same command has
to work on the author's machine and in CI, and a composite action would be
idiomatic for GitHub and would run nowhere else.

## Editing content

**Add or edit a case study:** create/modify a Markdown file in `content/projects/`. Required front-matter:

```yaml
---
title: "Project Title"
tagline: "One sentence for the page header."
summary: "One sentence for cards and meta description."
date: "YYYY-MM"
tags: [Tag, Tag]
cover: /assets/<project>/cover.png   # optional
repo: https://github.com/...
demo: https://...                    # optional
featured: true
order: 1                             # display order among featured
---
```

The body uses the case-study skeleton: `Context → Problem → Approach & Architecture → Stack → Results → Links`.

**Experience timeline:** edit `content/experience.json` (period, role, org, summary, tags per entry).

**Site identity and links:** `src/lib/site.ts`.

The test suite validates front-matter and compilation. Run `npm test` after content edits. The route smoke suite (`npm run test:routes`) builds the site, serves it, and checks every route; `npm run test:smoke` runs only the checks against a server that is already up. Set `SMOKE_BASE_URL` to skip the local server and sweep a running site instead, such as the live deployment: `SMOKE_BASE_URL=https://dmwandairo.vercel.app npm run test:smoke`. The route table lives in one place (`tests/smoke/routes.test.ts`) and drives both, so adding a route is one table entry.

## Deployment

Imported on Vercel as project `dmwandairo` (free Hobby tier). Pushes to `main` deploy automatically. The résumé download serves `public/David-Mwandairo-Resume.pdf`. Replace that file to update the résumé.
