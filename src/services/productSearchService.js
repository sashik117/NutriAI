import { nutriApi } from '@/api/nutriApi';
import {
  buildSearchResults,
  isSuspiciousTemplate,
  normalizeOpenFoodFactsProduct,
} from '@/domain/food/productSearchModel';
import { hasUsefulNutrition } from '@/lib/nutritionFallback';

export { cleanProduct } from '@/domain/food/productSearchModel';

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
      .map(normalizeOpenFoodFactsProduct)
      .filter((item) => item.name && hasUsefulNutrition(item) && !isSuspiciousTemplate(item));
  } catch {
    return [];
  }
}

async function fetchGeminiProducts(query) {
  try {
    const result = await nutriApi.integrations.Core.InvokeLLM({
      task: 'product_search',
      data: { query },
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

export async function searchProducts(query) {
  const offProducts = await fetchOpenFoodFacts(query);
  const geminiProducts = await fetchGeminiProducts(query);
  return buildSearchResults([...offProducts, ...geminiProducts], query);
}
