import crypto from 'node:crypto';

function pickFallback(items) {
  return items[crypto.randomInt(0, items.length)];
}

function targetCaloriesFromPrompt(prompt, fallback = 520) {
  const match = String(prompt || '').match(/\b(\d{3,4})\b/);
  const value = match ? Number(match[1]) : fallback;
  if (!Number.isFinite(value)) return fallback;
  return Math.min(Math.max(value, 250), 1200);
}

function scaleMacro(value, target, base = 500) {
  return Math.max(1, Math.round((value * target) / base));
}

let lastChallengeFallbackTitle = '';

function createRecipeFallback(prompt = '') {
  const isEnglish = /english/i.test(prompt);
  const target = targetCaloriesFromPrompt(prompt);
  const ukRecipes = [
    {
      title: 'Боул з куркою, гречкою та овочами',
      serving: '1 порція',
      ingredients: ['Куряче філе - 120 г', 'Гречка варена - 150 г', 'Огірок - 80 г', 'Помідори чері - 80 г', 'Оливкова олія - 8 г'],
      proteins: 38,
      fats: 16,
      carbs: 52,
      note: 'Збалансована страва з нормальним білком і повільними вуглеводами.',
    },
    {
      title: 'Омлет із сиром та тостом',
      serving: '1 порція',
      ingredients: ['Яйця - 2 шт', 'Сир кисломолочний - 120 г', 'Цільнозерновий хліб - 60 г', 'Авокадо - 50 г', 'Зелень - 10 г'],
      proteins: 34,
      fats: 22,
      carbs: 36,
      note: 'Добре підходить для сніданку або швидкого обіду.',
    },
    {
      title: 'Паста з тунцем і томатами',
      serving: '1 порція',
      ingredients: ['Паста варена - 170 г', 'Тунець у власному соку - 100 г', 'Томати - 120 г', 'Пармезан - 12 г', 'Оливкова олія - 6 г'],
      proteins: 36,
      fats: 14,
      carbs: 58,
      note: 'Ситний варіант без зайвого жиру, але з хорошою кількістю білка.',
    },
    {
      title: 'Йогуртовий боул з бананом і горіхами',
      serving: '1 порція',
      ingredients: ['Грецький йогурт - 220 г', 'Банан - 100 г', 'Вівсянка - 35 г', 'Горіхи - 15 г', 'Ягоди - 60 г'],
      proteins: 28,
      fats: 15,
      carbs: 62,
      note: 'М’який солодкий варіант, коли хочеться чогось простого.',
    },
  ];
  const enRecipes = [
    {
      title: 'Chicken quinoa bowl',
      serving: '1 serving',
      ingredients: ['Chicken breast - 120 g', 'Cooked quinoa - 140 g', 'Cucumber - 80 g', 'Cherry tomatoes - 80 g', 'Olive oil - 8 g'],
      proteins: 39,
      fats: 15,
      carbs: 50,
      note: 'Balanced, high-protein and easy to prepare.',
    },
    {
      title: 'Greek yogurt banana bowl',
      serving: '1 serving',
      ingredients: ['Greek yogurt - 220 g', 'Banana - 100 g', 'Oats - 35 g', 'Nuts - 15 g', 'Berries - 60 g'],
      proteins: 28,
      fats: 15,
      carbs: 62,
      note: 'A quick sweet meal with solid protein.',
    },
  ];
  const recipe = pickFallback(isEnglish ? enRecipes : ukRecipes);
  return {
    ...recipe,
    calories: target,
    proteins: scaleMacro(recipe.proteins, target),
    fats: scaleMacro(recipe.fats, target),
    carbs: scaleMacro(recipe.carbs, target),
  };
}

