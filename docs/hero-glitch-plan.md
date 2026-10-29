# Glitch transitions — implementation plan (v4)

A time-based glitch transition played on **page-to-page navigation**, inspired
by the hero effect on kimi.ai/blog/kimi-k3-1-pro. It implements the visual
design brief (docs/ai-showcase-design-brief-v2.md) as a **deliberate exception
to its "motion only when it explains a system state" rule (§10)**: the site has
one signature transition, and this is it.

Scrolling is completely native. There is no pin, no scrub, no scroll-linked
state, and no scroll-triggered glitch — the effect only runs when the route
changes.

## What plays

```
link click (internal)
   └─ EXIT     the current screen tears apart (420ms)
   └─ TELEPORT the route swap happens behind an opaque backdrop
   └─ ENTER    the destination assembles out of the chaos and resolves (520ms)
```

Back/forward plays **ENTER only** — there is no old screen left to tear down.
The first mount never glitches. The page is only ever "mid-glitch" for about a
second, and the final frame is always clean.

1. **Slice tears** — three residue clones of the visible screen, each clipped to
   a horizontal band (`clip-path: inset(...)`) and offset horizontally, stepping
   through a precomputed table of 9 buckets so the tear snaps instead of gliding.
2. **Headline scramble** — the first `h1`/`h2` of each visible block decodes from
   hex/binary glyphs; it is painted in an overlay clipped to the heading's own
   box so wide block glyphs can never re-wrap the layout.
3. **Data fragments** — 13 hand-placed mono hex/binary strings and mask bars over
   the whole viewport, faded and drifted by the transition.
4. **Persistent chrome** — the header is cloned into the stage, so the site
   chrome holds still while the content underneath changes. The screen didn't
   change; the content did.

## Route transitions

The marketing layout holds one `GlitchStage`, so it survives every navigation
inside `(marketing)` — home, work, offerings, playground, pricing, auth pages.

