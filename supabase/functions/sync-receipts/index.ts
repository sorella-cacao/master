// Files receipts that chocolate@sorellacacao.com.au emails to itself.
//
// Reads the Fastmail Sent folder (read-only API token in the FASTMAIL_API_TOKEN
// secret) for emails sent to the same address, saves each email and its
// attachments to the private "receipts" storage bucket under the month it was
// sent (Sydney time), and records it in public.receipts.
//
// Called weekly by pg_cron (x-cron-secret header) and by the Pod's "Check now"
// button (the signed-in admin's access token).

import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

const RECEIPTS_ADDRESS = "chocolate@sorellacacao.com.au";
const BUCKET = "receipts";
const TIME_BUDGET_MS = 100_000;
const PAGE_SIZE = 20;

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SECRET_KEY =
  JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}").default ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PUBLISHABLE_KEY =
  JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "{}").default ?? Deno.env.get("SUPABASE_ANON_KEY")!;

const admin = createClient(SUPABASE_URL, SECRET_KEY, { auth: { persistSession: false } });

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

/** The weekly cron job (shared secret) or a signed-in admin. */
async function isAllowed(req: Request) {
  const cronSecret = req.headers.get("x-cron-secret");
  if (cronSecret) {
    const { data } = await admin.rpc("receipts_cron_secret_matches", { secret: cronSecret });
    return data === true;
  }

  const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return false;
  const asUser = createClient(SUPABASE_URL, PUBLISHABLE_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });
  const { data } = await asUser.auth.getClaims(token);
  const userId = data?.claims?.sub;
  if (!userId) return false;
  // Row level security only shows the admins list to admins.
  const { data: row } = await asUser.from("admins").select("user_id").eq("user_id", userId).maybeSingle();
  return !!row;
}

type Part = { blobId: string; partId?: string; name?: string | null; type: string; size: number; disposition?: string | null; cid?: string | null };
type Email = {
  id: string;
  subject: string | null;
  receivedAt: string;
  from: { name?: string; email: string }[] | null;
  htmlBody: Part[];
  textBody: Part[];
  attachments: Part[];
  bodyValues: Record<string, { value: string }>;
};

/** "2026-10" for the month an email was sent, in Sydney time. */
function sydneyMonth(iso: string) {
  const parts = new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Sydney", year: "numeric", month: "2-digit" }).formatToParts(new Date(iso));
  return `${parts.find((p) => p.type === "year")!.value}-${parts.find((p) => p.type === "month")!.value}`;
}

function safeName(name: string) {
  return name.normalize("NFKD").replace(/[^\w.\- ]+/g, "").replace(/\s+/g, " ").trim().slice(0, 120) || "file";
}

function escapeHtml(text: string) {
  return text.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}

