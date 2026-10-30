"use client";

import { useEffect } from "react";

/** Scrolls an element into view once the page has loaded, e.g. an order that was just saved. */
export function ScrollTo({ id }: { id: string }) {
  useEffect(() => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [id]);
  return null;
}
