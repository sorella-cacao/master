// Catalogue copied verbatim from the Squarespace site (sorellacacao.com.au).
// Keep wording exactly as written — this file stands in for the database
// until we move products into Supabase.

import type { Product, Workshop } from "./types";

export const products: Product[] = [
  {
    "slug": "large-bar",
    "legacyUrlId": "product-2-5c6mb-j8mng-kdebn",
    "title": "Large Bar",
    "image": "/images/large-bar.webp",
    "optionName": "Flavour",
    "variants": [
      {
        "label": "84% Dark",
        "price": 14.0,
        "ingredients": "Roasted Cacao**(84%), rapadura sugar*(16%)"
      },
      {
        "label": "75% Dark",
        "price": 14.0,
        "ingredients": "Roasted Cacao**(75%), rapadura sugar* (25%)"
      },
      {
        "label": "Goats Milk",
        "price": 14.0,
        "ingredients": "Roasted Cacao**(60%), cacao butter*, Australian goats milk*, rapadura sugar*(25%)"
      },
      {
        "label": "Local Roasted Hazelnut Gianduja & Salt",
        "price": 14.0,
        "ingredients": "Roasted Cacao**, cacao butter*, rapadura sugar*, homemade roasted local hazelnut butter (orange region), crushed & roasted local hazelnuts, sea salt*"
      },
      {
        "label": "65% Dark & Local Mandarins",
        "price": 14.0,
        "ingredients": "Roasted Cacao**, cacao butter*, rapadura sugar*, local dried mandarins (Bilpin region)"
      },
      {
        "label": "White Choc w/ Local Peaches",
        "price": 14.0,
        "ingredients": "Cacao butter*, goats milk*, rapadura sugar*, rapadura sugar*, local peaches (yung region)"
      },
      {
        "label": "75% Smokey Smokey Chilli",
        "price": 14.0,
        "ingredients": "Smoke dried Cacao**, rapadura sugar*, cayenne pepper*"
      },
      {
        "label": "75% Dark Native Salt & Pepper",
        "price": 14.0,
        "ingredients": "Roasted Cacao**, rapadura sugar*, Tasmanian pepper berries**, flaky sea salt*"
      }
    ],
    "personalisedLabel": {
      "size": "large",
      "defaultFlavour": "75% Dark",
      "images": {
        "84% Dark": "/images/labels/large-84-dark.webp",
        "75% Dark": "/images/labels/large-75-dark.webp",
        "Goats Milk": "/images/labels/large-goats-milk.webp",
        "Local Roasted Hazelnut Gianduja & Salt": "/images/labels/large-hazelnut.webp",
        "65% Dark & Local Mandarins": "/images/labels/large-mandarin.webp",
        "White Choc w/ Local Peaches": "/images/labels/large-white-peaches.webp",
        "75% Smokey Smokey Chilli": "/images/labels/large-smoking-hot.webp",
        "75% Dark Native Salt & Pepper": "/images/labels/large-salt-pepper.webp"
      }
    },
    "ingredientsNote": "**Ethically Farmed *Organic",
    "description": [
      {
        "p": "108g"
      },
      {
        "p": "Handcrafted bean to bar chocolate."
      },
      {
        "p": "Cacao beans are ethically sourced from Ecuador, Solomon Island and Vanuatu."
      },
      {
        "p": "Using only organic and/or local ingredients."
      },
      {
        "p": "Everything is made by hand, with love and reverence to the process."
      },
      {
        "p": "Everything is sweetened by organic rapadura sugar!"
      },
      {
        "p": "PERSONALISED LABELS: Once you’ve chosen your flavour, choose “Yes” for a personalised label, then tap the label and write up to three words to print in place of “Sorella Cacao”. It’s $15 one-off for each wording, however many bars it goes on."
      }
    ]
  },
  {
    "slug": "small-bar",
    "legacyUrlId": "product-3-szb2y-gzh2r-7yeg3",
    "title": "Small Bar",
    "image": "/images/small-bar.webp",
    "optionName": "Flavour",
    "variants": [
      {
        "label": "84% Dark",
        "price": 8.0,
        "ingredients": "Cacao**(84%), rapadura sugar*(16%)"
      },
      {
        "label": "75% Dark",
        "price": 8.0,
        "ingredients": "Cacao**(75%), rapadura sugar* (25%)"
      },
      {
        "label": "60% Goats Milk",
        "price": 8.0,
        "ingredients": "Cacao**(60%), cacao butter*, goat milk*, rapadura sugar*(25%)"
      },
      {
        "label": "Local Roasted Hazelnut Gianduja",
        "price": 8.0,
        "ingredients": "Cacao**, cacao butter*, rapadura sugar*, homemade roasted hazelnut butter*, crushed & roasted hazelnuts*, sea salt*"
      },
      {
        "label": "75% Dark & Local Mandarins",
        "price": 8.0,
        "ingredients": "Cacao**, cacao butter*, rapadura sugar*, local dried mandarins"
      },
      {
        "label": "White Choc & Local Peaches",
        "price": 8.0,
        "ingredients": "Cacao butter*, goats milk*, rapadura sugar*, local peaches"
      }
    ],
    "personalisedLabel": {
      "size": "small",
      "defaultFlavour": "75% Dark",
      "images": {
        "84% Dark": "/images/labels/small-84-dark.webp",
        "75% Dark": "/images/labels/small-75-dark.webp",
        "60% Goats Milk": "/images/labels/small-goats-milk.webp",
        "Local Roasted Hazelnut Gianduja": "/images/labels/small-hazelnut.webp",
        "75% Dark & Local Mandarins": "/images/labels/small-mandarin.webp",
        "White Choc & Local Peaches": "/images/labels/small-white-peaches.webp"
      }
    },
    "ingredientsNote": "**Ethically Farmed *Organic",
    "description": [
      {
        "p": "50g"
      },
      {
        "p": "Handcrafted bean to bar chocolate."
      },
      {
        "p": "Cacao beans are ethically sourced from Ecuador, Solomon Island and Vanuatu."
      },
      {
        "p": "Using only organic and/or local ingredients."
      },
      {
        "p": "Everything is made by hand, with love and reverence to the process."
      },
      {
        "p": "Everything is sweetened by organic rapadura sugar!"
      },
      {
        "p": "PERSONALISED LABELS: Once you’ve chosen your flavour, choose “Yes” for a personalised label, then tap the label and write up to three words to print in place of “Sorella Cacao”. It’s $15 one-off for each wording, however many bars it goes on."
      }
    ]
  },
  {
    "slug": "pure-cacao",
    "legacyUrlId": "product-4-9e76d-pr6ls-fnkgx",
    "title": "Pure Cacao",
    "image": "/images/pure-cacao.webp",
    "optionName": "Size",
    "subscription": {
      "discount": 0.1,
      "interval": "Every month"
    },
    "variants": [
      {
        "label": "250g",
        "price": 35.0
      },
      {
        "label": "500g",
        "price": 60.0
      },
      {
        "label": "1kg",
        "price": 110.0
      }
    ],
    "description": [
      {
        "p": "Beans sourced from family run, sustainable cacao farms in Solomon Island & Ecuador"
      },
      {
        "p": "This medicine is a specifically cultivated light roast to ensure you are receiving the full medicine of Cacao."
      },
      {
        "p": "Raw (unroasted) cacao is cacao in its most ceremonial and traditional form, used for thousands of years as a sacred plant medicine. As it is not exposed to heat, raw cacao retains high levels of antioxidants that help protect cells, support heart and circulatory health, and gently stimulates the nervous system. Raw cacao is high in anandamide, the ‘bliss’ chemical and Tryptophan, the precursor to serotonin. This potency is what gives raw cacao its deeply heart-opening, emotionally activating quality, often used in ritual and intentional settings."
      },
      {
        "p": "Roasted cacao beans undergo heat, shifting cacao from a ceremonial medicine into a more grounding, nourishing food. Roasting can significantly reduce the heat sensitive antioxidants, bliss and happy compounds, however increases the bioavailability of minerals and nutrients such as iron, magnesium and potassium, making it easier for our guts to digest. The heat also increases phenylethylamine, the ‘love’ chemical, released when we fall in love. Roasting softens cacao’s stimulating effects for a calmer, more comforting experience, making roasted cacao ideal for everyday enjoyment, integration, and sharing, rather than deep ceremonial use."
      },
      {
        "p": "This medicine is roasted to a low heat that is a perfect balance to soften the cacaos stimulation, opening up the bioavailability of nutrients with only a slight reduction on the feel good compounds and antioxidants. Each sip, you are receiving cacao in her full magic and medicine."
      }
    ]
  }
];