- A **capture-phase click listener** intercepts internal `<a href="/…">` clicks
  (`preventDefault`, Next's `<Link>` respects it), plays EXIT, pushes the route,
  waits for the pathname to change (held at peak chaos, max 2.5s while the RSC
  payload loads), scrolls to the top, and plays ENTER on the new page.
- **Back/forward** (and any navigation we didn't intercept) plays ENTER only,
  once the new page has rendered.
- Same-page links (hash/query on the current path) are left to the browser, as
  are external links, `target="_blank"`, downloads, and modified clicks.
- Leaving `(marketing)` (e.g. `/dashboard`) unmounts the stage; the transition
  aborts cleanly (the cleanup clears the stage and releases the scroll lock).

## Scroll progress ring

`ScrollProgressRing` lives in the **root layout**, so every page — marketing,
playground, dashboard — shows a 44px circular indicator at the top right, below
the sticky header: an SVG ring plus a mono percentage. It is a real
`role="progressbar"` (`aria-valuenow`), rAF-throttled, and reads the document's
scroll ratio. During a transition it is covered by the stage like the rest of
the page.

## Architecture

```
web/components/marketing/glitch-stage.tsx      # 'use client' — the whole engine:
                                               #   stage DOM, click interception,
                                               #   rAF phase tweens, clone builder
web/components/marketing/scroll-progress-ring.tsx  # 'use client' — top-right ring
web/lib/glitch.ts                              # pure: charset, scramble(), bands(),
                                               #   glitchIntensity, exitIntensity,
                                               #   enterIntensity, tearTable()
web/app/globals.css                            # .glitch-stage / .glitch-clone /
                                               #   .glitch-fragment / .glitch-layer
web/app/(marketing)/layout.tsx                 # mounts <GlitchStage />
web/app/layout.tsx                             # mounts <ScrollProgressRing />
web/tests/glitch.test.ts                       # vitest: curves, table, scramble
```

Structural rules:

- **The real page is never touched.** No section is pinned, wrapped, or moved;
  the stage clones what is on screen into a fixed overlay, animates the clones,
  and removes them. `page.tsx` and `home-sections.tsx` contain zero glitch
  markup.
- **Clones are cropped to the visible slice.** Each direct child of `<main>`
  intersecting the viewport (plus the footer) gets one wrapper positioned at
  `rect.top` with the visible height and `overflow: hidden`; the base is shifted
  by `−offset`. Tear bands therefore always land on-screen, even in very long
  sections, and a viewport showing two half-sections tears both.
- **Opaque backdrop masks the teleport.** The stage is a full-viewport fixed
  layer whose page-coloured backdrop fades in over the first fifth of EXIT; the
  route swap happens behind it at full chaos, and ENTER resolves on top of the
  identical real page.
- **Headline scramble is an overlay**, not a rewrite: the heading's text is kept
  (hidden) as the layout skeleton, and the scrambled text is painted over it in
  a clipped absolutely-positioned span. Splitting into per-char spans re-wrapped
  the heading (wide `█` glyphs) and pushed it into the paragraph — do not
  "simplify" it back.
- **Clones are inert and aria-hidden**; the real DOM keeps its semantics, so no
  `aria-label` juggling and no duplicate focus targets.
- **Everything is rAF-driven** (`animate(duration, apply)`), not GSAP. The
  timeline must finish regardless of what the user does.

## Curves

```
exitIntensity(p)  = clamp01(p) ** 1.6                    # 0 → clean, 1 → full chaos
enterIntensity(p) = glitchIntensity(0.48 + p * 0.52)     # ≈0.97 → 0, monotonic
```

Both are quantized into `TEAR_STEPS = 9` buckets (`tearTable()`, seed 991) for
band positions and offsets; the intensity itself stays continuous so the fade
doesn't strobe. Offsets peak around ±64px; band height is capped at 90px.

## Input

Scrolling is native, always. The only input handling the stage does is a
**guard during a transition**: wheel, scroll keys (arrows, page keys, space,
home/end) and touch-move are swallowed while the ~1s animation runs, so the real
document can't drift under the chaos. Clicks are swallowed for the same reason —
the page under the cursor is about to be replaced.

There is no scroll lock trickery beyond that: `overflow: hidden` is applied to
`<html>` for the duration (with body padding compensation for the scrollbar) so
dragging the scrollbar can't move the page either, and it is removed before the
user can act again.

## Guardrails

- **Reduced motion**: the engine checks `prefers-reduced-motion` at click time
  and never engages; links navigate normally. CSS hides `.glitch-stage` entirely
  under `reduce`.
- **No-JS**: the stage renders empty and hidden; the page is the page.
- **Performance**: clones exist only while a transition runs (≈1s); fragments
  and bars are 13 static nodes whose opacity/transform are written per frame;
  `will-change` is scoped to the clones and fragments.
- **A11y**: stage `aria-hidden`, clones `inert`; the ring exposes
  `role="progressbar"` with `aria-valuenow`; focus is never moved into clones.

## Verification

- `pnpm exec tsc --noEmit`, `pnpm exec eslint` on touched files, `pnpm test`
  (25 tests: intensity curves, tear table bounds/determinism, scramble
  determinism and resolution).
- Browser pass: wheel/keyboard scrolling never starts a transition; clicking a
  nav link (`/` → `/offerings` → `/about` → `/playground`) plays exit + enter and
  lands at the top of the destination; back/forward plays enter-only; the ring
  reads 0/50/100% while scrolling; no console errors; a clean frame after every
  transition.

## Known risks / footguns

- **`html { scroll-behavior: smooth }`** is on for no-preference users. The
  post-navigation `scrollTo` must use `behavior: "instant"`; a bare `scrollTo`
  would animate *through* the destination behind the chaos.
- **Do not add scroll triggers back** without solving the v1–v3 problem: a
  scroll-driven effect freezes mid-tear when the user stops, which is exactly
  what this design removed.
- **The stage lives in the marketing layout.** A route outside `(marketing)`
  unmounts it mid-transition (abort is clean, but there is no enter frame).
  Mounting it in the root layout would require theme-aware clones for the
  console surfaces — not done.
- **GSAP is unused.** `gsap` / `@gsap/react` remain in `package.json` from
  v1–v3; they can be removed once nothing else needs them.
- **Dev fast refresh** can remount the stage mid-transition (the animation
  aborts, the page stays put). Reload if a dev session looks stuck.
- **Brief compliance**: this remains the documented §10 exception.

## History

- **v1** — hero-only glitch scrubbed by scroll (GSAP + ScrollTrigger pin).
- **v2** — pinned scenes: hero swaps into the capabilities strip, later home
  sections glitch in on arrival. Still scroll-scrubbed.
- **v3** — discrete landings: scroll intent at a section boundary played a full
  exit/teleport/enter sequence; route changes got the same treatment.
- **v4** — scroll-triggered landings removed at the owner's request. Scrolling is
  native; the glitch is a navigation transition only.
