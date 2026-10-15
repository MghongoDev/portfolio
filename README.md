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
