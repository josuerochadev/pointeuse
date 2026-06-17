# Pointeuse — "Soft Glass" Redesign

**Date**: 2026-06-17
**Scope**: Design system, visual treatment, app icon, animations. Structure/layout unchanged.
**Direction**: Apple Weather/Health mood — soft, airy, glassmorphism, gradient accents. Dual theme (light default, dark auto).

---

## 1. Design Tokens

### Colors — Light (default)

| Token | Value | Usage |
|---|---|---|
| `--bg-start` | `#F2F0ED` | Body gradient start |
| `--bg-end` | `#E8E4DF` | Body gradient end |
| `--surface` | `rgba(255,255,255,0.72)` | Card/panel backgrounds (+ `backdrop-filter: blur(20px)`) |
| `--surface-border` | `rgba(0,0,0,0.06)` | Card borders |
| `--text` | `#1C2530` | Primary text |
| `--muted` | `#6B7786` | Secondary text |
| `--faint` | `#A0AAB4` | Tertiary text, labels |
| `--positive` | `#1A8A6E` | On-time, positive delta |
| `--positive-end` | `#0FADBB` | Gradient end for positive |
| `--negative` | `#C46A28` | Late, negative delta |
| `--negative-end` | `#E8946A` | Gradient end for negative |
| `--positive-soft` | `rgba(26,138,110,0.10)` | Positive backgrounds |
| `--negative-soft` | `rgba(196,106,40,0.10)` | Negative backgrounds |

### Colors — Dark (auto via `prefers-color-scheme`)

| Token | Value | Usage |
|---|---|---|
| `--bg-start` | `#0F1419` | Body gradient start |
| `--bg-end` | `#161D26` | Body gradient end |
| `--surface` | `rgba(255,255,255,0.06)` | Glass surfaces |
| `--surface-border` | `rgba(255,255,255,0.08)` | Card borders |
| `--text` | `#E8ECF0` | Primary text |
| `--muted` | `#8A95A0` | Secondary text |
| `--faint` | `#5A6570` | Tertiary text |
| `--positive` | `#6FD3AC` | Positive |
| `--positive-end` | `#4ABFA0` | Gradient end |
| `--negative` | `#E6AE72` | Negative |
| `--negative-end` | `#D08A50` | Gradient end |
| `--positive-soft` | `rgba(111,211,172,0.12)` | Positive backgrounds |
| `--negative-soft` | `rgba(230,174,114,0.12)` | Negative backgrounds |

### Typography

| Role | Font | Weight | Notes |
|---|---|---|---|
| UI text | DM Sans | 400, 500, 600 | Replaces Inter. Rounder, more modern. |
| Data/numbers | Fraunces | 400, 500, 600 | Kept. Serif, expressive, `font-variant-numeric: tabular-nums` |
| Brand "Pointeuse" | DM Sans | 600 | Was Fraunces, now matches UI font for modern logo-text feel |

Key sizes: hero bigtime 56-62px, card titles 13px uppercase, body 14px, badges 10-11px.

### Spacing & Shape

| Token | Value |
|---|---|
| `--radius-card` | `22px` |
| `--radius-input` | `12px` |
| `--radius-badge` | `8px` |
| `--shadow` | `0 1px 3px rgba(0,0,0,0.04), 0 8px 32px rgba(0,0,0,0.08)` |
| `--gap-section` | `16px` |
| Max-width | `560px` (unchanged) |

---

## 2. Component Visual Treatment

### Header (top bar)
- Brand "Pointeuse" in DM Sans 600
- Week badge "sem. 24" in a glass pill (`--surface` + blur + `--surface-border`)
- Nav buttons: circles with glass treatment, scale(0.95) -> scale(1) tap animation

### Balance (solde cumule)
- Glass card with a 3px gradient accent bar on the left edge (positive or negative gradient)
- Solde value in Fraunces 30px
- Hover: subtle glow matching solde color

