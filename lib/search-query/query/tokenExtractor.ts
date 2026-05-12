import type { IntentSortBy } from "../types";

const BRANDS: Record<string, string[]> = {
  laptop: ["dell", "hp", "lenovo", "apple", "asus", "acer", "msi", "samsung", "huawei", "lg"],
  phone: ["samsung", "apple", "iphone", "xiaomi", "oppo", "vivo", "realme", "oneplus", "google", "nokia", "huawei", "infinix", "tecno"],
  tv: ["samsung", "lg", "sony", "tcl", "haier", "hisense", "orient", "pel"],
  fridge: ["samsung", "lg", "haier", "dawlance", "pel", "waves", "orient"],
  ac: ["samsung", "lg", "haier", "gree", "kenwood", "orient", "pel", "dawlance"],
  headphones: ["sony", "jbl", "bose", "apple", "samsung", "sennheiser", "beats", "anker"],
  watch: ["apple", "samsung", "xiaomi", "huawei", "amazfit"],
  tablet: ["apple", "samsung", "lenovo", "huawei", "xiaomi"],
  camera: ["canon", "nikon", "sony", "fujifilm", "panasonic"],
  generic: [],
};

const PRODUCT_KEYWORDS: Record<string, string[]> = {
  laptop: ["laptop", "notebook", "macbook", "chromebook"],
  phone: ["phone", "mobile", "smartphone", "iphone", "android"],
  tv: ["tv", "television", "smart tv", "oled", "qled", "led tv"],
  fridge: ["fridge", "refrigerator", "freezer"],
  ac: ["ac", "air conditioner", "air conditioning", "split ac", "inverter ac"],
  headphones: ["headphone", "earphone", "earbud", "airpod", "headset", "earbuds"],
  watch: ["watch", "smartwatch", "smart watch"],
  tablet: ["tablet", "ipad"],
  camera: ["camera", "dslr", "mirrorless"],
};

const FEATURE_KEYWORDS = [
  "gaming",
  "lightweight",
  "thin",
  "slim",
  "fast",
  "ssd",
  "touchscreen",
  "2-in-1",
  "backlit keyboard",
  "fingerprint",
  "4k",
  "oled",
  "5g",
  "4g",
  "waterproof",
  "wireless charging",
  "fast charging",
  "foldable",
  "good camera",
  "long battery",
  "big screen",
  "small",
  "energy saving",
  "inverter",
  "wifi",
  "bluetooth",
  "usb-c",
];

const SORT_KEYWORDS: Record<IntentSortBy, string[]> = {
  price_asc: ["cheapest", "lowest price", "budget", "affordable", "cheap", "inexpensive", "under", "less than"],
  price_desc: ["most expensive", "premium", "high end", "best quality", "luxury", "top of the line"],
  rating: ["best rated", "highest rated", "top rated", "most popular", "best reviewed", "recommended"],
  relevance: [],
};

export function extractProductType(query: string): string {
  for (const [type, keywords] of Object.entries(PRODUCT_KEYWORDS)) {
    if (keywords.some((keyword) => query.includes(keyword))) {
      return type;
    }
  }

  const words = query.replace(/[^a-z0-9 ]/g, "").split(" ").filter(Boolean);
  return words[0] ?? "product";
}

export function extractBrands(query: string, productType: string): string[] {
  const relevantBrands = [
    ...(BRANDS[productType] ?? []),
    ...BRANDS.generic,
  ];

  return relevantBrands.filter((brand) => query.includes(brand));
}

export function extractExcludedBrands(query: string, brands: string[]): string[] {
  return brands.filter((brand) => {
    const escaped = brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`(?:no|not|except|without)\\s+${escaped}\\b`);
    return pattern.test(query);
  });
}

export function extractFeatures(query: string): string[] {
  const found = new Set<string>();

  for (const feature of FEATURE_KEYWORDS) {
    if (query.includes(feature)) {
      found.add(feature);
    }
  }

  const ramMatch = query.match(/(\d+)\s*gb\s*(?:ram|memory)?/);
  if (ramMatch) {
    found.add(`${ramMatch[1]}GB RAM`);
  }

  const storageMatch = query.match(/(\d+)\s*(gb|tb)\s*(?:ssd|storage|hdd|nvme)/);
  if (storageMatch) {
    found.add(`${storageMatch[1]}${storageMatch[2].toUpperCase()} storage`);
  }

  const screenMatch = query.match(/(\d+(?:\.\d+)?)\s*(?:inch|")/);
  if (screenMatch) {
    found.add(`${screenMatch[1]} inch`);
  }

  return [...found];
}

export function extractSortBy(query: string): IntentSortBy {
  for (const [sortBy, keywords] of Object.entries(SORT_KEYWORDS) as Array<[IntentSortBy, string[]]>) {
    if (keywords.some((keyword) => query.includes(keyword))) {
      return sortBy;
    }
  }

  return "relevance";
}

export function extractLimit(query: string): number | null {
  const match = query.match(/(?:top|show|give me|find)\s+(\d{1,2})\b/);

  if (!match) {
    return null;
  }

  const limit = Number.parseInt(match[1], 10);
  return Number.isFinite(limit) ? limit : null;
}
