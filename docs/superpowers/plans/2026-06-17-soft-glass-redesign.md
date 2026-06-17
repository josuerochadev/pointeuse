# Soft Glass Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the Pointeuse PWA with a "Soft Glass" design system — glassmorphism, dual theme (light-first), gradient accents, new abstract icon, micro-interactions.

**Architecture:** Full CSS rewrite switching from dark-first to light-first with `prefers-color-scheme: dark` override. Font swap Inter -> DM Sans. App.js changes limited to replacing emoji with SVG chevrons in panel summaries. New Python script generates abstract progress-arc icons.

**Tech Stack:** Vanilla CSS (no build), vanilla JS (ES modules), Python 3 + Pillow for icon generation.

**Spec:** `docs/superpowers/specs/2026-06-17-soft-glass-redesign-design.md`

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `style.css` | Full rewrite | All design tokens, component styles, animations, dual theme |
| `index.html` | Modify lines 17-18, 24 | Theme-color meta tags, Google Fonts link (Inter -> DM Sans) |
| `app.js` | Modify lines 399-427 | Replace emoji with inline SVG chevrons in 3 panel summaries |
| `manifest.json` | Modify lines 8-9 | Update background_color and theme_color |
| `generate-icons.py` | Create | Python script to generate all 4 icon variants |
| `icons/icon-192.png` | Regenerate | Dark bg + teal gradient arc |
| `icons/icon-512.png` | Regenerate | Dark bg + teal gradient arc |
| `icons/icon-maskable-512.png` | Regenerate | Teal bg + white arc |
| `icons/apple-touch-icon.png` | Regenerate | Dark bg + teal gradient arc |

---

## Task 1: CSS Design Tokens & Base Reset

**Files:**
- Modify: `style.css` (full rewrite — start fresh)

- [ ] **Step 1: Write the `:root` light tokens and dark override**

```css
/* ===== TOKENS ===== */
:root {
  /* Background */
  --bg-start: #F2F0ED;
  --bg-end: #E8E4DF;

  /* Surfaces (glass) */
  --surface: rgba(255,255,255,0.72);
  --surface-border: rgba(0,0,0,0.06);
  --surface-hover: rgba(0,0,0,0.03);

  /* Text */
  --text: #1C2530;
  --muted: #6B7786;
  --faint: #A0AAB4;

  /* Positive (teal) */
  --positive: #1A8A6E;
  --positive-end: #0FADBB;
  --positive-soft: rgba(26,138,110,0.10);

  /* Negative (amber) */
  --negative: #C46A28;
  --negative-end: #E8946A;
  --negative-soft: rgba(196,106,40,0.10);

  /* Sick (purple — kept from current) */
  --sick: #A78BFA;

  /* Shape */
  --radius-card: 22px;
  --radius-input: 12px;
  --radius-badge: 8px;
  --shadow: 0 1px 3px rgba(0,0,0,0.04), 0 8px 32px rgba(0,0,0,0.08);
  --gap-section: 16px;
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg-start: #0F1419;
    --bg-end: #161D26;

    --surface: rgba(255,255,255,0.06);
    --surface-border: rgba(255,255,255,0.08);
    --surface-hover: rgba(255,255,255,0.04);

    --text: #E8ECF0;
    --muted: #8A95A0;
    --faint: #5A6570;

    --positive: #6FD3AC;
    --positive-end: #4ABFA0;
    --positive-soft: rgba(111,211,172,0.12);

    --negative: #E6AE72;
    --negative-end: #D08A50;
    --negative-soft: rgba(230,174,114,0.12);

    --shadow: 0 1px 3px rgba(0,0,0,0.12), 0 8px 32px rgba(0,0,0,0.24);
  }
}
```

- [ ] **Step 2: Write the base reset and body styles**

```css
/* ===== RESET & BASE ===== */
*{box-sizing:border-box;margin:0;padding:0}

html,body {
  background: linear-gradient(180deg, var(--bg-start), var(--bg-end));
  background-attachment: fixed;
  color: var(--text);
  font-family: "DM Sans", system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
  min-height: 100vh;
}

body {
  padding: 22px 16px 60px;
  padding-top: calc(22px + env(safe-area-inset-top, 0px));
  display: flex;
  justify-content: center;
}

.wrap { width: 100%; max-width: 560px }
```

- [ ] **Step 3: Write the glass utility and backdrop-filter fallback**