function createChallengeFallback(prompt = '') {
  const isEnglish = /english/i.test(prompt);
  const ukChallenges = [
    {
      title: 'Білковий тиждень',
      description: 'Мета - додати білок у кожен основний прийом їжі без різких обмежень.',
      emoji: '💪',
      tasks: ['Додати білок у сніданок', 'Випити норму води', 'Обрати одну овочеву страву', 'Записати всі перекуси', 'Підбити підсумок дня'],
    },
    {
      title: 'Тиждень рівної енергії',
      description: 'Фокус на стабільному харчуванні, воді та без хаотичних пропусків їжі.',
      emoji: '⚡',
      tasks: ['Не пропустити сніданок', 'Додати овочі до обіду', 'Випити першу склянку води до кави', 'Зробити легку вечерю', 'Зберегти серію записів'],
    },
    {
      title: 'М’який контроль КБЖУ',
      description: 'Тижневий виклик без стресу: бачити цифри і спокійно коригувати день.',
      emoji: '🎯',
      tasks: ['Записати перший прийом їжі', 'Перевірити залишок калорій', 'Добрати білок у другій половині дня', 'Додати 20 хвилин руху', 'Не забути воду'],
    },
    {
      title: 'Розумні перекуси',
      description: 'Ціль - зробити перекуси кориснішими і не губити прогрес між основними прийомами.',
      emoji: '🥜',
      tasks: ['Підготувати один білковий перекус', 'Замінити випадкову солодкість на фрукт', 'Записати напій або воду', 'Додати горіхи або йогурт у план', 'Перевірити баланс ввечері'],
    },
  ];
  const enChallenges = [
    {
      title: 'Protein focus week',
      description: 'Add a clear protein source to every main meal without strict dieting.',
      emoji: '💪',
      tasks: ['Add protein to breakfast', 'Hit the water goal', 'Choose one veggie-rich meal', 'Log every snack', 'Review the day'],
    },
    {
      title: 'Steady energy week',
      description: 'Keep meals consistent, hydration visible, and avoid chaotic gaps.',
      emoji: '⚡',
      tasks: ['Do not skip breakfast', 'Add vegetables to lunch', 'Drink water before coffee', 'Keep dinner light', 'Maintain the logging streak'],
    },
  ];
  const variants = isEnglish ? enChallenges : ukChallenges;
  const available = variants.filter((item) => item.title !== lastChallengeFallbackTitle);
  const challenge = pickFallback(available.length ? available : variants);
  lastChallengeFallbackTitle = challenge.title;
  return challenge;
}

export function createFallbackFromSchema(schema, prompt = '') {
  const props = schema?.properties || {};

  if (props.products) {
    const nameMatch = prompt.match(/"([^"]+)"/);
    const name = nameMatch?.[1] || 'Продукт';
    return {
      products: [
        { name, serving_label: '100 г', weight_g: 100, calories: 200, proteins: 8, fats: 6, carbs: 28, ingredients: 'Орієнтовні значення' },
      ],
    };
  }

  if (props.days) {
    const meals = [
      { meal_type: 'breakfast', name: 'Вівсянка з фруктами', description: 'Збалансований сніданок', calories: 430, proteins: 18, fats: 12, carbs: 62 },
      { meal_type: 'lunch', name: 'Курка з гречкою', description: 'Білкова основа з крупою', calories: 620, proteins: 42, fats: 18, carbs: 68 },
      { meal_type: 'dinner', name: 'Риба з овочами', description: 'Легка вечеря', calories: 480, proteins: 36, fats: 20, carbs: 34 },
      { meal_type: 'snack', name: 'Йогурт з горіхами', description: 'Перекус між прийомами їжі', calories: 230, proteins: 14, fats: 12, carbs: 18 },
    ];
    return { days: Array.from({ length: 7 }, (_, i) => ({ day: `День ${i + 1}`, meals, total_calories: 1760 })) };
  }

  if (props.categories) {
    return {
      categories: [
        { name: 'Овочі та фрукти', emoji: '🥦', items: [{ name: 'Овочі для салату', amount: '1-2 кг' }] },
        { name: "М'ясо та риба", emoji: '🍗', items: [{ name: 'Куряче філе', amount: '700 г' }] },
        { name: 'Крупи та злаки', emoji: '🌾', items: [{ name: 'Гречка або рис', amount: '500 г' }] },
      ],
    };
  }

  if (props.title && props.ingredients && props.calories) {
    return createRecipeFallback(prompt);
  }

  if (props.title && props.tasks) {
    return createChallengeFallback(prompt);
  }

  if (props.name && props.brand) {
    return { name: 'Продукт', brand: '', serving_label: '100 г', weight_g: 100, calories: 200, proteins: 8, fats: 6, carbs: 28 };
  }

  if (props.total_calories) {
    return {
      description: 'Орієнтовний прийом їжі',
      total_calories: 350,
      total_proteins: 20,
      total_fats: 12,
      total_carbs: 38,
      ai_tip: 'Значення приблизні. За потреби уточніть вагу або спосіб приготування.',
      items: [{ name: 'Їжа', weight_g: 250, calories: 350, proteins: 20, fats: 12, carbs: 38 }],
    };
  }

  if (process.env.GEMINI_API_KEY) {
    return 'Gemini тимчасово не відповів. Спробуйте ще раз або уточніть запит.';
  }

  return 'AI-підказка тимчасово працює у fallback-режимі. Додайте GEMINI_API_KEY, щоб отримувати персональні відповіді.';
}

