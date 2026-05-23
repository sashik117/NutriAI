const round = (value, digits = 0) => {
  const factor = 10 ** digits;
  return Math.round((Number(value) || 0) * factor) / factor;
};

export function cleanFoodText(value, fallback = '') {
  return String(value || fallback)
    .replace(/\*/g, '')
    .replace(/[{}[\]"]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function hasUsefulNutrition(item) {
  const calories = Number(item?.calories) || 0;
  const macros = (Number(item?.proteins) || 0) + (Number(item?.fats) || 0) + (Number(item?.carbs) || 0);
  return calories > 5 || macros > 1;
}

const cookedWords = /варен|готов|cooked|відвар/i;

const profiles = [
  { re: /snickers|снікерс|сникерс/i, name: 'Snickers', amount: 50, unit: 'g', per100: { calories: 488, proteins: 8.6, fats: 24, carbs: 61 } },
  { re: /twix|твікс/i, name: 'Twix', amount: 50, unit: 'g', per100: { calories: 502, proteins: 4.9, fats: 24.9, carbs: 64 } },
  { re: /макарон|паста|спагет|penne|пенне/i, name: 'Макарони', amount: 100, unit: 'g', per100: { calories: 350, proteins: 12, fats: 1.5, carbs: 72 }, cooked: { calories: 150, proteins: 5, fats: 1, carbs: 31 } },
  { re: /греч/i, name: 'Гречка', amount: 100, unit: 'g', per100: { calories: 343, proteins: 13.3, fats: 3.4, carbs: 71.5 }, cooked: { calories: 110, proteins: 3.6, fats: 1.1, carbs: 21.3 } },
  { re: /рис/i, name: 'Рис', amount: 100, unit: 'g', per100: { calories: 360, proteins: 7, fats: 0.7, carbs: 78 }, cooked: { calories: 130, proteins: 2.7, fats: 0.3, carbs: 28 } },
  { re: /вівсян|овсян|пластів/i, name: 'Вівсяні пластівці', amount: 50, unit: 'g', per100: { calories: 370, proteins: 13, fats: 7, carbs: 60 } },
  { re: /молок/i, name: 'Молоко 2.5%', amount: 200, unit: 'ml', per100: { calories: 53, proteins: 2.9, fats: 2.5, carbs: 4.7 } },
  { re: /кефір|kefir/i, name: 'Кефір', amount: 250, unit: 'ml', per100: { calories: 50, proteins: 3, fats: 2.5, carbs: 4 } },
  { re: /йогурт/i, name: 'Йогурт', amount: 150, unit: 'g', per100: { calories: 75, proteins: 4, fats: 2.5, carbs: 9 } },
  { re: /сир кисломол|творог|cottage/i, name: 'Сир кисломолочний', amount: 150, unit: 'g', per100: { calories: 121, proteins: 17, fats: 5, carbs: 2 } },
  { re: /банан/i, name: 'Банан', amount: 120, unit: 'g', per100: { calories: 89, proteins: 1.1, fats: 0.3, carbs: 23 } },
  { re: /яблук/i, name: 'Яблуко', amount: 150, unit: 'g', per100: { calories: 52, proteins: 0.3, fats: 0.2, carbs: 14 } },
  { re: /кур(ка|яч)|філе/i, name: 'Куряче філе', amount: 150, unit: 'g', per100: { calories: 165, proteins: 31, fats: 3.6, carbs: 0 } },
  { re: /яйц/i, name: 'Яйця', amount: 100, unit: 'g', per100: { calories: 155, proteins: 13, fats: 11, carbs: 1.1 } },
  { re: /хліб|bread/i, name: 'Хліб', amount: 40, unit: 'g', per100: { calories: 250, proteins: 8, fats: 3, carbs: 49 } },
  { re: /борщ/i, name: 'Борщ', amount: 300, unit: 'g', per100: { calories: 55, proteins: 2.5, fats: 2.2, carbs: 6.5 } },
  { re: /салат/i, name: 'Салат', amount: 200, unit: 'g', per100: { calories: 80, proteins: 3, fats: 4, carbs: 8 } },
];

function pickProfile(name) {
  const text = String(name || '');
  const profile = profiles.find((item) => item.re.test(text));
  if (!profile) return null;
  const per100 = profile.cooked && cookedWords.test(text) ? profile.cooked : profile.per100;
  return { ...profile, per100 };
}

export function estimateNutritionFromName(name, overrides = {}) {
  const cleanedName = cleanFoodText(name, 'Продукт');
  const profile = pickProfile(cleanedName) || {
    name: cleanedName,
    amount: 100,
    unit: /молок|кефір|сік|напій|лате|кава|чай/i.test(cleanedName) ? 'ml' : 'g',
    per100: { calories: 180, proteins: 6, fats: 6, carbs: 24 },
  };

  const unit = overrides?.unit === 'ml' ? 'ml' : profile.unit;
  const amount = Math.max(round(overrides?.amount ?? overrides?.weight_g ?? profile.amount), 1);
  const ratio = amount / 100;

  return {
    ...overrides,
    name: cleanFoodText(overrides?.name, profile.name || cleanedName),
    serving_label: cleanFoodText(overrides?.serving_label, `${amount} ${unit === 'ml' ? 'мл' : 'г'}`),
    unit,
    amount,
    weight_g: Math.max(round(overrides?.weight_g ?? amount), 1),
    calories: Math.max(round(profile.per100.calories * ratio), 1),
    proteins: round(profile.per100.proteins * ratio, 1),
    fats: round(profile.per100.fats * ratio, 1),
    carbs: round(profile.per100.carbs * ratio, 1),
  };
}

export function repairNutritionItem(item, query = '') {
  const cleaned = {
    ...item,
    name: cleanFoodText(item?.name, query || 'Продукт'),
    serving_label: cleanFoodText(item?.serving_label, ''),
    calories: Math.max(round(item?.calories), 0),
    proteins: round(item?.proteins, 1),
    fats: round(item?.fats, 1),
    carbs: round(item?.carbs, 1),
  };

  if (hasUsefulNutrition(cleaned)) return cleaned;
  return estimateNutritionFromName(`${cleaned.name} ${query}`, cleaned);
}