```css
/* ===== GLASS UTILITY ===== */
.glass {
  background: var(--surface);
  border: 1px solid var(--surface-border);
  -webkit-backdrop-filter: blur(20px);
  backdrop-filter: blur(20px);
}

@supports not (backdrop-filter: blur(1px)) {
  .glass {
    background: rgba(255,255,255,0.92);
  }
  @media (prefers-color-scheme: dark) {
    .glass {
      background: rgba(30,40,52,0.95);
    }
  }
}
```

- [ ] **Step 4: Verify** — open `index.html` in a browser, confirm gradient background appears, text is readable in both light and dark system themes.

- [ ] **Step 5: Commit**

```bash
git add style.css
git commit -m "style: rewrite CSS tokens — light-first, glass, DM Sans ready"
```

---

## Task 2: Header, Balance & Warning Components

**Files:**
- Modify: `style.css` (append after tokens)

- [ ] **Step 1: Write header (top bar) styles**

```css
/* ===== HEADER ===== */
.top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--text);
  margin-bottom: var(--gap-section);
  padding: 0 4px;
}

.brand {
  display: flex;
  align-items: baseline;
  gap: 9px;
}

.brand b {
  font-family: "DM Sans", system-ui, sans-serif;
  font-weight: 600;
  font-size: 20px;
  color: var(--text);
  letter-spacing: .2px;
}

.brand span {
  font-size: 12px;
  color: var(--muted);
  letter-spacing: .06em;
  text-transform: uppercase;
  background: var(--surface);
  border: 1px solid var(--surface-border);
  -webkit-backdrop-filter: blur(16px);
  backdrop-filter: blur(16px);
  padding: 4px 10px;
  border-radius: 20px;
}

.weeknav {
  display: flex;
  align-items: center;
  gap: 4px;
}

.weeknav button {
  background: var(--surface);
  border: 1px solid var(--surface-border);
  -webkit-backdrop-filter: blur(16px);
  backdrop-filter: blur(16px);
  color: var(--text);
  width: 32px;
  height: 32px;
  border-radius: 50%;
  font-size: 15px;
  cursor: pointer;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all .2s ease-out;
}

.weeknav button:hover {
  background: var(--surface-hover);
}

.weeknav button:active {
  transform: scale(0.95);
}

.weeknav .lbl {
  font-size: 12.5px;
  color: var(--muted);
  min-width: 84px;
  text-align: center;
}

.weeknav .today {
  font-size: 11px;
  padding: 0 10px;
  width: auto;
  border-radius: 20px;
  color: var(--positive);
}
```

- [ ] **Step 2: Write balance (solde cumule) styles**

```css
/* ===== BALANCE ===== */
.balance {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--surface);
  border: 1px solid var(--surface-border);
  -webkit-backdrop-filter: blur(20px);
  backdrop-filter: blur(20px);
  border-radius: var(--radius-card);
  padding: 14px 18px;
  margin-bottom: var(--gap-section);
  cursor: pointer;
  transition: all .2s ease-out;
  position: relative;
  overflow: hidden;
}

.balance::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: linear-gradient(180deg, var(--positive), var(--positive-end));
}

.balance.neg-accent::before {
  background: linear-gradient(180deg, var(--negative), var(--negative-end));
}

.balance:hover {
  box-shadow: 0 0 0 1px var(--surface-border), 0 4px 16px rgba(0,0,0,0.06);
}

.balance:active {
  transform: scale(0.97);
}

.balance .l {
  font-size: 11.5px;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: .09em;
}

.balance .l small {
  display: block;
  text-transform: none;
  letter-spacing: 0;
  color: var(--faint);
  font-size: 11px;
  margin-top: 1px;
}

.balance b {
  font-family: "Fraunces", serif;
  font-weight: 500;
  font-size: 30px;
  font-variant-numeric: tabular-nums;
}

.balance b.pos { color: var(--positive) }
.balance b.neg { color: var(--negative) }
```

- [ ] **Step 3: Write warning banner styles**

```css
/* ===== WARNING ===== */
.warn {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--negative-soft);
  border: 1px solid rgba(196,106,40,0.20);
  border-radius: var(--radius-card);
  padding: 11px 16px;
  margin-bottom: var(--gap-section);
  cursor: pointer;
  transition: all .2s ease-out;
}

.warn:hover {
  background: rgba(196,106,40,0.14);
}

.warn:active {
  transform: scale(0.97);
}

.warn .wico {
  font-size: 16px;
  flex-shrink: 0;
}

.warn .wtxt {
  font-size: 12.5px;
  color: var(--negative);
  line-height: 1.4;
}

.warn .wtxt b {
  color: var(--negative);
  font-weight: 600;
}

.unclosed-dot {
  display: inline-block;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--negative);
  margin-left: 4px;
  vertical-align: middle;
}
```

