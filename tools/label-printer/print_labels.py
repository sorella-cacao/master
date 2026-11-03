#!/usr/bin/python3
"""Prints label runs saved by the Pod's Labels page on the TSC label printer.

The Pod saves each run's PDFs into Sorella/Labels/Print Runs/<date>/ (or Sorella/Print Runs/<date>/) and then a print list,
print-HHMMSS.json: {"labels": [{"file", "logo", "copies", "size"}]}. Each label prints in pairs
with its logo from Sorella/Logos/Current Logos (logo, ingredients, logo, ingredients...), then the
list is renamed printed-HHMMSS.json (or failed-HHMMSS.json) so it never prints twice.

Run every few seconds by launchd (com.sorellacacao.label-printer). DRY_RUN=1 logs instead of printing.
"""

import json
import os
import subprocess
from datetime import datetime
from pathlib import Path

SORELLA = Path.home() / "Desktop" / "Sorella"
# Where the Pod saves runs: Labels/Print Runs, or Print Runs right in Sorella if that folder was the one picked.
RUNS = [SORELLA / "Labels" / "Print Runs", SORELLA / "Print Runs"]
LOGOS = SORELLA / "Logos" / "Current Logos"
PRINTER = "TSC_DA210"
# The labels' own sizes, so the printer doesn't shrink them onto its 2 x 4 inch default.
PAGE_SIZES = {"large": "Custom.100x48mm", "small": "Custom.50x32mm"}
LOG = Path.home() / "Library" / "Logs" / "Sorella Labels.log"
DRY_RUN = os.environ.get("DRY_RUN") == "1"


def log(message):
    with LOG.open("a") as f:
        f.write(f"{datetime.now():%Y-%m-%d %H:%M:%S}  {message}\n")


def print_list(path):
    labels = json.loads(path.read_text())["labels"]
    for label in labels:
        copies = int(label["copies"])
        ingredients = path.parent / label["file"]
        if not ingredients.is_file():
            raise FileNotFoundError(f"{ingredients.name} isn't in {path.parent.name}")
        pair = [ingredients]
        logo = LOGOS / label["logo"] if label.get("logo") else None
        if logo and logo.is_file():
            pair = [logo, ingredients]
        else:
            log(f"No logo found for {ingredients.name} ({label.get('logo') or 'none set'}), printing it alone")
        command = ["lp", "-d", PRINTER, "-o", f"PageSize={PAGE_SIZES[label['size']]}", "-t", f"{copies} x {ingredients.stem}"]
        command += [str(p) for p in pair] * copies
        if DRY_RUN:
            log("Would run: " + " ".join(command[:8]) + f" ... ({len(pair) * copies} pages)")
        else:
            subprocess.run(command, check=True, capture_output=True, text=True)
            log(f"Printed {copies} x {ingredients.stem}" + (" with its logo" if len(pair) == 2 else ""))


def print_lists():
    """The print lists waiting in every Print Runs folder, oldest first."""
    lists = []
    for runs in RUNS:
        try:
            os.listdir(runs)
        except FileNotFoundError:
            continue
        except PermissionError:
            # macOS hasn't let this helper into the Desktop folder (Privacy & Security). Said once.
            if not LOG.exists() or "no permission" not in LOG.read_text()[-300:]:
                log("Can't open Print Runs: no permission to the Desktop folder yet")
            continue
        lists += runs.glob("*/print-*.json")
    return sorted(lists, key=lambda p: p.stat().st_mtime)


def main():
    for path in print_lists():
        done = "printed"
        try:
            print_list(path)
        except Exception as error:  # Keep going with other lists; this one is set aside with the reason logged.
            log(f"Couldn't print {path.parent.name}/{path.name}: {error}")
            done = "failed"
        if not DRY_RUN:
            path.rename(path.with_name(path.name.replace("print-", f"{done}-", 1)))


if __name__ == "__main__":
    main()
