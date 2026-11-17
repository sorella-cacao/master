"use client";

import { useEffect, useRef, useState } from "react";
import { PLACEHOLDERS, fill } from "./placeholders";

/** The email as a customer would get it, with sample details, redrawn as its form is edited. */
export function ReplyPreview({ templateKey, subject, body }: { templateKey: string; subject: string; body: string }) {
  const [text, setText] = useState({ subject, body });
  const ref = useRef<HTMLDivElement>(null);
  const values = PLACEHOLDERS[templateKey] ?? {};

  useEffect(() => {
    const form = ref.current?.closest("form");
    if (!form) return;
    const update = () => {
      const data = new FormData(form);
      setText({ subject: String(data.get("subject") ?? ""), body: String(data.get("body") ?? "") });
    };
    form.addEventListener("input", update);
    return () => form.removeEventListener("input", update);
  }, []);

  return (
    <div ref={ref} className="space-y-2">
      <p className="eyebrow text-xs text-cream/70">Preview, with sample details</p>
      <div className="rounded-xl bg-[#fbf6ee] p-4 font-sans text-sm text-[#2b1a10]">
        <p className="border-b border-[#2b1a10]/15 pb-2 font-semibold">{fill(text.subject, values)}</p>
        <p className="mt-3 whitespace-pre-wrap leading-relaxed">{fill(text.body, values)}</p>
      </div>
      <p className="font-sans text-xs text-cream/60">
        You can use: {Object.keys(values).map((key) => `{${key}}`).join(" ")}
      </p>
    </div>
  );
}
