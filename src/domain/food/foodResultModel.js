export const EMPTY_FOOD_RESULT_ITEM = {
  name: '',
  unit: 'g',
  amount: 100,
  weight_g: 100,
  calories: 0,
  proteins: 0,
  fats: 0,
  carbs: 0,
};

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function cleanName(value) {
  return String(value || '')
    .replace(/\*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeFoodResultItem(item = {}) {
  const unit = item?.unit === 'ml' ? 'ml' : 'g';
  const amount = Math.max(
    toNumber(item?.amount ?? item?.weight_g ?? item?.volume_ml ?? 100, 100),
    1
  );

  return {
    ...item,
    name: cleanName(item?.name || item?.title || item?.dish_name || item?.description),
    unit,
    amount,
    weight_g: Math.max(toNumber(item?.weight_g ?? (unit === 'g' ? amount : item?.grams), amount), 1),
    calories: toNumber(item?.calories, 0),
    proteins: toNumber(item?.proteins, 0),
    fats: toNumber(item?.fats, 0),
    carbs: toNumber(item?.carbs, 0),
  };
}

export function updateFoodResultItem(item, key, value) {
  const nextValue = key === 'name' || key === 'unit' ? value : toNumber(value, 0);
  const next = { ...item, [key]: nextValue };

  if (key === 'amount' && next.unit === 'g') {
    next.weight_g = toNumber(value, next.weight_g || 100);
  }

  if (key === 'unit' && value === 'g') {
    next.weight_g = toNumber(next.amount || next.weight_g || 100, 100);
  }

  return next;
}

export function summarizeFoodResultItems(items = []) {
  return items.reduce(
    (acc, item) => ({
      total_calories: acc.total_calories + toNumber(item.calories, 0),
      total_proteins: acc.total_proteins + toNumber(item.proteins, 0),
      total_fats: acc.total_fats + toNumber(item.fats, 0),
      total_carbs: acc.total_carbs + toNumber(item.carbs, 0),
    }),
    { total_calories: 0, total_proteins: 0, total_fats: 0, total_carbs: 0 }
  );
}

export function buildFoodResultSavePayload(result, items = []) {
  const normalizedItems = items.map(normalizeFoodResultItem).filter((item) => item.name);
  const totals = summarizeFoodResultItems(normalizedItems);

  return {
    ...result,
    total_calories: Math.round(totals.total_calories),
    total_proteins: Math.round(totals.total_proteins),
    total_fats: Math.round(totals.total_fats),
    total_carbs: Math.round(totals.total_carbs),
    items: normalizedItems,
  };
}
