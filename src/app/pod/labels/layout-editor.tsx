"use client";

import { useEffect, useRef, useState } from "react";
import { FONTS, type FontKey, LAYOUT_PARTS, type Layout, type LayoutPart, type PartLayout, cleanLayout } from "./label-layout";

type Size = "large" | "small";

const STEP_MM = 0.5;
const STEP_PERCENT = 5;

/**
 * Moves, widens, resizes and changes the font of each part of a label, beside a preview of the
 * label as its form has it now. Sits inside the label's form: the layout goes in with the form as
 * hidden fields, and the preview redraws whenever anything in the form changes.
 */
export function LayoutEditor({
  initialSize,
  initialLayout,
  initialOwn,
  sizeLayouts,
}: {
  initialSize: Size;
  initialLayout: Layout;
  initialOwn: boolean;
  sizeLayouts: Record<Size, Layout>;
}) {
  const [size, setSize] = useState<Size>(initialSize);
  const [layout, setLayout] = useState<Layout>(initialLayout);
  const [own, setOwn] = useState(initialOwn);
  const [preview, setPreview] = useState("");
  const [previewError, setPreviewError] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  function update(part: LayoutPart, change: (current: PartLayout) => PartLayout) {
    setLayout((current) => cleanLayout({ ...current, [part]: change(current[part] ?? {}) }));
  }

  // Redraws the preview shortly after the last change, from everything in the form.
  function refresh() {
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const form = ref.current?.closest("form");
      if (!form) return;
      try {
        const response = await fetch("/pod/labels/preview", { method: "POST", body: new FormData(form) });
        if (!response.ok) throw new Error(await response.text());
        const url = URL.createObjectURL(await response.blob());
        setPreview((old) => {
          if (old) URL.revokeObjectURL(old);
          return url;
        });
        setPreviewError(false);
      } catch {
        setPreviewError(true);
      }
    }, 400);
  }

  // The hidden layout field has the latest layout once React has drawn it, so redraw after that.
  useEffect(refresh, [layout, own]);

  useEffect(() => {
    const form = ref.current?.closest("form");
    if (!form) return;
    const changed = (e: Event) => {
      const target = e.target as HTMLInputElement;
      if (target.name === "size") {
        const next = target.value === "small" ? "small" : "large";
        setSize(next);
        // Following the size's shared layout: show the other size's one.
        if (!own) setLayout(sizeLayouts[next]);
      }
      if (target.name !== "layout") refresh();
    };
    form.addEventListener("input", changed);
    form.addEventListener("change", changed);
    return () => {
      form.removeEventListener("input", changed);
      form.removeEventListener("change", changed);
    };
  });

  const button =
    "grid size-7 place-items-center rounded-md border border-white/20 text-cream/80 transition-colors hover:border-gold hover:text-gold";
  const mm = (n = 0) => `${n > 0 ? "+" : ""}${n}`;

  return (
    <div ref={ref} className="space-y-4">
      <input type="hidden" name="layout" value={JSON.stringify(layout)} />
      <input type="hidden" name="layout_scope" value={own ? "label" : "size"} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="space-y-2">
          <div
            className={`mx-auto overflow-hidden rounded-lg border border-white/15 bg-white ${size === "small" ? "max-w-56" : ""}`}
            style={{ aspectRatio: size === "small" ? "32 / 50" : "100 / 48" }}
          >
            {preview && <iframe src={`${preview}#toolbar=0&navpanes=0&view=Fit`} title="Label preview" className="size-full" />}
          </div>
          <p className="text-center font-sans text-xs text-cream/60">
            {previewError ? "Couldn’t draw the preview. Check the label’s details." : "Preview with a sample best before and batch number."}
          </p>
        </div>

        <div className="space-y-3">
          <label className="block">
            <span className="eyebrow mb-1 block text-xs text-cream/70">This layout is for</span>
            <select
              value={own ? "label" : "size"}
              onChange={(e) => {
                const isOwn = e.target.value === "label";
                setOwn(isOwn);
                if (!isOwn) setLayout(sizeLayouts[size]);
              }}
              className="pod-input py-2 text-sm"
            >
              <option value="size">All {size} labels</option>
              <option value="label">Just this label</option>
            </select>
          </label>

          <div className="overflow-x-auto rounded-xl border border-white/15">
            <table className="w-full font-sans text-sm">
              <caption className="eyebrow border-b border-white/15 bg-white/5 px-3 py-1.5 text-left text-cream/80">Layout</caption>
              <thead>
                <tr className="text-xs text-cream/70">
                  <th scope="col" className="px-3 py-1 text-left font-normal">Part</th>
                  <th scope="col" className="px-2 py-1 text-left font-normal">Move (mm)</th>
                  <th scope="col" className="px-2 py-1 text-left font-normal">Width</th>
                  <th scope="col" className="px-2 py-1 text-left font-normal">Text size</th>
                  <th scope="col" className="px-2 py-1 text-left font-normal">Font</th>
                </tr>
              </thead>
              <tbody>
                {LAYOUT_PARTS[size].map(({ part, name, font }, i) => {
                  const p = layout[part] ?? {};
                  const nudge = (key: "x" | "y", by: number) => update(part, (c) => ({ ...c, [key]: (c[key] ?? 0) + by }));
                  const grow = (key: "width" | "size", by: number) => update(part, (c) => ({ ...c, [key]: (c[key] ?? 100) + by }));
                  return (
                    <tr key={part} className={i % 2 ? "" : "bg-white/[0.03]"}>
                      <th scope="row" className="px-3 py-1.5 text-left font-normal">
                        {name}
                        {layout[part] && (
                          <button type="button" onClick={() => update(part, () => ({}))} className="ml-2 text-xs text-cream/50 underline hover:text-gold">
                            reset
                          </button>
                        )}
                      </th>
                      <td className="px-2 py-1.5">
                        <div className="flex items-center gap-1">
                          <button type="button" className={button} onClick={() => nudge("x", -STEP_MM)} aria-label={`Move ${name} left`}>←</button>
                          <button type="button" className={button} onClick={() => nudge("x", STEP_MM)} aria-label={`Move ${name} right`}>→</button>
                          <button type="button" className={button} onClick={() => nudge("y", -STEP_MM)} aria-label={`Move ${name} up`}>↑</button>
                          <button type="button" className={button} onClick={() => nudge("y", STEP_MM)} aria-label={`Move ${name} down`}>↓</button>
                          <span className="ml-1 whitespace-nowrap tabular-nums text-xs text-cream/60">
                            {mm(p.x)}, {mm(p.y)}
                          </span>
                        </div>
                      </td>
                      {(["width", "size"] as const).map((key) => (
                        <td key={key} className="px-2 py-1.5">
                          <div className="flex items-center gap-1">
                            <button type="button" className={button} onClick={() => grow(key, -STEP_PERCENT)} aria-label={`Smaller ${key} for ${name}`}>−</button>
                            <span className="w-10 text-center tabular-nums text-xs">{p[key] ?? 100}%</span>
                            <button type="button" className={button} onClick={() => grow(key, STEP_PERCENT)} aria-label={`Bigger ${key} for ${name}`}>+</button>
                          </div>
                        </td>
                      ))}
                      <td className="px-2 py-1.5">
                        <select
                          value={p.font ?? font}
                          onChange={(e) => update(part, (c) => ({ ...c, font: e.target.value as FontKey }))}
                          aria-label={`Font for ${name}`}
                          className="pod-input py-1 text-xs"
                        >
                          {Object.entries(FONTS).map(([key, label]) => (
                            <option key={key} value={key}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setLayout({})}
              className="eyebrow rounded-full border border-white/20 px-4 py-2 text-xs text-cream/70 transition-colors hover:border-gold hover:text-gold"
            >
              Back to the standard layout
            </button>
            <p className="font-sans text-xs text-cream/60">
              Changes show in the preview straight away and are kept when you save.
              {!own && ` Saving changes the layout of every ${size} label.`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
