"use client";

import { useOptimistic, useState, useTransition } from "react";
import { PodForm } from "../pod-form";
import { addOrderNotes, editOrderNote, setOrderNoteDone } from "./actions";

export type OrderNote = { id: string; note: string; done: boolean; carriedFrom: string | null };

/**
 * Notes about the week's orders: each line saved in the box becomes a sentence of its own with a tick
 * box. Ones not ticked off carry on to the next week.
 */
export function OrderNotes({ week, notes }: { week: string; notes: OrderNote[] }) {
  const [shown, setDone] = useOptimistic(notes, (current, change: { id: string; done: boolean }) =>
    current.map((n) => (n.id === change.id ? { ...n, done: change.done } : n)),
  );
  const [, startTransition] = useTransition();
  const [error, setError] = useState("");

  const tick = (id: string, done: boolean) =>
    startTransition(async () => {
      setDone({ id, done });
      setError((await setOrderNoteDone(week, id, done)).error ?? "");
    });

  return (
    <section className="space-y-4" aria-label="Notes">
      {shown.length > 0 && (
        <div>
          <h3 className="eyebrow mb-2 text-cream/70">Notes</h3>
          <ul className="overflow-hidden rounded-xl border border-white/15 font-sans text-base">
            {shown.map((n) => (
              <NoteRow key={`${n.id}-${n.note}`} note={n} onTick={(done) => tick(n.id, done)} onError={setError} />
            ))}
          </ul>
        </div>
      )}
      {error && (
        <p role="alert" className="font-sans text-base font-semibold">
          {error}
        </p>
      )}
      <PodForm action={addOrderNotes} submitLabel="Save notes" resetOnSuccess>
        <input type="hidden" name="week" value={week} />
        <label className="block">
          <span className="eyebrow mb-2 block text-cream/70">Add notes</span>
          <textarea
            name="note"
            rows={3}
            placeholder="A new line for each note. Once saved they’re listed above to tick off, and carry on to the next week until they’re done."
            className="pod-input min-h-24 resize-y [field-sizing:content]"
          />
        </label>
      </PodForm>
    </section>
  );
}

/** One note: its tick box, its words, and changing them (clearing them removes the note). */
function NoteRow({ note, onTick, onError }: { note: OrderNote; onTick: (done: boolean) => void; onError: (error: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [saving, startSaving] = useTransition();

  const save = (text: string) => {
    if (text.trim() === note.note) return setEditing(false);
    startSaving(async () => {
      const { error } = await editOrderNote(note.id, text);
      onError(error ?? "");
      if (!error) setEditing(false);
    });
  };

  return (
    <li className="flex items-start gap-3 border-t border-white/10 px-3 py-2 first:border-t-0 odd:bg-cacao-950/60">
      {editing ? (
        <form
          className="flex flex-1 flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            save(String(new FormData(e.currentTarget).get("text") ?? ""));
          }}
        >
          <input name="text" defaultValue={note.note} autoFocus aria-label="Note" className="pod-input min-w-0 flex-1 px-3 py-1.5" />
          <button type="submit" disabled={saving} className="eyebrow rounded-full bg-caramel px-4 py-2 text-cacao-950 hover:bg-gold disabled:opacity-60">
            Save
          </button>
          <button type="button" disabled={saving} onClick={() => setEditing(false)} className="eyebrow px-2 text-cream/70 hover:text-gold">
            Cancel
          </button>
          <button type="button" disabled={saving} onClick={() => save("")} className="eyebrow px-2 text-cream/70 hover:text-gold">
            Remove
          </button>
        </form>
      ) : (
        <>
          <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={note.done}
              onChange={(e) => onTick(e.target.checked)}
              className="mt-1 h-5 w-5 shrink-0 accent-[#5e9a4a]"
            />
            <span className={`break-words ${note.done ? "text-cream/60 line-through" : ""}`}>
              {note.note}
              {note.carriedFrom && !note.done && <span className="ml-2 whitespace-nowrap text-sm text-cream/60">since {note.carriedFrom}</span>}
            </span>
          </label>
          <button
            type="button"
            onClick={() => setEditing(true)}
            aria-label={`Change note: ${note.note}`}
            className="eyebrow shrink-0 py-1 text-xs text-cream/60 hover:text-gold"
          >
            Change
          </button>
        </>
      )}
    </li>
  );
}
