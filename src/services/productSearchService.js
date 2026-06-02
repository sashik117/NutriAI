import { nutriApi } from '@/api/nutriApi';
import { cleanFoodText, estimateNutritionFromName, hasUsefulNutrition, repairNutritionItem } from '@/lib/nutritionFallback';

const round = (value, digits = 0) => {
  const factor = 10 ** digits;
  return Math.round((Number(value) || 0) * factor) / factor;
};

function decodeHtml(value) {
  return String(value || '')
    .replace(/&quot;|&#34;/gi, '"')
    .replace(/&amp;/gi, '&')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&nbsp;/gi, ' ');
}

function stripBrandNoise(name, brand = '') {
  let value = cleanFoodText(decodeHtml(name), '');
  const brandParts = String(brand || '').split(',').map((item) => cleanFoodText(item)).filter(Boolean);
  brandParts.forEach((part) => {
    if (part.length >= 3) value = value.replace(new RegExp(part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'ig'), '');
  });

  value = value
    .replace(/["'`«»“”]/g, ' ')
    .replace(/\b(de luxe|deluxe|premium|classic|original|brand|product)\b/gi, ' ')
    .replace(/\s*[-–—|,:;]\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const lower = `${value} ${name}`.toLowerCase();
  if (/spaghetti|спагет/.test(lower)) return 'Спагетті';
  if (/макарон|pasta|penne|fusilli|farfalle|вермішел/.test(lower)) return 'Макарони';
  if (/snickers|снікерс|сникерс/.test(lower)) return 'Snickers';
  if (/twix|твікс/.test(lower)) return 'Twix';

  return value || cleanFoodText(name, 'Продукт');
}

function canonicalGroup(product, query = '') {
  const text = `${product?.name || ''} ${query}`.toLowerCase();
  if (/spaghetti|спагет/.test(text)) return 'spaghetti';
  if (/макарон|pasta|penne|fusilli|farfalle|вермішел/.test(text)) return 'pasta';
  if (/snickers|снікерс|сникерс/.test(text)) return 'snickers';
  if (/twix|твікс/.test(text)) return 'twix';
  return cleanFoodText(product?.name).toLowerCase().slice(0, 24);
}

function isSuspiciousTemplate(product) {
  const calories = Math.round(Number(product?.calories) || 0);
  const proteins = round(product?.proteins, 1);
  const fats = round(product?.fats, 1);
  const carbs = round(product?.carbs, 1);
  return calories === 200 && proteins === 8 && fats === 6 && carbs === 28;
}

function forceEstimate(product, query) {
  return estimateNutritionFromName(`${product?.name || query} ${query}`, {
    ...product,
    calories: 0,
    proteins: 0,
    fats: 0,
    carbs: 0,
  });
}

export function cleanProduct(product, query = '') {
  const unit = product?.unit === 'ml' ? 'ml' : 'g';
  const amount = Math.max(Math.round(Number(product?.amount ?? product?.volume_ml ?? product?.weight_g) || 100), 1);
  const brand = cleanFoodText(decodeHtml(product?.brand || product?.brands || product?.ingredients), '');
  const cleaned = {
    name: stripBrandNoise(product?.name || query, brand),
    brand,
    serving_label: cleanFoodText(product?.serving_label, `${amount} ${unit === 'ml' ? 'мл' : 'г'}`),
    unit,
    amount,
    weight_g: Math.max(Math.round(Number(product?.weight_g ?? product?.grams ?? amount) || amount), 1),
    calories: Math.max(Math.round(Number(product?.calories) || 0), 0),
    proteins: round(product?.proteins, 1),
    fats: round(product?.fats, 1),
    carbs: round(product?.carbs, 1),
    ingredients: cleanFoodText(product?.ingredients, ''),
    source: product?.source || '',
  };

  if (isSuspiciousTemplate(cleaned)) return forceEstimate(cleaned, query);
  return repairNutritionItem(cleaned, query);
}

function normalizeOpenFoodFacts(product) {
  const nutriments = product?.nutriments || {};
  return {
    name: stripBrandNoise(product?.product_name || product?.generic_name || product?.brands, product?.brands),
    brand: cleanFoodText(decodeHtml(product?.brands?.split(',')?.[0]), ''),
    serving_label: '100 г',
    unit: 'g',
    amount: 100,
    weight_g: 100,
    calories: Math.round(Number(nutriments['energy-kcal_100g']) || 0),
    proteins: round(nutriments.proteins_100g, 1),
    fats: round(nutriments.fat_100g, 1),
    carbs: round(nutriments.carbohydrates_100g, 1),
    ingredients: '',
    source: 'OpenFoodFacts',
  };
}

async function fetchOpenFoodFacts(query) {
  const url = new URL('https://world.openfoodfacts.org/cgi/search.pl');
  url.searchParams.set('search_terms', query);
  url.searchParams.set('search_simple', '1');
  url.searchParams.set('action', 'process');
  url.searchParams.set('json', '1');
  url.searchParams.set('page_size', '5');
  url.searchParams.set('fields', 'product_name,generic_name,brands,nutriments');

  try {
    const response = await fetch(url.toString());
    if (!response.ok) return [];
    const data = await response.json();
    return (data.products || [])
      .map(normalizeOpenFoodFacts)
      .filter((item) => item.name && hasUsefulNutrition(item) && !isSuspiciousTemplate(item));
  } catch {
    return [];
  }
}

async function fetchGeminiProducts(query) {
  try {
    const result = await nutriApi.integrations.Core.InvokeLLM({
      prompt: `Give realistic average nutrition data for "${query}" per 100 grams.
Return only JSON.
Rules:
- Each product must be for 100 g, unit "g", amount 100, weight_g 100.
- Never reuse this placeholder template: 200 kcal, protein 8, fat 6, carbs 28.
- Snickers is usually about 480-500 kcal per 100 g, fat about 23-25 g, carbs about 60-65 g.
- Dry pasta is usually about 340-370 kcal per 100 g and fat about 1-2 g.
- If exact brand data is unknown, give an honest realistic estimate.
- Do not use markdown or explanatory text.`,
      response_json_schema: {
        type: 'object',
        properties: {
          products: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                serving_label: { type: 'string' },
                unit: { type: 'string' },
                amount: { type: 'number' },
                weight_g: { type: 'number' },
                calories: { type: 'number' },
                proteins: { type: 'number' },
                fats: { type: 'number' },
                carbs: { type: 'number' },
                ingredients: { type: 'string' },
              },
            },
          },
        },
      },
      model: 'gemini_3_flash',
    });

    return (result.products || []).map((product) => ({ ...product, source: 'Gemini' }));
  } catch {
    return [];
  }
}

function dedupeProducts(products, query) {
  const seen = new Set();
  return products.filter((product) => {
    const key = [
      canonicalGroup(product, query),
      Math.round((Number(product.calories) || 0) / 25) * 25,
      Math.round((Number(product.proteins) || 0) / 2) * 2,
      Math.round((Number(product.fats) || 0) / 2) * 2,
      Math.round((Number(product.carbs) || 0) / 5) * 5,
    ].join('|');
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function searchProducts(query) {
  const offProducts = await fetchOpenFoodFacts(query);
  const geminiProducts = await fetchGeminiProducts(query);
  const cleaned = dedupeProducts([...offProducts, ...geminiProducts]
    .map((product) => cleanProduct(product, query))
    .map((product) => (isSuspiciousTemplate(product) ? forceEstimate(product, query) : product))
    .filter((item) => item.name && hasUsefulNutrition(item) && !isSuspiciousTemplate(item)), query);

  return cleaned.length ? cleaned.slice(0, 5) : [forceEstimate({ name: query }, query)];
}
