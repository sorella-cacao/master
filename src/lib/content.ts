import type { ContentBlock } from "@/data/types";

/**
 * Descriptions are edited as plain text: paragraphs separated by a blank line,
 * and bullet points as lines starting with "- ".
 */
export function blocksToText(blocks: ContentBlock[]) {
  return blocks
    .map((b) => ("p" in b ? b.p : b.list.map((item) => `- ${item}`).join("\n")))
    .join("\n\n");
}

export function textToBlocks(text: string): ContentBlock[] {
  return text
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .map((chunk) => chunk.split("\n").map((line) => line.trim()).filter(Boolean))
    .filter((lines) => lines.length > 0)
    .map((lines) =>
      lines.every((line) => line.startsWith("- "))
        ? { list: lines.map((line) => line.slice(2).trim()) }
        : { p: lines.join(" ") },
    );
}
