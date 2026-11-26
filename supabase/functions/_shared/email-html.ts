// The look of the automatic emails ("gothic ledger"): the Sorella Cacao wordmark with the logo between
// gold lines, cream writing on cacao brown, orders as a receipt in a double gold frame, and a gold
// footer. The words are the plain text written in Pod › Replies; blank lines start new paragraphs,
// and {items} or {workshops} become the receipt.
//
// Used by the Edge Functions to send and by the Pod to preview, so it imports nothing.

const SITE = "https://sorellacacao.com.au";
const C = { page: "#1c1003", row: "#2a1805", text: "#f6eee2", soft: "#d8c6a8", gold: "#d9ad68" };
const SERIF = "'Cormorant Garamond', Georgia, 'Times New Roman', serif";
const DECORATIVE = "'Cinzel Decorative', Georgia, serif";

/** An order (or booking) as a receipt: what was bought, then labels and postage, then the total. */
export type Receipt = {
  heading: string;
  lines: { name: string; quantity?: number; amount: number; note?: string }[];
  extras: { name: string; amount: number }[];
  total: number;
};

const money = (n: number) => `$${Number(n).toFixed(2)}`;
const escape = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Web addresses in (already escaped) text become links, e.g. a parcel's tracking page. */
const linkify = (html: string) =>
  html.replace(/https?:\/\/[^\s<]+[^\s<.,;:!?)]/g, (url) => `<a href="${url}" style="color:${C.gold};">${url}</a>`);

/** The receipt in the plain-text version of an email. */
export function receiptText(r: Receipt) {
  const rows = r.lines.map(
    (l) => `${l.name}${l.quantity ? ` ×${l.quantity}` : ""} — ${money(l.amount)}${l.note ? `\n   “${l.note}”` : ""}`,
  );
  const extras = r.extras.map((e) => `${e.name} — ${e.amount ? money(e.amount) : "Free"}`);
  return [...rows, ...extras, `Total paid: ${money(r.total)}`].join("\n");
}

function receiptHtml(r: Receipt) {
  const { row, soft, gold } = C;
  let shade = true;
  const cells = (name: string, amount: string, bg: string) =>
    `<td style="padding:5px 8px;${bg}">${name}</td><td align="right" style="padding:5px 8px;white-space:nowrap;${bg}">${amount}</td>`;
  const rows: string[] = [];
  for (const l of r.lines) {
    const bg = shade ? `background-color:${row};` : "";
    const qty = l.quantity ? ` <span style="color:${soft};">×${l.quantity}</span>` : "";
    rows.push(`<tr>${cells(`${escape(l.name)}${qty}`, money(l.amount), bg)}</tr>`);
    if (l.note) {
      rows.push(`<tr><td colspan="2" style="padding:0 8px 4px 8px;font-style:italic;color:${soft};font-size:15px;${bg}">“${escape(l.note)}”</td></tr>`);
    }
    shade = !shade;
  }
  for (const e of r.extras) {
    rows.push(`<tr>${cells(escape(e.name), e.amount ? money(e.amount) : "Free", shade ? `background-color:${row};` : "")}</tr>`);
    shade = !shade;
  }
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 22px 0;border:3px double ${gold};border-radius:6px;">
<tr><td style="padding:12px;">
<p style="margin:0 0 10px 0;text-align:center;font-family:${DECORATIVE};color:${gold};font-size:16px;">~ ${escape(r.heading)} ~</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-family:${SERIF};font-size:16px;color:${C.text};">
${rows.join("\n")}
<tr><td style="padding:9px 8px 2px 8px;border-top:1px solid ${gold};color:${gold};font-weight:bold;font-size:18px;">Total paid</td><td align="right" style="padding:9px 8px 2px 8px;border-top:1px solid ${gold};color:${gold};font-weight:bold;font-size:18px;">${money(r.total)}</td></tr>
</table>
</td></tr>
</table>`;
}

// Where a receipt goes in the designed version: a marker no one would type.
const slot = (key: string) => `\u0000${key}\u0000`;
const SLOT = /\u0000(\w+)\u0000/;

/** The email as HTML. `text` may hold receipt markers (from renderEmail) where receipts go. */
export function emailHtml(subject: string, text: string, receipts: Record<string, Receipt> = {}) {
  const { page, text: ink, soft, gold } = C;
  const paragraphs = (chunk: string) =>
    chunk
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => `<p style="margin:0 0 18px 0;">${linkify(escape(p)).replace(/\n/g, "<br>")}</p>`)
      .join("\n");
  const body = text
    .replace(/\r\n/g, "\n")
    .split(SLOT)
    .map((part, i) => (i % 2 ? (receipts[part] ? receiptHtml(receipts[part]) : "") : paragraphs(part)))
    .join("\n");
  const rule = `<td width="60" style="border-top:1px solid ${gold};font-size:0;line-height:0;">&nbsp;</td>`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark">
<link href="https://fonts.googleapis.com/css2?family=Cinzel+Decorative&family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&display=swap" rel="stylesheet">
<title>${escape(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:${page};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${page};">
<tr><td align="center" style="padding:24px 14px;">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:560px;">
<tr><td align="center" style="padding:0 0 18px 0;">
<a href="${SITE}"><img src="${SITE}/images/email-header.png" width="560" alt="Sorella Cacao" style="display:block;width:100%;max-width:560px;height:auto;border:0;"></a>
</td></tr>
<tr><td style="padding:0 6px;font-family:${SERIF};font-size:18px;line-height:1.55;color:${ink};">
${body}
</td></tr>
<tr><td align="center" style="padding:16px 0 8px 0;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
${rule}
<td style="padding:0 12px;font-family:${SERIF};font-style:italic;font-size:16px;color:${soft};white-space:nowrap;">Handmade in the Blue Mountains</td>
${rule}
</tr></table>
<p style="margin:6px 0 0 0;font-family:${SERIF};font-size:16px;color:${gold};">
<a href="${SITE}" style="color:${gold};text-decoration:none;">Visit our website</a>
&nbsp;·&nbsp;
<a href="https://instagram.com/sorella_cacao" style="color:${gold};text-decoration:none;">@sorella_cacao</a>
</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

/**
 * Fills in an email's subject and message: placeholders like {first_name} from `values`, and
 * {items} / {workshops} as receipts (a designed one in the HTML, a text one in the plain version).
 * Unknown placeholders are left as they are.
 */
export function renderEmail(subject: string, body: string, values: Record<string, string>, receipts: Record<string, Receipt> = {}) {
  const fill = (text: string, designed: boolean) =>
    text.replace(/\{(\w+)\}/g, (whole, key) =>
      key in receipts ? (designed ? slot(key) : receiptText(receipts[key])) : key in values ? values[key] : whole,
    );
  const filledSubject = fill(subject, false).replace(/\s+/g, " ").trim();
  const plain = body.replace(/\r\n/g, "\n");
  return { subject: filledSubject, text: fill(plain, false), html: emailHtml(filledSubject, fill(plain, true), receipts) };
}
