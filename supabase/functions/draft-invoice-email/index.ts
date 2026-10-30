// Puts an invoice email, with its PDF attached, in the Fastmail Drafts folder for
// chocolate@sorellacacao.com.au to check and send. It never sends anything.
//
// Uses the API token in the FASTMAIL_API_TOKEN secret (it needs Email read/write
// access). Called by the Pod's "Email invoice" button with the signed-in admin's
// access token.

import { createClient } from "npm:@supabase/supabase-js@2";

const FROM = { name: "Sorella Cacao", email: "chocolate@sorellacacao.com.au" };

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const PUBLISHABLE_KEY =
  JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "{}").default ?? Deno.env.get("SUPABASE_ANON_KEY")!;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

/** A signed-in admin. */
async function isAdmin(req: Request) {
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

type Draft = { to: string; toName?: string; subject: string; text: string; filename: string; pdf: string };

async function createDraft(token: string, draft: Draft) {
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

  // Upload the PDF, then make the draft with it attached.
  const pdf = Uint8Array.from(atob(draft.pdf), (c) => c.charCodeAt(0));
  const uploadUrl = (session.uploadUrl as string).replace("{accountId}", encodeURIComponent(accountId));
  const upload = await fetch(uploadUrl, { method: "POST", headers: { ...auth, "Content-Type": "application/pdf" }, body: pdf });
  if (!upload.ok) {
    throw new Error(upload.status === 403 ? "The Fastmail API token can't write emails. It needs Email read/write access." : `Couldn't upload the PDF (${upload.status}).`);
  }
  const { blobId } = await upload.json();

  const [[, drafts]] = await jmap([["Mailbox/query", { accountId, filter: { role: "drafts" } }, "drafts"]]);
  const draftsId: string | undefined = drafts.ids[0];
  if (!draftsId) throw new Error("Couldn't find the Drafts folder in Fastmail.");

  const [[, created]] = await jmap([
    [
      "Email/set",
      {
        accountId,
        create: {
          invoice: {
            mailboxIds: { [draftsId]: true },
            keywords: { $draft: true, $seen: true },
            from: [FROM],
            to: [{ name: draft.toName ?? null, email: draft.to }],
            subject: draft.subject,
            bodyValues: { text: { value: draft.text } },
            bodyStructure: {
              type: "multipart/mixed",
              subParts: [
                { partId: "text", type: "text/plain" },
                { blobId, type: "application/pdf", name: draft.filename, disposition: "attachment" },
              ],
            },
          },
        },
      },
      "create",
    ],
  ]);
  const email = created.created?.invoice;
  if (!email) {
    const reason = created.notCreated?.invoice;
    throw new Error(reason?.type === "forbidden" ? "The Fastmail API token can't write emails. It needs Email read/write access." : `Fastmail didn't make the draft (${reason?.type ?? "unknown"}).`);
  }
  return email.id as string;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Use POST." }, 405);
  if (!(await isAdmin(req))) return json({ error: "Not allowed." }, 401);

  const token = Deno.env.get("FASTMAIL_API_TOKEN");
  if (!token) return json({ error: "Fastmail isn't connected yet. Add the FASTMAIL_API_TOKEN secret in Supabase." }, 400);

  let draft: Draft;
  try {
    draft = await req.json();
  } catch {
    return json({ error: "Couldn't read the request." }, 400);
  }
  if (!draft.to || !draft.subject || !draft.pdf || !draft.filename) return json({ error: "Missing the email address, subject or PDF." }, 400);

  try {
    const id = await createDraft(token, draft);
    return json({ ok: true, id });
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 502);
  }
});
