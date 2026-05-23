import { useEffect, useMemo, useState } from 'react';
import { nutriApi } from '@/api/nutriApi';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowRight, CalendarDays, Check, Loader2, Plus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import ShoppingList from '../components/meal-plan/ShoppingList';

const PLAN_STORAGE_KEY = 'nutriai_weekly_meal_plan';
const PLAN_CACHE_PREFIX = 'nutriai_weekly_meal_plan_mode_';
const GENERATION_STEPS = [
  'ШІ аналізує ваші цілі...',
  'Складаю найкращий раціон...',
  'Підбираю продукти з магазинів України...',
];
const WEEK_DAYS = ['Понеділок', 'Вівторок', 'Середа', 'Четвер', 'Пʼятниця', 'Субота', 'Неділя'];
const PLAN_MODES = [
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
const MEAL_SLOTS = [
  { key: 'breakfast', label: 'Сніданок' },
  { key: 'snack', label: 'Перекус' },
  { key: 'lunch', label: 'Обід' },
  { key: 'dinner', label: 'Вечеря' },
];
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

const mealSchema = {
  type: 'object',
  properties: {
    slot: { type: 'string' },
    title: { type: 'string' },
    description: { type: 'string' },
    grams: { type: 'number' },
    calories: { type: 'number' },
    proteins: { type: 'number' },
    fats: { type: 'number' },
    carbs: { type: 'number' },
    ingredients: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          amount: { type: 'string' },
          unit: { type: 'string' },
          weight_g: { type: 'number' },
          note: { type: 'string' },
        },
      },
    },
  },
};

const daySchema = {
  type: 'object',
  properties: {
    day: { type: 'string' },
    meals: {
      type: 'array',
      items: mealSchema,
    },
    total_calories: { type: 'number' },
    total_proteins: { type: 'number' },
    total_fats: { type: 'number' },
    total_carbs: { type: 'number' },
  },
};

function buildDietitianPrompt({ mode, profile, recentFoods, usedMeals = [], dayName = '', singleDay = false }) {
  return `Ти професійний дієтолог і food stylist
Поверни результат тільки у форматі JSON за схемою
Створи ${singleDay ? `новий варіант раціону на день ${dayName}` : 'тижневий план харчування'} українською мовою як структуровані дані

Тип плану: ${mode.label}
Фокус плану: ${mode.prompt}
Користувач в Україні, тому використовуй продукти, які реально купити в Сільпо, АТБ, Варусі або звичайному супермаркеті
Ціль користувача: ${profile?.goal === 'lose' ? 'схуднення' : profile?.goal === 'gain' ? 'набір маси' : 'підтримка ваги'}
Денна норма калорій: ${profile?.daily_calories || 2000}
Білки: ${profile?.daily_proteins || 150} г
Жири: ${profile?.daily_fats || 67} г
Вуглеводи: ${profile?.daily_carbs || 200} г
Продукти які користувач часто їсть: ${recentFoods.join(', ') || 'не вказано'}
Уже використані страви, які не можна повторювати: ${usedMeals.join(', ') || 'немає'}

Правила якості
Ніколи не повторюй одну й ту саму страву в межах плану
Кожен день має бути унікальним: різні білки, овочі, крупи, соуси і текстури
Назви мають звучати апетитно, не як їдальня
Класичний режим: боули, паста з тунцем та черрі, курка теріякі, лосось, індичка, сир кисломолочний, сезонні овочі
Легкий режим: морепродукти, салати, смузі, легкі сири, йогурт, риба, індичка, багато зелені
Рослинний режим: тофу, нут, сочевиця, авокадо, горіхи, квасоля, кіноа, булгур, хумус

Правила даних
${singleDay ? 'Поверни рівно 1 день' : 'Поверни рівно 7 днів'}
Кожен день має рівно 4 страви зі slot: breakfast, snack, lunch, dinner
Кожна страва має title, description, grams, calories, proteins, fats, carbs
Кожна страва має ingredients як масив об'єктів з name, amount, unit, weight_g, note
Кожен ingredient це реальний продукт з точною вагою
Для списку покупок пиши тільки основні інгредієнти страви
Не додавай воду, сіль, перець як окремі продукти
Не додавай продукти, яких немає в конкретній страві
Приклад ingredient: name Лосось, amount 200, unit г, weight_g 200, note Основний білок
Не використовуй markdown, зірочки, крапки або маркери списку`;
}

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
        return itemKey && itemKey !== mealKey && !mealKey.includes(itemKey);
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

