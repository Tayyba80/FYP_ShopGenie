// lib/ai.ts
import { RankingEngine } from '@/lib/ranking/rankingEngine';
import { ConstraintExtractor } from '@/lib/ranking/constraintExtractor';
import { getKnowledgeCache, setKnowledgeDb } from '@/lib/ranking/knowledgeCache';
import { ShopGenieExplanationModule } from '@/lib/explanation-module/explanationModule';
import { prisma } from '@/lib/prisma';
import type { Product, RankedProduct, ExplanationOutput } from '@/types/product';

setKnowledgeDb(prisma);

// ── Greeting detection ──────────────────────────────────────────
function isGreeting(message: string): boolean {
  const greetings = [
    'hello', 'hi', 'hey', 'greetings', 'good morning', 'good afternoon',
    'good evening', 'howdy', "what's up", 'sup', 'yo', 'hola', 'hi there',
    'morning', 'evening', 'afternoon',
  ];
  const lower = message.toLowerCase().trim();
  return greetings.some((g) => lower === g || lower.startsWith(g));
}

// ── Stop‑words (to be ignored when matching) ─────────────────────
const STOP_WORDS = new Set([
  'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', 'your',
  'yours', 'yourself', 'yourselves', 'he', 'him', 'his', 'himself', 'she',
  'her', 'hers', 'herself', 'it', 'its', 'itself', 'they', 'them', 'their',
  'theirs', 'themselves', 'what', 'which', 'who', 'whom', 'this', 'that',
  'these', 'those', 'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'having', 'do', 'does', 'did', 'doing', 'a', 'an',
  'the', 'and', 'but', 'if', 'or', 'because', 'as', 'until', 'while', 'of',
  'at', 'by', 'for', 'with', 'about', 'against', 'between', 'into', 'through',
  'during', 'before', 'after', 'above', 'below', 'to', 'from', 'up', 'down',
  'in', 'out', 'on', 'off', 'over', 'under', 'again', 'further', 'then',
  'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'both',
  'each', 'few', 'more', 'most', 'other', 'some', 'such', 'only', 'own',
  'same', 'so', 'than', 'too', 'very', 's', 't', 'can', 'will', 'just', 'don',
  'should', 'now', 'want', 'please', 'need', 'like', 'get', 'would', 'could',
  'may', 'might', 'must', 'shall', 'also', 'even', 'still', 'yet', 'ever',
  'almost', 'enough', 'actually', 'really', 'already', 'always', 'usually',
]);