- [ ] **Step 4: Verify** — open in browser, confirm header has glass pills, balance card has left gradient bar, warning banner uses token colors.

- [ ] **Step 5: Commit**

```bash
git add style.css
git commit -m "style: header, balance & warning with glass treatment"
```

---

## Task 3: Hero Card & Timeline

**Files:**
- Modify: `style.css` (append)

- [ ] **Step 1: Write hero card styles with gradient text**

```css
/* ===== HERO ===== */
.hero {
  background: var(--surface);
  border: 1px solid var(--surface-border);
  -webkit-backdrop-filter: blur(20px);
  backdrop-filter: blur(20px);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow);
  padding: 24px 24px 20px;
  margin-bottom: var(--gap-section);
  position: relative;
  overflow: hidden;
}

.hero .eyebrow {
  font-size: 11px;
  letter-spacing: .13em;
  text-transform: uppercase;
  color: var(--muted);
  font-weight: 600;
}

.hero .date {
  font-family: "Fraunces", serif;
  font-size: 15px;
  color: var(--muted);
  margin-top: 2px;
}

.leaverow {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  margin-top: 14px;
}

.leaverow .lab {
  font-size: 13px;
  color: var(--muted);
  margin-bottom: 6px;
}

.bigtime {
  font-family: "Fraunces", serif;
  font-weight: 500;
  font-size: 58px;
  line-height: .92;
  letter-spacing: -.01em;
  font-variant-numeric: tabular-nums;
  background: linear-gradient(135deg, var(--positive), var(--positive-end));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.bigtime.over {
  background: linear-gradient(135deg, var(--negative), var(--negative-end));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.quick {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.quick label {
  font-size: 11px;
  color: var(--faint);
  text-transform: uppercase;
  letter-spacing: .08em;
}

.quick input {
  font-family: "Fraunces", serif;
  font-size: 22px;
  color: var(--text);
  border: none;
  background: transparent;
  text-align: right;
  width: 96px;
  border-bottom: 1.5px solid var(--surface-border);
  padding: 2px 0;
  font-variant-numeric: tabular-nums;
  transition: border-color .2s ease-out;
}

.quick input:focus {
  outline: none;
  border-color: var(--positive);
}
```

- [ ] **Step 2: Write timeline bar with gradient fill and animated now marker**

```css
/* ===== TIMELINE ===== */
.timeline { margin-top: 20px }

.bar {
  height: 10px;
  border-radius: 6px;
  background: var(--surface-border);
  position: relative;
  overflow: hidden;
}

.bar .fill {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  background: linear-gradient(90deg, var(--positive), var(--positive-end));
  border-radius: 6px;
  transition: width .4s ease-out;
}

.bar .fill.over {
  background: linear-gradient(90deg, var(--negative), var(--negative-end));
}

.bar .fill.active {
  background-size: 200% 100%;
  animation: shimmer 3s ease-in-out infinite;
}

.bar .now {
  position: absolute;
  top: -3px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--text);
  transform: translateX(-50%);
  box-shadow: 0 0 0 3px var(--positive-soft);
  animation: pulse-glow 2s ease-in-out infinite;
}

.ticks {
  display: flex;
  justify-content: space-between;
  margin-top: 7px;
  font-size: 11.5px;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}

.ticks b {
  color: var(--text);
  font-weight: 500;
}
```

- [ ] **Step 3: Verify** — open in browser, confirm hero card is glass, bigtime shows gradient text, timeline bar has gradient fill.

- [ ] **Step 4: Commit**

```bash
git add style.css
git commit -m "style: hero card with gradient text & animated timeline"
```

---

## Task 4: Week Table Card

**Files:**
- Modify: `style.css` (append)

- [ ] **Step 1: Write card and table row styles**

