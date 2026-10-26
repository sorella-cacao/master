import "server-only";
import path from "node:path";
import { Document, Font, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { formatPrice } from "@/lib/format";
import { type Invoice, invoiceNumber, invoiceTotal, lineTotal } from "./invoice-data";

const fonts = path.join(process.cwd(), "src/app/pod/invoices/fonts");
Font.register({
  family: "EB Garamond",
  fonts: [400, 600, 700].map((fontWeight) => ({ src: path.join(fonts, `eb-garamond-latin-${fontWeight}-normal.woff`), fontWeight })),
});
// Keep words whole rather than hyphenating them across lines.
Font.registerHyphenationCallback((word) => [word]);

// Matches the invoices made in Google Docs before the Pod: navy rule, Garamond, grey details.
const NAVY = "#2b3990";
const INK = "#1a1a1a";
const GREY = "#6f6f6f";
const SHADE = "#f2f2f2";

const s = StyleSheet.create({
  page: { fontFamily: "EB Garamond", fontSize: 11, color: INK, paddingTop: 36, paddingBottom: 48, paddingHorizontal: 58 },
  rule: { borderTopWidth: 2, borderTopColor: NAVY, marginHorizontal: -26, marginBottom: 30 },
  top: { flexDirection: "row" },
  half: { width: "50%" },
  business: { fontSize: 22, fontWeight: 700, marginBottom: 8 },
  title: { fontSize: 22, fontWeight: 700, marginBottom: 6 },
  submitted: { fontSize: 12, fontWeight: 700 },
  detail: { color: GREY, fontSize: 10.5, marginBottom: 5 },
  parties: { flexDirection: "row", marginTop: 22, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: "#bdbdbd" },
  party: { width: "37%" },
  partyNarrow: { width: "26%" },
  label: { fontSize: 12, fontWeight: 600, color: "#3a3a3a", marginBottom: 8 },
  table: { marginTop: 26 },
  headRow: { flexDirection: "row", paddingBottom: 8, paddingHorizontal: 4 },
  head: { fontSize: 12, fontWeight: 700 },
  row: { flexDirection: "row", paddingVertical: 6, paddingHorizontal: 4 },
  shaded: { backgroundColor: SHADE },
  description: { width: "52%" },
  price: { width: "16%", textAlign: "right" },
  qty: { width: "14%", textAlign: "right" },
  total: { width: "18%", textAlign: "right" },
  number: { color: GREY },
  totalRow: { flexDirection: "row", marginTop: 14, paddingHorizontal: 4, alignItems: "baseline" },
  totalLabel: { width: "52%", textAlign: "right", fontSize: 13, fontWeight: 700, paddingRight: 24 },
  totalAmount: { width: "48%", textAlign: "right", fontSize: 13, fontWeight: 700 },
  bank: { marginTop: 10, backgroundColor: SHADE, padding: 6, width: "52%" },
  bankTitle: { fontWeight: 700, textDecoration: "underline", marginBottom: 2 },
  notes: { marginTop: 18, color: GREY },
});

/** "15/10/26" */
const shortDate = (date: string) => `${date.slice(8, 10)}/${date.slice(5, 7)}/${date.slice(2, 4)}`;
/** "22/10/2026" */
const longDate = (date: string) => `${date.slice(8, 10)}/${date.slice(5, 7)}/${date.slice(0, 4)}`;
const quantity = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2));
const lines = (text: string) => text.split("\n").map((l) => l.trim()).filter(Boolean);

function InvoiceDocument({ invoice }: { invoice: Invoice }) {
  const { seller } = invoice;
  // Lines left without a price (e.g. postage not needed this time) aren't printed.
  const priced = invoice.lines.filter((l) => l.unit_price !== null);
  return (
    <Document title={`Invoice ${invoiceNumber(invoice.number)}`} author={seller.business_name}>
      <Page size="A4" style={s.page}>
        <View style={s.rule} />
        <View style={s.top}>
          <View style={s.half}>
            <Text style={s.business}>{seller.business_name}</Text>
            {[...lines(seller.address), seller.email, seller.phone].filter(Boolean).map((line) => (
              <Text key={line} style={s.detail}>
                {line}
              </Text>
            ))}
            {seller.abn && <Text style={s.detail}>ABN {seller.abn}</Text>}
          </View>
          <View style={s.half}>
            <Text style={s.title}>Invoice # {invoiceNumber(invoice.number)}</Text>
            <Text style={s.submitted}>Submitted on {shortDate(invoice.issuedOn)}</Text>
          </View>
        </View>

        <View style={s.parties}>
          <View style={s.party}>
            <Text style={s.label}>Invoice for</Text>
            {lines(invoice.billTo).map((line, i) => (
              <Text key={i} style={s.detail}>
                {line}
              </Text>
            ))}
          </View>
          <View style={s.partyNarrow}>
            <Text style={s.label}>Payable to</Text>
            <Text style={s.detail}>{seller.payable_to || seller.business_name}</Text>
          </View>
          <View style={s.partyNarrow}>
            <Text style={s.label}>Due date</Text>
            <Text style={s.detail}>{longDate(invoice.dueOn)}</Text>
          </View>
        </View>

        <View style={s.table}>
          <View style={s.headRow}>
            <Text style={[s.head, s.description]}>Description</Text>
            <Text style={[s.head, s.price]}>Price</Text>
            <Text style={[s.head, s.qty]}>Qty</Text>
            <Text style={[s.head, s.total]}>Total price</Text>
          </View>
          {priced.map((line, i) => (
            <View key={i} style={i % 2 === 0 ? [s.row, s.shaded] : s.row} wrap={false}>
              <Text style={s.description}>{line.description}</Text>
              <Text style={[s.price, s.number]}>{formatPrice(line.unit_price ?? 0)}</Text>
              <Text style={[s.qty, s.number]}>{quantity(line.quantity)}</Text>
              <Text style={[s.total, s.number]}>{formatPrice(lineTotal(line))}</Text>
            </View>
          ))}
        </View>

        <View style={s.totalRow} wrap={false}>
          <Text style={s.totalLabel}>Total:</Text>
          <Text style={s.totalAmount}>{formatPrice(invoiceTotal(priced))}</Text>
        </View>

        {(seller.bank_account_name || seller.bank_account_number) && (
          <View style={s.bank} wrap={false}>
            <Text style={s.bankTitle}>Bank Details</Text>
            {seller.bank_account_name && <Text>Acc Name: {seller.bank_account_name}</Text>}
            {seller.bank_account_number && <Text>Acc number: {seller.bank_account_number}</Text>}
            {seller.bank_bsb && <Text>BSB: {seller.bank_bsb}</Text>}
          </View>
        )}

        {invoice.notes && <Text style={s.notes}>{invoice.notes}</Text>}
      </Page>
    </Document>
  );
}

export function renderInvoicePdf(invoice: Invoice) {
  return renderToBuffer(<InvoiceDocument invoice={invoice} />);
}
