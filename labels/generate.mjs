#!/usr/bin/env node
// Stamps the best-before date and batch number onto label templates and
// renders print-ready PNGs.
//
//   node generate.mjs [--made YYYY-MM-DD] <size>/<flavour> [...]
//   node generate.mjs --made 2026-10-01 large/75-dark-local-figs small/goats-milk
//
// Templates are Canva PDF exports in templates/<size>/<front|back>/<flavour>.pdf.
// The back label must contain "Best Before <date>" and "Batch # <batch>";
// the existing values are painted over and replaced. The flavour code is
// taken from the template's existing batch number (e.g. 300926FIG -> FIG).
// Output: output/<made date>/<size>-<flavour>-<front|back>.png
//
// Needs poppler (pdftotext, pdftoppm) on the PATH.

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fontkit from "@pdf-lib/fontkit";
import { PDFDict, PDFDocument, PDFName, rgb } from "pdf-lib";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const config = JSON.parse(fs.readFileSync(path.join(ROOT, "labels.json"), "utf8"));

// Canva Sans (the font in Canva exports) has the same vertical metrics as
// these; DM Sans is the closest free match for the stamped text.
const DEFAULT_ASCENT = 1.06885;
const DEFAULT_DESCENT = -0.29297;
const STAMP_FONT = path.join(ROOT, "fonts/DMSans-Regular.ttf");

function parseArgs(argv) {
  const args = { made: new Date(), items: [] };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--made") {
      const [y, m, d] = argv[++i].split("-").map(Number);
      args.made = new Date(y, m - 1, d);
    } else {
      args.items.push(argv[i]);
    }
  }
  if (!args.items.length) {
    console.error("Usage: node generate.mjs [--made YYYY-MM-DD] <size>/<flavour> ...");
    process.exit(1);
  }
  return args;
}

const pad = (n) => String(n).padStart(2, "0");
const isoDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const auDate = (d) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;

function addMonths(date, months) {
  const target = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(date.getDate(), lastDay));
  return target;
}

/** Word boxes (top-left origin, points) from poppler. */
function wordBoxes(pdfPath) {
  const xml = execFileSync("pdftotext", ["-bbox", pdfPath, "-"], { encoding: "utf8" });
  return [...xml.matchAll(/<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">([^<]*)<\/word>/g)].map(
    (m) => ({ x0: +m[1], y0: +m[2], x1: +m[3], y1: +m[4], text: m[5].replace(/&amp;/g, "&") }),
  );
}

/** The word that follows `label` on the same line. */
function valueAfter(words, label) {
  const i = words.findIndex((w) => w.text === label);
  const next = words[i + 1];
  if (i < 0 || !next || Math.abs(next.y0 - words[i].y0) > 1) {
    throw new Error(`Couldn't find a value after "${label}"`);
  }
  return next;
}

/** Vertical metrics of the template's main font, as a fraction of the font size. */
function fontMetrics(doc) {
  for (const [, obj] of doc.context.enumerateIndirectObjects()) {
    if (obj instanceof PDFDict && obj.get(PDFName.of("Type")) === PDFName.of("FontDescriptor")) {
      const ascent = Number(obj.get(PDFName.of("Ascent"))?.toString());
      const descent = Number(obj.get(PDFName.of("Descent"))?.toString());
      if (ascent && descent) return { ascent: ascent / 1000, descent: descent / 1000 };
    }
  }
  return { ascent: DEFAULT_ASCENT, descent: DEFAULT_DESCENT };
}

async function stampBack(templatePath, made) {
  const words = wordBoxes(templatePath);
  const dateBox = valueAfter(words, "Before");
  const batchBox = valueAfter(words, "#");
  const code = batchBox.text.replace(/^\d{6}/, "");

  const bestBefore = auDate(addMonths(made, config.shelfLifeMonths));
  const batch = `${pad(made.getDate())}${pad(made.getMonth() + 1)}${String(made.getFullYear()).slice(2)}${code}`;

  const doc = await PDFDocument.load(fs.readFileSync(templatePath));
  doc.registerFontkit(fontkit);
  const font = await doc.embedFont(fs.readFileSync(STAMP_FONT), { subset: true });
  const page = doc.getPage(0);
  const box = page.getMediaBox();
  const top = box.y + box.height;
  const { ascent, descent } = fontMetrics(doc);

  for (const [word, text] of [
    [dateBox, bestBefore],
    [batchBox, batch],
  ]) {
    const size = (word.y1 - word.y0) / (ascent - descent);
    page.drawRectangle({
      x: word.x0 - 0.4,
      y: top - word.y1 - 0.2,
      width: word.x1 - word.x0 + 0.8,
      height: word.y1 - word.y0 + 0.4,
      color: rgb(1, 1, 1),
    });
    page.drawText(text, {
      x: word.x0,
      y: top - (word.y0 + ascent * size),
      size,
      font,
      color: rgb(0, 0, 0),
    });
  }

  return { bytes: await doc.save(), bestBefore, batch };
}

function renderPng(pdfPath, outPath) {
  execFileSync("pdftoppm", ["-r", String(config.dpi), "-png", "-singlefile", pdfPath, outPath.replace(/\.png$/, "")]);
}

async function main() {
  const { made, items } = parseArgs(process.argv.slice(2));
  const outDir = path.join(ROOT, "output", isoDate(made));
  fs.mkdirSync(outDir, { recursive: true });
  const tmp = fs.mkdtempSync(path.join(outDir, ".tmp-"));

  try {
    for (const item of items) {
      const [size, flavour] = item.split("/");
      const name = `${size}-${flavour}`;
      const front = path.join(ROOT, "templates", size, "front", `${flavour}.pdf`);
      const back = path.join(ROOT, "templates", size, "back", `${flavour}.pdf`);

      if (fs.existsSync(front)) {
        renderPng(front, path.join(outDir, `${name}-front.png`));
      } else {
        console.warn(`! no front template: ${path.relative(ROOT, front)}`);
      }

      if (!fs.existsSync(back)) {
        console.warn(`! no back template: ${path.relative(ROOT, back)}`);
        continue;
      }
      const stamped = await stampBack(back, made);
      const tmpPdf = path.join(tmp, `${name}-back.pdf`);
      fs.writeFileSync(tmpPdf, stamped.bytes);
      renderPng(tmpPdf, path.join(outDir, `${name}-back.png`));
      console.log(`✓ ${name}: Best Before ${stamped.bestBefore}, Batch # ${stamped.batch}`);
    }
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  console.log(`→ ${path.relative(process.cwd(), outDir) || "."}`);
}

main();