```css
/* ===== CARD (WEEK TABLE) ===== */
.card {
  background: var(--surface);
  border: 1px solid var(--surface-border);
  -webkit-backdrop-filter: blur(20px);
  backdrop-filter: blur(20px);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow);
  overflow: hidden;
}

.card h2 {
  font-size: 11px;
  letter-spacing: .13em;
  text-transform: uppercase;
  color: var(--muted);
  font-weight: 600;
  padding: 16px 18px 8px;
}

.head, .row {
  display: grid;
  grid-template-columns: 54px 1fr 42px 54px 1fr;
  align-items: center;
  gap: 7px;
  padding: 8px 16px;
}

.head {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: .05em;
  color: var(--faint);
  padding-bottom: 4px;
  padding-top: 0;
}

.head span:nth-child(3),
.head span:nth-child(4),
.head span:nth-child(5) {
  text-align: center;
}

.row {
  border-top: 1px solid var(--surface-border);
}

.row.today {
  background: rgba(26,138,110,0.06);
}

.row .day {
  font-weight: 600;
  font-size: 13px;
  color: var(--text);
  cursor: pointer;
  -webkit-user-select: none;
  user-select: none;
}

.row .day small {
  display: block;
  font-weight: 400;
  font-size: 11px;
  color: var(--faint);
}

.row.today .day small {
  color: var(--positive);
}

.row input[type=time] {
  font-family: inherit;
  font-size: 14px;
  border: 1px solid transparent;
  border-radius: var(--radius-input);
  padding: 6px;
  width: 100%;
  background: transparent;
  color: var(--text);
  font-variant-numeric: tabular-nums;
  transition: all .2s ease-out;
}

.row input[type=time]:hover {
  border-color: var(--surface-border);
}

.row input[type=time]:focus {
  outline: none;
  border-color: var(--positive);
  box-shadow: 0 0 0 3px var(--positive-soft);
  background: var(--surface);
}

.row .pause input {
  width: 40px;
  text-align: center;
  font-size: 13px;
  border: 1px solid transparent;
  border-radius: var(--radius-input);
  padding: 6px 2px;
  font-family: inherit;
  color: var(--text);
  background: transparent;
  transition: all .2s ease-out;
}

.row .pause input:hover {
  border-color: var(--surface-border);
}

.row .pause input:focus {
  outline: none;
  border-color: var(--positive);
  background: var(--surface);
}

.row .prev {
  text-align: center;
  font-size: 14px;
  color: var(--positive);
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}

.row .prev.empty { color: var(--faint) }

.realcell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

/* Delta pill badges */
.ddelta {
  font-size: 10px;
  font-variant-numeric: tabular-nums;
  text-align: center;
  font-weight: 600;
  line-height: 1;
  padding: 3px 8px;
  border-radius: var(--radius-badge);
  display: inline-block;
  margin: 0 auto;
}

.ddelta.pos {
  color: var(--positive);
  background: var(--positive-soft);
}

.ddelta.neg {
  color: var(--negative);
  background: var(--negative-soft);
}

/* Day status badges */
.day-badge {
  font-size: 10px;
  font-weight: 500;
  letter-spacing: .04em;
  margin-top: 1px;
  line-height: 1;
}

.day-badge.leave { color: var(--positive) }
.day-badge.holiday { color: var(--negative) }
.day-badge.sick { color: var(--sick) }

.row.off input { opacity: .25; pointer-events: none }
.row.off .prev { opacity: .25 }
```

- [ ] **Step 2: Write summary row (week totals) styles**

```css
/* ===== SUMMARY ROW ===== */
.sum {
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  gap: 14px;
  padding: 16px 18px;
  border-top: 1px solid var(--surface-border);
}

.sum .lab {
  font-size: 11px;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: .07em;
  font-weight: 600;
  margin-bottom: 3px;
}

.sum .val {
  font-family: "Fraunces", serif;
  font-size: 23px;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.sum .val small {
  font-size: 12px;
  color: var(--faint);
  font-family: "DM Sans", system-ui, sans-serif;
  font-weight: 400;
  display: block;
  margin-top: 3px;
}

.sum .soldebox {
  text-align: right;
  border-left: 1px solid var(--surface-border);
  padding-left: 14px;
}

.sum .sval {
  font-family: "Fraunces", serif;
  font-size: 23px;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.sum .sval.pos { color: var(--positive) }
.sum .sval.neg { color: var(--negative) }
```

- [ ] **Step 3: Verify** — confirm card is glass, inputs are invisible at rest, today row has teal tint, delta badges are pills with soft bg.

- [ ] **Step 4: Commit**

```bash
git add style.css
git commit -m "style: week table card with glass inputs & delta pills"
```

---

## Task 5: Buttons, Panels & Remaining Components

**Files:**
- Modify: `style.css` (append)

- [ ] **Step 1: Write button styles**

