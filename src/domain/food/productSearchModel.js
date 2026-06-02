import {
  cleanFoodText,
  estimateNutritionFromName,
  hasUsefulNutrition,
  repairNutritionItem,
} from '../../lib/nutritionFallback.js';

export const roundProductNumber = (value, digits = 0) => {
  const factor = 10 ** digits;
  return Math.round((Number(value) || 0) * factor) / factor;
};

export function decodeHtml(value) {
  return String(value || '')
    .replace(/&quot;|&#34;/gi, '"')
    .replace(/&amp;/gi, '&')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&nbsp;/gi, ' ');
}

export function stripBrandNoise(name, brand = '') {
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

export function canonicalProductGroup(product, query = '') {
  const text = `${product?.name || ''} ${query}`.toLowerCase();
  if (/spaghetti|спагет/.test(text)) return 'spaghetti';
  if (/макарон|pasta|penne|fusilli|farfalle|вермішел/.test(text)) return 'pasta';
  if (/snickers|снікерс|сникерс/.test(text)) return 'snickers';
  if (/twix|твікс/.test(text)) return 'twix';
  return cleanFoodText(product?.name).toLowerCase().slice(0, 24);
}

export function isSuspiciousTemplate(product) {
  const calories = Math.round(Number(product?.calories) || 0);
  const proteins = roundProductNumber(product?.proteins, 1);
  const fats = roundProductNumber(product?.fats, 1);
  const carbs = roundProductNumber(product?.carbs, 1);
  return calories === 200 && proteins === 8 && fats === 6 && carbs === 28;
}

export function forceProductEstimate(product, query) {
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
    proteins: roundProductNumber(product?.proteins, 1),
    fats: roundProductNumber(product?.fats, 1),
    carbs: roundProductNumber(product?.carbs, 1),
    ingredients: cleanFoodText(product?.ingredients, ''),
    source: product?.source || '',
  };

  if (isSuspiciousTemplate(cleaned)) return forceProductEstimate(cleaned, query);
  return repairNutritionItem(cleaned, query);
}

export function normalizeOpenFoodFactsProduct(product) {
  const nutriments = product?.nutriments || {};
  return {
    name: stripBrandNoise(product?.product_name || product?.generic_name || product?.brands, product?.brands),
    brand: cleanFoodText(decodeHtml(product?.brands?.split(',')?.[0]), ''),
    serving_label: '100 г',
    unit: 'g',
    amount: 100,
    weight_g: 100,
    calories: Math.round(Number(nutriments['energy-kcal_100g']) || 0),
    proteins: roundProductNumber(nutriments.proteins_100g, 1),
    fats: roundProductNumber(nutriments.fat_100g, 1),
    carbs: roundProductNumber(nutriments.carbohydrates_100g, 1),
    ingredients: '',
    source: 'OpenFoodFacts',
  };
}

export function dedupeProducts(products, query) {
  const seen = new Set();
  return products.filter((product) => {
    const key = [
      canonicalProductGroup(product, query),
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

export function buildSearchResults(products, query) {
  const cleaned = dedupeProducts(
    products
      .map((product) => cleanProduct(product, query))
      .map((product) => (isSuspiciousTemplate(product) ? forceProductEstimate(product, query) : product))
      .filter((item) => item.name && hasUsefulNutrition(item) && !isSuspiciousTemplate(item)),
    query
  );

  return cleaned.length ? cleaned.slice(0, 5) : [forceProductEstimate({ name: query }, query)];
}
