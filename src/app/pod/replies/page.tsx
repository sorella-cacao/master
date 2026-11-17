import type { Metadata } from "next";
import { PodForm } from "../pod-form";
import { PodNav } from "../pod-nav";
import { PodPanel } from "../pod-panel";
import { getSession } from "../session";
import { deleteMessage, saveReply } from "./actions";
import { ReplyPreview } from "./preview";

export const metadata: Metadata = { title: "Replies" };

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-AU", { timeZone: "Australia/Sydney", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

export default async function RepliesPage() {
  const { supabase, email, isAdmin } = await getSession();
  if (!isAdmin) {
    return (
      <div className="max-w-xl">
        <h1 className="font-script text-6xl text-gold">The Pod</h1>
        <p className="mt-6 text-xl">{email ?? "This account"} doesn’t have access to the Pod yet.</p>
      </div>
    );
  }

  const [templates, messages, sent] = await Promise.all([
    supabase.from("email_templates").select("key, name, sent_when, subject, body, enabled").order("position"),
    supabase.from("contact_messages").select("id, name, email, message, created_at").order("created_at", { ascending: false }).limit(30),
    supabase.from("sent_emails").select("id, template, to_email, subject, error, created_at").order("created_at", { ascending: false }).limit(30),
  ]);
  if (templates.error) throw templates.error;
  if (messages.error) throw messages.error;
  if (sent.error) throw sent.error;
  const names = new Map(templates.data.map((t) => [t.key, t.name]));

  return (
    <div className="space-y-6">
      <header className="space-y-6">
        <h1 className="font-script text-6xl text-gold sm:text-7xl">The Pod</h1>
        <PodNav current="/pod/replies" />
      </header>

      <div className="space-y-2">
        {templates.data.map((template) => (
          <PodPanel
            key={template.key}
            small
            title={`${template.name}${template.enabled ? "" : " · off"}`}
            hint={template.sent_when}
          >
            <PodForm action={saveReply} submitLabel="Save">
              <input type="hidden" name="key" value={template.key} />
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-4">
                  <label className="block">
                    <span className="eyebrow mb-1 block text-xs text-cream/70">Subject</span>
                    <input name="subject" defaultValue={template.subject} required className="pod-input py-2 text-sm" />
                  </label>
                  <label className="block">
                    <span className="eyebrow mb-1 block text-xs text-cream/70">Message</span>
                    <textarea name="body" defaultValue={template.body} required rows={14} className="pod-input py-2 font-sans text-sm" />
                  </label>
                  <label className="flex items-center gap-3 font-sans text-sm">
                    <input type="checkbox" name="enabled" defaultChecked={template.enabled} className="size-4 accent-[#8a5226]" />
                    Send this email
                  </label>
                </div>
                <ReplyPreview templateKey={template.key} subject={template.subject} body={template.body} />
              </div>
            </PodForm>
          </PodPanel>
        ))}
      </div>

      <PodPanel small title="Messages from the website" hint={`${messages.data.length ? `${messages.data.length} recent` : "None yet"} · also emailed to you`}>
        <div className="space-y-4">
          {messages.data.length === 0 && <p className="text-cream/70">Messages sent through the contact form will show here.</p>}
          {messages.data.map((m) => (
            <article key={m.id} className="rounded-xl border border-white/15 p-4 font-sans text-sm">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-base">
                  {m.name} ·{" "}
                  <a href={`mailto:${m.email}`} className="underline decoration-white/30 underline-offset-2 hover:text-gold">
                    {m.email}
                  </a>
                </p>
                <p className="text-cream/60">{when(m.created_at)}</p>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-cream/85">{m.message}</p>
              <PodForm action={deleteMessage} submitLabel="Delete" variant="quiet" confirmMessage={`Delete the message from ${m.name}?`}>
                <input type="hidden" name="id" value={m.id} />
              </PodForm>
            </article>
          ))}
        </div>
      </PodPanel>

      <PodPanel small title="Emails sent" hint="The latest automatic emails, and any that couldn’t be sent.">
        {sent.data.length === 0 ? (
          <p className="text-cream/70">Nothing sent yet.</p>
        ) : (
          <ul className="divide-y divide-white/10 font-sans text-sm">
            {sent.data.map((s) => (
              <li key={s.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2">
                <span>
                  {names.get(s.template) ?? s.template} → {s.to_email}
                  {s.error && <span className="block text-gold">Not sent: {s.error}</span>}
                </span>
                <span className="text-cream/60">{when(s.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </PodPanel>
    </div>
  );
}
