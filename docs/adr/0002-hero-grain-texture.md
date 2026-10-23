# ADR 0002: Hero canvas grain texture

Status: proposed

## Problem

The hero page reads as a flat dark void. The type scale introduced in
ADR 0001 gives the name weight, but the background has no texture.

## Options

A. Keep the void flat. No change.
B. Add a heavy noise overlay. It would be felt but would reduce contrast.
C. Add a light grain layer to the body. It adds depth without changing the
   type or motion.

## Decision

Add a `body::after` layer that uses an SVG `feTurbulence` filter. Set
opacity to 3 %. Set `pointer-events: none` so it does not block text.
Do not animate it.

## Why this option

The grain is felt not seen. It adds a hint of paper or film texture. The
3 % opacity keeps the layer quiet. `pointer-events: none` guarantees it
does not interfere with selection or links. No animation means it does
not fight the entry choreography from `.zcode/skills/awwwards-motion`.

## Guard

`scripts/check-hero-grain.mjs` measures the hero at 375, 768, 1024,
1440 and 1920 px. It fails if the grain is missing, interactive, or
animated. It also fails if the contrast between the name or tagline and
its background drops by more than 0.1:1. The interactive control forces
`pointer-events: auto` and requires the guard to see the change.

## References

- ADR 0001: editorial hero type scale
- Ticket #11: hero grain texture
- `.zcode/skills/awwwards-motion`: one signature moment per page,
  animations behind `prefers-reduced-motion`
