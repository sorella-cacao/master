import "server-only";
import path from "node:path";
import { Circle, Document, Font, Page, Path, Rect, StyleSheet, Svg, Text, View, renderToBuffer } from "@react-pdf/renderer";
import type { Styles } from "@react-pdf/renderer";
import { type Label, NUTRITION_ROWS, type PrintRun, labelTitle } from "./label-data";
import { type FontKey, LAYOUT_PARTS, type LayoutPart } from "./label-layout";

type Style = Styles[string];

// Open Sans stands in for Canva Sans; the headline is Noto Serif Ethiopic Condensed, as in Canva.
const fonts = path.join(process.cwd(), "src/app/pod/labels/fonts");
Font.register({
  family: "Open Sans",
  fonts: [400, 700].map((fontWeight) => ({ src: path.join(fonts, `open-sans-${fontWeight}.ttf`), fontWeight })),
});
Font.register({ family: "Noto Serif Condensed", src: path.join(fonts, "noto-serif-ethiopic-condensed-700.ttf"), fontWeight: 700 });
// The invoices' Garamond, under its own name here.
Font.register({
  family: "Label Garamond",
  fonts: [400, 700].map((fontWeight) => ({
    src: path.join(process.cwd(), "src/app/pod/invoices/fonts", `eb-garamond-latin-${fontWeight}-normal.woff`),
    fontWeight,
  })),
});
Font.registerHyphenationCallback((word) => [word]);

const MM = 72 / 25.4;
const HEADLINE = "Chocolate woven by hand in devotion and celebration to the Spirit of Grandmother Cacao.";
const STORY = [
  "Sorella Cacao is not just your average chocolate, it’s a ceremony of ingredients.",
  "Our origins are rooted in the love for chocolate that is good for our bodies and the Earth. We care deeply about where our ingredients come from and the hands that grow them.",
  "Where possible, we source local and organic. Our cacao beans come from family-run farms across the Pacific Islands where generations of care are woven into every harvest.",
];
const RULE = "#7d7d7d";

const s = StyleSheet.create({
  bold: { fontWeight: 700 },
  underline: { textDecoration: "underline" },
  headline: { fontWeight: 700, textAlign: "center" },
  panel: { color: "#222" },
  panelTitle: { fontWeight: 700, letterSpacing: 0.35 },
  row: { flexDirection: "row" },
  centre: { textAlign: "center" },
});

const FAMILIES: Record<FontKey, string> = {
  "serif-condensed": "Noto Serif Condensed",
  "open-sans": "Open Sans",
  helvetica: "Helvetica",
  times: "Times-Roman",
  garamond: "Label Garamond",
};

/**
 * Where a part goes and how it looks, from the label's layout: `place` moves and widens its box
 * (given in points, as standard), `k` is its text size as a multiple, and `font` its font family.
 */
function layoutOf(label: Label) {
  const of = (part: LayoutPart) => label.layout[part] ?? {};
  return {
    place: (part: LayoutPart, box: { left: number; top: number; width: number }) => ({
      position: "absolute" as const,
      left: box.left + (of(part).x ?? 0) * MM,
      top: box.top + (of(part).y ?? 0) * MM,
      width: (box.width * (of(part).width ?? 100)) / 100,
    }),
    k: (part: LayoutPart) => (of(part).size ?? 100) / 100,
    width: (part: LayoutPart) => (of(part).width ?? 100) / 100,
    font: (part: LayoutPart) => ({
      fontFamily: FAMILIES[of(part).font ?? LAYOUT_PARTS[label.size].find((p) => p.part === part)?.font ?? "open-sans"],
    }),
  };
}

/** "May contain: Milk & nuts", with the allergens in bold. */
function MayContain({ text, style }: { text: string; style: Style }) {
  return (
    <Text style={style}>
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
      <Text style={style}>
        <Text style={[s.bold, s.underline]}>Ingredients:</Text> {label.ingredients}
      </Text>
      <Text style={[style, notesStyle ?? {}]}>{label.ingredientNotes}</Text>
    </>
  );
}

/**
 * The nutrition panel. Sizes are in points: `size` for the rows' text, `line` between rows, and the
 * x of the per-serving and per-100 g columns. The empty corner can hold a note (small labels
 * put the packaging line there).
 */