/** The email itself as a printable file, since many receipts are just email text. */
function emailDocument(email: Email) {
  const subject = email.subject || "(no subject)";
  const sent = new Date(email.receivedAt).toLocaleString("en-AU", { timeZone: "Australia/Sydney", dateStyle: "full", timeStyle: "short" });
  const html = email.htmlBody.filter((p) => p.type === "text/html").map((p) => email.bodyValues[p.partId!]?.value ?? "").join("\n");
  const text = email.textBody.map((p) => email.bodyValues[p.partId!]?.value ?? "").join("\n");
  const header = `<p style="font:13px sans-serif;color:#555">Receipt emailed ${escapeHtml(sent)}<br>Subject: ${escapeHtml(subject)}</p><hr>`;
  const body = html || `<pre style="white-space:pre-wrap;font:14px sans-serif">${escapeHtml(text)}</pre>`;
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(subject)}</title></head><body>${header}${body}</body></html>`;
}

/** Real attachments (PDFs, photos), not images embedded in an email signature. */
function keepAttachment(part: Part) {
  return part.disposition !== "inline" || !part.cid || part.type === "application/pdf";
}

async function fileEmail(email: Email, download: (part: Part) => Promise<Blob>) {
  const id = crypto.randomUUID();
  const folder = `${sydneyMonth(email.receivedAt)}/${id}`;
  const files: { name: string; path: string; type: string; size: number }[] = [];
  const used = new Set<string>();

  async function save(name: string, body: Blob, type: string) {
    let fileName = safeName(name);
    for (let n = 2; used.has(fileName); n++) fileName = `${n} ${safeName(name)}`;
    used.add(fileName);
    const path = `${folder}/${fileName}`;
    const { error } = await admin.storage.from(BUCKET).upload(path, body, { contentType: type, upsert: true });
    if (error) throw error;
    files.push({ name: fileName, path, type, size: body.size });
  }

  try {
    const doc = new Blob([emailDocument(email)], { type: "text/html" });
    await save(`Email - ${email.subject || "receipt"}.html`, doc, "text/html");
    for (const part of email.attachments.filter(keepAttachment)) {
      await save(part.name || `attachment-${files.length}`, await download(part), part.type || "application/octet-stream");
    }
    const { error } = await admin.from("receipts").insert({
      id,
      email_id: email.id,
      subject: email.subject ?? "",
      sender: email.from?.[0]?.email ?? null,
      received_at: email.receivedAt,
      files,
    });
    if (error) throw error;
  } catch (e) {
    // Leave nothing half-filed; the email is retried next time.
    if (files.length) await admin.storage.from(BUCKET).remove(files.map((f) => f.path));
    throw e;
  }
}

async function syncReceipts(supabase: SupabaseClient, token: string) {
  const auth = { Authorization: `Bearer ${token}` };
  const sessionRes = await fetch("https://api.fastmail.com/jmap/session", { headers: auth });
  if (!sessionRes.ok) throw new Error(`Fastmail refused the API token (${sessionRes.status}).`);
  const session = await sessionRes.json();
  const accountId: string = session.primaryAccounts["urn:ietf:params:jmap:mail"];

  async function jmap(methodCalls: unknown[]) {
    const res = await fetch(session.apiUrl, {
      method: "POST",
      headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify({ using: ["urn:ietf:params:jmap:core", "urn:ietf:params:jmap:mail"], methodCalls }),
    });
    if (!res.ok) throw new Error(`Fastmail request failed (${res.status}).`);
    const { methodResponses } = await res.json();
    for (const [name, result] of methodResponses) {
      if (name === "error") throw new Error(`Fastmail error: ${result.type}`);
    }
    return methodResponses;
  }

  const download = async (part: Part) => {
    const url = (session.downloadUrl as string)
      .replace("{accountId}", encodeURIComponent(accountId))
      .replace("{blobId}", encodeURIComponent(part.blobId))
      .replace("{type}", encodeURIComponent(part.type || "application/octet-stream"))
      .replace("{name}", encodeURIComponent(part.name || "file"));
    const res = await fetch(url, { headers: auth });
    if (!res.ok) throw new Error(`Couldn't download an attachment (${res.status}).`);
    return await res.blob();
  };

  const [[, sent]] = await jmap([["Mailbox/query", { accountId, filter: { role: "sent" } }, "sent"]]);
  const sentId: string | undefined = sent.ids[0];
  if (!sentId) throw new Error("Couldn't find the Sent folder in Fastmail.");

  // Pick up from the newest receipt already filed (a day's overlap; duplicates are skipped).
  const { data: latest } = await supabase.from("receipts").select("received_at").order("received_at", { ascending: false }).limit(1).maybeSingle();
  const after = latest ? new Date(new Date(latest.received_at).getTime() - 86_400_000).toISOString() : undefined;

  const started = Date.now();
  let filed = 0;
  let failed = 0;
  let position = 0;
  let more = false;

  while (true) {
    const responses = await jmap([
      [
        "Email/query",
        {
          accountId,
          filter: { inMailbox: sentId, to: RECEIPTS_ADDRESS, ...(after && { after }) },
          sort: [{ property: "receivedAt", isAscending: true }],
          position,
          limit: PAGE_SIZE,
          calculateTotal: true,
        },
        "q",
      ],
      [
        "Email/get",
        {
          accountId,
          "#ids": { resultOf: "q", name: "Email/query", path: "/ids" },
          properties: ["id", "subject", "receivedAt", "from", "htmlBody", "textBody", "attachments", "bodyValues"],
          fetchHTMLBodyValues: true,
          fetchTextBodyValues: true,
        },
        "g",
      ],
    ]);
    const query = responses[0][1];
    const emails: Email[] = responses[1][1].list;
    if (emails.length === 0) break;

    const { data: existing } = await supabase.from("receipts").select("email_id").in("email_id", emails.map((e) => e.id));
    const done = new Set((existing ?? []).map((r) => r.email_id));

    for (const email of emails) {
      if (done.has(email.id)) continue;
      if (Date.now() - started > TIME_BUDGET_MS) {
        more = true;
        break;
      }
      try {
        await fileEmail(email, download);
        filed++;
      } catch (e) {
        failed++;
        console.error(`Couldn't file email ${email.id}:`, e);
      }
    }

    position += emails.length;
    if (more || position >= query.total) break;
  }

  return { filed, failed, more };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Use POST." }, 405);
  if (!(await isAllowed(req))) return json({ error: "Not allowed." }, 401);

  const token = Deno.env.get("FASTMAIL_API_TOKEN");
  if (!token) {
    return json({ connected: false, filed: 0, failed: 0, more: false, message: "Fastmail isn't connected yet." });
  }

  try {
    const result = await syncReceipts(admin, token);
    return json({ connected: true, ...result });
  } catch (e) {
    console.error(e);
    return json({ connected: true, error: e instanceof Error ? e.message : String(e) }, 502);
  }
});
