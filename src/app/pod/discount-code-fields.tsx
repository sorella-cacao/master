"use client";

import { useState } from "react";

// No letters or numbers that look alike (0/O, 1/I/L).
const LETTERS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const random = () => `FREEPOST-${Array.from(crypto.getRandomValues(new Uint32Array(5)), (n) => LETTERS[n % LETTERS.length]).join("")}`;

/** A new code: made up for you, or your own words. */
export function NewCodeFields() {
  const [code, setCode] = useState("");
  return (
    <div className="grid gap-4 sm:grid-cols-[1fr_9rem_11rem]">
      <label className="block">
        <span className="eyebrow mb-2 block text-cream/70">Code</span>
        <span className="flex gap-2">
          <input
            name="code"
            required
            maxLength={30}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s+/g, "-"))}
            placeholder="e.g. FREEPOST-XMAS"
            className="pod-input min-w-0"
          />
          <button
            type="button"
            onClick={() => setCode(random())}
            className="eyebrow shrink-0 rounded-full border border-white/20 px-4 py-2 text-xs text-cream/70 hover:border-gold hover:text-gold"
          >
            Make one up
          </button>
        </span>
      </label>
      <label className="block">
        <span className="eyebrow mb-2 block text-cream/70">Times it can be used</span>
        <input type="number" name="max_uses" min="1" step="1" inputMode="numeric" defaultValue="1" placeholder="Any" className="pod-input" />
      </label>
      <label className="block">
        <span className="eyebrow mb-2 block text-cream/70">Last day</span>
        <input type="date" name="expires_on" className="pod-input" />
      </label>
    </div>
  );
}