const nutritionFallbacks = [
  { pattern: /dill|parsley|herb|кр[іи]п|укроп|петруш|зелень|базил|кінз/i, item: { calories: 43, proteins: 3.5, fats: 1.1, carbs: 7 }, category: 'herb' },
  { pattern: /minced|ground|фарш|свин|ялов|говяд|beef|pork/i, item: { calories: 250, proteins: 17, fats: 20, carbs: 0 }, category: 'meat' },
  { pattern: /cream|вершк|сливоч|cheese sauce|сирн.*соус|соус/i, item: { calories: 220, proteins: 3, fats: 20, carbs: 4 }, category: 'sauce' },
  { pattern: /apple|яблу/i, item: { calories: 52, proteins: 0.3, fats: 0.2, carbs: 14 } },
  { pattern: /banana|банан/i, item: { calories: 89, proteins: 1.1, fats: 0.3, carbs: 23 } },
  { pattern: /rice|рис/i, item: { calories: 130, proteins: 2.7, fats: 0.3, carbs: 28 } },
  { pattern: /chicken|кур/i, item: { calories: 165, proteins: 31, fats: 3.6, carbs: 0 }, category: 'meat' },
  { pattern: /egg|яйц/i, item: { calories: 155, proteins: 13, fats: 11, carbs: 1.1 } },
  { pattern: /bread|хліб/i, item: { calories: 250, proteins: 8, fats: 3, carbs: 49 } },
  { pattern: /potato|картоп/i, item: { calories: 77, proteins: 2, fats: 0.1, carbs: 17 } },
  { pattern: /salad|салат/i, item: { calories: 70, proteins: 2, fats: 4, carbs: 8 } },
  { pattern: /pasta|penne|паста|пенне|макарон/i, item: { calories: 155, proteins: 5.8, fats: 0.9, carbs: 31 }, category: 'starch' },
  { pattern: /fish|риба|лосос|тунец/i, item: { calories: 180, proteins: 22, fats: 9, carbs: 0 }, category: 'meat' },
];

const defaultNutrition = { calories: 160, proteins: 7, fats: 6, carbs: 18 };

function nutritionMatch(name = '') {
  return nutritionFallbacks.find((entry) => entry.pattern.test(name));
}

function estimateNutritionForName(name = '', weight = 150) {
  const match = nutritionMatch(name);
  const per100 = match?.item || defaultNutrition;
  const ratio = Math.max(Number(weight) || 150, 1) / 100;
  return {
    calories: Math.round(per100.calories * ratio),
    proteins: Math.round(per100.proteins * ratio * 10) / 10,
    fats: Math.round(per100.fats * ratio * 10) / 10,
    carbs: Math.round(per100.carbs * ratio * 10) / 10,
  };
}

function cleanNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function realisticWeight(name = '', value) {
  const weight = cleanNumber(value);
  if (weight && weight > 0) return weight;
  const category = nutritionMatch(name)?.category;
  if (category === 'herb') return 3;
  if (category === 'sauce') return 50;
  if (category === 'meat') return 100;
  if (category === 'starch') return 150;
  return 150;
}

