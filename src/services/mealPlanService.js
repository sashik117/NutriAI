import { nutriApi } from '@/api/nutriApi';

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

export const mealPlanDaySchema = {
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

const weeklyPlanSchema = {
  type: 'object',
  properties: {
    days: {
      type: 'array',
      items: mealPlanDaySchema,
    },
  },
};

function goalLabel(goal) {
  if (goal === 'lose') return 'weight loss';
  if (goal === 'gain') return 'healthy weight gain';
  return 'maintenance';
}

function buildDietitianPrompt({ mode, profile, recentFoods = [], usedMeals = [], dayName = '', singleDay = false }) {
  return `You are a professional dietitian and food stylist for NutriAI.
Return only strict JSON matching the provided schema. No markdown, no stars, no bullets.
Create ${singleDay ? `one new day option for ${dayName}` : 'a 7 day meal plan'} in Ukrainian as structured data.

Plan style: ${mode?.label || mode?.key || 'classic'}
Style focus: ${mode?.prompt || 'modern balanced meals'}
User lives in Ukraine, so use realistic products available in Silpo, ATB, Varus, or normal supermarkets.
Goal: ${goalLabel(profile?.goal)}
Daily calories: ${profile?.daily_calories || 2000}
Protein: ${profile?.daily_proteins || 150} g
Fat: ${profile?.daily_fats || 67} g
Carbs: ${profile?.daily_carbs || 200} g
Foods the user often eats: ${recentFoods.join(', ') || 'not specified'}
Already used meal names that must not repeat: ${usedMeals.join(', ') || 'none'}

Quality rules:
- Never repeat the same dish within the plan.
- Every day must be different: proteins, vegetables, grains, sauces, and textures should vary.
- Names should sound appetizing, not like a cafeteria list.
- Classic style: bowls, tuna pasta with cherry tomatoes, teriyaki chicken, salmon, turkey, cottage cheese, seasonal vegetables.
- Light style: seafood, salads, smoothies, light cheeses, yogurt, fish, turkey, greens.
- Plant-based style: tofu, chickpeas, lentils, beans, avocado, nuts, quinoa, bulgur, hummus.

Data rules:
- ${singleDay ? 'Return exactly 1 day.' : 'Return exactly 7 days.'}
- Each day has exactly 4 meals with slots: breakfast, snack, lunch, dinner.
- Each meal has title, description, grams, calories, proteins, fats, carbs.
- Each meal has ingredients as an array of objects: name, amount, unit, weight_g, note.
- Ingredients must be real supermarket products with concrete quantities.
- For shopping lists include only main ingredients. Do not add water, salt, pepper as separate products.
- Do not add ingredients that are not part of the concrete meal.`;
}

export async function generateWeeklyMealPlan({ mode, profile, recentFoods }) {
  return nutriApi.integrations.Core.InvokeLLM({
    prompt: buildDietitianPrompt({ mode, profile, recentFoods, usedMeals: [] }),
    response_json_schema: weeklyPlanSchema,
    model: 'gemini_3_flash',
  });
}

export async function regenerateMealPlanDay({ mode, profile, recentFoods, usedMeals, dayName }) {
  return nutriApi.integrations.Core.InvokeLLM({
    prompt: buildDietitianPrompt({
      mode,
      profile,
      recentFoods,
      usedMeals,
      dayName,
      singleDay: true,
    }),
    response_json_schema: mealPlanDaySchema,
    model: 'gemini_3_flash',
  });
}
