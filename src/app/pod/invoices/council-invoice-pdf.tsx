import "server-only";
import { Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { type Invoice, invoiceTotal, lineTotal } from "./invoice-data";

// Matches the invoice template the council asked for: Times, underlined labels, a boxed table and
// no due date (they pay within their own terms).
const s = StyleSheet.create({
  page: { fontFamily: "Times-Roman", fontSize: 11, color: "#000", paddingTop: 70, paddingBottom: 48, paddingHorizontal: 72 },
  right: { textAlign: "right", marginBottom: 10 },
  line: { marginBottom: 10 },
  sans: { fontFamily: "Helvetica", fontSize: 10 },
  underline: { textDecoration: "underline" },
  gap: { height: 38 },
  table: { marginTop: 36, borderWidth: 1, borderColor: "#000" },
  row: { flexDirection: "row" },
  divided: { borderTopWidth: 1, borderTopColor: "#000" },
  cell: { paddingHorizontal: 4, paddingVertical: 1, borderLeftWidth: 1, borderLeftColor: "#000" },
  first: { borderLeftWidth: 0 },
  head: { fontSize: 10 },
  body: { fontSize: 12 },
  totals: { marginTop: 10, marginLeft: 240 },
  totalRow: { flexDirection: "row", marginBottom: 8 },
  totalLabel: { width: 110, textAlign: "right", paddingRight: 8 },
  totalDue: { marginTop: 8 },
  payment: { marginTop: 14, marginBottom: 16 },
  bank: { flexDirection: "row" },
  notes: { marginTop: 20 },
});

const COLUMNS = ["26%", "27%", "25%", "22%"] as const;

/** "$9.5", "$38", "$284" — the way the council's template prints amounts. */
const money = (n: number) => `$${Number(n.toFixed(2))}`;
/** "22/10/2026" */
const longDate = (date: string) => `${date.slice(8, 10)}/${date.slice(5, 7)}/${date.slice(0, 4)}`;
const quantity = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2));

function Labelled({ label, value, sans }: { label: string; value: string; sans?: boolean }) {
  return (
    <Text style={s.line}>
      <Text style={s.underline}>{label}</Text> <Text style={sans ? s.sans : undefined}>{value}</Text>
    </Text>
  );
}

export function CouncilInvoicePage({ invoice, number }: { invoice: Invoice; number: string }) {
  const { seller } = invoice;
  // Lines left without a price (e.g. postage not needed this time) aren't printed.
  const priced = invoice.lines.filter((l) => l.unit_price !== null);
  const total = invoiceTotal(priced);
  const [to, ...address] = invoice.billTo.split("\n").map((l) => l.trim()).filter(Boolean);
  return (
    <Page size="A4" style={s.page}>
      <Text style={[s.right, s.underline]}>INVOICE</Text>
      <Text style={s.right}>Invoice number {number}</Text>
      <Text style={s.right}>
        Date <Text style={s.sans}>{longDate(invoice.issuedOn)}</Text>
      </Text>

      <Labelled label="TO:" value={` ${to ?? ""}`} />
      {address.map((line, i) => (
        <Text key={i} style={s.line}>
          {line}
        </Text>
      ))}

      <View style={s.gap} />
      <Labelled label="NAME:" value={` ${seller.owner_name || seller.bank_account_name}`} />
      <Labelled label="Phone Number:" value={seller.phone.replace(/\s+/g, "")} />
      <Labelled label="Email Address:" value={seller.email} />
      <Labelled label="Company Name:" value={seller.business_name} />
      <Labelled label="ABN:" value={` ${seller.abn}`} />
      <Labelled label="ADDRESS:" value={seller.street_address || seller.address} sans />

      <View style={s.table}>
        <View style={s.row} wrap={false}>
          {["PRODUCT", "QUANTITY", "PRICE / UNIT", "SUB-TOTAL"].map((heading, i) => (
            <Text key={heading} style={[s.cell, s.head, { width: COLUMNS[i] }, i === 0 ? s.first : {}]}>
              {heading}
            </Text>
          ))}
        </View>
        {priced.map((line, i) => (
          <View key={i} style={[s.row, s.divided]} wrap={false}>
            {[line.description, quantity(line.quantity), money(line.unit_price ?? 0), money(lineTotal(line))].map((value, c) => (
              <Text key={c} style={[s.cell, s.body, { width: COLUMNS[c] }, c === 0 ? s.first : {}]}>
                {value}
              </Text>
            ))}
          </View>
        ))}
      </View>

      <View style={s.totals} wrap={false}>
        <View style={s.totalRow}>
          <Text style={s.totalLabel}>SUBTOTAL =</Text>
          <Text>{money(total)}</Text>
        </View>
        <View style={s.totalRow}>
          <Text style={s.totalLabel}>GST =</Text>
          <Text>$0.0</Text>
        </View>
        <View style={[s.totalRow, s.totalDue]}>
          <Text style={s.totalLabel}>TOTAL DUE =</Text>
          <Text>{money(total)}</Text>
        </View>
      </View>

      <View wrap={false}>
        <Text style={[s.payment, s.underline]}>PAYMENT METHOD - Bank Account Details:</Text>
        <View style={s.bank}>
          <Text style={{ width: 107 }}>BSB:{"    "}{seller.bank_bsb}</Text>
          <Text style={{ width: 144 }}>ACC:{"    "}{seller.bank_account_number}</Text>
          {seller.bank_name && <Text>BANK: {seller.bank_name}</Text>}
        </View>
      </View>

      {invoice.notes && <Text style={s.notes}>{invoice.notes}</Text>}
    </Page>
  );
}