const STATIC_PRODUCTS: Product[] = [
  {
    productId: 'wh-1000xm5',
    platform: 'amazon',
    title: 'Sony WH-1000XM5 Wireless Noise Cancelling Headphones',
    productUrl: 'https://amazon.com/sony-wh1000xm5',
    mainImageUrl: 'https://picsum.photos/seed/wh1000xm5/200',
    brand: 'Sony',
    model: 'WH-1000XM5',
    category: 'Electronics',
    description: 'Industry-leading noise cancellation with premium sound quality.',
    keyFeatures: ['noise cancelling', '30h battery', 'Bluetooth 5.2', 'multipoint connection'],
    price: { amount: 349, currency: 'USD' },
    availability: 'In Stock',
    rating: { average: 4.8, count: 12500 },
    reviews: [],
    timestamp: new Date().toISOString(),
  },
  {
    productId: 'airpods-pro-2',
    platform: 'bestbuy',
    title: 'Apple AirPods Pro (2nd Gen)',
    productUrl: 'https://bestbuy.com/airpodspro2',
    mainImageUrl: 'https://picsum.photos/seed/airpodspro2/200',
    brand: 'Apple',
    model: 'AirPods Pro 2',
    category: 'Electronics',
    description: 'Active Noise Cancellation, Transparency mode, and spatial audio.',
    keyFeatures: ['noise cancelling', 'spatial audio', 'MagSafe charging', 'sweat resistant'],
    price: { amount: 249, currency: 'USD' },
    availability: 'In Stock',
    rating: { average: 4.7, count: 23000 },
    reviews: [],
    timestamp: new Date().toISOString(),
  },
  {
    productId: 'galaxy-buds2-pro',
    platform: 'walmart',
    title: 'Samsung Galaxy Buds2 Pro',
    productUrl: 'https://walmart.com/galaxybuds2pro',
    mainImageUrl: 'https://picsum.photos/seed/buds2pro/200',
    brand: 'Samsung',
    model: 'Galaxy Buds2 Pro',
    category: 'Electronics',
    description: 'Hi-Fi sound with intelligent ANC and comfortable fit.',
    keyFeatures: ['noise cancelling', '24-bit audio', 'IPX7 water resistant', '18h total battery'],
    price: { amount: 179, currency: 'USD' },
    availability: 'In Stock',
    rating: { average: 4.5, count: 8700 },
    reviews: [],
    timestamp: new Date().toISOString(),
  },
  {
    productId: 'mk-tote-1',
    platform: 'amazon',
    title: 'Michael Kors Jet Set Large Tote Bag',
    productUrl: 'https://amazon.com/mk-jet-set-tote',
    mainImageUrl: 'https://picsum.photos/seed/mktote/200',
    brand: 'Michael Kors',
    model: 'Jet Set',
    category: 'Fashion',
    description: 'Elegant Saffiano leather tote with spacious interior.',
    keyFeatures: ['leather', 'large capacity', 'zip closure', 'signature MK print'],
    price: { amount: 298, currency: 'USD' },
    availability: 'In Stock',
    rating: { average: 4.7, count: 3200 },
    reviews: [],
    timestamp: new Date().toISOString(),
  },
  {
    productId: 'coach-crossbody',
    platform: 'ebay',
    title: 'Coach Pebbled Leather Crossbody Bag',
    productUrl: 'https://ebay.com/coach-crossbody',
    mainImageUrl: 'https://picsum.photos/seed/coach/200',
    brand: 'Coach',
    model: 'Pebble Crossbody',
    category: 'Fashion',
    description: 'Classic pebbled leather crossbody with adjustable strap.',
    keyFeatures: ['pebbled leather', 'adjustable strap', 'multiple pockets', 'magnetic clasp'],
    price: { amount: 195, currency: 'USD' },
    availability: 'In Stock',
    rating: { average: 4.6, count: 1800 },
    reviews: [],
    timestamp: new Date().toISOString(),
  },
  {
    productId: 'kate-spade-satchel',
    platform: 'walmart',
    title: 'Kate Spade New York Satchel Bag',
    productUrl: 'https://walmart.com/katespade-satchel',
    mainImageUrl: 'https://picsum.photos/seed/katespade/200',
    brand: 'Kate Spade',
    model: 'Satchel',
    category: 'Fashion',
    description: 'Chic satchel with a structured silhouette.',
    keyFeatures: ['structured design', 'top handle', 'removable strap', 'cotton lining'],
    price: { amount: 279, currency: 'USD' },
    availability: 'In Stock',
    rating: { average: 4.4, count: 950 },
    reviews: [],
    timestamp: new Date().toISOString(),
  },
  {
    productId: 'dyson-v15',
    platform: 'bestbuy',
    title: 'Dyson V15 Detect Cordless Vacuum Cleaner',
    productUrl: 'https://bestbuy.com/dyson-v15',
    mainImageUrl: 'https://picsum.photos/seed/dyson/200',
    brand: 'Dyson',
    model: 'V15 Detect',
    category: 'Home',
    description: 'Laser reveals microscopic dust, powerful suction.',
    keyFeatures: ['laser dust detection', '60min runtime', 'LCD screen', 'anti-tangle brush'],
    price: { amount: 749, currency: 'USD' },
    availability: 'In Stock',
    rating: { average: 4.8, count: 5600 },
    reviews: [],
    timestamp: new Date().toISOString(),
  },
  {
    productId: 'irobot-j7',
    platform: 'amazon',
    title: 'iRobot Roomba j7 Robot Vacuum',
    productUrl: 'https://amazon.com/roomba-j7',
    mainImageUrl: 'https://picsum.photos/seed/roomba/200',
    brand: 'iRobot',
    model: 'Roomba j7',
    category: 'Home',
    description: 'PrecisionVision navigation avoids obstacles like cords and pet waste.',
    keyFeatures: ['obstacle avoidance', 'self-emptying base', 'smart mapping', 'voice control'],
    price: { amount: 599, currency: 'USD' },
    availability: 'In Stock',
    rating: { average: 4.5, count: 8200 },
    reviews: [],
    timestamp: new Date().toISOString(),
  },
  {
    productId: 'shark-nv352',
    platform: 'walmart',
    title: 'Shark Navigator Lift-Away NV352 Vacuum',
    productUrl: 'https://walmart.com/shark-nv352',
    mainImageUrl: 'https://picsum.photos/seed/shark/200',
    brand: 'Shark',
    model: 'NV352',
    category: 'Home',
    description: 'Lightweight upright vacuum with detachable pod.',
    keyFeatures: ['lift-away canister', 'HEPA filter', 'swivel steering', 'pet hair attachment'],
    price: { amount: 179, currency: 'USD' },
    availability: 'In Stock',
    rating: { average: 4.4, count: 15000 },
    reviews: [],
    timestamp: new Date().toISOString(),
  },
  {
    productId: 'fitbit-charge-5',
    platform: 'amazon',
    title: 'Fitbit Charge 5 Advanced Fitness Tracker',
    productUrl: 'https://amazon.com/fitbit-charge5',
    mainImageUrl: 'https://picsum.photos/seed/fitbit/200',
    brand: 'Fitbit',
    model: 'Charge 5',
    category: 'Fitness',
    description: 'Built-in GPS, heart rate monitoring, and stress management tools.',
    keyFeatures: ['GPS', 'heart rate monitor', 'stress management', '7-day battery'],
    price: { amount: 149, currency: 'USD' },
    availability: 'In Stock',
    rating: { average: 4.6, count: 20000 },
    reviews: [],
    timestamp: new Date().toISOString(),
  },
  {
    productId: 'apple-watch-8',
    platform: 'bestbuy',
    title: 'Apple Watch Series 8',
    productUrl: 'https://bestbuy.com/apple-watch-8',
    mainImageUrl: 'https://picsum.photos/seed/a-watch8/200',
    brand: 'Apple',
    model: 'Series 8',
    category: 'Fitness',
    description: 'Advanced health monitoring with temperature sensor and crash detection.',
    keyFeatures: ['blood oxygen', 'ECG', 'temperature sensor', 'water resistant'],
    price: { amount: 399, currency: 'USD' },
    availability: 'In Stock',
    rating: { average: 4.7, count: 18000 },
    reviews: [],
    timestamp: new Date().toISOString(),
  },
  {
    productId: 'garmin-vivocactive4',
    platform: 'walmart',
    title: 'Garmin Vivoactive 4 Smartwatch',
    productUrl: 'https://walmart.com/garmin-vivoactive4',
    mainImageUrl: 'https://picsum.photos/seed/garmin/200',
    brand: 'Garmin',
    model: 'Vivoactive 4',
    category: 'Fitness',
    description: 'GPS smartwatch with animated workouts and music storage.',
    keyFeatures: ['GPS', 'music storage', 'body battery energy monitor', 'Pulse Ox'],
    price: { amount: 329, currency: 'USD' },
    availability: 'In Stock',
    rating: { average: 4.5, count: 9200 },
    reviews: [],
    timestamp: new Date().toISOString(),
  },
];