function normalizeDay(rawDay, dayIndex, modeKey) {
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

function normalizePlan(rawPlan, fallbackMode = 'classic') {
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

function getCachedModePlan(modeKey, profile) {
  try {
    const cached = JSON.parse(localStorage.getItem(`${PLAN_CACHE_PREFIX}${modeKey}`) || 'null');
    if (cached?.profileSignature && cached.profileSignature !== profilePlanSignature(profile)) return null;
    if (cached?.plan?.days?.length) return cached;
  } catch {
    // Ignore broken cache.
  }
  return null;
}

function setCachedModePlan(modeKey, plan, selectedDayIndex = 0, selectedMeals = [], profile = null) {
  localStorage.setItem(
    `${PLAN_CACHE_PREFIX}${modeKey}`,
    JSON.stringify({ plan: { ...plan, selectedMeals }, selectedDayIndex, selectedMeals, profileSignature: profilePlanSignature(profile), savedAt: new Date().toISOString() })
  );
}

function MealPlanSkeleton({ status }) {
  return (
    <div className="space-y-4 rounded-3xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-primary">
        <Loader2 className="h-4 w-4 animate-spin" />
        {status}
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <motion.div
          className="h-full w-1/2 rounded-full bg-primary"
          animate={{ x: ['-100%', '220%'] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>
      {[0, 1, 2, 3].map((item) => (
        <div key={item} className="space-y-2 rounded-2xl bg-muted/40 p-3">
          <div className="h-3 w-24 animate-pulse rounded-full bg-muted-foreground/15" />
          <div className="h-4 w-4/5 animate-pulse rounded-full bg-muted-foreground/20" />
          <div className="flex gap-2">
            <div className="h-6 w-16 animate-pulse rounded-full bg-muted-foreground/15" />
            <div className="h-6 w-14 animate-pulse rounded-full bg-muted-foreground/15" />
            <div className="h-6 w-14 animate-pulse rounded-full bg-muted-foreground/15" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function MealPlan() {
  const [plan, setPlan] = useState(null);
  const [planId, setPlanId] = useState(null);
  const [planMode, setPlanMode] = useState('classic');
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [selectedMeals, setSelectedMeals] = useState([]);
  const [shoppingMeals, setShoppingMeals] = useState(null);
  const [openDescriptions, setOpenDescriptions] = useState({});
  const [generating, setGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);
  const [regeneratingDay, setRegeneratingDay] = useState(false);
  const [shoppingListToken, setShoppingListToken] = useState(0);
  const queryClient = useQueryClient();

  const { data: profiles } = useQuery({
    queryKey: ['userProfile'],
    queryFn: () => nutriApi.entities.UserProfile.list(),
    initialData: [],
  });
  const { data: recentLogs } = useQuery({
    queryKey: ['allFoodLogsGamif'],
    queryFn: () => nutriApi.entities.FoodLog.list('-date', 50),
    initialData: [],
  });
  const { data: savedPlans, isLoading: loadingSavedPlan } = useQuery({
    queryKey: ['mealPlans'],
    queryFn: () => nutriApi.entities.MealPlan.list('-updated_date', 1),
    initialData: [],
  });

  const profile = profiles[0];
  const selectedDay = plan?.days?.[selectedDayIndex];
  const activeMode = PLAN_MODES.find((mode) => mode.key === planMode) || PLAN_MODES[0];
  const generationStatus = GENERATION_STEPS[generationStep % GENERATION_STEPS.length];

  const recentFoods = useMemo(
    () => [...new Set(recentLogs.slice(0, 20).flatMap((log) => log.items?.map((item) => item.name) || []))].slice(0, 10),
    [recentLogs]
  );

  const selectedMealsForDay = useMemo(() => {
    if (!selectedDay) return [];
    return selectedDay.meals.filter((meal) => selectedMeals.includes(meal.id));
  }, [selectedDay, selectedMeals]);
  const selectedMealsForPlan = useMemo(() => {
    if (!plan?.days?.length) return [];
    return plan.days.flatMap((day) => day.meals || []).filter((meal) => selectedMeals.includes(meal.id));
  }, [plan, selectedMeals]);
  const activeShoppingMeals = shoppingMeals || selectedMealsForPlan;

  useEffect(() => {
    if (!generating) return undefined;
    setGenerationStep(0);
    const timer = setInterval(() => {
      setGenerationStep((step) => step + 1);
    }, 1800);
    return () => clearInterval(timer);
  }, [generating]);

  useEffect(() => {
    if (plan || loadingSavedPlan) return;

    const savedPlan = savedPlans?.[0];
    if (savedPlan?.plan?.days?.length) {
      const normalized = normalizePlan(savedPlan.plan, savedPlan.plan.mode || 'classic');
      setPlan(normalized);
      setPlanId(savedPlan.id);
      setPlanMode(normalized.mode || 'classic');
      setSelectedMeals(normalized.selectedMeals || []);
      setSelectedDayIndex(Math.min(Math.max(Number(savedPlan.selected_day_index) || 0, 0), 6));
      return;
    }

    try {
      const localPlan = JSON.parse(localStorage.getItem(PLAN_STORAGE_KEY) || 'null');
      if (localPlan?.plan?.days?.length) {
        const normalized = normalizePlan(localPlan.plan, localPlan.plan.mode || 'classic');
        setPlan(normalized);
        setPlanMode(normalized.mode || 'classic');
        setSelectedMeals(normalized.selectedMeals || localPlan.selectedMeals || []);
        setSelectedDayIndex(Math.min(Math.max(Number(localPlan.selectedDayIndex) || 0, 0), 6));
      }
    } catch {
      // Database is primary, localStorage is fallback.
    }
  }, [loadingSavedPlan, plan, savedPlans]);

  const persistPlan = async (nextPlan, nextSelectedDayIndex = selectedDayIndex, currentPlanId = planId, nextSelectedMeals = selectedMeals) => {
    const planToSave = { ...nextPlan, selectedMeals: nextSelectedMeals };
    localStorage.setItem(
      PLAN_STORAGE_KEY,
      JSON.stringify({ plan: planToSave, selectedDayIndex: nextSelectedDayIndex, selectedMeals: nextSelectedMeals, savedAt: new Date().toISOString() })
    );
    setCachedModePlan(planToSave.mode || planMode, planToSave, nextSelectedDayIndex, nextSelectedMeals, profile);

    try {
      const payload = { title: `План ${activeMode.label}`, plan: planToSave, selected_day_index: nextSelectedDayIndex };
      const saved = currentPlanId
        ? await nutriApi.entities.MealPlan.update(currentPlanId, payload)
        : await nutriApi.entities.MealPlan.create(payload);
      setPlanId(saved.id);
      queryClient.invalidateQueries({ queryKey: ['mealPlans'] });
      return saved;
    } catch (error) {
      toast.error(error.message || 'План збережено локально, але БД не відповіла');
      return null;
    }
  };

  const selectDay = (index) => {
    setSelectedDayIndex(index);
    setShoppingMeals(null);
    if (plan) persistPlan(plan, index);
  };

  const toggleMeal = (meal) => {
    const nextSelectedMeals = selectedMeals.includes(meal.id) ? selectedMeals.filter((mealId) => mealId !== meal.id) : [...selectedMeals, meal.id];
    setSelectedMeals(nextSelectedMeals);
    setShoppingMeals(null);
    if (plan) persistPlan(plan, selectedDayIndex, planId, nextSelectedMeals);
  };

  const generatePlan = async (modeKey = planMode, forceRefresh = false) => {
    const mode = PLAN_MODES.find((item) => item.key === modeKey) || PLAN_MODES[0];
    const cached = getCachedModePlan(mode.key, profile);
    if (!forceRefresh && cached?.plan?.days?.length) {
      const normalized = normalizePlan(cached.plan, mode.key);
      setPlan(normalized);
      setPlanMode(mode.key);
      setSelectedMeals(normalized.selectedMeals || cached.selectedMeals || []);
      setShoppingMeals(null);
      setSelectedDayIndex(Math.min(Math.max(Number(cached.selectedDayIndex) || 0, 0), 6));
      toast.success(`${mode.label} план відкрито з кешу`);
      return;
    }
    setGenerating(true);
    setPlanMode(mode.key);
    setPlan(null);
    setSelectedMeals([]);
    setShoppingMeals(null);
    setSelectedDayIndex(0);

    try {
      const result = await nutriApi.integrations.Core.InvokeLLM({
        prompt: buildDietitianPrompt({
          mode,
          profile,
          recentFoods,
          usedMeals: [],
        }),
        response_json_schema: {
          type: 'object',
          properties: {
            days: {
              type: 'array',
              items: daySchema,
            },
          },
        },
        model: 'gemini_3_flash',
      });

      const normalized = normalizePlan({ ...result, mode: mode.key, generatedAt: new Date().toISOString(), selectedMeals: [] }, mode.key);
      setPlan(normalized);
      const saved = await persistPlan(normalized, 0, planId, []);
      toast.success(saved ? `${mode.label} план готовий і збережений` : `${mode.label} план готовий`);
    } catch (error) {
      const fallback = normalizePlan({ mode: mode.key, selectedMeals: [] }, mode.key);
      setPlan(fallback);
      await persistPlan(fallback, 0, planId, []);
      toast.error(error.message || 'Не вдалося скласти план, показую базовий варіант');
    } finally {
      setGenerating(false);
    }
  };

  const regenerateSelectedDay = async () => {
    if (!plan || !selectedDay) return;
    const mode = PLAN_MODES.find((item) => item.key === planMode) || PLAN_MODES[0];
    const usedMeals = plan.days.flatMap((day, index) => (index === selectedDayIndex ? [] : day.meals.map((meal) => meal.title)));

    setRegeneratingDay(true);
    try {
      const result = await nutriApi.integrations.Core.InvokeLLM({
        prompt: buildDietitianPrompt({
          mode,
          profile,
          recentFoods,
          usedMeals,
          dayName: selectedDay.day,
          singleDay: true,
        }),
        response_json_schema: daySchema,
        model: 'gemini_3_flash',
      });

      const nextDay = normalizeDay(result?.day ? result : { ...result, day: selectedDay.day }, selectedDayIndex, mode.key);
      const dayPrefix = `${selectedDayIndex}:${mode.key}:`;
      const nextSelectedMeals = selectedMeals.filter((mealId) => !mealId.startsWith(dayPrefix));
      const nextPlan = {
        ...plan,
        days: plan.days.map((day, index) => (index === selectedDayIndex ? nextDay : day)),
        selectedMeals: nextSelectedMeals,
        generatedAt: new Date().toISOString(),
      };

      setPlan(nextPlan);
      setSelectedMeals(nextSelectedMeals);
      setShoppingMeals(null);
      await persistPlan(nextPlan, selectedDayIndex, planId, nextSelectedMeals);
      toast.success('Новий варіант дня готовий');
    } catch (error) {
      toast.error(error.message || 'Не вдалося оновити цей день');
    } finally {
      setRegeneratingDay(false);
    }
  };

  const makeShoppingList = (meals = selectedMealsForPlan) => {
    if (!meals.length) {
      toast.error('Спочатку вибери страви галочкою');
      return;
    }
    setShoppingMeals(meals);
    setShoppingListToken(Date.now());
  };

  const focusMealProducts = (meal) => {
    if (!selectedMeals.includes(meal.id)) toggleMeal(meal);
    setShoppingMeals([meal]);
    setShoppingListToken(Date.now());
  };

  return (
    <div className="space-y-5 pb-8 pt-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-extrabold">План харчування</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Gemini генерує раціон під вибраний режим</p>
      </motion.div>

      <div className="grid grid-cols-3 gap-2">
        {PLAN_MODES.map((mode) => (
          <button
            key={mode.key}
            type="button"
            className={`rounded-2xl border px-2 py-3 text-sm font-bold transition ${
              planMode === mode.key ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card'
            }`}
            onClick={() => generatePlan(mode.key)}
            disabled={generating}
          >
            {mode.label}
          </button>
        ))}
      </div>

      {generating ? (
        <MealPlanSkeleton status={generationStatus} />
      ) : !plan ? (
        <div className="space-y-4">
          {profile && (
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-xs font-bold text-muted-foreground">Ваші цілі на день</p>
              <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                <p>{profile.goal === 'lose' ? 'Схуднення' : profile.goal === 'gain' ? 'Набір маси' : 'Підтримка'}</p>
                <p>{profile.daily_calories || 2000} ккал</p>
                <p>Б: {profile.daily_proteins || 150} г</p>
                <p>Ж: {profile.daily_fats || 67} г</p>
                <p>В: {profile.daily_carbs || 200} г</p>
              </div>
            </div>
          )}

          <Button className="h-12 w-full rounded-xl text-base" onClick={() => generatePlan(planMode)} disabled={generating}>
            {generating ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Sparkles className="mr-2 h-5 w-5" />}
            {generating ? 'Складаю план...' : 'Згенерувати план'}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <Button variant="outline" size="sm" className="w-full rounded-xl" onClick={() => generatePlan(planMode, true)} disabled={generating}>
            {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Оновити план {activeMode.label}
          </Button>

          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {plan.days.map((day, index) => (
              <button
                key={day.day}
                type="button"
                onClick={() => selectDay(index)}
                className={`min-w-[112px] rounded-2xl border p-3 text-left transition ${
                  selectedDayIndex === index ? 'border-primary bg-primary/10 shadow-sm' : 'border-border bg-card'
                }`}
              >
                <p className="text-[11px] font-bold text-muted-foreground">{index + 1}</p>
                <p className="truncate text-sm font-extrabold">{day.day}</p>
                <p className="mt-1 text-xs text-muted-foreground">{day.total_calories} ккал</p>
              </button>
            ))}
          </div>

          {selectedDay && (
            <>
              <div className="rounded-3xl border border-border bg-card p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="flex items-center gap-2 text-sm font-extrabold">
                      <CalendarDays className="h-4 w-4 text-primary" />
                      {selectedDay.day}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {selectedDay.total_calories} ккал · Б {selectedDay.total_proteins} г · Ж {selectedDay.total_fats} г · В{' '}
                      {selectedDay.total_carbs} г
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <span className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">{selectedMealsForDay.length} вибрано</span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 rounded-full px-3 text-xs"
                      onClick={regenerateSelectedDay}
                      disabled={regeneratingDay}
                    >
                      {regeneratingDay ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-1 h-3.5 w-3.5" />}
                      Інший день
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  {selectedDay.meals.map((meal) => {
                    const slot = MEAL_SLOTS.find((item) => item.key === meal.slot) || MEAL_SLOTS[1];
                    const selected = selectedMeals.includes(meal.id);
                    const descriptionOpen = Boolean(openDescriptions[meal.id]);

                    return (
                      <div key={meal.id} className={`rounded-2xl p-3 transition ${selected ? 'bg-primary/10 ring-1 ring-primary/30' : 'bg-muted/35'}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-extrabold uppercase tracking-wide text-muted-foreground">{slot.label}</p>
                            <button
                              type="button"
                              className="mt-1 text-left text-sm font-bold"
                              onClick={() => setOpenDescriptions((current) => ({ ...current, [meal.id]: !current[meal.id] }))}
                            >
                              {meal.title}
                            </button>
                            {descriptionOpen && (
                              <div className="mt-2 rounded-xl bg-background p-3 text-xs leading-relaxed text-muted-foreground">
                                <p>{meal.description}</p>
                                <p className="mt-2 font-semibold text-foreground">Склад</p>
                                <p>{meal.ingredients.map((item) => [item.name, item.amount, item.unit].filter(Boolean).join(' ')).join(', ')}</p>
                              </div>
                            )}
                            <div className="mt-2 flex flex-wrap gap-2 text-xs">
                              <span className="rounded-full bg-primary/10 px-2 py-1 font-bold text-primary">{meal.calories} ккал</span>
                              <span className="rounded-full bg-sky-100 px-2 py-1 text-sky-700">Б: {meal.proteins} г</span>
                              <span className="rounded-full bg-amber-100 px-2 py-1 text-amber-700">Ж: {meal.fats} г</span>
                              <span className="rounded-full bg-rose-100 px-2 py-1 text-rose-700">В: {meal.carbs} г</span>
                              <span className="rounded-full bg-background px-2 py-1 text-muted-foreground">{meal.grams} г</span>
                            </div>
                          </div>
                          <div className="flex shrink-0 flex-col gap-2">
                            <Button
                              size="icon"
                              variant={selected ? 'default' : 'outline'}
                              className="h-9 w-9 rounded-full"
                              onClick={() => toggleMeal(meal)}
                              title={selected ? 'Вибрано' : 'Вибрати страву'}
                            >
                              {selected ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                            </Button>
                            {selected && (
                              <Button
                                size="icon"
                                variant="outline"
                                className="h-9 w-9 rounded-full"
                                onClick={() => focusMealProducts(meal)}
                                title="Продукти для цієї страви"
                              >
                                <ArrowRight className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <ShoppingList
                day={selectedDay}
                dayIndex={selectedDayIndex}
                meals={selectedMealsForPlan}
                activeMeals={activeShoppingMeals}
                autoGenerateToken={shoppingListToken}
                onGenerateRequest={() => makeShoppingList(selectedMealsForPlan)}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}
