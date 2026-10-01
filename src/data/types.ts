/** A block of original copy: a paragraph or a bulleted list. */
export type ContentBlock = { p: string } | { list: string[] };

export type Variant = {
  label: string;
  price: number;
  soldOut?: boolean;
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
