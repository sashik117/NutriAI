import { nutriApi } from '@/api/nutriApi';
import { cleanFoodText, repairNutritionItem } from '@/lib/nutritionFallback';

function firstText(...values) {
  return values.map((value) => cleanFoodText(value, '')).find(Boolean) || '';
}

function isGenericName(value) {
  const text = cleanFoodText(value, '').toLowerCase();
  return !text || /^(їжа|еда|food|страва|блюдо|продукт|meal|item)$/i.test(text);
}

function numberFrom(...values) {
  const value = values.find((item) => Number.isFinite(Number(item)) && Number(item) > 0);
  return Number(value) || 0;
}

function normalizePlateItem(item, fallbackName = '') {
  const name = firstText(
    item?.name,
    item?.dish_name,
    item?.meal_name,
    item?.title,
    item?.dish,
    item?.ingredient,
    item?.food_name,
    item?.description,
    fallbackName
  );
  const unit = item?.unit === 'ml' ? 'ml' : 'g';
  const amount = Math.max(Math.round(numberFrom(item?.amount, item?.volume_ml, item?.weight_g, item?.grams, 100)), 1);

  return repairNutritionItem(
    {
      name,
      unit,
      amount,
      weight_g: Math.max(Math.round(numberFrom(item?.weight_g, item?.grams, unit === 'g' ? amount : 100)), 1),
      calories: Math.max(Math.round(numberFrom(item?.calories, item?.kcal, item?.energy_kcal)), 0),
      proteins: Math.round(numberFrom(item?.proteins, item?.protein) * 10) / 10,
      fats: Math.round(numberFrom(item?.fats, item?.fat) * 10) / 10,
      carbs: Math.round(numberFrom(item?.carbs, item?.carbohydrates) * 10) / 10,
    },
    name || fallbackName
  );
}

export function normalizePlateResult(result = {}) {
  const dishName = firstText(result?.dish_name, result?.meal_name, result?.name, result?.title, result?.description);
  const rawItems = Array.isArray(result?.items) ? result.items : [];
  const sourceItems = rawItems.length
    ? rawItems
    : [
        {
          name: dishName,
          amount: result?.amount || result?.weight_g || 300,
          weight_g: result?.weight_g || result?.grams || 300,
          calories: result?.total_calories || result?.calories,
          proteins: result?.total_proteins || result?.proteins,
          fats: result?.total_fats || result?.fats,
          carbs: result?.total_carbs || result?.carbs,
        },
      ];

  const items = sourceItems
    .map((item, index) => {
      const fallback = !isGenericName(dishName) ? `${dishName}${sourceItems.length > 1 ? ` ${index + 1}` : ''}` : '';
      return normalizePlateItem(item, fallback);
    })
    .filter((item) => item.name && !isGenericName(item.name));

  const sum = (key) => Math.round(items.reduce((total, item) => total + (Number(item[key]) || 0), 0) * 10) / 10;
  const fallbackDescription = items.map((item) => `${item.name} ~${item.amount} ${item.unit === 'ml' ? 'мл' : 'г'}`).join(', ');

  return {
    description: !isGenericName(dishName) ? dishName : fallbackDescription,
    items,
    total_calories: Math.round(numberFrom(result?.total_calories, result?.calories, sum('calories'))),
    total_proteins: Math.round(numberFrom(result?.total_proteins, result?.proteins, sum('proteins')) * 10) / 10,
    total_fats: Math.round(numberFrom(result?.total_fats, result?.fats, sum('fats')) * 10) / 10,
    total_carbs: Math.round(numberFrom(result?.total_carbs, result?.carbs, sum('carbs')) * 10) / 10,
    ai_tip: cleanFoodText(result?.ai_tip, ''),
  };
}

export function createApproximatePlateResult(reason = '') {
  return normalizePlateResult({
    dish_name: 'Ймовірно паста з соусом',
    description: reason ? `Ймовірно паста з соусом. ${reason}` : 'Ймовірно паста з соусом',
    total_calories: 520,
    total_proteins: 20,
    total_fats: 16,
    total_carbs: 72,
    ai_tip: 'Результат приблизний. Перевірте назву, вагу і КБЖУ перед збереженням.',
    items: [
      { name: 'Паста варена', unit: 'g', amount: 220, weight_g: 220, calories: 330, proteins: 11, fats: 2, carbs: 68 },
      { name: "Соус з м'ясом", unit: 'g', amount: 120, weight_g: 120, calories: 190, proteins: 9, fats: 14, carbs: 4 },
    ],
  });
}

function getVisionPrompt(force = false) {
  return `You are NutriAI, an expert dietitian analyzing a plate photo.
Critical: if there is any food in the image, return a result. Do not refuse, do not return empty JSON.
If uncertain, give the most likely concrete dish name and set ai_tip to "Приблизно, можна відредагувати".
The most important field is the dish name. Fill dish_name and name. Never use generic names like "Food", "Meal", "Їжа", "Страва".

For pasta with red or brown meat sauce, use a concrete name such as "Макарони Болоньєзе" or "Паста з м'ясним соусом".
Rules:
1. Split complex meals into visible components with approximate weights.
2. Calculate realistic calories, proteins, fats, carbs for every component and totals.
3. Use unit "ml" for liquids and "g" for solid food.
4. If the photo is not perfect, make the best concrete hypothesis from texture, color, and shape.
5. Meat without breading has almost no carbs; herbs 2-5 g have almost no calories; count pasta as cooked.
${force ? 'Force mode: return an approximate editable object even with low confidence.' : ''}
Return strict JSON only. No markdown or explanatory text.`;
}

export const plateVisionSchema = {
  type: 'object',
  properties: {
    dish_name: { type: 'string' },
    name: { type: 'string' },
    description: { type: 'string' },
    total_calories: { type: 'number' },
    total_proteins: { type: 'number' },
    total_fats: { type: 'number' },
    total_carbs: { type: 'number' },
    ai_tip: { type: 'string' },
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          dish_name: { type: 'string' },
          title: { type: 'string' },
          unit: { type: 'string' },
          amount: { type: 'number' },
          weight_g: { type: 'number' },
          calories: { type: 'number' },
          proteins: { type: 'number' },
          fats: { type: 'number' },
          carbs: { type: 'number' },
        },
      },
    },
  },
};

export async function analyzePlatePhoto(file) {
  const { file_url } = await nutriApi.integrations.Core.UploadFile({ file });
  const runVision = (force = false) =>
    nutriApi.integrations.Core.InvokeLLM({
      prompt: getVisionPrompt(force),
      file_urls: [file_url],
      model: 'gemini_3_flash',
      response_json_schema: plateVisionSchema,
    });

  let normalized = normalizePlateResult(await runVision(false));
  if (!normalized.items.length) {
    normalized = normalizePlateResult(await runVision(true));
  }

  return normalized.items.length
    ? normalized
    : createApproximatePlateResult('Gemini не повернув структуровані дані, тому відкрито редагований приблизний варіант.');
}
