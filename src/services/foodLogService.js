import { repairNutritionItem } from '@/lib/nutritionFallback';

export function normalizeFoodItem(item) {
  const unit = item?.unit === 'ml' ? 'ml' : 'g';
  const amount = Math.max(Math.round(Number(item?.amount ?? item?.volume_ml ?? item?.weight_g) || 100), 1);
  const normalized = {
    name: String(item?.name || item?.dish_name || item?.meal_name || item?.title || item?.dish || item?.food_name || item?.description || 'Їжа').replace(/\*/g, '').trim(),
    unit,
    amount,
    weight_g: Math.max(Math.round(Number(item?.weight_g ?? item?.grams ?? amount) || 100), 1),
    calories: Math.max(Math.round(Number(item?.calories) || 0), 0),
    proteins: Math.round((Number(item?.proteins) || 0) * 10) / 10,
    fats: Math.round((Number(item?.fats) || 0) * 10) / 10,
    carbs: Math.round((Number(item?.carbs) || 0) * 10) / 10,
  };
  return repairNutritionItem(normalized, normalized.name);
}

export function normalizeFoodResult(result) {
  const items = (result?.items || []).map(normalizeFoodItem).filter((item) => item.name);
  const sum = (key) => Math.round(items.reduce((total, item) => total + (Number(item[key]) || 0), 0) * 10) / 10;

  return {
    description: String(result?.description || items.map((item) => `${item.name} ${item.amount} ${item.unit === 'ml' ? 'мл' : 'г'}`).join(', ')).replace(/\*/g, '').trim(),
    items,
    total_calories: Math.round(Number(result?.total_calories) || sum('calories')),
    total_proteins: Math.round((Number(result?.total_proteins) || sum('proteins')) * 10) / 10,
    total_fats: Math.round((Number(result?.total_fats) || sum('fats')) * 10) / 10,
    total_carbs: Math.round((Number(result?.total_carbs) || sum('carbs')) * 10) / 10,
    ai_tip: String(result?.ai_tip || '').replace(/\*/g, '').trim(),
  };
}

export function buildFoodLogPayload({ result, mealType, date }) {
  const normalized = normalizeFoodResult(result);
  return {
    meal_type: mealType,
    description: normalized.description,
    items: normalized.items,
    total_calories: Math.round(normalized.total_calories || 0),
    total_proteins: Math.round((normalized.total_proteins || 0) * 10) / 10,
    total_fats: Math.round((normalized.total_fats || 0) * 10) / 10,
    total_carbs: Math.round((normalized.total_carbs || 0) * 10) / 10,
    date,
  };
}
