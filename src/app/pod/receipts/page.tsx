import type { Metadata } from "next";
import { formatPrice } from "@/lib/format";
import { type ReceiptFile, financialYear, monthLabel, receiptDate, sydneyMonth } from "@/lib/receipts";
import { PodForm } from "../pod-form";
import { PodNav } from "../pod-nav";
import { getSession } from "../session";
import { checkReceipts, deleteReceipt, saveReceipt } from "./actions";

export const metadata: Metadata = { title: "Receipts" };

const RECEIPTS_ADDRESS = "chocolate@sorellacacao.com.au";

type Receipt = {
  id: string;
  subject: string;
  received_at: string;
  amount: number | null;
  gst: number | null;
  note: string | null;
  files: (ReceiptFile & { url?: string })[];
};

const sum = (receipts: Receipt[], key: "amount" | "gst") =>
  receipts.reduce((total, r) => total + (r[key] === null ? 0 : Number(r[key])), 0);

export default async function ReceiptsPage() {
  const { supabase, email, isAdmin } = await getSession();
  if (!isAdmin) {
    return (
      <div className="max-w-xl">
        <h1 className="font-script text-6xl text-gold">The Pod</h1>
        <p className="mt-6 text-xl">{email ?? "This account"} doesn’t have access to the Pod yet.</p>
      </div>
    );
  }

  const { data, error } = await supabase
    .from("receipts")
    .select("id, subject, received_at, amount, gst, note, files")
    .order("received_at", { ascending: false });
  if (error) throw error;
  const receipts = data.map((r) => ({ ...r, files: r.files as ReceiptFile[] })) as Receipt[];

  // Private download links, valid for an hour.
  const paths = receipts.flatMap((r) => r.files.map((f) => f.path));
  if (paths.length) {
    const { data: signed } = await supabase.storage.from("receipts").createSignedUrls(paths, 3600, { download: true });
    const urls = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));
    for (const r of receipts) for (const f of r.files) f.url = urls.get(f.path) ?? undefined;
  }

  // Financial year → month → receipts, newest first.
  const years = new Map<string, Map<string, Receipt[]>>();
  for (const r of receipts) {
    const month = sydneyMonth(r.received_at);
    const fy = financialYear(month);
    if (!years.has(fy)) years.set(fy, new Map());
    const months = years.get(fy)!;
    if (!months.has(month)) months.set(month, []);
    months.get(month)!.push(r);
  }

  return (
    <div className="space-y-12">
      <header className="space-y-6">
        <h1 className="font-script text-6xl text-gold sm:text-7xl">The Pod</h1>
        <PodNav current="/pod/receipts" />
      </header>

      <section className="space-y-4 rounded-2xl border border-white/10 bg-cacao-950/40 p-6 sm:p-8">
        <h2 className="text-4xl">Receipts</h2>
        <p className="text-cream/80">
          Email a receipt from <strong className="font-medium text-cream">{RECEIPTS_ADDRESS}</strong> to itself and
          it’s filed here under the month it was sent. New receipts are collected every Monday morning, or straight
          away with <em>Check now</em>.
        </p>
        <PodForm action={checkReceipts} submitLabel="Check now" />
      </section>

      {receipts.length === 0 ? (
        <p className="text-xl text-cream/70">No receipts filed yet.</p>
      ) : (
        [...years].map(([fy, months]) => {
          const yearReceipts = [...months.values()].flat();
          return (
            <section key={fy} aria-labelledby={`fy-${fy}`} className="space-y-6">
              <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-white/15 pb-3">
                <h2 id={`fy-${fy}`} className="text-4xl">
                  Financial year {fy}
                </h2>
                <Totals receipts={yearReceipts} />
              </div>

              {[...months].map(([month, monthReceipts]) => (
                <details key={month} open={month === sydneyMonth(new Date().toISOString())} className="group rounded-2xl border border-white/10 bg-cacao-950/40">
                  <summary className="flex cursor-pointer flex-wrap items-baseline justify-between gap-4 p-6 sm:px-8">
                    <span className="text-3xl text-gold">
                      {monthLabel(month)}
                      <span className="eyebrow ml-3 align-middle text-cream/60">
                        {monthReceipts.length} {monthReceipts.length === 1 ? "receipt" : "receipts"}
                      </span>
                    </span>
                    <Totals receipts={monthReceipts} />
                  </summary>

                  <ul className="space-y-4 px-6 pb-6 sm:px-8 sm:pb-8">
                    {monthReceipts.map((r) => (
                      <li key={r.id} className="rounded-xl border border-white/10 p-4 sm:p-5">
                        <p className="eyebrow text-cream/60">{receiptDate(r.received_at)}</p>
                        <p className="mt-1 text-2xl">{r.subject || "(no subject)"}</p>
                        <ul className="mt-3 flex flex-wrap gap-2">
                          {r.files.map((f) => (
                            <li key={f.path}>
                              <a
                                href={f.url}
                                className="inline-block rounded-full border border-white/20 px-3 py-1.5 font-sans text-sm text-cream/80 hover:border-gold hover:text-gold"
                              >
                                {f.name.startsWith("Email - ") ? "Email" : f.name} ↓
                              </a>
                            </li>
                          ))}
                        </ul>

                        <PodForm action={saveReceipt} submitLabel="Save" className="mt-5">
                          <input type="hidden" name="id" value={r.id} />
                          <div className="grid gap-4 sm:grid-cols-[10rem_10rem_1fr]">
                            <MoneyField name="amount" label="Total ($)" value={r.amount} />
                            <MoneyField name="gst" label="GST ($)" value={r.gst} />
                            <label className="block">
                              <span className="eyebrow mb-2 block text-cream/70">Note</span>
                              <input name="note" defaultValue={r.note ?? ""} placeholder="e.g. cacao beans" className="pod-input" />
                            </label>
                          </div>
                        </PodForm>
                        <PodForm
                          action={deleteReceipt}
                          submitLabel="Delete receipt"
                          variant="quiet"
                          confirmMessage={`Delete “${r.subject || "this receipt"}” and its files? This can’t be undone.`}
                          className="-mt-1"
                        >
                          <input type="hidden" name="id" value={r.id} />
                        </PodForm>
                      </li>
                    ))}
                  </ul>
                </details>
              ))}
            </section>
          );
        })
      )}
    </div>
  );
}

function Totals({ receipts }: { receipts: Receipt[] }) {
  const total = sum(receipts, "amount");
  const gst = sum(receipts, "gst");
  if (!total && !gst) return null;
  return (
    <span className="font-sans text-base text-cream/80">
      Total {formatPrice(total)} · GST {formatPrice(gst)}
    </span>
  );
}

function MoneyField({ name, label, value }: { name: string; label: string; value: number | null }) {
  return (
    <label className="block">
      <span className="eyebrow mb-2 block text-cream/70">{label}</span>
      <input
        type="number"
        name={name}
        min="0"
        step="0.01"
        inputMode="decimal"
        defaultValue={value === null ? "" : Number(value).toFixed(2)}
        className="pod-input"
      />
    </label>
  );
}
