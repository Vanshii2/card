# Hero block — static + dynamic — plan & rationale

## Goal

Reproduce the promotional card from the assignment screenshot as an AEM Edge
Delivery Services block:

1. **Static** — authored directly, matching the screenshot.
2. **Dynamic** — same functionality, but content sourced from elsewhere
   instead of retyped.

## Revision: use the default `Hero` block instead of a new one

First pass built a new `program-card` block with a bespoke field set
(Category/Status/Format/Level/Duration/Description/Link as labeled rows).
Correct feedback from review: the boilerplate already ships a `Hero` block
(`blocks/hero/`) that covers exactly this shape — full-width image with a
heading over/beside it — and it was overkill to invent a parallel block
instead of using it. That block is now deleted.

**Static** = the stock `Hero` block, unmodified. `hero.css` already styles
whatever picture and heading an author puts in the block via descendant
selectors (`.hero picture`, `.hero h1`), with no JS required and no custom
fields to learn — an author just adds an image and a heading. This does mean
the eyebrow / status badge / meta-list chrome from the screenshot isn't
reproduced as distinct styled elements; Hero is a simpler pattern than that,
and fabricating custom fields to chase pixel-parity is exactly the
over-engineering being avoided here. A heading + supporting paragraph is
enough for the "static block" requirement.

**Dynamic** = the same `Hero` block, with a `dynamic` modifier
(`Hero (dynamic)` in the authoring table → `class="hero dynamic"`). The one
addition is in `hero.js` (previously empty — Hero needed no JS at all for
static content): if the block has the `dynamic` class, it reads a single
authored link, fetches `{path}.plain.html` from that page, and pulls that
page's own `.hero` block into itself — the same fetch pattern the existing
`Fragment` block already uses in this repo (`blocks/fragment/fragment.js`),
including the `./media_*` URL rebasing fix it needs. For static authoring
(the default, no `dynamic` class), `decorate()` returns immediately and does
nothing — zero behavior change from stock boilerplate Hero.

This keeps the diff small and self-contained: one file with real logic
(`hero.js`, ~25 lines), no new CSS, no new content model to document beyond
"same as Hero, plus one link."

## Content model

Static — two rows, each a single cell:

| Hero | |
|---|---|
| *(image)* | |
| # Heading text<br>Supporting paragraph. | |

Dynamic — one row, one cell, a link to the source page:

| Hero (dynamic) | |
|---|---|
| /learning/cohort-aep | |

## Files

```
blocks/hero/hero.js                    # decorate() — no-op unless `dynamic`; then fetch + inline
drafts/learning/cohort-aep.html        # canonical source page (static hero) — pretty HTML
drafts/learning/cohort-aep.plain.html  # same page's body-only markup, what the dynamic block fetches
drafts/my-learning.html                # consumer page: dynamic hero + a second static hero for comparison
images/program-card-sample.jpg         # optimized (~15KB) placeholder photo for local testing
```

`cohort-aep.plain.html` exists only because the local `aem up --html-folder`
dev server doesn't auto-derive `.plain.html` from `.html` the way the real
aem.live backend does for authored content — it's a local testing fixture.

## Testing performed

- `npm run lint` (`eslint` + `stylelint`) — clean on `hero.js`.
- `aem up --html-folder drafts --html-mount /` locally.
- Headless-Chrome render check (`--dump-dom --virtual-time-budget=8000`,
  needed because a plain `--screenshot` can race ahead of the dynamic
  block's `fetch()`) of both `/learning/cohort-aep` (static) and
  `/my-learning` (dynamic hero + a second static hero side by side):
  correct image/heading/text, no leftover raw table markup, no console
  errors, dynamic hero's content matches the source page exactly.