function maybeReplaceImpossibleItem(item) {
  const match = nutritionMatch(item.name);
  const category = match?.category;
  const estimate = estimateNutritionForName(item.name, item.weight_g);
  const maxPossibleCalories = Math.max(item.weight_g * 9, 1);
  const caloriesPer100 = item.weight_g > 0 ? (item.calories / item.weight_g) * 100 : 0;
  const fatsPer100 = item.weight_g > 0 ? (item.fats / item.weight_g) * 100 : 0;
  const carbsPer100 = item.weight_g > 0 ? (item.carbs / item.weight_g) * 100 : 0;
  const proteinsPer100 = item.weight_g > 0 ? (item.proteins / item.weight_g) * 100 : 0;

  const impossibleCalories =
    item.calories > maxPossibleCalories ||
    caloriesPer100 > 900 ||
    (category === 'herb' && item.weight_g <= 10 && item.calories > 10);

  const impossibleMacros =
    item.proteins + item.fats + item.carbs > item.weight_g * 1.35 ||
    (category === 'herb' && item.weight_g <= 10 && (item.proteins > 1 || item.fats > 1 || item.carbs > 2));

  if (impossibleCalories || impossibleMacros) {
    return { ...item, ...estimate };
  }

  if (category === 'meat' && !/соус|sauce|пані|bread|batter|кляр/i.test(item.name) && item.carbs > item.weight_g * 0.08) {
    return { ...item, carbs: 0 };
  }

  if (category === 'sauce' && /cream|вершк|сливоч|сирн/i.test(item.name) && (fatsPer100 < 8 || carbsPer100 > 15)) {
    return { ...item, ...estimate };
  }

  if (category === 'starch' && /pasta|penne|паста|пенне|макарон/i.test(item.name) && (fatsPer100 > 5 || carbsPer100 < 20 || proteinsPer100 > 12)) {
    return { ...item, ...estimate };
  }

  return item;
}

export function normalizeNutritionResult(result, prompt = '') {
  if (!result || typeof result !== 'object' || !('total_calories' in result || 'items' in result)) return result;

  let items = Array.isArray(result.items) ? result.items : [];
  if (items.length === 0) {
    const nameMatch = prompt.match(/"([^"]+)"/);
    items = [{ name: nameMatch?.[1] || result.description || 'Страва', weight_g: 150 }];
  }

  const normalizedItems = items.map((item) => {
    const name = item.name || 'Продукт';
    const weight = realisticWeight(name, item.weight_g);
    const estimated = estimateNutritionForName(name, weight);
    const normalized = {
      ...item,
      name,
      weight_g: weight,
      calories: cleanNumber(item.calories) ?? estimated.calories,
      proteins: cleanNumber(item.proteins) ?? estimated.proteins,
      fats: cleanNumber(item.fats) ?? estimated.fats,
      carbs: cleanNumber(item.carbs) ?? estimated.carbs,
    };
    return maybeReplaceImpossibleItem(normalized);
  });

  const totals = normalizedItems.reduce((acc, item) => ({
    calories: acc.calories + (Number(item.calories) || 0),
    proteins: acc.proteins + (Number(item.proteins) || 0),
    fats: acc.fats + (Number(item.fats) || 0),
    carbs: acc.carbs + (Number(item.carbs) || 0),
  }), { calories: 0, proteins: 0, fats: 0, carbs: 0 });

  return {
    ...result,
    items: normalizedItems,
    total_calories: Math.round(totals.calories),
    total_proteins: Math.round(totals.proteins * 10) / 10,
    total_fats: Math.round(totals.fats * 10) / 10,
    total_carbs: Math.round(totals.carbs * 10) / 10,
    ai_tip: result.ai_tip || 'КБЖУ оцінено AI приблизно та перевірено на реалістичність. За потреби можна відредагувати вручну.',
  };
}

export function normalizeSchemaResult(result, schema, prompt = '') {
  const props = schema?.properties || {};
  if (!result || typeof result !== 'object' || Array.isArray(result)) return result;

  if (props.title && props.ingredients && props.calories) {
    if (result.title && Array.isArray(result.ingredients) && result.ingredients.length && result.calories) return result;
    const fallback = createRecipeFallback(prompt);
    return {
      ...fallback,
      ...result,
      title: result.title || result.name || fallback.title,
      serving: result.serving || result.portion || fallback.serving,
      ingredients: Array.isArray(result.ingredients) && result.ingredients.length ? result.ingredients : fallback.ingredients,
      calories: Number(result.calories) || fallback.calories,
      proteins: Number(result.proteins) || fallback.proteins,
      fats: Number(result.fats) || fallback.fats,
      carbs: Number(result.carbs) || fallback.carbs,
      note: result.note || result.description || fallback.note,
    };
  }

  if (props.title && props.tasks) {
    if (result.title && Array.isArray(result.tasks) && result.tasks.length) return result;
    const fallback = createChallengeFallback(prompt);
    return {
      ...fallback,
      ...result,
      title: result.title || fallback.title,
      description: result.description || fallback.description,
      emoji: result.emoji || fallback.emoji,
      tasks: Array.isArray(result.tasks) && result.tasks.length ? result.tasks : fallback.tasks,
    };
  }

  return result;
}
