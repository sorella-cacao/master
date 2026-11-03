"use client";

import { useState, useSyncExternalStore } from "react";
import { batchNumber } from "./batch-number";

type LabelChoice = { id: string; size: "small" | "large"; name: string; batchCode: string; title: string; logoFile: string };

// Chrome and Edge can save straight into a folder on the computer; other browsers download the files.
type FolderHandle = {
  name: string;
  getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<FolderHandle>;
  getFileHandle(name: string, options?: { create?: boolean }): Promise<{
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
const runFolderName = (today: string) =>
  `${today.slice(8, 10)}${["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"][Number(today.slice(5, 7)) - 1]}${today.slice(0, 4)}`;

export function LabelMaker({ labels, today, defaultBestBefore }: { labels: LabelChoice[]; today: string; defaultBestBefore: string }) {
  const [bestBefore, setBestBefore] = useState(defaultBestBefore);
  const [digits, setDigits] = useState(`${today.slice(8, 10)}${today.slice(5, 7)}`);
  // How many of each label to print, as typed.
  const [copies, setCopies] = useState<Record<string, string>>({});
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  // Known only in the browser (false while rendering on the server).
  const canSaveToFolder = useSyncExternalStore(
    () => () => {},
    () => !!folderPicker(),
    () => false,
  );

  async function pickFolder() {
    const folder = await folderPicker()!({ id: "sorella-labels", mode: "readwrite" });
    await remembered(folder);
    return folder;
  }

  async function make(chooseFolder = false) {
    if (!/^\d{4}$/.test(digits)) return setStatus("Enter the first 4 digits of the batch number, e.g. 2610.");
    if (!bestBefore) return setStatus("Enter the best before date.");
    const count = (l: LabelChoice) => Number(copies[l.id] || 0);
    const picked = labels.filter((l) => count(l) > 0);
    if (!picked.length) return setStatus("Enter how many of each label you’d like.");
    if (bestBefore <= today && !window.confirm("That best before date isn’t in the future. Make the labels anyway?")) return;

    setBusy(true);
    try {
      let folder: FolderHandle | undefined;
      if (folderPicker()) {
        folder = chooseFolder ? undefined : await remembered();
        if (folder && (await folder.requestPermission?.({ mode: "readwrite" })) !== "granted") folder = undefined;
        if (!folder) {
          setStatus("Choose your Labels folder (Sorella › Labels).");
          folder = await pickFolder();
        }
      }

      const files: { label: LabelChoice; title: string; pdf: Blob }[] = [];
      for (const label of picked) {
        setStatus(`Making ${label.title}…`);
        const response = await fetch(`/pod/labels/pdf?id=${label.id}&best_before=${bestBefore}&batch=${digits}`);
        if (!response.ok) throw new Error(await response.text());
        files.push({ label, title: label.title, pdf: await response.blob() });
      }

      if (folder) {
        const run = await (await folder.getDirectoryHandle("Print Runs", { create: true })).getDirectoryHandle(runFolderName(today), {
          create: true,
        });
        const save = async (name: string, data: Blob) => {
          const writable = await (await run.getFileHandle(name, { create: true })).createWritable();
          await writable.write(data);
          await writable.close();
        };
        for (const { title, pdf } of files) await save(`${title}.pdf`, pdf);
        // The print list goes in last, once its PDFs are there: the print helper on the Mac prints
        // each label with its logo, in pairs, then marks the list as printed.
        const list = files.map(({ label, title }) => ({ file: `${title}.pdf`, logo: label.logoFile, copies: count(label), size: label.size }));
        const time = new Date().toTimeString().slice(0, 8).replaceAll(":", "");
        await save(`print-${time}.json`, new Blob([JSON.stringify({ labels: list }, null, 2)], { type: "application/json" }));
        const total = list.reduce((n, l) => n + l.copies, 0);
        setStatus(
          `Saved in ${folder.name} › Print Runs › ${runFolderName(today)}. Sending ${total} label${total === 1 ? "" : "s"} to the printer` +
            `${list.some((l) => !l.logo) ? " (some have no logo set, so they print alone)" : ", each with its logo"}.`,
        );
      } else {
        for (const { title, pdf } of files) {
          const link = document.createElement("a");
          link.href = URL.createObjectURL(pdf);
          link.download = `${title}.pdf`;
          link.click();
          setTimeout(() => URL.revokeObjectURL(link.href), 10_000);
        }
        setStatus(
          `Downloaded ${files.length} label${files.length === 1 ? "" : "s"}. This browser can’t save into Print Runs, so they won’t print by themselves — use Chrome for that.`,
        );
      }
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
            <fieldset key={size} className="overflow-hidden rounded-xl border border-white/15">
              <legend className="sr-only">{title} labels</legend>
              <p className="eyebrow border-b border-white/15 bg-white/5 px-3 py-1.5 text-cream/80">{title}</p>
              {ofSize.map((label, i) => (
                <label key={label.id} className={`flex items-center gap-3 px-3 py-2 font-sans text-sm ${i % 2 ? "" : "bg-white/[0.03]"}`}>
                  <input
                    inputMode="numeric"
                    value={copies[label.id] ?? ""}
                    onChange={(e) => setCopies((c) => ({ ...c, [label.id]: e.target.value.replace(/\D/g, "").slice(0, 3) }))}
                    placeholder="0"
                    aria-label={`How many ${title.toLowerCase()} ${label.name} labels`}
                    className="pod-input w-14 px-2 py-1 text-right text-sm"
                  />
                  <span className="flex-1">{label.name}</span>
                  <span className="tabular-nums text-cream/60">
                    {/^\d{4}$/.test(digits) ? `Batch # ${batchNumber(digits, today, label.batchCode)}` : ""}
                  </span>
                </label>
              ))}
            </fieldset>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => make()}
          className="eyebrow rounded-full bg-caramel px-5 py-2.5 text-cacao-950 transition-colors hover:bg-gold disabled:opacity-60"
        >
          Make labels
        </button>
        {canSaveToFolder && (
          <button
            type="button"
            disabled={busy}
            onClick={() => make(true)}
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
