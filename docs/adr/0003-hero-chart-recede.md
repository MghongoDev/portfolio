# 0003. Hero chart recedes behind the name

Date: 2026-10-23

Status: Accepted

## Context

The hero canvas filled the whole section. At every viewport the chart sat
behind the name and drew the eye away from it.

Measured against the shipped layout:

| viewport | canvas height | section height | canvas fill |
| --- | --- | --- | --- |
| 375px | 150px | 792px | 19% |
| 768px | 198px | 792px | 25% |
| 1024px | 207px | 893px | 23% |
| 1440px | 214px | 920px | 23% |
| 1920px | 214px | 920px | 23% |

The canvas was `absolute inset-0 h-full w-full`. It covered the whole hero,
so the name never led.

## Decision

Shrink the canvas to the bottom quarter of the hero.

Change the canvas class to `absolute inset-x-0 bottom-0 h-[25%] w-full`.

The chart now sits in a strip below the name. It reads as texture, not a
competing focal point.

## Consequences

The chart is no longer the first thing seen. The name leads at every
viewport. The chart still anchors the bottom of the hero and keeps the
page from feeling empty.

Two trade-offs are accepted:

- The chart has less room to breathe on small screens. At 375px it is
  198px tall, which is enough for the line and its glow, but little more.
- On very tall viewports the chart is a thin strip. That is the point, but
  it means the hero's lower third is quieter than before.

## Verification

`scripts/check-hero-chart.mjs` measures the real rendered hero through the
Chrome DevTools Protocol at 375, 768, 1024, 1440 and 1920px. It fails if
the canvas overlaps the name, or if the canvas animates under reduced
motion. It also forces the canvas full-size with `--force-overlap` and
forces animation with `--force-animate`; both controls must trip or the
script exits non-zero.

`scripts/verify-hero-chart.mjs` is the break-restore cycle for that guard.
It takes the baseline before breaking anything, then forces overlap and
animation, then restores, and prints all three verdicts side by side.