export const workshops: Workshop[] = [
  {
    "slug": "chocolate-making-workshop-september-19th",
    "legacyUrlId": "open-studio-session-jtrxz-977yf",
    "title": "Chocolate Making Workshop- September 19th",
    "images": [
      "/images/home-bowl.webp",
      "/images/workshop-2.webp"
    ],
    "soldOut": false,
    "optionName": "Ticket Type",
    "variants": [
      {
        "label": "Adult $95",
        "price": 95.0,
        "soldOut": false
      },
      {
        "label": "Child $45",
        "price": 45.0,
        "soldOut": false
      }
    ],
    "description": [
      {
        "p": "Saturday 19th September, Lawson Blue Mountains"
      },
      {
        "p": "10am-1:30pm"
      },
      {
        "p": "Step into the world of chocolate with this hands on experience. Working from the cacao beans, you’ll craft your own chocolate bar through a roasting, winnowing and milling process. We’ll touch on the origins and rich history of Cacao over a warm hot chocolate."
      },
      {
        "p": "A truly decadent experience, where we appreciated chocolate in it’s purest form."
      },
      {
        "p": "On the day you'll enjoy:"
      },
      {
        "list": [
          "Learn, step by step, how to transform raw cacao beans into silky chocolate by roasting, cracking, winnowing, and milling your own cacao beans.",
          "Discover the fascinating history of cacao, from the ancient Mesoamerican civilizations through to modern bean-to-bar chocolate making.",
          "Sip a nourishing cup of warm ceremonial-style cacao as we settle into the experience.",
          "Master the art of tempering and create your own smoothly finished chocolate bar.",
          "Taste and compare a range of cacao beans and chocolates from different origins, discovering how land and processing influence flavour.",
          "Design and create your own personalised chocolate label before wrapping your handmade bar to take home.",
          "Connect with like-minded people in a relaxed, welcoming atmosphere filled with creativity, laughter, and community."
        ]
      },
      {
        "p": "Whether you're a chocolate lover, a curious foodie, or simply looking for a unique experience, you'll leave with new skills, a deeper appreciation for cacao, and a handcrafted chocolate bar to enjoy."
      },
      {
        "p": "Limited spots available."
      }
    ]
  },
  {
    "slug": "chocolate-making-workshop-october-24th",
    "legacyUrlId": "open-studio-session-jtrxz-jkylg",
    "title": "SOLD OUT Chocolate Making Workshop- October 24th",
    "images": [
      "/images/home-bowl.webp",
      "/images/workshop-2.webp"
    ],
    "soldOut": true,
    "optionName": "Ticket Type",
    "variants": [
      {
        "label": "Adult $95",
        "price": 95.0,
        "soldOut": true
      },
      {
        "label": "Child $45",
        "price": 45.0,
        "soldOut": true
      }
    ],
    "description": [
      {
        "p": "SOLD OUT"
      },
      {
        "p": "Saturday 24th October, Lawson Blue Mountains"
      },
      {
        "p": "10am-1:30pm"
      },
      {
        "p": "Step into the world of chocolate with this hands on experience. Working from the cacao beans, you’ll craft your own chocolate bar through a roasting, winnowing and milling process. We’ll touch on the origins and rich history of Cacao over a warm hot chocolate."
      },
      {
        "p": "A truly decadent experience, where we appreciated chocolate in it’s purest form."
      },
      {
        "p": "On the day you'll enjoy:"
      },
      {
        "list": [
          "Learn, step by step, how to transform raw cacao beans into silky chocolate by roasting, cracking, winnowing, and milling your own cacao beans.",
          "Discover the fascinating history of cacao, from the ancient Mesoamerican civilizations through to modern bean-to-bar chocolate making.",
          "Sip a nourishing cup of warm ceremonial-style cacao as we settle into the experience.",
          "Master the art of tempering and create your own smoothly finished chocolate bar.",
          "Taste and compare a range of cacao beans and chocolates from different origins, discovering how land and processing influence flavour.",
          "Design and create your own personalised chocolate label before wrapping your handmade bar to take home.",
          "Connect with like-minded people in a relaxed, welcoming atmosphere filled with creativity, laughter, and community."
        ]
      },
      {
        "p": "Whether you're a chocolate lover, a curious foodie, or simply looking for a unique experience, you'll leave with new skills, a deeper appreciation for cacao, and a handcrafted chocolate bar to enjoy."
      },
      {
        "p": "Limited spots available."
      }
    ]
  }
];
