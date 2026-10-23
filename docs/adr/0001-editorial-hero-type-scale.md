# 0001. Editorial type scale for the hero name

Date: 2026-10-23

Status: Accepted

## Context

The hero heading is the page's one signature moment, so it should be the first
thing a visitor notices. It was not. The name was set to
`text-[clamp(2.9rem, 8.5vw, 5.75rem)]`, which resolves to 46.4px on a phone and
pins at its 5.75rem ceiling of 92px on any viewport wider than 1082px.

Measured against the shipped layout, that scale fills a small fraction of the
canvas, and the fraction shrinks as the viewport grows:

| viewport | font | name width | container | fill |
| --- | --- | --- | --- | --- |
| 375px | 46.4px | 249px | 317px | 79% |
| 768px | 65.3px | 351px | 710px | 49% |
| 1024px | 87.0px | 468px | 966px | 48% |
| 1440px | 92px | 494px | 1104px | 45% |
| 1920px | 92px | 494px | 1104px | 45% |

The cause is the ceiling, not the absence of a responsive scale. At 1440px the
`8.5vw` term resolves to 122px, already past the 92px ceiling, so the scale has
been pinned there since 1082px. The container keeps widening to 1104px while
the name stays at 494px, so the first screen reads as a page header with empty
space beside it rather than a cover.

Two measurements drive everything below. The hero container is `max-w-6xl`
(1152px) with `px-6` padding, so its content box is 1104px wide. And the
name's natural width is a constant 5.37x its font size in Space Grotesk Bold,
which held across every size measured for this change.

## Decision

Set the hero name to `clamp(2.75rem, 14.5vw, 12.25rem)`, held in the
`--text-hero-name` design token so the value has one home and the component
references the token rather than a literal.

**Raise the ceiling from 5.75rem to 12.25rem (92px to 196px).** This is the
change that matters. 196px x 5.37 = 1052px, a 93% fill of the 1104px content
box with 52px of headroom. A larger ceiling clips at the wide end.

**Raise the slope from 8.5vw to 14.5vw.** The shallow slope was never the
binding constraint, but keeping it would have left the mid range underfilled
once the ceiling moved up. 14.5vw is the largest slope that leaves headroom at
the narrow end of the supported range: at 375px it resolves to 54.4px, a 90%
fill of the 317px content box. A steeper slope (the first attempt was `17.5vw`)
resolved to 65.6px at 375px and clipped, because the name's intrinsic width
then exceeded the box.

The floor is `2.75rem` (44px). It only binds below roughly 303px of viewport,
below the design's supported width, and exists so the name can never fall
below the tagline.

**Tighten the lockup.** The two name lines are held together as one
composition by `line-height: 0.92` and `letter-spacing: -0.04em`, replacing the
previous `0.98` and `tracking-tight`. The tight leading gives a line pitch of
50px against a 55px glyph box at 375px, so the second line overlaps the first
slightly and the pair reads as one lockup rather than two unrelated lines. The
line height is exposed as `--text-hero-name--line-height` so the lockup can be
retuned in one place.

## Consequences

Measured after the change, at the design's supported widths:

| viewport | font | fill | clips |
| --- | --- | --- | --- |
| 375px | 54.4px | 90% | no |
| 768px | 111.4px | 82% | no |
| 1024px | 148.5px | 80% | no |
| 1440px | 196px | 93% | no |
| 1920px | 196px | 93% | no |

The name grows between 1.2x and 2.1x its previous size. The gain is largest
where it was worst: 45% to 93% at the wide end.

Two trade-offs are accepted rather than solved:

- **The mid range fills less than the ends.** At 768px and 1024px the fill is
  80-82%, against 93% at the wide end and 90% at the narrow end. A single
  `vw` slope cannot hold a constant fill across a container that widens from
  317px to 1104px and then stops. Raising the slope to lift the mid range
  clips the narrow end, so the narrow end was preferred.
- **Fill is measured against the content box, not the viewport.** The 48px of
  horizontal padding is deliberate, so a name that reached 100% of the
  viewport would touch the screen edge.

## Rejected alternatives

**Keep `8.5vw`, raise only the ceiling.** Would have lifted the wide end
without touching the narrow end, which is the smaller change. Measured with the
new ceiling held, it resolves to 48% fill at 768px, 47% at 1024px and 77% at
1920px, against the 80-93% this change achieves. Rejected because the mid range
would read as undersized on tablets and the wide end would still leave a fifth
of the canvas empty.

**A fixed rem size.** One value, so no clipping risk at any width, but it
either underfills the wide canvas or clips the narrow one, because a single
number cannot track a container whose width varies fourfold.

**A pure `vw` scale with no ceiling.** Tracks the container exactly, but the
container is padded by 48px, so a scale tuned to fill 100% of the viewport
overflows the content box. It also has no floor, so at 320px the name would be
smaller than the tagline.

## Verification

`scripts/check-hero-scale.mjs` measures the shipped build through the Chrome
DevTools Protocol at 375, 768, 1024, 1440 and 1920px and fails if the name or
the tagline clips, or if the name fills less than 75% of its container. It
also re-measures with the name forced to `30vw` and requires that control to
clip; if the control does not trip, the script exits non-zero on the grounds
that a guard which cannot see a clip proves nothing.

It runs as a CI step, so the scale is gated rather than merely present.

`scripts/verify-hero-guard.mjs` is the break-restore cycle for that guard. It
takes the baseline before breaking anything, forces the hero to a scale
measured to clip at 375px via the guard's `--variant` flag, then restores and
prints all three verdicts side by side. A run whose baseline is already red
exits non-zero and says so, because such a run proves nothing.
