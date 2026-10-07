/** A block of original copy: a paragraph or a bulleted list. */
export type ContentBlock = { p: string } | { list: string[] };

export type Variant = {
  label: string;
  price: number;
  soldOut?: boolean;
};

/** A bar's printed labels, used to preview a customer's personalised wording. */
export type PersonalisedLabel = {
  size: "large" | "small";
  /** Label artwork (with the "Sorella Cacao" heading removed), keyed by flavour. */
  images: Record<string, string>;
  /** Flavour whose label is shown before one is chosen. */
  defaultFlavour: string;
};

export type Product = {
  slug: string;
  /** Squarespace URL id, used to redirect old /shop/p/... links. */
  legacyUrlId: string;
  title: string;
  image: string;
  optionName: string;
  variants: Variant[];
  /** Optional subscribe-and-save, as offered on Pure Cacao. */
  subscription?: { discount: number; interval: string };
  /** Offered on the chocolate bars: customers can replace "Sorella Cacao" on the label. */
  personalisedLabel?: PersonalisedLabel;
  description: ContentBlock[];
};

export type Workshop = {
  slug: string;
  legacyUrlId: string;
  title: string;
  images: string[];
  soldOut: boolean;
  optionName: string;
  variants: Variant[];
  description: ContentBlock[];
};
