# Category poster art

Hand-authored, flat-colour poster illustrations — one per canonical event
category (`shared/data/categories.json`) plus a generic `event.svg` fallback.
They replace the old "teal gradient + category label" placeholder on event
cards, event heroes and anywhere else an event has no image of its own.

**Licence: CC0 / public domain.** Every file was drawn by hand as SVG geometry
for FindLocal. No third-party artwork, no fonts, no tracing of stock images, no
embedded rasters — so the native apps (and anyone else) can copy this folder
verbatim with no attribution and no licence bookkeeping.

## Contract

Each file is:

- `1200 × 800` viewBox (3:2), `preserveAspectRatio` default — crops cleanly to a
  16:9 or 1:1 thumbnail from the centre.
- Under 12 KB, no external references (`href`/`url()` are document-internal
  only), no `<text>`, `<image>`, `<script>` or `<foreignObject>`.
- Self-contained enough to render identically in `<img src>`, in
  `background-image: url(...)`, and inline. Element ids are prefixed per file
  (`musicG`, `parksV`, …) so several can be inlined on one page without
  colliding.
- Built the same way: flat base colour → two or three layered shapes → an
  iconic silhouette → a dot-grain pattern → a subtle vignette.

`web/test/categoryArt.test.ts` enforces all of the above, and that every slug in
`categories.json` has a file here.

## Usage

```ts
import { categoryArtUrl } from '../lib/categoryArt';

const art = categoryArtUrl(event.category); // '/art/music.svg', '/art/event.svg', …
```

`categoryArtUrl` normalises labels, venue types and common aliases
(`Arts & Culture` → `art`, `outdoors` → `parks`, `kids` → `family`,
`theatre` → `theater`, `trivia` → `nightlife`, …) and always resolves to a file
that exists, falling back to `event.svg`.

`web/art-sheet.html` is a contact sheet of the whole set. It lives **outside
`public/`** on purpose, so Workers assets never serve it; open it directly from
disk (`open web/art-sheet.html`) to eyeball every tile at once.

## The set

| Slug | Category | Palette | Motif |
|------|----------|---------|-------|
| `music` | Music | deep violet `#2b0b4f` · magenta `#e0218a` / `#ff6fb5` · blush cream `#ffd9f0` · amber `#ffc94f` | mic on a stand under three spotlight beams, two floating notes |
| `comedy` | Comedy | warm yellow `#ffc42e` / `#ffdf7a` · burnt orange `#f2600c` · cocoa `#3e1b06` | laughing comedy mask on a sunburst with an orange swoosh |
| `theater` | Theater | oxblood `#2b0410` · crimson `#a8122f` / `#6b0a20` · gold `#f2b535` | proscenium: scalloped valance, draped curtains, tie-backs, stage spot |
| `dance` | Dance | indigo `#200a44` · coral `#ff4d6d` · gold `#ffc43d` · shell `#ffe8e1` | two dancing figures riding a double ribbon swirl |
| `literary` | Literary | ink blue `#14264a` / `#1f3a6b` · cream `#f3e7ce` / `#e6d6b4` · rust `#b4532b` | open book with abstract lines of type and a bookmark ribbon |
| `art` | Arts & Culture | plum `#3e1240` / `#5c1e60` · ochre `#e2a33a` · cream `#f6ebd8` · rose `#d6476a` | framed canvas with a paint splash, brush and easel legs |
| `food_drink` | Food & Drink | olive `#6e7a32` / `#8a9741` · tomato `#d6432a` · cream `#f7eedd` · wine `#8a1c3f` | fork and filled wine glass on a round plate |
| `family` | Family | lilac `#efd9ff` · mint `#9be7d2` / `#7fdcc0` · candy pink `#ff9eb8` · sky `#8ed3f5` · butter `#ffd166` | four balloons on curling strings over a pastel hill, confetti |
| `market` | Markets | mustard `#e5ae33` / `#f0c65e` · terracotta `#b9522f` / `#c4402c` · cream `#f6e8ce` | striped market awning over a stall counter and produce crates |
| `workshop` | Classes & Workshops | teal `#0e5b57` / `#14746e` · amber `#f0a31e` · bone `#f6ecd8` | sixteen-tooth gear with a wrench laid across it |
| `fitness` | Fitness & Wellness | deep teal `#07484d` / `#0b6068` · lime `#b6e52a` · coral `#ff6b5a` | dumbbell under a heart-rate pulse line and breathing rings |
| `nightlife` | Nightlife | purple `#2e0b57` · neon teal `#14e0d0` · magenta `#ff4fd8` · ice `#d8fffb` | faceted disco ball throwing six light beams onto a lit floor |
| `community` | Community | leaf green `#2e7d4f` / `#256a42` · sky `#7fc8f0` · cream `#f6e8ce` · red `#e8455f` | three houses on a hill, two cupped hands holding a heart |
| `festival` | Festivals | coral `#ff6b4a` · sunset red `#e0452f` · plum `#5b1a4a` · gold `#ffd166` | bunting over two striped tents, sun disc, crowd silhouettes |
| `parks` | Parks & Outdoors | sky `#8fd4e8` · forest `#14452f` / `#1d5c3b` · green `#2a7a4b` · sun `#f5c542` | snow-capped peaks, sun, layered ground, three pines |
| `event` | *(generic fallback)* | brand teal `#0b4f4f` · `#4da399` / `#80d8ca` / `#9fe6d8` · gold `#ffd166` | perforated ticket with a star on a six-ray starburst |

## Adding or changing one

1. Copy the nearest existing file and keep the structure (defs → base → layers →
   motif → grain → vignette).
2. Rename the two pattern/gradient ids to the new slug prefix — the test asserts
   ids are file-scoped and globally unique.
3. Run `npm test` from the repo root; add the row above.
