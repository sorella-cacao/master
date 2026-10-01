# Labels

Print-ready chocolate labels with the best-before date and batch number
filled in.

```
templates/
  large/front/<flavour>.pdf   large/back/<flavour>.pdf
  small/front/<flavour>.pdf   small/back/<flavour>.pdf
output/<made date>/<size>-<flavour>-<front|back>.png
```

- Templates are Canva PDF exports. Use the same `<flavour>` file name for
  front and back, and for large and small (e.g. `75-dark-local-figs`).
- The back label keeps its "Best Before …" and "Batch # …" text from
  Canva; the generator paints over the values and writes new ones in
  DM Sans (closest free match to Canva Sans).
- Batch number = made-on date (DDMMYY) + the flavour code already on the
  template, e.g. `300926FIG`. Best before = made-on + `shelfLifeMonths`
  (`labels.json`, default 12).
- Each label is shrunk slightly and centred so nothing sits closer than
  `safeMarginMm` (default 2.5 mm) to the edge, which allows for printer and
  cutter drift.
- PNGs render at 300 DPI at the label's exact size.

```bash
cd labels && npm install
node generate.mjs --made 2026-10-01 large/75-dark-local-figs small/goats-milk
```

Needs poppler (`pdftotext`, `pdftoppm`); on a Mac: `brew install poppler`.

## Nutrition panel

```bash
node nutrition/calculate.mjs --weight 108 cacao-mass=75 rapadura-sugar=25
```

Builds an Australian nutrition information panel (per serving and per
100 g) from the bar weight and ingredient percentages. Serving size
defaults to `servingSizeG` in `labels.json` (20 g). Ingredient figures
per 100 g are in `nutrition/ingredients.json`, each with its source
(FSANZ Nutrition Panel Calculator or USDA FoodData Central); replace them
with supplier spec sheets where available.
