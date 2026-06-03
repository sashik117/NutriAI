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

export async function generateWeeklyMealPlan({ mode, profile, recentFoods }) {
  return nutriApi.integrations.Core.InvokeLLM({
    task: 'meal_plan_weekly',
    data: { mode, profile, recentFoods },
    response_json_schema: weeklyPlanSchema,
    model: 'gemini_3_flash',
  });
}

export async function regenerateMealPlanDay({ mode, profile, recentFoods, usedMeals, dayName }) {
  return nutriApi.integrations.Core.InvokeLLM({
    task: 'meal_plan_day',
    data: { mode, profile, recentFoods, usedMeals, dayName },
    response_json_schema: mealPlanDaySchema,
    model: 'gemini_3_flash',
  });
}
