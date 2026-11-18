import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, degrees, popGraphicsState, pushGraphicsState, rgb } from "pdf-lib";

/**
 * Where a Canva back label says its best before date or batch number, found when the label was
 * copied from Canva: the text as it was, a box that covers it, where its first letter sits, its
 * size and which way it reads. All in PDF points from the bottom left of the label.
 */
export type Stamp = {
  kind: "date" | "batch";
  text: string;
  box: [number, number, number, number];
  x: number;
  y: number;
  size: number;
  angle: number;
};

const DATE = /\d{1,2}\/\d{1,2}\/\d{4}/;
const FIRST_FOUR = /\d{4}/;

/** The label's own wording with the new date, or the batch number's first 4 digits swapped. */
export function stampText(stamp: Stamp, bestBefore: string, digits: string) {
  return stamp.kind === "date" ? stamp.text.replace(DATE, bestBefore) : stamp.text.replace(FIRST_FOUR, digits);
}

/**
 * The Canva back label with the best before date ("28/10/2027") and the batch number's first 4
 * digits written over the old ones, in Open Sans (the nearest open font to Canva Sans).
 */
export async function stampLabel(pdf: ArrayBuffer, stamps: Stamp[], bestBefore: string, digits: string, font: ArrayBuffer) {
  const doc = await PDFDocument.load(pdf);
  doc.registerFontkit(fontkit);
  const sans = await doc.embedFont(font, { subset: true });
  const page = doc.getPage(0);
  // Canva's drawing leaves its own scaling in place at the end, so it's fenced off (saved and
  // restored) to draw the stamps in plain label coordinates.
  page.node.wrapContentStreams(
    doc.context.register(doc.context.contentStream([pushGraphicsState()])),
    doc.context.register(doc.context.contentStream([popGraphicsState()])),
  );
  for (const stamp of stamps) {
    const [x, y, width, height] = stamp.box;
    page.drawRectangle({ x, y, width, height, color: rgb(1, 1, 1) });
    const text = stampText(stamp, bestBefore, digits).trimEnd();
    // No longer than the old text (Open Sans runs a little wider than Canva Sans).
    const room = (stamp.angle ? height : width) - 1.2;
    const size = Math.min(stamp.size, (stamp.size * room) / sans.widthOfTextAtSize(text, stamp.size));
    page.drawText(text, {
      x: stamp.x,
      y: stamp.y,
      size,
      font: sans,
      color: rgb(0, 0, 0),
      rotate: degrees(stamp.angle),
    });
  }
  return doc.save();
}