```css
/* ===== BUTTONS ===== */
.actions {
  display: flex;
  gap: 10px;
  margin-top: var(--gap-section);
}

.btn {
  flex: 1;
  border: none;
  border-radius: var(--radius-input);
  padding: 13px;
  font-family: inherit;
  font-size: 13.5px;
  font-weight: 600;
  cursor: pointer;
  transition: all .2s ease-out;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
}

.btn:active {
  transform: scale(0.97);
}

.btn-primary {
  background: linear-gradient(135deg, var(--positive), var(--positive-end));
  color: #fff;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.15);
}

.btn-primary:hover {
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.15), 0 4px 12px rgba(26,138,110,0.3);
}

.btn-ghost {
  background: var(--surface);
  color: var(--text);
  border: 1px solid var(--surface-border);
  -webkit-backdrop-filter: blur(16px);
  backdrop-filter: blur(16px);
}

.btn-ghost:hover {
  background: var(--surface-hover);
}
```

- [ ] **Step 2: Write panel (details/summary) styles with chevron animation**

```css
/* ===== PANELS ===== */
details.panel {
  margin-top: 12px;
  background: var(--surface);
  border: 1px solid var(--surface-border);
  -webkit-backdrop-filter: blur(20px);
  backdrop-filter: blur(20px);
  border-radius: var(--radius-card);
  overflow: hidden;
}

details.panel summary {
  list-style: none;
  cursor: pointer;
  padding: 13px 18px;
  font-size: 13px;
  color: var(--text);
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
  transition: background .2s ease-out;
}

details.panel summary::-webkit-details-marker { display: none }

details.panel summary:hover {
  background: var(--surface-hover);
}

details.panel summary .chevron {
  width: 16px;
  height: 16px;
  color: var(--faint);
  transition: transform .2s ease-out;
  flex-shrink: 0;
}

details.panel[open] summary .chevron {
  transform: rotate(90deg);
}

details.panel[open] summary {
  border-bottom: 1px solid var(--surface-border);
}
```

- [ ] **Step 3: Write settings grid, history rows, monthly rows styles**

```css
/* ===== SETTINGS ===== */
.setgrid {
  padding: 16px 18px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.setgrid .f {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.setgrid label {
  font-size: 11px;
  color: var(--faint);
  text-transform: uppercase;
  letter-spacing: .06em;
}

.setgrid input {
  background: var(--surface-hover);
  border: 1px solid var(--surface-border);
  border-radius: var(--radius-input);
  padding: 9px 10px;
  color: var(--text);
  font-family: inherit;
  font-size: 14px;
  font-variant-numeric: tabular-nums;
  transition: border-color .2s ease-out;
}

.setgrid input:focus {
  outline: none;
  border-color: var(--positive);
  box-shadow: 0 0 0 3px var(--positive-soft);
}

.sethint {
  grid-column: 1 / -1;
  font-size: 12px;
  color: var(--muted);
  line-height: 1.5;
  margin-top: -2px;
}

.sethint b {
  color: var(--text);
  font-weight: 500;
}

/* ===== HISTORY ROWS ===== */
.hist { padding: 6px 0 }

.hrow {
  display: grid;
  grid-template-columns: 1fr auto auto;
  align-items: center;
  gap: 12px;
  padding: 11px 18px;
  cursor: pointer;
  border-top: 1px solid var(--surface-border);
  transition: background .2s ease-out;
}

.hrow:first-child { border-top: none }
.hrow:hover { background: var(--surface-hover) }
.hrow:active { transform: scale(0.97) }

.hrow .hr-date { font-size: 13px; color: var(--text) }
.hrow .hr-date small { display: block; color: var(--muted); font-size: 11px; margin-top: 1px }
.hrow .hr-tot { font-size: 13px; color: var(--muted); font-variant-numeric: tabular-nums }
.hrow .hr-d { font-family: "Fraunces", serif; font-size: 16px; font-variant-numeric: tabular-nums; min-width: 62px; text-align: right }
.hrow .hr-d.pos { color: var(--positive) }
.hrow .hr-d.neg { color: var(--negative) }

.hempty { padding: 18px; color: var(--muted); font-size: 13px; text-align: center }

/* ===== MONTHLY ROWS ===== */
.mrow {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 12px;
  padding: 11px 18px;
  border-top: 1px solid var(--surface-border);
  transition: background .12s ease-out;
}

.mrow:first-child { border-top: none }
.mrow .mr-label { font-size: 13px; color: var(--text) }
.mrow .mr-label small { display: block; color: var(--muted); font-size: 11px; margin-top: 1px }
.mrow .mr-solde { font-family: "Fraunces", serif; font-size: 16px; font-variant-numeric: tabular-nums; text-align: right }
.mrow .mr-solde.pos { color: var(--positive) }
.mrow .mr-solde.neg { color: var(--negative) }

/* ===== SYNC ===== */
.sync-section { grid-column: 1 / -1; border-top: 1px solid var(--surface-border); padding-top: 14px; margin-top: 4px }
.sync-row { display: flex; align-items: center; justify-content: space-between; gap: 10px }
.sync-badge { font-size: 12px; color: var(--positive); display: flex; align-items: center; gap: 6px }
.sync-badge::before { content: ""; width: 7px; height: 7px; border-radius: 50%; background: var(--positive) }
.sync-badge small { color: var(--muted); font-size: 11px; display: block; margin-top: 2px }
.sync-connect { display: flex; gap: 8px; width: 100% }
.sync-connect input { flex: 1 }
.sync-connect button { flex-shrink: 0 }
```

