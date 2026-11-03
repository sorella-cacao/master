import "server-only";
import path from "node:path";
import { Circle, Document, Font, Page, Path, Rect, StyleSheet, Svg, Text, View, renderToBuffer } from "@react-pdf/renderer";
import type { Styles } from "@react-pdf/renderer";
import { type Label, type Nutrition, type PrintRun, labelTitle } from "./label-data";

type Style = Styles[string];

// Open Sans stands in for Canva Sans; the headline is Noto Serif Ethiopic Condensed, as in Canva.
const fonts = path.join(process.cwd(), "src/app/pod/labels/fonts");
Font.register({
  family: "Open Sans",
  fonts: [400, 700].map((fontWeight) => ({ src: path.join(fonts, `open-sans-${fontWeight}.ttf`), fontWeight })),
});
Font.register({ family: "Noto Serif Condensed", src: path.join(fonts, "noto-serif-ethiopic-condensed-700.ttf"), fontWeight: 700 });
Font.registerHyphenationCallback((word) => [word]);

const MM = 72 / 25.4;
const HEADLINE = "Chocolate woven by hand in devotion and celebration to the Spirit of Grandmother Cacao.";
const STORY = [
  "Sorella Cacao is not just your average chocolate, it’s a ceremony of ingredients.",
  "Our origins are rooted in the love for chocolate that is good for our bodies and the Earth. We care deeply about where our ingredients come from and the hands that grow them.",
  "Where possible, we source local and organic. Our cacao beans come from family-run farms across the Pacific Islands where generations of care are woven into every harvest.",
];
const ROWS: [keyof Nutrition, string][] = [
  ["energy", "Energy"],
  ["protein", "Protein"],
  ["fat", "Fat, total"],
  ["saturated", " - saturated"],
  ["carbohydrate", "Carbohydrate"],
  ["sugars", " - sugars"],
  ["sodium", "Sodium"],
];
const RULE = "#7d7d7d";

const s = StyleSheet.create({
  sans: { fontFamily: "Open Sans" },
  bold: { fontWeight: 700 },
  underline: { textDecoration: "underline" },
  headline: { fontFamily: "Noto Serif Condensed", fontWeight: 700, textAlign: "center" },
  panel: { fontFamily: "Helvetica", color: "#222" },
  panelTitle: { fontFamily: "Helvetica-Bold", letterSpacing: 0.35 },
  row: { flexDirection: "row" },
  centre: { textAlign: "center" },
});

/** "May contain: Milk & nuts", with the allergens in bold. */
function MayContain({ text, style }: { text: string; style: Style }) {
  return (
    <Text style={[s.sans, style]}>
      May contain:{" "}
      {text.split(/(\s*&\s*|,\s*)/).map((part, i) => (
        <Text key={i} style={i % 2 === 0 ? s.bold : undefined}>
          {part}
        </Text>
      ))}
    </Text>
  );
}

function Ingredients({ label, style, notesStyle }: { label: Label; style: Style; notesStyle?: Style }) {
  return (
    <>
      <Text style={[s.sans, style]}>
        <Text style={[s.bold, s.underline]}>Ingredients:</Text> {label.ingredients}
      </Text>
      <Text style={[s.sans, style, notesStyle ?? {}]}>{label.ingredientNotes}</Text>
    </>
  );
}

/**
 * The nutrition panel. Sizes are in points: `font` for the rows, `line` between rows, and the
 * x of the per-serving and per-100 g columns. The empty corner can hold a note (small labels
 * put the packaging line there).
 */
