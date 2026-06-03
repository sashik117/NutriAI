import { nutriApi } from '@/api/nutriApi';
import { hasUsefulNutrition, repairNutritionItem } from '@/lib/nutritionFallback';

function cleanText(value, fallback = '') {
  return String(value || fallback).replace(/\*/g, '').replace(/[•]/g, '').replace(/\s+/g, ' ').trim();
}

export function extractBarcode(rawValue) {
  return String(rawValue || '').match(/\d{8,14}/)?.[0] || String(rawValue || '').trim();
}

function normalizeOpenFoodFacts(product, code) {
  const nutriments = product?.nutriments || {};
  const weight = Math.max(Number(product?.serving_quantity || product?.product_quantity || 100) || 100, 1);
  const ratio = weight / 100;
  const per100 = {
    calories: Number(nutriments['energy-kcal_100g']) || Number(nutriments['energy-kcal']) || 0,
    proteins: Number(nutriments.proteins_100g) || 0,
    fats: Number(nutriments.fat_100g) || 0,
    carbs: Number(nutriments.carbohydrates_100g) || 0,
  };

  const normalized = {
    barcode: code,
    name: cleanText(product?.product_name || product?.generic_name, `Продукт ${code}`),
    brand: cleanText(product?.brands?.split(',')?.[0]),
    serving_label: cleanText(product?.serving_size, `${Math.round(weight)} г`),
    unit: 'g',
    amount: Math.round(weight),
    weight_g: Math.round(weight),
    calories: Math.round(per100.calories * ratio),
    proteins: Math.round(per100.proteins * ratio * 10) / 10,
    fats: Math.round(per100.fats * ratio * 10) / 10,
    carbs: Math.round(per100.carbs * ratio * 10) / 10,
  };

  return repairNutritionItem(normalized, product?.product_name || product?.generic_name || code);
}

function normalizeVisionProduct(result, barcodeHint = '') {
  const packageWeight = Math.max(Number(result?.package_weight_g || result?.weight_g || 100) || 100, 1);
  const ratio = packageWeight / 100;
  const caloriesPer100 = Number(result?.calories_per_100g || result?.per100?.calories || 0);
  const proteinsPer100 = Number(result?.proteins_per_100g || result?.per100?.proteins || 0);
  const fatsPer100 = Number(result?.fats_per_100g || result?.per100?.fats || 0);
  const carbsPer100 = Number(result?.carbs_per_100g || result?.per100?.carbs || 0);

  const normalized = {
    barcode: cleanText(result?.barcode, barcodeHint),
    name: cleanText(result?.name, barcodeHint ? `Продукт ${barcodeHint}` : 'Продукт'),
    brand: cleanText(result?.brand),
    serving_label: cleanText(result?.serving_label, `${Math.round(packageWeight)} г`),
    unit: result?.unit === 'ml' ? 'ml' : 'g',
    amount: Math.max(Math.round(Number(result?.amount ?? result?.volume_ml ?? packageWeight) || packageWeight), 1),
    weight_g: Math.round(packageWeight),
    calories: Math.max(Math.round(Number(result?.calories_total || result?.calories) || caloriesPer100 * ratio), 1),
    proteins: Math.round((Number(result?.proteins_total || result?.proteins) || proteinsPer100 * ratio) * 10) / 10,
    fats: Math.round((Number(result?.fats_total || result?.fats) || fatsPer100 * ratio) * 10) / 10,
    carbs: Math.round((Number(result?.carbs_total || result?.carbs) || carbsPer100 * ratio) * 10) / 10,
  };

  return repairNutritionItem(normalized, result?.name || barcodeHint);
}

export async function fetchProductByBarcode(code) {
  const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${encodeURIComponent(code)}.json`);
  if (!response.ok) return null;
  const data = await response.json();
  if (data.status !== 1 || !data.product) return null;
  const product = normalizeOpenFoodFacts(data.product, code);
  return hasUsefulNutrition(product) ? product : null;
}

const productLabelSchema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    brand: { type: 'string' },
    barcode: { type: 'string' },
    serving_label: { type: 'string' },
    unit: { type: 'string' },
    amount: { type: 'number' },
    weight_g: { type: 'number' },
    package_weight_g: { type: 'number' },
    calories_per_100g: { type: 'number' },
    proteins_per_100g: { type: 'number' },
    fats_per_100g: { type: 'number' },
    carbs_per_100g: { type: 'number' },
    calories_total: { type: 'number' },
    proteins_total: { type: 'number' },
    fats_total: { type: 'number' },
    carbs_total: { type: 'number' },
    calories: { type: 'number' },
    proteins: { type: 'number' },
    fats: { type: 'number' },
    carbs: { type: 'number' },
  },
};

export async function analyzeProductLabel(file, barcodeHint = '') {
  const { file_url } = await nutriApi.integrations.Core.UploadFile({ file });
  const result = await nutriApi.integrations.Core.InvokeLLM({
    task: 'product_label',
    data: { barcodeHint },
    file_urls: [file_url],
    model: 'gemini_3_flash',
    response_json_schema: productLabelSchema,
  });

  return normalizeVisionProduct(result, barcodeHint);
}