- [ ] **Step 4: Write toast, loading, accessibility, SW update styles**

```css
/* ===== TOAST ===== */
.toast {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%) translateY(20px);
  background: var(--text);
  color: var(--bg-start);
  padding: 11px 20px;
  border-radius: var(--radius-input);
  font-size: 13.5px;
  opacity: 0;
  pointer-events: none;
  transition: all .25s ease-out;
  z-index: 10;
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
}

.toast.show {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}

.loading {
  text-align: center;
  color: var(--muted);
  padding: 40px;
  font-size: 14px;
}

/* ===== ACCESSIBILITY ===== */
:focus-visible {
  outline: 2px solid var(--positive);
  outline-offset: 2px;
}

:focus:not(:focus-visible) { outline: none }

.skip-link {
  position: absolute;
  top: -100%;
  left: 16px;
  background: var(--positive);
  color: #fff;
  padding: 8px 16px;
  border-radius: 0 0 8px 8px;
  font-size: 14px;
  font-weight: 600;
  z-index: 100;
  text-decoration: none;
}

.skip-link:focus { top: 0 }

/* ===== SW UPDATE ===== */
.sw-update {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background: linear-gradient(90deg, var(--positive), var(--positive-end));
  color: #fff;
  text-align: center;
  padding: 10px 16px;
  font-size: 13.5px;
  font-weight: 500;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.sw-update button {
  background: #fff;
  color: var(--positive);
  border: none;
  border-radius: var(--radius-badge);
  padding: 6px 14px;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}
```

- [ ] **Step 5: Verify** — check all panels, buttons, settings, history, toast in both themes.

- [ ] **Step 6: Commit**

```bash
git add style.css
git commit -m "style: buttons, panels, history, settings — full glass treatment"
```

---

## Task 6: CSS Animations & Keyframes

**Files:**
- Modify: `style.css` (append at end)

- [ ] **Step 1: Write keyframe animations**

```css
/* ===== ANIMATIONS ===== */
@keyframes shimmer {
  0% { background-position: 200% 0 }
  100% { background-position: -200% 0 }
}

@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 0 3px var(--positive-soft); opacity: .6 }
  50% { box-shadow: 0 0 0 6px var(--positive-soft); opacity: 1 }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 2: Verify** — confirm shimmer on active fill bar, now marker pulses, reduced motion disables all.

- [ ] **Step 3: Commit**

```bash
git add style.css
git commit -m "style: keyframe animations — shimmer, pulse-glow, reduced-motion"
```

---

## Task 7: Update index.html — Font & Meta Tags

**Files:**
- Modify: `index.html` lines 17-18, 24

- [ ] **Step 1: Update theme-color meta tags**

Change line 17 from:
```html
<meta name="theme-color" content="#161D26" media="(prefers-color-scheme: dark)">
```
to:
```html
<meta name="theme-color" content="#0F1419" media="(prefers-color-scheme: dark)">
```

Change line 18 from:
```html
<meta name="theme-color" content="#F7F5F0" media="(prefers-color-scheme: light)">
```
to:
```html
<meta name="theme-color" content="#F2F0ED" media="(prefers-color-scheme: light)">
```

- [ ] **Step 2: Swap Inter for DM Sans in Google Fonts link**

Change line 24 from:
```html
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
```
to:
```html
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&display=swap" rel="stylesheet">
```

- [ ] **Step 3: Verify** — confirm DM Sans loads (check Network tab or inspect body font).

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "chore: swap Inter for DM Sans, update theme-color meta tags"
```

---

## Task 8: Update app.js — Emoji to SVG Chevrons