function NutritionPanel({
  label,
  width,
  font,
  line,
  rowLine = line,
  columns,
  boxed,
  titleSize,
  corner,
  gaps,
}: {
  label: Label;
  width: number;
  font: number;
  line: number;
  rowLine?: number;
  columns: [number, number];
  boxed: boolean;
  titleSize: number;
  corner?: React.ReactNode;
  gaps: { top: number; title: number; section: number };
}) {
  const rule = { borderTopWidth: boxed ? 1 : 1.6, borderTopColor: RULE };
  const cell = (x: number, next: number) => ({ position: "absolute" as const, left: x, width: next - x });
  return (
    <View style={[s.panel, { width, fontSize: font, lineHeight: line / font }, boxed ? { borderWidth: 1, borderColor: "#444" } : rule]}>
      <View style={{ paddingHorizontal: 3, paddingTop: gaps.top, paddingBottom: gaps.section }}>
        <Text style={[s.panelTitle, { fontSize: titleSize, lineHeight: 1.2, marginBottom: gaps.title }]}>NUTRITION INFORMATION</Text>
        <Text>Servings Per Package: {label.servingsPerPackage}</Text>
        <Text>Serving Size: {label.servingSize}</Text>
      </View>
      <View style={[rule, { height: line * 3 + gaps.section * 2 }]}>
        {corner && <View style={{ ...cell(3, columns[0] - 2), top: gaps.section }}>{corner}</View>}
        {["Serving", "100 g"].map((last, i) => (
          <View key={last} style={{ ...cell(columns[i], i ? width : columns[1]), top: gaps.section }}>
            <Text>Average</Text>
            <Text>Quantity per</Text>
            <Text>{last}</Text>
          </View>
        ))}
      </View>
      <View style={[rule, { paddingVertical: gaps.section }]}>
        {ROWS.map(([key, name]) => (
          <View key={key} style={[s.row, { height: rowLine }]}>
            <Text style={{ ...cell(3, columns[0]) }}>{name}</Text>
            <Text style={{ ...cell(columns[0], columns[1]) }}>{label.nutrition[key]?.[0] ?? ""}</Text>
            <Text style={{ ...cell(columns[1], width) }}>{label.nutrition[key]?.[1] ?? ""}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function PhoneIcon({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 2.2a9.8 9.8 0 0 0-8.4 14.8L2.3 21.7l4.8-1.3A9.8 9.8 0 1 0 12 2.2z" stroke="#000" strokeWidth={1.8} fill="none" />
      <Path
        d="M8.6 7.2c.3-.1.6-.1.8.2l1 2c.1.3 0 .6-.2.8l-.6.6c.6 1.3 1.6 2.3 2.9 2.9l.6-.6c.2-.2.5-.3.8-.2l2 1c.3.2.3.5.2.8-.4 1-1.3 1.6-2.3 1.5-3.3-.4-5.9-3-6.3-6.3-.1-1 .5-1.9 1.1-2.7z"
        fill="#000"
      />
    </Svg>
  );
}

function GlobeIcon({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={12} cy={12} r={10} stroke="#000" strokeWidth={1.4} fill="none" />
      <Circle cx={12} cy={12} r={6} stroke="#000" strokeWidth={1} fill="none" />
      <Path d="M12 6.5v11M6.5 12h11M8 8.5h8M8 15.5h8M12 6.5c-2 2.8-2 8.2 0 11M12 6.5c2 2.8 2 8.2 0 11" stroke="#000" strokeWidth={0.8} fill="none" />
    </Svg>
  );
}

function InstagramIcon({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x={2.5} y={2.5} width={19} height={19} rx={5.5} stroke="#000" strokeWidth={2.2} fill="none" />
      <Circle cx={12} cy={12} r={4.4} stroke="#000" strokeWidth={2.2} fill="none" />
      <Circle cx={17.4} cy={6.6} r={1.3} fill="#000" />
    </Svg>
  );
}

/** 100 × 48 mm, laid out like the Canva "Large Ingredients" labels. */
function LargeLabel({ label, run }: { label: Label; run: PrintRun }) {
  const W = 100 * MM;
  const H = 48 * MM;
  const icon = 7.6;
  return (
    <Page size={[W, H]} style={{ color: "#000" }}>
      {/* One page-sized box holds everything, so nothing that reaches the bottom edge starts a second page. */}
      <View style={{ position: "absolute", left: 0, top: 0, width: W, height: H }}>
        <Text style={[s.headline, { position: "absolute", top: -1, left: 1, right: 1, fontSize: 8.9, lineHeight: 1.26 }]}>{HEADLINE}</Text>

        <View style={{ position: "absolute", left: 1.2, top: 27.4 }}>
          <NutritionPanel
            label={label}
            width={109.4}
            font={4.2}
            line={6.85}
            rowLine={6.55}
            columns={[52.6, 82]}
            boxed
            titleSize={6.55}
            gaps={{ top: 2.6, title: 2.6, section: 2.2 }}
          />
        </View>

        <View style={{ position: "absolute", left: 113, right: 1.5, top: 27.6 }}>
          {STORY.map((p) => (
            <Text key={p} style={[s.sans, s.centre, { fontSize: 4.85, lineHeight: 1.39 }]}>
              {p}
            </Text>
          ))}
        </View>

        <View style={{ position: "absolute", left: 112, width: 94, top: 85.4 }}>
          <Ingredients label={label} style={{ fontSize: 4, lineHeight: 1.5, textAlign: "center" }} />
          <MayContain text={label.mayContain} style={{ fontSize: 4, marginTop: 1.4, marginLeft: 3 }} />
        </View>

        <View style={{ position: "absolute", left: 111.6, top: 120.6 }}>
          <Text style={[s.sans, { fontSize: 4.1, lineHeight: 1.7 }]}>Best Before {run.bestBefore}</Text>
          <Text style={[s.sans, { fontSize: 4.1, lineHeight: 1.7, marginLeft: 1.4 }]}>Batch # {run.batch}</Text>
        </View>
        <Text style={[s.sans, s.centre, { position: "absolute", left: 163, width: 45, top: 113.8, fontSize: 3.25, lineHeight: 1.38 }]}>
          Packaged in recycled alfoil and compostable wrapping  (ink is made by heat! No nastie dyes)
        </Text>

        <View style={{ position: "absolute", left: 208, top: 93 }}>
          <Text style={[s.sans, s.bold, { fontSize: 4.1, marginBottom: 4 }]}>Follow our journey..</Text>
          {[
            [<PhoneIcon key="p" size={icon} />, run.phone.replace(/\s+/g, "")],
            [<GlobeIcon key="g" size={icon} />, "sorellacacao.com.au"],
            [<InstagramIcon key="i" size={icon} />, "sorella_cacao"],
          ].map(([iconEl, text], i) => (
            <View key={i} style={[s.row, { alignItems: "center", marginBottom: 1.7 }]}>
              {iconEl}
              <Text style={[s.sans, s.bold, { fontSize: 5.6, marginLeft: 1.2 }]}>{text}</Text>
            </View>
          ))}
        </View>
      </View>
    </Page>
  );
}

/**
 * 50 × 32 mm page with the label turned on its side (it wraps around the bar portrait), laid out
 * like the Canva "Small Ingredients" labels.
 */
function SmallLabel({ label, run }: { label: Label; run: PrintRun }) {
  const W = 50 * MM;
  const H = 32 * MM;
  const text = { fontSize: 3.55, lineHeight: 1.3 };
  const small = { fontSize: 3.3, lineHeight: 1.17 };
  return (
    // The turned label is taller than the page, so its box is kept page-height and its contents spill
    // out of it (a taller box would be pushed onto a second page).
    <Page size={[W, H]} style={{ color: "#000" }}>
      <View
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: H,
          height: H,
          transformOrigin: "0 0",
          transform: `translate(0, ${H}) rotate(-90deg)`,
        }}
      >
        <View style={{ position: "absolute", left: 0, top: 15.3 }}>
          <NutritionPanel
            label={label}
            width={H}
            font={3.15}
            line={5.3}
            rowLine={5.6}
            columns={[42.4, 62.5]}
            boxed={false}
            titleSize={5.35}
            gaps={{ top: 3, title: 3.1, section: 3 }}
            corner={
              <Text style={[s.sans, s.centre, { fontSize: 3, lineHeight: 1.35, color: "#000" }]}>
                Packaged in recycled alfoil and compostable wrapping
              </Text>
            }
          />
        </View>

        {/* After the panel, so its last line ("Cacao.") sits on top of the panel's first rule, as in Canva. */}
        <Text style={[s.headline, { position: "absolute", top: 0.4, left: 0.6, right: 0.6, fontSize: 4.75, lineHeight: 1.2 }]}>{HEADLINE}</Text>

        <View style={{ position: "absolute", left: 0.8, right: 0.6, top: 108.7 }}>
          <Ingredients label={label} style={text} />
        </View>

        <Text style={[s.sans, s.bold, small, { position: "absolute", left: 46, width: 38, top: 122.4, textAlign: "right" }]}>
          Follow our journey..
        </Text>
        <View style={{ position: "absolute", left: 0.8, width: 54, top: 128.5 }}>
          <MayContain text={label.mayContain} style={small} />
          <Text style={[s.sans, small, { marginLeft: 4.4 }]}>Batch # {run.batch}</Text>
          <Text style={[s.sans, small]}>Best Before{run.bestBefore}</Text>
        </View>
        <View style={{ position: "absolute", left: 56.8, right: 0.6, top: 128.5 }}>
          <Text style={[s.sans, small]}>{run.phone.replace(/\s+/g, "")}</Text>
          <Text style={[s.sans, small]}>sorellacacao.com.au</Text>
          <Text style={[s.sans, small]}>sorella_cacao</Text>
        </View>
      </View>
    </Page>
  );
}

export function renderLabelPdf(label: Label, run: PrintRun) {
  return renderToBuffer(
    <Document title={labelTitle(label)} author="Sorella Cacao">
      {label.size === "small" ? <SmallLabel label={label} run={run} /> : <LargeLabel label={label} run={run} />}
    </Document>,
  );
}