function NutritionPanel({
  label,
  width,
  size,
  line,
  rowLine = line,
  columns,
  boxed,
  titleSize,
  corner,
  gaps,
  font: family,
}: {
  label: Label;
  font: { fontFamily: string };
  width: number;
  size: number;
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
    <View style={[s.panel, family, { width, fontSize: size, lineHeight: line / size }, boxed ? { borderWidth: 1, borderColor: "#444" } : rule]}>
      <View style={{ paddingHorizontal: 3, paddingTop: gaps.top, paddingBottom: gaps.section }}>
        <Text style={[s.panelTitle, family, { fontSize: titleSize, lineHeight: 1.2, marginBottom: gaps.title }]}>NUTRITION INFORMATION</Text>
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
        {NUTRITION_ROWS.map(([key, name]) => (
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
  const { place, k, width, font } = layoutOf(label);
  const icon = 7.6 * k("contact");
  return (
    <Page size={[W, H]} style={{ color: "#000" }}>
      {/* One page-sized box holds everything, so nothing that reaches the bottom edge starts a second page. */}
      <View style={{ position: "absolute", left: 0, top: 0, width: W, height: H }}>
        <Text style={[s.headline, font("headline"), place("headline", { left: 1, top: -1, width: W - 2 }), { fontSize: 8.9 * k("headline"), lineHeight: 1.26 }]}>
          {HEADLINE}
        </Text>

        <View style={place("nutrition", { left: 1.2, top: 27.4, width: 109.4 })}>
          <NutritionPanel
            label={label}
            font={font("nutrition")}
            width={109.4 * width("nutrition")}
            size={4.2 * k("nutrition")}
            line={6.85}
            rowLine={6.55}
            columns={[52.6 * width("nutrition"), 82 * width("nutrition")]}
            boxed
            titleSize={6.55 * k("nutrition")}
            gaps={{ top: 2.6, title: 2.6, section: 2.2 }}
          />
        </View>

        <View style={place("story", { left: 113, top: 27.6, width: W - 114.5 })}>
          {STORY.map((p) => (
            <Text key={p} style={[s.centre, font("story"), { fontSize: 4.85 * k("story"), lineHeight: 1.39 }]}>
              {p}
            </Text>
          ))}
        </View>

        <View style={place("ingredients", { left: 112, top: 85.4, width: 94 })}>
          <Ingredients label={label} style={{ ...font("ingredients"), fontSize: 4 * k("ingredients"), lineHeight: 1.5, textAlign: "center" }} />
          <MayContain text={label.mayContain} style={{ ...font("ingredients"), fontSize: 4 * k("ingredients"), marginTop: 1.4, marginLeft: 3 }} />
        </View>

        <View style={place("dates", { left: 111.6, top: 120.6, width: 50 })}>
          <Text style={[font("dates"), { fontSize: 4.1 * k("dates"), lineHeight: 1.7 }]}>Best Before {run.bestBefore}</Text>
          <Text style={[font("dates"), { fontSize: 4.1 * k("dates"), lineHeight: 1.7, marginLeft: 1.4 }]}>Batch # {run.batch}</Text>
        </View>
        <Text style={[s.centre, font("packaging"), place("packaging", { left: 163, top: 113.8, width: 45 }), { fontSize: 3.25 * k("packaging"), lineHeight: 1.38 }]}>
          Packaged in recycled alfoil and compostable wrapping  (ink is made by heat! No nastie dyes)
        </Text>

        <View style={place("contact", { left: 208, top: 93, width: W - 208 })}>
          <Text style={[s.bold, font("contact"), { fontSize: 4.1 * k("contact"), marginBottom: 4 }]}>Follow our journey..</Text>
          {[
            [<PhoneIcon key="p" size={icon} />, run.phone.replace(/\s+/g, "")],
            [<GlobeIcon key="g" size={icon} />, "sorellacacao.com.au"],
            [<InstagramIcon key="i" size={icon} />, "sorella_cacao"],
          ].map(([iconEl, text], i) => (
            <View key={i} style={[s.row, { alignItems: "center", marginBottom: 1.7 }]}>
              {iconEl}
              <Text style={[s.bold, font("contact"), { fontSize: 5.6 * k("contact"), marginLeft: 1.2 }]}>{text}</Text>
            </View>
          ))}
        </View>
      </View>
    </Page>
  );
}

/**
 * 32 × 50 mm, laid out like the Canva "Small Ingredients" labels. It prints on a 50 × 32 mm page with
 * the label turned on its side (it wraps around the bar portrait); `upright` keeps it upright, for
 * the preview in the Pod.
 */
function SmallLabel({ label, run, upright }: { label: Label; run: PrintRun; upright: boolean }) {
  const W = 50 * MM;
  const H = 32 * MM;
  const { place, k, width, font } = layoutOf(label);
  const text = { ...font("ingredients"), fontSize: 3.55 * k("ingredients"), lineHeight: 1.3 };
  const small = { ...font("dates"), fontSize: 3.3 * k("dates"), lineHeight: 1.17 };
  const contact = { ...font("contact"), fontSize: 3.3 * k("contact"), lineHeight: 1.17 };
  const follow = place("contact", { left: 46, top: 122.4, width: 38 });
  return (
    // The turned label is taller than the page, so its box is kept page-height and its contents spill
    // out of it (a taller box would be pushed onto a second page).
    <Page size={upright ? [H, W] : [W, H]} style={{ color: "#000" }}>
      <View
        style={
          upright
            ? { position: "absolute", left: 0, top: 0, width: H, height: W }
            : { position: "absolute", left: 0, top: 0, width: H, height: H, transformOrigin: "0 0", transform: `translate(0, ${H}) rotate(-90deg)` }
        }
      >
        <View style={place("nutrition", { left: 0, top: 15.3, width: H })}>
          <NutritionPanel
            label={label}
            font={font("nutrition")}
            width={H * width("nutrition")}
            size={3.15 * k("nutrition")}
            line={5.3}
            rowLine={5.6}
            columns={[42.4 * width("nutrition"), 62.5 * width("nutrition")]}
            boxed={false}
            titleSize={5.35 * k("nutrition")}
            gaps={{ top: 3, title: 3.1, section: 3 }}
            corner={
              // The note is in Open Sans, as in Canva, unless the panel is given a font.
              <Text
                style={[
                  s.centre,
                  label.layout.nutrition?.font ? font("nutrition") : { fontFamily: FAMILIES["open-sans"] },
                  { fontSize: 3 * k("nutrition"), lineHeight: 1.35, color: "#000" },
                ]}
              >
                Packaged in recycled alfoil and compostable wrapping
              </Text>
            }
          />
        </View>

        {/* After the panel, so its last line ("Cacao.") sits on top of the panel's first rule, as in Canva. */}
        <Text style={[s.headline, font("headline"), place("headline", { left: 0.6, top: 0.4, width: H - 1.2 }), { fontSize: 4.75 * k("headline"), lineHeight: 1.2 }]}>
          {HEADLINE}
        </Text>

        <View style={place("ingredients", { left: 0.8, top: 108.7, width: H - 1.4 })}>
          <Ingredients label={label} style={text} />
        </View>

        <Text style={[s.bold, contact, follow, { textAlign: "right" }]}>Follow our journey..</Text>
        <View style={place("dates", { left: 0.8, top: 128.5, width: 54 })}>
          <MayContain text={label.mayContain} style={small} />
          <Text style={[small, { marginLeft: 4.4 }]}>Batch # {run.batch}</Text>
          <Text style={small}>Best Before{run.bestBefore}</Text>
        </View>
        <View style={place("contact", { left: 56.8, top: 128.5, width: H - 57.4 })}>
          <Text style={contact}>{run.phone.replace(/\s+/g, "")}</Text>
          <Text style={contact}>sorellacacao.com.au</Text>
          <Text style={contact}>sorella_cacao</Text>
        </View>
      </View>
    </Page>
  );
}

/** The label as a PDF ready to print; `upright` turns small labels the right way up, for previews. */
export function renderLabelPdf(label: Label, run: PrintRun, { upright = false } = {}) {
  return renderToBuffer(
    <Document title={labelTitle(label)} author="Sorella Cacao">
      {label.size === "small" ? <SmallLabel label={label} run={run} upright={upright} /> : <LargeLabel label={label} run={run} />}
    </Document>,
  );
}