**Files:**
- Modify: `app.js` lines ~3 (add const), ~399, ~404, ~426 (replace emoji)

- [ ] **Step 1: Add chevron SVG constant**

Add after the imports at the top of `app.js` (after line 2, before the `/* ---------- state ---------- */` comment):

```javascript
const CHEVRON_SVG = '<svg class="chevron" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 4l4 4-4 4"/></svg>';
```

- [ ] **Step 2: Replace emoji in the 3 panel summaries**

In the `render()` function, find and replace:

```javascript
// Line ~399 — History panel
<summary>\uD83D\uDCC5 Historique par semaine</summary>
// Change to:
<summary>${CHEVRON_SVG} Historique par semaine</summary>

// Line ~404 — Monthly recap panel
<summary>\uD83D\uDCCA R\u00e9cap mensuel</summary>
// Change to:
<summary>${CHEVRON_SVG} R\u00e9cap mensuel</summary>

// Line ~426 — Settings panel
<summary>\u2699 R\u00e9glages</summary>
// Change to:
<summary>${CHEVRON_SVG} R\u00e9glages</summary>
```

- [ ] **Step 3: Fix hardcoded border-color in monthly CSV export button**

In the render function (~line 421), change:
```javascript
`<div style="padding:12px 18px;border-top:1px solid #232E3A">`
```
to:
```javascript
`<div style="padding:12px 18px;border-top:1px solid var(--surface-border)">`
```

- [ ] **Step 4: Add `neg-accent` class to balance card when negative**

In the render function (~line 333), the balance div opening tag — add the class conditionally:

Change:
```javascript
<div class="balance"
```
to:
```javascript
<div class="balance${bal<0?' neg-accent':''}"
```

- [ ] **Step 5: Add `active` class to timeline fill bar when today**

In the render function (~line 353), change the fill div:

From:
```javascript
<div class="fill ${over?'over':''}"
```
to:
```javascript
<div class="fill ${over?'over':''}${ti===heroIdx?' active':''}"
```

- [ ] **Step 6: Verify** — confirm chevrons appear and rotate on panel open, balance has correct accent bar color, shimmer on active timeline.

- [ ] **Step 7: Commit**

```bash
git add app.js
git commit -m "feat: SVG chevrons, balance accent class, active timeline shimmer"
```

---

## Task 9: Update manifest.json

**Files:**
- Modify: `manifest.json` lines 8-9

- [ ] **Step 1: Update colors to light-first**

Change:
```json
"background_color": "#161D26",
"theme_color": "#161D26",
```
to:
```json
"background_color": "#F2F0ED",
"theme_color": "#F2F0ED",
```

- [ ] **Step 2: Commit**

```bash
git add manifest.json
git commit -m "chore: update manifest colors to light-first theme"
```

---

## Task 10: Generate New Icons

**Files:**
- Create: `generate-icons.py`
- Regenerate: `icons/icon-192.png`, `icons/icon-512.png`, `icons/icon-maskable-512.png`, `icons/apple-touch-icon.png`

- [ ] **Step 1: Write the Python icon generation script**

