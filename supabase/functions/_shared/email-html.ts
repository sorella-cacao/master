// The branded look of the automatic emails: the Sorella Cacao header on cacao brown, cream writing in
// a serif, a gold line and the website and Instagram at the bottom. The words are the plain text
// written in Pod › Replies; blank lines start new paragraphs.
//
// Used by the Edge Functions to send and by the Pod to preview, so it imports nothing.

const SITE = "https://sorella-cacao.vercel.app";
const COLOURS = { page: "#1c1003", card: "#2a1805", border: "#5a3612", text: "#f6eee2", soft: "#d8c6a8", gold: "#d9ad68" };

const escape = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** The email as HTML, from its subject and plain-text message. */
export function emailHtml(subject: string, text: string) {
  const { page, card, border, text: ink, soft, gold } = COLOURS;
  const paragraphs = text
    .trim()
    .split(/\n\s*\n/)
    .map((p) => `<p style="margin:0 0 18px 0;">${escape(p.trim()).replace(/\n/g, "<br>")}</p>`)
    .join("");
  const serif = "Georgia, 'Times New Roman', serif";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark">
<title>${escape(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:${page};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${page};">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;">
<tr><td align="center" style="padding:0 0 8px 0;">
<a href="${SITE}"><img src="${SITE}/images/email-header.png" width="600" alt="Sorella Cacao" style="display:block;width:100%;max-width:600px;height:auto;border:0;"></a>
</td></tr>
<tr><td style="background-color:${card};border:1px solid ${border};border-radius:16px;padding:32px 32px 14px 32px;font-family:${serif};font-size:17px;line-height:1.6;color:${ink};">
${paragraphs}
</td></tr>
<tr><td align="center" style="padding:24px 16px 8px 16px;">
<table role="presentation" width="80" cellpadding="0" cellspacing="0" border="0"><tr><td style="border-top:1px solid ${gold};font-size:0;line-height:0;">&nbsp;</td></tr></table>
<p style="margin:16px 0 6px 0;font-family:${serif};font-style:italic;font-size:15px;color:${soft};">Handmade in the Blue Mountains</p>
<p style="margin:0;font-family:${serif};font-size:14px;color:${gold};">
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
