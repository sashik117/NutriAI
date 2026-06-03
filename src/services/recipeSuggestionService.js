import { nutriApi } from '@/api/nutriApi';

export function cleanAiText(value, fallback = '') {
  return String(value || fallback)
    .replace(/```json|```/gi, '')
    .replace(/[#*_`>~]/g, '')
    .replace(/^\s*[-•]\s*/gm, '')
    .replace(/\s+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function toNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const match = String(value || '').replace(',', '.').match(/\d+(\.\d+)?/);
  return match ? Number(match[0]) : 0;
}

function normalizeIngredient(item) {
  if (item && typeof item === 'object') {
    const name = cleanAiText(item.name || item.title || item.item || item.product);
    const amount = cleanAiText(item.amount || item.quantity || item.weight || item.serving);
    return [name, amount].filter(Boolean).join(' - ');
  }

  return cleanAiText(item);
}

export function normalizeRecipeSuggestion(result, isEnglish) {
  if (typeof result === 'string') {
    return { raw: cleanAiText(result) };
  }

  const title = cleanAiText(result?.title || result?.name, isEnglish ? 'Balanced meal idea' : 'Ідея страви');
  const ingredients = Array.isArray(result?.ingredients)
    ? result.ingredients.map((item) => normalizeIngredient(item)).filter(Boolean)
    : [];

  return {
    title,
    serving: cleanAiText(result?.serving || result?.portion || result?.grams, isEnglish ? '1 serving' : '1 порція'),
    ingredients,
    calories: Math.round(toNumber(result?.calories)),
    proteins: Math.round(toNumber(result?.proteins) * 10) / 10,
    fats: Math.round(toNumber(result?.fats) * 10) / 10,
    carbs: Math.round(toNumber(result?.carbs) * 10) / 10,
    note: cleanAiText(result?.note || result?.description),
  };
}

const recipeSchema = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    serving: { type: 'string' },
    ingredients: { type: 'array', items: { type: 'string' } },
    calories: { type: 'number' },
    proteins: { type: 'number' },
    fats: { type: 'number' },
    carbs: { type: 'number' },
    note: { type: 'string' },
  },
};

export async function generateRecipeSuggestion({ remainingCalories = 0, isEnglish = false }) {
  const targetCalories = Math.max(200, Math.round(remainingCalories || 0));
  const seed = Math.random().toString(36).slice(2, 8);
  const result = await nutriApi.integrations.Core.InvokeLLM({
    model: 'gemini_3_flash',
    task: 'recipe_suggestion',
    data: { targetCalories, isEnglish, seed },
    response_json_schema: recipeSchema,
  });

  return normalizeRecipeSuggestion(result, isEnglish);
}
