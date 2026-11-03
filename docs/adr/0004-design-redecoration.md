# ADR 0004: Visual re-decoration target

Status: Accepted

## Context

The portfolio already ships a coherent dark design system
(`ink` `#05080a` / `paper` `#e9f1ee` / accent `#c8f04b`, Space Grotesk +
Inter + JetBrains Mono, spring-eased motion, hero guards in CI). The
`astro-portfolio` skill's Terminal Luxe system is a different stack target:
it produces an Astro 5 site, while this repo is Next.js 16 App Router.
Re-scaffolding to Astro would drop the existing case-study build, hero
guards, and test suite for no gain.

## Decision

Adopt Terminal Luxe as the *direction* only (dark ink, teal/violet accent
reference, staggered fade-up reveal animations, atmospheric background),
and apply it as a surgical, CSS-only re-decoration of the existing Next.js
site using the visual-redesign pipeline:

- JavaScript logic (state, effects, API calls, event handlers, routing, data
  flow) is sacred and never touched.
- The redesign happens in globals.css plus a small number of component
  className/style edits, loaded as overrides after the existing stylesheets.
- None of the hero type-scale, grain, or chart regressions may regress;
  the guarded values (`--text-hero-name`, canvas position, grain layer) are
  frozen and must keep passing their CI guards.

## Consequences

- The site keeps its existing identity (dark ink, yellow-green accent,
  Space Grotesk) instead of a full Terminal Luxe rebrand.
- Any new visual tokens live alongside the existing ones; the existing
  stylesheets are not deleted until the override is verified.
- The hero guards must re-run green after the re-decoration.

## Verification

- `npm run build` and `npm test` must pass after every layer.
- `npm run test:routes` must keep every route returning its key text.
- Hero guard cycles (`check-hero-scale`, `check-hero-grain`, `check-hero-chart`)
  must stay green.
