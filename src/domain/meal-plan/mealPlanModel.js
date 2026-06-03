export const PLAN_STORAGE_KEY = 'nutriai_weekly_meal_plan';
const PLAN_CACHE_PREFIX = 'nutriai_weekly_meal_plan_mode_';
export function localPlanDate(date = new Date()) {
  const value = date instanceof Date ? date : new Date(date);
  const safeDate = Number.isNaN(value.getTime()) ? new Date() : value;
  const year = safeDate.getFullYear();
  const month = String(safeDate.getMonth() + 1).padStart(2, '0');
  const day = String(safeDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const GENERATION_STEPS = [
  'ШІ аналізує ваші цілі...',
  'Складаю найкращий раціон...',
  'Підбираю продукти з магазинів України...',
];
export const GENERATION_STEPS_EN = [
  'AI is analyzing your goals...',
  'Building the best meal plan...',
  'Choosing realistic supermarket products...',
];
const WEEK_DAYS = ['Понеділок', 'Вівторок', 'Середа', 'Четвер', 'Пʼятниця', 'Субота', 'Неділя'];
export const PLAN_MODES = [
  {
    key: 'classic',
    label: 'Класичний',
    prompt:
      'сучасний класичний раціон з ресторанним вайбом: боули, паста з тунцем та черрі, курка теріякі з рисом, індичка з булгуром, лосось з овочами, сирники з кисломолочного сиру',
  },
  {
    key: 'light',
    label: 'Легкий',
    prompt:
      'легкий свіжий раціон: морепродукти, риба, індичка, салати, смузі, кисломолочний сир, йогурт, сезонні овочі, ягоди, легкі соуси без майонезу',
  },
  {
    key: 'plant',
    label: 'Рослинний',
    prompt:
      'цікавий рослинний раціон без мʼяса, риби, яєць і молочних продуктів: тофу, нут, сочевиця, квасоля, авокадо, горіхи, кіноа, булгур, хумус, овочеві боули',
  },
];
export const MEAL_SLOTS = [
  { key: 'breakfast', label: 'Сніданок' },
  { key: 'snack', label: 'Перекус' },
  { key: 'lunch', label: 'Обід' },
  { key: 'dinner', label: 'Вечеря' },
];
export const MEAL_SLOT_LABELS_EN = {
  breakfast: 'Breakfast',
  snack: 'Snack',
  lunch: 'Lunch',
  dinner: 'Dinner',
};
const SLOT_ALIASES = {
  breakfast: 'breakfast',
  сніданок: 'breakfast',
  lunch: 'lunch',
  обід: 'lunch',
  dinner: 'dinner',
  вечеря: 'dinner',
  snack: 'snack',
  snack1: 'snack',
  snack2: 'snack',
  перекус: 'snack',
};

function cleanText(value, fallback = '') {
  if (value && typeof value === 'object') {
    return cleanText(value.title || value.name || value.description || value.text, fallback);
  }
  return String(value || fallback)
    .replace(/\*/g, '')
    .replace(/[\u2022.]/g, '')
    .replace(/```json|```/gi, '')
    .replace(/["{}[\]]/g, '')
    .replace(/\b(title|name|description|ingredients|calories|proteins|fats|carbs)\s*:/gi, '')
    .replace(/,\s*/g, ', ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function displayMealTitle(title, isEnglish) {
  if (!isEnglish) return title;
  const cleaned = cleanText(title).replace(/\s+\d+$/, '');
  const map = {
    'Вівсянка з ягодами': 'Oatmeal with berries',
    'Вівсянка з фруктами': 'Oatmeal with fruit',
    'Вівсянка з бананом': 'Oatmeal with banana',
    'Йогурт з фруктами': 'Yogurt with fruit',
    'Йогурт з горіхами': 'Yogurt with nuts',
    'Курка з гречкою': 'Chicken with buckwheat',
    'Риба з овочами': 'Fish with vegetables',
    'Хумус з овочами': 'Hummus with vegetables',
    'Сочевиця з булгуром': 'Lentils with bulgur',
    'Тофу з кіноа': 'Tofu with quinoa',
    'Сир з ягодами': 'Cottage cheese with berries',
    'Яблуко та кефір': 'Apple and kefir',
    'Індичка з рисом': 'Turkey with rice',
    'Салат з тунцем': 'Tuna salad',
  };
  return map[cleaned] || cleaned
    .replace(/Вівсянка/g, 'Oatmeal')
    .replace(/Курка/g, 'Chicken')
    .replace(/Риба/g, 'Fish')
    .replace(/овочами/g, 'vegetables')
    .replace(/гречкою/g, 'buckwheat');
}

export function displayIngredientName(name, isEnglish) {
  if (!isEnglish) return name;
  const map = {
    'Вівсяні пластівці': 'Oats',
    'Ягоди': 'Berries',
    'Молоко': 'Milk',
    'Банан': 'Banana',
    'Йогурт': 'Yogurt',
    'Фрукти або ягоди': 'Fruit or berries',
    'Куряче філе': 'Chicken breast',
    'Гречка': 'Buckwheat',
    'Овочі': 'Vegetables',
    'Риба': 'Fish',
    'Тунець': 'Tuna',
    'Лосось': 'Salmon',
    'Хумус': 'Hummus',
    'Сочевиця': 'Lentils',
    'Булгур': 'Bulgur',
    'Тофу': 'Tofu',
    'Кіноа': 'Quinoa',
    'Сир кисломолочний': 'Cottage cheese',
    'Яблуко': 'Apple',
    'Кефір': 'Kefir',
    'Індичка': 'Turkey',
  };
  return map[name] || name;
}

export function displayUnit(unit, isEnglish) {
  if (!isEnglish) return unit;
  return unit === 'г' ? 'g' : unit === 'мл' ? 'ml' : unit === 'шт' ? 'pcs' : unit;
}

function parseJsonish(value) {
  if (!value) return value;
  if (typeof value === 'object') return value;
  if (typeof value !== 'string') return value;

  const text = value.replace(/```json|```/gi, '').trim();
  const candidates = [
    text,
    text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1),
    text.slice(text.indexOf('['), text.lastIndexOf(']') + 1),
  ].filter((candidate) => candidate && candidate.length > 1);

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      // Try next candidate.
    }
  }
  return value;
}

function unwrapMeal(rawMeal) {
  const parsed = parseJsonish(rawMeal);
  if (Array.isArray(parsed)) return parsed[0] || {};
  if (!parsed || typeof parsed !== 'object') return { title: cleanText(parsed) };
  if (parsed.meal && typeof parsed.meal === 'object') return parsed.meal;
  if (parsed.dish && typeof parsed.dish === 'object') return parsed.dish;
  return parsed;
}

function extractIngredients(rawIngredients) {
  const parsed = parseJsonish(rawIngredients);
  if (Array.isArray(parsed)) return parsed;
  if (parsed?.ingredients && Array.isArray(parsed.ingredients)) return parsed.ingredients;
  if (parsed?.items && Array.isArray(parsed.items)) return parsed.items;
  return rawIngredients;
}

function canonicalFoodName(value) {
  return cleanText(value)
    .toLowerCase()
    .replace(/\b(боул|салат|суп|паста|сніданок|обід|вечеря|перекус|стейк|рагу|болоньєзе|bolognese)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function makeIngredient(name, amount, unit = 'г', note = '') {
  return { name, amount: String(amount), unit, weight_g: unit === 'г' ? Number(amount) || 0 : 0, note };
}

function inferIngredientsFromTitle(title) {
  const value = cleanText(title).toLowerCase();
  const ingredients = [];

  if (/болонь|bolognese/i.test(value)) {
    if (/сочев/i.test(value)) ingredients.push(makeIngredient('Сочевиця зелена', 100));
    ingredients.push(makeIngredient('Спагетті цільнозернові', 150));
    ingredients.push(makeIngredient('Томати', 200));
    ingredients.push(makeIngredient('Цибуля', 80));
    ingredients.push(makeIngredient('Оливкова олія', 10, 'мл'));
  } else if (/вівс|пластів|oat/i.test(value)) {
    ingredients.push(makeIngredient('Вівсяні пластівці', 50));
    if (/банан/i.test(value)) ingredients.push(makeIngredient('Банан', 1, 'шт'));
    if (/ягод/i.test(value)) ingredients.push(makeIngredient('Ягоди', 100));
    if (/молок/i.test(value)) ingredients.push(makeIngredient('Молоко', 200, 'мл'));
  } else if (/кіноа|quinoa/i.test(value)) {
    ingredients.push(makeIngredient('Кіноа', 80));
    if (/кур/i.test(value)) ingredients.push(makeIngredient('Куряче філе', 150));
    if (/тофу/i.test(value)) ingredients.push(makeIngredient('Тофу', 150));
    if (/овоч|салат|черрі|томат/i.test(value)) ingredients.push(makeIngredient('Овочі', 200));
    if (/авокад/i.test(value)) ingredients.push(makeIngredient('Авокадо', 80));
  } else if (/греч/i.test(value)) {
    ingredients.push(makeIngredient('Гречка', 80));
    if (/кур/i.test(value)) ingredients.push(makeIngredient('Куряче філе', 150));
    if (/овоч|салат/i.test(value)) ingredients.push(makeIngredient('Овочі', 200));
  } else if (/рис/i.test(value)) {
    ingredients.push(makeIngredient('Рис', 90));
    if (/кур/i.test(value)) ingredients.push(makeIngredient('Куряче філе', 150));
    if (/індич/i.test(value)) ingredients.push(makeIngredient('Індичка', 150));
    if (/овоч|салат/i.test(value)) ingredients.push(makeIngredient('Овочі', 200));
  } else if (/риба|лосос|тунец|тунець/i.test(value)) {
    ingredients.push(makeIngredient(/лосос/i.test(value) ? 'Лосось' : /тун/i.test(value) ? 'Тунець' : 'Риба', 180));
    if (/овоч|салат/i.test(value)) ingredients.push(makeIngredient('Овочі', 250));
  } else if (/тофу/i.test(value)) {
    ingredients.push(makeIngredient('Тофу', 180));
    if (/кіноа/i.test(value)) ingredients.push(makeIngredient('Кіноа', 80));
    if (/овоч|салат/i.test(value)) ingredients.push(makeIngredient('Овочі', 200));
  } else if (/сочев/i.test(value)) {
    ingredients.push(makeIngredient('Сочевиця', 120));
    if (/булгур/i.test(value)) ingredients.push(makeIngredient('Булгур', 80));
    if (/томат/i.test(value)) ingredients.push(makeIngredient('Томати', 180));
  } else if (/йогурт/i.test(value)) {
    ingredients.push(makeIngredient('Йогурт', 200, 'г'));
    if (/фрукт|ягод/i.test(value)) ingredients.push(makeIngredient('Фрукти або ягоди', 120));
  } else if (/сир|творог|кисломол/i.test(value)) {
    ingredients.push(makeIngredient('Сир кисломолочний', 200));
    if (/ягод/i.test(value)) ingredients.push(makeIngredient('Ягоди', 100));
  } else if (/хумус/i.test(value)) {
    ingredients.push(makeIngredient('Хумус', 80));
    ingredients.push(makeIngredient('Овочі', 200));
  }

  return ingredients;
}

function toNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function roundMacro(value) {
  return Math.round(toNumber(value) / 0.1) / 10;
}

function normalizeSlot(rawSlot, index) {
  return SLOT_ALIASES[String(rawSlot || '').trim().toLowerCase()] || MEAL_SLOTS[index]?.key || 'snack';
}

function estimateMacros(calories, slotKey) {
  const presets = {
    breakfast: { proteins: 0.22, fats: 0.28, carbs: 0.5 },
    snack: { proteins: 0.25, fats: 0.25, carbs: 0.5 },
    lunch: { proteins: 0.3, fats: 0.28, carbs: 0.42 },
    dinner: { proteins: 0.34, fats: 0.3, carbs: 0.36 },
  };
  const preset = presets[slotKey] || presets.snack;
  return {
    proteins: calories / (4 / preset.proteins),
    fats: calories / (9 / preset.fats),
    carbs: calories / (4 / preset.carbs),
  };
}

function normalizeIngredients(rawIngredients, mealTitle) {
  const ingredients = extractIngredients(rawIngredients);
  if (Array.isArray(ingredients) && ingredients.length) {
    const normalized = ingredients
      .map((item) => ({
        name: cleanText(item?.name || item?.product),
        amount: cleanText(item?.amount || item?.quantity || item?.weight_g || item?.grams),
        unit: cleanText(item?.unit || (item?.weight_g || item?.grams ? 'г' : '')),
        weight_g: Math.max(Math.round(toNumber(item?.weight_g || item?.grams, 0)), 0),
        note: cleanText(item?.note || item?.description),
      }))
      .filter((item) => {
        if (!item.name) return false;
        const itemKey = canonicalFoodName(item.name);
        const mealKey = canonicalFoodName(mealTitle);
        return itemKey && itemKey !== mealKey;
      });
    if (normalized.length) return normalized;
  }
  return inferIngredientsFromTitle(mealTitle);
}

function buildFallbackMeal(slot, dayIndex, modeKey) {
  const classic = {
    breakfast: ['Вівсянка з ягодами', 430, 22, 14, 56],
    snack: ['Йогурт з фруктами', 210, 14, 6, 25],
    lunch: ['Курка з гречкою', 620, 42, 18, 68],
    dinner: ['Риба з овочами', 520, 38, 16, 48],
  };
  const plant = {
    breakfast: ['Вівсянка з бананом', 440, 16, 12, 72],
    snack: ['Хумус з овочами', 250, 11, 13, 25],
    lunch: ['Сочевиця з булгуром', 610, 30, 14, 88],
    dinner: ['Тофу з кіноа', 520, 32, 18, 56],
  };
  const light = {
    breakfast: ['Сир з ягодами', 360, 32, 10, 34],
    snack: ['Яблуко та кефір', 190, 10, 5, 28],
    lunch: ['Індичка з рисом', 560, 44, 12, 62],
    dinner: ['Салат з тунцем', 430, 38, 14, 30],
  };
  const bank = modeKey === 'plant' ? plant : modeKey === 'light' ? light : classic;
  const [title, calories, proteins, fats, carbs] = bank[slot.key] || bank.snack;

  return {
    id: `${dayIndex}:${modeKey}:${slot.key}`,
    slot: slot.key,
    title: `${title} ${dayIndex + 1}`,
    description: 'Проста страва під денну норму',
    grams: 250,
    calories,
    proteins,
    fats,
    carbs,
    ingredients: inferIngredientsFromTitle(title),
  };
}

function normalizeMeal(rawMeal, slot, dayIndex, slotIndex, modeKey) {
  if (!rawMeal) return buildFallbackMeal(slot, dayIndex, modeKey);

  const fallback = buildFallbackMeal(slot, dayIndex, modeKey);
  const meal = unwrapMeal(rawMeal);
  const title = cleanText(meal.title || meal.name || meal.dish || meal.meal, fallback.title);
  const calories = Math.max(Math.round(toNumber(meal.calories, fallback.calories)), 1);
  const estimated = estimateMacros(calories, slot.key);

  return {
    id: `${dayIndex}:${modeKey}:${slot.key}`,
    slot: slot.key,
    title,
    description: cleanText(meal.description || meal.notes, fallback.description),
    grams: Math.max(Math.round(toNumber(meal.grams || meal.weight_g || meal.weight, 250)), 1),
    calories,
    proteins: roundMacro(meal.proteins || meal.protein || estimated.proteins),
    fats: roundMacro(meal.fats || meal.fat || estimated.fats),
    carbs: roundMacro(meal.carbs || meal.carbohydrates || estimated.carbs),
    ingredients: normalizeIngredients(meal.ingredients || meal.products || meal.items, title),
    originalIndex: slotIndex,
  };
}

export function normalizeDay(rawDay, dayIndex, modeKey) {
  const day = parseJsonish(rawDay);
  const rawMeals = Array.isArray(day?.meals)
    ? day.meals
    : Array.isArray(day?.variants)
      ? day.variants[Number(day.selectedVariantIndex) || 0]?.meals || []
      : [];

  const meals = MEAL_SLOTS.map((slot, slotIndex) => {
    const directMatch = rawMeals.find((meal, mealIndex) => normalizeSlot(meal?.slot || meal?.meal_type || meal?.type, mealIndex) === slot.key);
    return normalizeMeal(directMatch || rawMeals[slotIndex], slot, dayIndex, slotIndex, modeKey);
  });
  const totals = meals.reduce(
    (acc, meal) => ({
      calories: acc.calories + meal.calories,
      proteins: acc.proteins + meal.proteins,
      fats: acc.fats + meal.fats,
      carbs: acc.carbs + meal.carbs,
    }),
    { calories: 0, proteins: 0, fats: 0, carbs: 0 }
  );

  return {
    day: cleanText(day?.day, WEEK_DAYS[dayIndex]),
    meals,
    total_calories: Math.round(totals.calories),
    total_proteins: roundMacro(totals.proteins),
    total_fats: roundMacro(totals.fats),
    total_carbs: roundMacro(totals.carbs),
  };
}

export function normalizePlan(rawPlan, fallbackMode = 'classic') {
  const planData = parseJsonish(rawPlan);
  const mode = planData?.mode || fallbackMode;
  const rawDays = Array.isArray(planData?.days) ? planData.days : [];
  const selectedMeals = Array.isArray(planData?.selectedMeals)
    ? planData.selectedMeals
    : Object.keys(planData?.selectedMeals || {}).filter((key) => planData.selectedMeals[key]);

  return {
    ...planData,
    mode,
    generatedAt: planData?.generatedAt || new Date().toISOString(),
    startDate: planData?.startDate || localPlanDate(planData?.generatedAt || new Date()),
    days: WEEK_DAYS.map((_, dayIndex) => normalizeDay(rawDays[dayIndex], dayIndex, mode)),
    selectedMeals,
  };
}

function profilePlanSignature(profile) {
  return [
    profile?.goal || 'maintain',
    Math.round(Number(profile?.daily_calories) || 2000),
    Math.round(Number(profile?.daily_proteins) || 150),
    Math.round(Number(profile?.daily_fats) || 67),
    Math.round(Number(profile?.daily_carbs) || 200),
  ].join(':');
}

export function getCachedModePlan(modeKey, profile) {
  try {
    const cached = JSON.parse(localStorage.getItem(`${PLAN_CACHE_PREFIX}${modeKey}`) || 'null');
    if (cached?.profileSignature && cached.profileSignature !== profilePlanSignature(profile)) return null;
    if (cached?.plan?.days?.length) return cached;
  } catch {
    // Ignore broken cache.
  }
  return null;
}

export function setCachedModePlan(modeKey, plan, selectedDayIndex = 0, selectedMeals = [], profile = null) {
  localStorage.setItem(
    `${PLAN_CACHE_PREFIX}${modeKey}`,
    JSON.stringify({ plan: { ...plan, selectedMeals }, selectedDayIndex, selectedMeals, profileSignature: profilePlanSignature(profile), savedAt: new Date().toISOString() })
  );
}
