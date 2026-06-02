export const EMPTY_MEAL_ITEM = {
  name: '',
  unit: 'g',
  amount: 100,
  weight_g: 100,
  calories: 0,
  proteins: 0,
  fats: 0,
  carbs: 0,
};

export function normalizeEditableMealItem(item = {}) {
  const unit = item?.unit === 'ml' ? 'ml' : 'g';
  const amount = Math.max(Number(item?.amount ?? item?.weight_g ?? 100) || 100, 1);
  return {
    ...EMPTY_MEAL_ITEM,
    ...item,
    unit,
    amount,
    weight_g: unit === 'g' ? amount : Number(item?.weight_g ?? amount),
  };
}

export function updateEditableMealItem(item, key, value) {
  const next = { ...item, [key]: key === 'name' || key === 'unit' ? value : Number(value) };
  if (key === 'amount' && next.unit === 'g') next.weight_g = Number(value);
  if (key === 'unit' && value === 'g') next.weight_g = Number(next.amount || 100);
  return next;
}

export function summarizeEditableMealItems(items = []) {
  return items.reduce((acc, item) => ({
    calories: acc.calories + (Number(item.calories) || 0),
    proteins: acc.proteins + (Number(item.proteins) || 0),
    fats: acc.fats + (Number(item.fats) || 0),
    carbs: acc.carbs + (Number(item.carbs) || 0),
  }), { calories: 0, proteins: 0, fats: 0, carbs: 0 });
}

export function buildMealUpdatePayload({ mealType, items }) {
  const normalizedItems = items.map(normalizeEditableMealItem);
  const totals = summarizeEditableMealItems(normalizedItems);
  return {
    meal_type: mealType,
    items: normalizedItems,
    total_calories: Math.round(totals.calories),
    total_proteins: Math.round(totals.proteins),
    total_fats: Math.round(totals.fats),
    total_carbs: Math.round(totals.carbs),
  };
}
