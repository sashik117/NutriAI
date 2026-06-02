import { repairNutritionItem } from '@/lib/nutritionFallback';

const round = (value, digits = 0) => {
  const factor = 10 ** digits;
  return Math.round((Number(value) || 0) * factor) / factor;
};

export function cleanFoodItemName(item, fallback = 'Їжа') {
  return String(
    item?.name ||
      item?.dish_name ||
      item?.meal_name ||
      item?.title ||
      item?.dish ||
      item?.food_name ||
      item?.description ||
      fallback
  )
    .replace(/\*/g, '')
    .trim();
}

export function normalizeFoodItem(item = {}) {
  const unit = item?.unit === 'ml' ? 'ml' : 'g';
  const amount = Math.max(Math.round(Number(item?.amount ?? item?.volume_ml ?? item?.weight_g) || 100), 1);
  const normalized = {
    name: cleanFoodItemName(item),
    unit,
    amount,
    weight_g: Math.max(Math.round(Number(item?.weight_g ?? item?.grams ?? amount) || 100), 1),
    calories: Math.max(Math.round(Number(item?.calories) || 0), 0),
    proteins: round(item?.proteins, 1),
    fats: round(item?.fats, 1),
    carbs: round(item?.carbs, 1),
  };

  return repairNutritionItem(normalized, normalized.name);
}

export function normalizeFoodResult(result = {}) {
  const items = (result?.items || []).map(normalizeFoodItem).filter((item) => item.name);
  const sum = (key) => round(items.reduce((total, item) => total + (Number(item[key]) || 0), 0), 1);

  return {
    description: String(
      result?.description ||
        items.map((item) => `${item.name} ${item.amount} ${item.unit === 'ml' ? 'мл' : 'г'}`).join(', ')
    )
      .replace(/\*/g, '')
      .trim(),
    items,
    total_calories: Math.round(Number(result?.total_calories) || sum('calories')),
    total_proteins: round(Number(result?.total_proteins) || sum('proteins'), 1),
    total_fats: round(Number(result?.total_fats) || sum('fats'), 1),
    total_carbs: round(Number(result?.total_carbs) || sum('carbs'), 1),
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
    total_proteins: round(normalized.total_proteins || 0, 1),
    total_fats: round(normalized.total_fats || 0, 1),
    total_carbs: round(normalized.total_carbs || 0, 1),
    date,
  };
}
