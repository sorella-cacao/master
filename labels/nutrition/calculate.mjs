#!/usr/bin/env node
// Nutrition information panel from a recipe, per Australian (FSANZ) rules.
//
//   node nutrition/calculate.mjs --weight 108 cacao-mass=75 rapadura-sugar=25
//   node nutrition/calculate.mjs --weight 50 --serving 20 cacao-mass=60 ...
//
// Percentages are by weight of the finished bar and must add to 100.
// Ingredient data (per 100 g) lives in ingredients.json.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const ingredients = JSON.parse(fs.readFileSync(path.join(ROOT, "ingredients.json"), "utf8"));
const config = JSON.parse(fs.readFileSync(path.join(ROOT, "..", "labels.json"), "utf8"));

export const ROWS = [
  { key: "energyKj", label: "Energy", unit: "kJ", decimals: 0 },
  { key: "protein", label: "Protein", unit: "g", decimals: 1 },
  { key: "fat", label: "Fat, total", unit: "g", decimals: 1 },
  { key: "saturatedFat", label: " - saturated", unit: "g", decimals: 1 },
  { key: "carbohydrate", label: "Carbohydrate", unit: "g", decimals: 1 },
  { key: "sugars", label: " - sugars", unit: "g", decimals: 1 },
  { key: "sodiumMg", label: "Sodium", unit: "mg", decimals: 0 },
];

/** Per-100 g and per-serving values for a recipe of { ingredientKey: percent }. */
export function calculate(recipe, { weight, serving = config.servingSizeG ?? 20 }) {
  const total = Object.values(recipe).reduce((a, b) => a + b, 0);
  if (Math.abs(total - 100) > 0.01) throw new Error(`Percentages add to ${total}, not 100`);

  const per100 = Object.fromEntries(ROWS.map((r) => [r.key, 0]));
  for (const [key, percent] of Object.entries(recipe)) {
    const ing = ingredients[key];
    if (!ing) throw new Error(`Unknown ingredient "${key}". Known: ${Object.keys(ingredients).filter((k) => k[0] !== "_").join(", ")}`);
    for (const r of ROWS) per100[r.key] += (ing[r.key] * percent) / 100;
  }
  const perServing = Object.fromEntries(ROWS.map((r) => [r.key, (per100[r.key] * serving) / 100]));
  return { weight, serving, servingsPerPackage: weight / serving, per100, perServing };
}

/** Rounded display value. Values under 1 g show one decimal; tiny amounts follow FSANZ "less than" style. */
export function display(value, row) {
  if (row.unit === "g" && value > 0 && value < 0.1) return "LESS THAN 0.1 g";
  if (row.unit === "mg" && value > 0 && value < 5) return `${Math.round(value)} mg`;
  return `${value.toFixed(row.decimals)} ${row.unit}`;
}

function main() {
  const argv = process.argv.slice(2);
  const opts = {};
  const recipe = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--weight") opts.weight = Number(argv[++i]);
    else if (argv[i] === "--serving") opts.serving = Number(argv[++i]);
    else {
      const [k, v] = argv[i].split("=");
      recipe[k] = Number(v);
    }
  }
  if (!opts.weight || !Object.keys(recipe).length) {
    console.error("Usage: node nutrition/calculate.mjs --weight <g> [--serving <g>] ingredient=percent ...");
    process.exit(1);
  }
  const nip = calculate(recipe, opts);
  console.log("NUTRITION INFORMATION");
  console.log(`Servings Per Package: ${+nip.servingsPerPackage.toFixed(1)}`);
  console.log(`Serving Size: ${nip.serving}g\n`);
  console.log("".padEnd(16) + "Per Serving".padEnd(18) + "Per 100 g");
  for (const r of ROWS) {
    console.log(r.label.padEnd(16) + display(nip.perServing[r.key], r).padEnd(18) + display(nip.per100[r.key], r));
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