### Hero (depart prevu)
- Background: subtle ambient gradient (warm white -> cream in light, dark ink -> slight teal in dark)
- Bigtime (56-62px): gradient text via `background-clip: text` using positive/negative gradient
- Timeline bar: gradient fill (teal -> light green) animated with a slow shimmer (3s loop), rounded ends
- "Now" marker: luminous dot with pulsing `box-shadow` glow (2s ease-in-out infinite, opacity 0.4 -> 0.8)
- Arrival input: glass style, invisible border at rest, teal ring on focus

### Week Table (card)
- Glass background (`--surface` + blur)
- Row separators: `rgba` very subtle
- Today row: tinted teal `rgba(26,138,110,0.06)`
- Daily deltas: pill badges (8px radius) with soft positive/negative background instead of bare text
- Time inputs: invisible border at rest, appears on focus with soft teal ring

### Buttons
- Primary: teal gradient + subtle inner shadow for depth
- Ghost: glass style (semi-transparent + blur + fine border)
- All: `border-radius: 12px`, `transition: ease-out 200ms`, `scale(0.97)` on `:active`

### Panels (details)
- Glass treatment matching cards
- Summary: inline SVG chevron icons (replacing emoji), chevron rotates 90deg on open
- Content: softer hover on rows

### Summary Row (week totals)
- Same glass treatment
- Separator: rgba fine line instead of solid gray

---

## 3. Icon — Abstract Progress Arc

### Concept
A 270deg (3/4) circular arc, open at bottom-right. The arc end has a round dot (like a progress cursor). The negative space + dot visually suggests an abstract "P". Evokes time/progress without being a literal clock.

### Specs
- Arc stroke width: ~15% of viewBox
- `stroke-linecap: round` on both ends
- Arc gradient: `#1A8A6E` -> `#6FD3AC`

### Variants

| File | Size | Background | Arc color |
|---|---|---|---|
| `icon-192.png` | 192x192 | Dark ink `#161D26` | Teal gradient |
| `icon-512.png` | 512x512 | Dark ink `#161D26` | Teal gradient |
| `icon-maskable-512.png` | 512x512 | Solid teal `#1A8A6E` | White `#FFFFFF` |
| `apple-touch-icon.png` | 180x180 | Dark ink `#161D26` | Teal gradient |

Icons generated via Python script (Pillow) or SVG-to-PNG pipeline, as per existing workflow.

---

## 4. Animations & Micro-interactions

### Transitions
- Global: `ease-out 200ms` (replacing 150ms linear)
- `prefers-reduced-motion: reduce` honored (existing, kept)

### Hero Timeline
- Fill bar: gradient shimmer animation (translateX loop, ~3s, subtle)
- "Now" marker: pulsing glow (`box-shadow` animation, 2s infinite)
- Bigtime value change: fade transition (opacity 0 -> 1, 300ms)

### Touch Interactions
- Buttons, clickable cards, history rows: `scale(0.97)` on `:active`, return 150ms
- Nav chevrons: 15deg rotation on tap, elastic return
- Week badge pill: subtle bounce on week change

### Panel Open/Close
- Chevron: `rotate(0)` -> `rotate(90deg)` in 200ms
- Content: `max-height` + `opacity` transition (smooth, no native jump)

### Theme Switching
- No transition on dark/light switch (follows OS, instant change)

### Numbers
- No counter/roll animation (YAGNI) — fade is sufficient

---

## 5. Implementation Notes

- **No build step**: stays vanilla HTML/CSS/JS
- **CSS**: all tokens in `:root` (light) and `@media (prefers-color-scheme: dark)` override
- **Google Fonts**: replace Inter with DM Sans in the fonts link, keep Fraunces
- **backdrop-filter**: has good browser support; fallback to solid `--surface` with higher opacity for unsupported browsers (`@supports not (backdrop-filter: blur(1px))`)
- **Gradient text**: `background-clip: text` + `-webkit-background-clip: text` + `color: transparent`
- **Icon generation**: update existing Python script or create new SVG source
- **Files changed**: `style.css` (full rewrite), `index.html` (font link update), `manifest.json` (theme_color update if needed), `icons/*` (regenerated), `app.js` (replace emoji in panel summaries with inline SVG chevrons)
