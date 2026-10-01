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
- PNGs render at 300 DPI at the label's exact size.

```bash
cd labels && npm install
node generate.mjs --made 2026-10-01 large/75-dark-local-figs small/goats-milk
```

Needs poppler (`pdftotext`, `pdftoppm`); on a Mac: `brew install poppler`.
