"use client";

import { Fragment, useState, useSyncExternalStore } from "react";
import { type Stamp, stampLabel, stampText } from "./stamp";

type LabelChoice = { id: string; size: "small" | "large"; name: string; frontFile: string; backFile: string; stamps: Stamp[]; section: string | null };

/** "28/10/2027" from "2027-10-28", as the labels print it. */
const labelDate = (date: string) => `${date.slice(8, 10)}/${date.slice(5, 7)}/${date.slice(0, 4)}`;

// Chrome and Edge can save straight into a folder on the computer; other browsers download the files.
type FolderHandle = {
  name: string;
  getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<FolderHandle>;
  getFileHandle(name: string, options?: { create?: boolean }): Promise<{
    getFile(): Promise<File>;
    createWritable(): Promise<{ write(data: Blob): Promise<void>; close(): Promise<void> }>;
  }>;
  queryPermission?(options: { mode: "readwrite" }): Promise<PermissionState>;
  requestPermission?(options: { mode: "readwrite" }): Promise<PermissionState>;
};
type FolderPicker = (options?: { id?: string; mode?: "readwrite" }) => Promise<FolderHandle>;
const folderPicker = () => (globalThis as { showDirectoryPicker?: FolderPicker }).showDirectoryPicker;

// The chosen Labels folder is remembered in this browser, so it's only picked once.
const DB = "pod-labels";
function remembered(handle?: FolderHandle): Promise<FolderHandle | undefined> {
  return new Promise((resolve) => {
    try {
      const open = indexedDB.open(DB, 1);
      open.onupgradeneeded = () => open.result.createObjectStore("folders");
      open.onerror = () => resolve(undefined);
      open.onsuccess = () => {
        const store = open.result.transaction("folders", "readwrite").objectStore("folders");
        const request = handle ? store.put(handle, "labels") : store.get("labels");
        request.onsuccess = () => resolve(handle ?? (request.result as FolderHandle | undefined));
        request.onerror = () => resolve(undefined);
      };
    } catch {
      resolve(undefined);
    }
  });
}

/** "03NOV2026", like the folders in Labels › Print Runs. */
/** The Canva folder inside the Labels folder, whether Labels or Sorella was picked. */
async function canvaIn(folder: FolderHandle) {
  const labels = await folder.getDirectoryHandle("Labels").catch(() => folder);
  return labels.getDirectoryHandle("Canva").catch(() => undefined);
}

const wrongFolder = (folder: FolderHandle) =>
  folder.name === "Canva"
    ? "That’s the Canva folder itself. Go back one and choose the Labels folder it’s in (Sorella › Labels)."
    : `There’s no Canva folder in ${folder.name}. Choose the Labels folder in Sorella (Sorella › Labels).`;

/** What the back's batch number will say, e.g. "Batch # 18112684", or which side is missing. */
function batchShown(label: LabelChoice, digits: string) {
  if (!label.backFile) return "Front only";
  const batch = label.stamps.find((s) => s.kind === "batch");
  const shown = batch && /^\d{4}$/.test(digits) ? stampText(batch, "", digits).trim() : "";
  return label.frontFile ? shown : `${shown}${shown ? " · " : ""}Back only`;
}

const runFolderName = (today: string) =>
  `${today.slice(8, 10)}${["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"][Number(today.slice(5, 7)) - 1]}${today.slice(0, 4)}`;