function extractKeywords(rawQuery: string): string[] {
  return rawQuery
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter((word) => word.length > 2)          // ignore 1-2 char words (like "a", "an", "on")
    .filter((word) => !STOP_WORDS.has(word));   // remove grammatical stop words
}

async function fetchProductsForQuery(query: string): Promise<Product[]> {
  const keywords = extractKeywords(query);
  if (keywords.length === 0) return [];         // no meaningful content → return nothing

  const matching = STATIC_PRODUCTS.filter((product) => {
    const searchText = [
      product.title,
      product.brand,
      product.category,
      ...(product.keyFeatures ?? []),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    // Require at least one keyword to match
    return keywords.some((kw) => searchText.includes(kw));
  });

  return matching;
}

export async function getAIResponse(
  history: { role: 'user' | 'assistant'; content: string }[]
): Promise<ExplanationOutput | string> {
  const lastUserMsg = [...history].reverse().find((m) => m.role === 'user');
  if (!lastUserMsg) {
    return "I'm your AI shopping assistant. What product can I help you find today?";
  }
  const query = lastUserMsg.content.trim();

  if (isGreeting(query)) {
    return "Hello! 👋 I'm ShopGenie, your personal AI shopping assistant. I can compare products across 100+ retailers and find the best deals for you. Just tell me what you're looking for!";
  }

  const products = await fetchProductsForQuery(query);
  if (products.length === 0) {
    return "I'm here to help you find the best products! 🛍️  I can search, compare, and recommend items like electronics, fashion, home goods, and more. Could you describe the product you're interested in?";
  }

  const cache = getKnowledgeCache();
  await cache.loadFromDb();
  await cache.learnFromProducts(products);
  ConstraintExtractor.setKnownBrands(cache.getBrands());
  ConstraintExtractor.initializeCanonicalFeatures(cache.getFeatures());

  const engine = new RankingEngine();
  const ranked = await engine.rankProducts(products, query);

  const explainer = new ShopGenieExplanationModule();
  const explanation: ExplanationOutput = await explainer.process(query, ranked);
  return explanation;   // return whole object, not just .chatResponse
}