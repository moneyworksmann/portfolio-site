# DESIGN.md — Mann Patel, public site

Audience: recruiters and hiring managers in finance, quant and data roles, often on a phone.
Feeling: **confident, quiet, made with care** — a studio-style portfolio, not a template.

Reference the person chose: the Nempanthh agency site (nempanth-45ab3.web.app). Borrowed
**structure only**: a near-empty white home with one large statement, a menu button that
opens a mosaic of coloured tiles, dark inner pages with faint grid lines and a narrow left
rail. Colours, mark, copy and content are our own; tiles carry real figures from the
projects instead of illustrations. UXKIN was not connected, so no other sites were compared.

## Color

| Token | Value | Role |
|---|---|---|
| `--white` | `#ffffff` | Home background |
| `--night` | `#17181b` | Inner page background (Work, case studies, Writing) |
| `--night-2` | `#202227` | Panels and demo frames on dark pages |
| `--ink` | `#1c2a44` | Text on white (navy ink, 14.2:1) |
| `--ink-soft` | `#5b6678` | Secondary text on white (5.9:1) |
| `--paper` | `#f2f0ea` | Text on dark (16.0:1 on night) |
| `--paper-soft` | `#a3a6ad` | Secondary text on dark (7.4:1) |
| `--line` | `#2c2f36` / `#e6e4de` | Grid lines and rules (dark / light) |
| `--focus` | `#7aa0ff` | Focus ring on both backgrounds |
| `--pos` / `--neg` | `#4cc38a` / `#ff7b7b` | Gains and losses in demos on dark |

**Menu tiles** (each with its own text colour for ≥4.5:1):

| Tile | Fill | Text |
|---|---|---|
| Work | `#7fd3e6` | `#10222b` |
| Now | `#f3d36b` | `#2a2208` |
| Writing | `#e9845c` | `#2a120a` |
| About | `#c4dc6a` | `#1d2508` |
| Résumé | `#1c2a44` | `#ffffff` |
| Demos | `#8a3b56` | `#ffffff` |
| LinkedIn | `#c9b5ea` | `#1f1630` |
| Contact | `#a7744f` | `#ffffff` |

No gradients, glass or gradient text. Charts in demos use the hub's validated categorical
order, always labelled.

## Typography

- **One family: Space Grotesk** (400, 500, 600) for everything; **JetBrains Mono** for figures and code.
- Scale (px/line-height): 112/0.95 (page title, 64 on phone) · 44/1.1 (home statement, 30 on phone) · 28/1.2 · 20/1.35 · 17/1.6 (body) · 14/1.45 · 12/1.4 (rail labels, vertical).
- Body 17px, measure ≤ 68ch.

## Spacing & layout

- 8-based: 8, 16, 24, 32, 48, 64, 96, 128.
- Home: statement top-left at ~12vh, menu mark bottom-left, `min-height: 100svh`.
- Inner pages: 48px left rail (page name rotated, menu button centred, "About" at the bottom),
  content from 96px; faint 1px grid lines placed off the main column, never through text.
- Content width 1120px; prose 680px; phone gutter 20px; rail becomes a top bar under 720px.

## Shape & depth

- Radius 0 for tiles and frames (squared, editorial); 10px only for buttons and chips.
- No shadows. Depth comes from the white→night page change and hairlines.

## Components

- **Menu:** `<dialog>` opened with a labelled Menu button; tiles in a CSS-grid mosaic (named areas,
  uneven sizes), two columns on phone; Escape and a visible Close; focus returns to Menu.
  Each tile shows a label and one small real figure (e.g. "Work · 10 projects").
- **Buttons:** primary (paper on night or ink on white, filled), secondary (1px outline), quiet (text + →).
  Hover inverts; focus 2px `--focus` ring offset 2px; disabled 45%.
- **Work index:** numbered rows (01, 02…) on night, title large, sector and stack small, hover reveals a data preview.
- **Case study:** huge title, sector chip, then Brief · What I built · The demo · What I learned · Next case.
- **Demo frame:** `--night-2` panel with a top label "Demo · sample data from <date>".
- **Motion:** view transition between a tile and the page it opens; none with reduced motion.

## Imagery & icons

- Visuals are real outputs: charts, tables, screenshots from the projects. No stock photos.
- Icons: Lucide outline 1.75px, only where they label something. No emoji.
- Mark: a small navy square with "MP" in Space Grotesk 600 (our own, not the reference's aperture).
- Light-only on the home page; inner pages are dark by design (no separate theme toggle).