export function LabelMaker({
  labels,
  today,
  defaultBestBefore,
  fromMade = null,
}: {
  labels: LabelChoice[];
  today: string;
  defaultBestBefore: string;
  /** Filled in from what's made in a week on Orders: copies by label id, and anything made without a label. */
  fromMade?: { copies: Record<string, string>; missing: string[]; weekOf: string } | null;
}) {
  const [bestBefore, setBestBefore] = useState(defaultBestBefore);
  const [digits, setDigits] = useState(`${today.slice(8, 10)}${today.slice(5, 7)}`);
  // How many of each label to print, as typed.
  const [copies, setCopies] = useState<Record<string, string>>(fromMade?.copies ?? {});
  const [status, setStatus] = useState("");
  // "Ingredients only" prints just the backs, "Logo only" just the fronts; otherwise both, in pairs.
  const [only, setOnly] = useState<Record<LabelChoice["size"], "back" | "front" | null>>({ large: null, small: null });
  const [busy, setBusy] = useState(false);
  // Known only in the browser (false while rendering on the server).
  const canSaveToFolder = useSyncExternalStore(
    () => () => {},
    () => !!folderPicker(),
    () => false,
  );

  /** Asks for the Labels folder (or Sorella, which holds it), and remembers it if it's the right one. */
  async function pickFolder() {
    const folder = await folderPicker()!({ id: "sorella-labels", mode: "readwrite" });
    if (await canvaIn(folder)) await remembered(folder);
    return folder;
  }

  async function chooseFolder() {
    try {
      const folder = await pickFolder();
      setStatus((await canvaIn(folder)) ? `Labels will be saved in ${folder.name}.` : wrongFolder(folder));
    } catch (error) {
      // Closing the folder picker without choosing isn't an error worth showing.
      if (!(error instanceof DOMException)) console.error(error);
    }
  }

  /** Makes one size's labels and sends them to the printer. */
  async function print(size: LabelChoice["size"]) {
    if (!/^\d{4}$/.test(digits)) return setStatus("Enter the first 4 digits of the batch number, e.g. 2610.");
    if (!bestBefore) return setStatus("Enter the best before date.");
    const count = (l: LabelChoice) => Number(copies[l.id] || 0);
    const side = only[size];
    const wanted = labels.filter((l) => l.size === size && count(l) > 0);
    if (!wanted.length) return setStatus(`Enter how many of each ${size} label you’d like.`);
    // Which sides to print: a label without that side is left out.
    const front = (l: LabelChoice) => (side === "back" ? "" : l.frontFile);
    const back = (l: LabelChoice) => (side === "front" ? "" : l.backFile);
    const picked = wanted.filter((l) => front(l) || back(l));
    const skipped = wanted.filter((l) => !front(l) && !back(l)).map((l) => l.name);
    if (!picked.length) return setStatus(`None of those have ${side === "back" ? "an ingredients side" : "a logo side"} to print.`);
    if (bestBefore <= today && !window.confirm("That best before date isn’t in the future. Make the labels anyway?")) return;

    setBusy(true);
    try {
      // The Canva labels are read from Sorella › Labels › Canva, so this needs a browser that can open folders.
      if (!folderPicker()) {
        return setStatus("This browser can’t open your Labels folder. Please use Chrome to make labels.");
      }
      let folder = await remembered();
      if (folder && (await folder.requestPermission?.({ mode: "readwrite" })) !== "granted") folder = undefined;
      // A folder remembered from before that turns out to be the wrong one is asked for again.
      if (folder && !(await canvaIn(folder))) folder = undefined;
      if (!folder) {
        setStatus("Choose your Labels folder (Sorella › Labels).");
        folder = await pickFolder();
      }
      // If the Sorella folder itself was picked, use the Labels folder inside it.
      const labelsFolder = await folder.getDirectoryHandle("Labels").catch(() => folder!);
      const canva = await labelsFolder.getDirectoryHandle("Canva").catch(() => undefined);
      if (!canva) return setStatus(wrongFolder(folder));
      const read = async (name: string) => (await (await canva.getFileHandle(name)).getFile()).arrayBuffer();

      const font = await (await fetch("/fonts/open-sans-400.ttf")).arrayBuffer();
      const date = labelDate(bestBefore);
      const files: { name: string; pdf: Blob }[] = [];
      for (const label of picked) {
        setStatus(`Making ${label.size} ${label.name}…`);
        if (front(label)) files.push({ name: label.frontFile, pdf: new Blob([await read(label.frontFile)], { type: "application/pdf" }) });
        if (back(label)) {
          const stamped = await stampLabel(await read(label.backFile), label.stamps, date, digits, font);
          files.push({ name: label.backFile, pdf: new Blob([stamped as BlobPart], { type: "application/pdf" }) });
        }
      }

      const run = await (await labelsFolder.getDirectoryHandle("Print Runs", { create: true })).getDirectoryHandle(runFolderName(today), {
        create: true,
      });
      const save = async (name: string, data: Blob) => {
        const writable = await (await run.getFileHandle(name, { create: true })).createWritable();
        await writable.write(data);
        await writable.close();
      };
      for (const { name, pdf } of files) await save(name, pdf);
      // The print list goes in last, once its PDFs are there: the print helper on the Mac prints each
      // label's front and back in pairs, then marks the list as printed.
      const list = picked.map((l) => ({ file: back(l), front: front(l), copies: count(l), size: l.size }));
      const time = new Date().toTimeString().slice(0, 8).replaceAll(":", "");
      await save(`print-${time}.json`, new Blob([JSON.stringify({ labels: list }, null, 2)], { type: "application/json" }));
      const total = list.reduce((n, l) => n + l.copies, 0);
      setStatus(
        `Saved in ${labelsFolder.name} › Print Runs › ${runFolderName(today)}. Sending ${total} label${total === 1 ? "" : "s"} to the printer` +
          `${
            side === "back"
              ? ", ingredients only"
              : side === "front"
                ? ", logos only"
                : list.some((l) => !l.file || !l.front)
                  ? " (some only have a front or a back, so they print alone)"
                  : ", each front with its back"
          }.${skipped.length ? ` Left out (no ${side === "back" ? "ingredients" : "logo"} side): ${skipped.join(", ")}.` : ""}`,
      );
    } catch (error) {
      // Closing the folder picker without choosing isn't an error worth showing.
      setStatus(error instanceof DOMException && error.name === "AbortError" ? "" : "Couldn’t make the labels. Please try again.");
      if (!(error instanceof DOMException)) console.error(error);
    } finally {
      setBusy(false);
    }
  }

  const sizes = [
    { size: "large", title: "Large" },
    { size: "small", title: "Small" },
  ] as const;

  return (
    <div className="space-y-6">
      {fromMade && (
        <div className="space-y-1 rounded-xl border border-[#efb94f] bg-white/5 px-4 py-3 font-sans text-base">
          <p>
            {Object.keys(fromMade.copies).length
              ? `Filled in with everything marked as made in the week of ${fromMade.weekOf}. Take out any you’ve already printed, then check the date and batch number.`
              : `Nothing with a label is marked as made in the week of ${fromMade.weekOf} yet.`}
          </p>
          {fromMade.missing.length > 0 && (
            <p>
              <strong>No label for:</strong> {fromMade.missing.join(", ")}
            </p>
          )}
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="eyebrow mb-1 block text-xs text-cream/70">Best before</span>
          <input type="date" value={bestBefore} onChange={(e) => setBestBefore(e.target.value)} className="pod-input py-2 text-sm" />
        </label>
        <label className="block">
          <span className="eyebrow mb-1 block text-xs text-cream/70">Batch # first 4 digits</span>
          <input
            inputMode="numeric"
            maxLength={4}
            value={digits}
            onChange={(e) => setDigits(e.target.value.replace(/\D/g, ""))}
            placeholder="e.g. 2610"
            className="pod-input py-2 text-sm"
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {sizes.map(({ size, title }) => {
          const ofSize = labels.filter((l) => l.size === size);
          if (!ofSize.length) return null;
          return (
            <div key={size} className="space-y-3">
            <fieldset className="overflow-hidden rounded-xl border border-white/15">
              <legend className="sr-only">{title} labels</legend>
              <p className="eyebrow border-b border-white/15 bg-white/5 px-3 py-1.5 text-cream/80">{title}</p>
              {ofSize.map((label, i) => (
                <Fragment key={label.id}>
                {label.section && label.section !== ofSize[i - 1]?.section && (
                  <p className="eyebrow border-t border-white/30 bg-white/5 px-3 py-1.5 text-xs text-gold">{label.section}</p>
                )}
                <label className={`flex items-center gap-3 px-3 py-2 font-sans text-sm ${i % 2 ? "" : "bg-white/[0.03]"}`}>
                  <input
                    inputMode="numeric"
                    value={copies[label.id] ?? ""}
                    onChange={(e) => setCopies((c) => ({ ...c, [label.id]: e.target.value.replace(/\D/g, "").slice(0, 3) }))}
                    placeholder="0"
                    aria-label={`How many ${title.toLowerCase()} ${label.name} labels`}
                    className="pod-input w-14 px-2 py-1 text-right text-sm"
                  />
                  <span className="flex-1">{label.name}</span>
                  <span className="tabular-nums text-cream/60">{batchShown(label, digits)}</span>
                </label>
                </Fragment>
              ))}
            </fieldset>
            <div className="flex flex-wrap gap-x-5 gap-y-1 font-sans text-sm">
              {(
                [
                  { side: "back", label: "Ingredients only" },
                  { side: "front", label: "Logo only" },
                ] as const
              ).map((o) => (
                <label key={o.side} className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={only[size] === o.side}
                    // Ticking one unticks the other; with neither, fronts and backs print together.
                    onChange={(e) => setOnly((all) => ({ ...all, [size]: e.target.checked ? o.side : null }))}
                    className="size-4 accent-[#8a5226]"
                  />
                  {o.label}
                </label>
              ))}
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() => print(size)}
              aria-label={`Print ${size} labels`}
              className="eyebrow w-full rounded-full bg-caramel px-5 py-2.5 text-cacao-950 transition-colors hover:bg-gold disabled:opacity-60 sm:w-auto"
            >
              Print labels
            </button>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {canSaveToFolder && (
          <button
            type="button"
            disabled={busy}
            onClick={chooseFolder}
            className="eyebrow rounded-full border border-white/20 px-4 py-2 text-cream/70 transition-colors hover:border-gold hover:text-gold disabled:opacity-60"
          >
            Choose a different folder
          </button>
        )}
        <p role="status" className="font-sans text-sm text-cream/70">
          {status}
        </p>
      </div>
    </div>
  );
}