```python
"""Generate Pointeuse app icons — abstract progress arc (270deg).

Usage: python3 generate-icons.py
Requires: pip install Pillow
"""

from PIL import Image, ImageDraw
import math

DARK_BG = (15, 20, 25)       # #0F1419
TEAL_START = (26, 138, 110)  # #1A8A6E
TEAL_END = (111, 211, 172)   # #6FD3AC
WHITE = (255, 255, 255)


def draw_arc(draw, size, cx, cy, radius, stroke_w, color_start, color_end):
    """Draw a 270-degree arc from 135deg (bottom-left) to 45deg (bottom-right),
    going clockwise through top. Uses segmented lines for gradient effect."""
    segments = 120
    start_angle = 135  # bottom-left
    sweep = 270
    for i in range(segments):
        t = i / segments
        t2 = (i + 1) / segments
        a1 = math.radians(start_angle + sweep * t)
        a2 = math.radians(start_angle + sweep * t2)
        x1 = cx + radius * math.cos(a1)
        y1 = cy + radius * math.sin(a1)
        x2 = cx + radius * math.cos(a2)
        y2 = cy + radius * math.sin(a2)
        # Interpolate color
        r = int(color_start[0] + (color_end[0] - color_start[0]) * t)
        g = int(color_start[1] + (color_end[1] - color_start[1]) * t)
        b = int(color_start[2] + (color_end[2] - color_start[2]) * t)
        draw.line([(x1, y1), (x2, y2)], fill=(r, g, b), width=stroke_w)

    # Round end caps
    a_start = math.radians(start_angle)
    a_end = math.radians(start_angle + sweep)
    cap_r = stroke_w // 2
    for angle, t in [(a_start, 0.0), (a_end, 1.0)]:
        px = cx + radius * math.cos(angle)
        py = cy + radius * math.sin(angle)
        r = int(color_start[0] + (color_end[0] - color_start[0]) * t)
        g = int(color_start[1] + (color_end[1] - color_start[1]) * t)
        b = int(color_start[2] + (color_end[2] - color_start[2]) * t)
        draw.ellipse(
            [px - cap_r, py - cap_r, px + cap_r, py + cap_r],
            fill=(r, g, b)
        )

    # Dot at the end (progress cursor) — slightly larger
    dot_r = int(stroke_w * 0.7)
    ex = cx + radius * math.cos(a_end)
    ey = cy + radius * math.sin(a_end)
    draw.ellipse(
        [ex - dot_r, ey - dot_r, ex + dot_r, ey + dot_r],
        fill=color_end
    )


def generate_icon(size, bg_color, arc_start, arc_end, filename, maskable=False):
    """Generate a single icon variant."""
    # Render at 4x for anti-aliasing
    scale = 4
    s = size * scale
    img = Image.new("RGB", (s, s), bg_color)
    draw = ImageDraw.Draw(img)

    if maskable:
        # Safe zone: 80% of the icon (10% padding each side)
        safe = int(s * 0.4)
    else:
        safe = int(s * 0.14)

    cx = s // 2
    cy = s // 2
    stroke_w = int(s * 0.15)
    radius = (s // 2) - safe - (stroke_w // 2)

    draw_arc(draw, s, cx, cy, radius, stroke_w, arc_start, arc_end)

    # Downsample with high-quality resampling
    img = img.resize((size, size), Image.LANCZOS)
    img.save(f"icons/{filename}", "PNG")
    print(f"  Generated icons/{filename} ({size}x{size})")


if __name__ == "__main__":
    print("Generating Pointeuse icons...")

    # Standard icons — dark bg, teal gradient arc
    generate_icon(512, DARK_BG, TEAL_START, TEAL_END, "icon-512.png")
    generate_icon(192, DARK_BG, TEAL_START, TEAL_END, "icon-192.png")
    generate_icon(180, DARK_BG, TEAL_START, TEAL_END, "apple-touch-icon.png")

    # Maskable — teal bg, white arc
    generate_icon(512, TEAL_START, WHITE, WHITE, "icon-maskable-512.png", maskable=True)

    print("Done!")
```

- [ ] **Step 2: Run the script**

```bash
pip install Pillow && python3 generate-icons.py
```

Expected output:
```
Generating Pointeuse icons...
  Generated icons/icon-512.png (512x512)
  Generated icons/icon-192.png (192x192)
  Generated icons/apple-touch-icon.png (180x180)
  Generated icons/icon-maskable-512.png (512x512)
Done!
```

- [ ] **Step 3: Visually verify** — open each generated icon, confirm arc shape, gradient, dot at end, correct backgrounds.

- [ ] **Step 4: Commit**

```bash
git add generate-icons.py icons/
git commit -m "feat: new abstract progress-arc app icons"
```

---

## Task 11: Final Visual QA

**Files:** None (verification only)

- [ ] **Step 1: Open app in browser — light mode**

Verify all of:
- Gradient background (warm gray)
- Glass cards with blur effect
- DM Sans for UI text, Fraunces for numbers
- Teal gradient on bigtime text
- Timeline shimmer animation (if today)
- Pulsing now marker (if today)
- Inputs invisible at rest, teal ring on focus
- Delta pills with colored backgrounds
- Balance card with left gradient bar
- SVG chevrons in panels, rotate on open
- Buttons: gradient primary, glass ghost
- All text readable

- [ ] **Step 2: Toggle to dark mode (system preference)**

Verify all tokens flip correctly:
- Dark gradient background
- Glass surfaces with light opacity
- Text colors invert properly
- Gradients still visible
- No hardcoded colors bleeding through

- [ ] **Step 3: Test reduced motion**

Enable reduced-motion in system preferences. Verify:
- No shimmer animation
- No pulse animation
- Transitions are instant

- [ ] **Step 4: Test on mobile viewport (375px width)**

Verify nothing overflows, glass blur works on Safari/iOS.

- [ ] **Step 5: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: visual QA adjustments"
```
