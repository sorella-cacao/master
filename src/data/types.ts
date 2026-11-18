/** A block of original copy: a paragraph or a bulleted list. */
export type ContentBlock = { p: string } | { list: string[] };

export type Variant = {
  label: string;
  price: number;
  soldOut?: boolean;
  /** Shown under the option menu once this option is chosen. */
  ingredients?: string;
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
  title: string;
  image: string;
  optionName: string;
  variants: Variant[];
  /** Optional subscribe-and-save, as offered on Pure Cacao. */
  subscription?: { discount: number; interval: string };
  /** Offered on the chocolate bars: customers can replace "Sorella Cacao" on the label. */
  personalisedLabel?: PersonalisedLabel;
  /** Key to the asterisks in the variants' ingredients. */
  ingredientsNote?: string;
  /** The last day it can be ordered ("2026-12-20"), for seasonal products like the Christmas bundle. */
  availableUntil?: string;
  /** A line under the heading on its page. */
  subheading?: string;
  description: ContentBlock[];
};

/** The strip across the top of every page and the banner on the home page, for one product. */
export type Promo = {
  stripText: string;
  bannerTitle: string;
  bannerText: string;
  /** `price` is the lowest; `priceFrom` when there are dearer options too (shown as "from $24"). */
  product: { slug: string; title: string; image: string; price: number; priceFrom: boolean; availableUntil?: string };
};

export type Workshop = {
  slug: string;
  title: string;
  images: string[];
  soldOut: boolean;
  optionName: string;
  variants: Variant[];
  description: ContentBlock[];
};
