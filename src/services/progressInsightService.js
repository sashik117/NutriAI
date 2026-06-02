import { nutriApi } from '@/api/nutriApi';

function cleanAiText(value, fallback = '') {
  return String(value || fallback)
    .replace(/```json|```/gi, '')
    .replace(/[#*_`>~]/g, '')
    .replace(/^\s*[-•]\s*/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function goalLabel(goal) {
  if (goal === 'lose') return 'weight loss';
  if (goal === 'gain') return 'healthy weight gain';
  return 'maintenance';
}

export async function generateWeightForecast({ chartData = [], latestWeight, profile = {} }) {
  const result = await nutriApi.integrations.Core.InvokeLLM({
    model: 'gemini_3_flash',
    prompt: `You are NutriAI, a concise supportive nutrition coach.
Analyze the user's weight trend and return 2-3 short Ukrainian sentences.
No markdown, no bullets, no stars.

Weight logs: ${chartData.map((item) => `${item.date}: ${item.weight} kg`).join(', ') || 'not enough data'}
Current weight: ${latestWeight || 'unknown'} kg
Goal: ${goalLabel(profile?.goal)}
Daily calories: ${profile?.daily_calories || 2000} kcal`,
  });

  return cleanAiText(result);
}

function profileTone(profile = {}) {
  const tones = {
    caring_grandma: 'warm, caring, gentle',
    strict_coach: 'direct, motivational, coach-like',
    lofi_friend: 'calm, friendly, soft',
  };
  return tones[profile?.ai_personality] || tones.lofi_friend;
}

export async function generateDayNutritionSummary({ profile = {}, totals = {}, totalWater = 0, foodLogs = [] }) {
  const goals = {
    calories: profile?.daily_calories || 2000,
    proteins: profile?.daily_proteins || 150,
    fats: profile?.daily_fats || 67,
    carbs: profile?.daily_carbs || 200,
  };

  const result = await nutriApi.integrations.Core.InvokeLLM({
    model: 'gemini_3_flash',
    prompt: `You are NutriAI.
Tone: ${profileTone(profile)}.
Analyze this nutrition day and return 2-3 concrete Ukrainian sentences.
No markdown, no bullets, no stars.

Goals: ${goals.calories} kcal, protein ${goals.proteins} g, fat ${goals.fats} g, carbs ${goals.carbs} g
Actual: ${Math.round(totals.calories || 0)} kcal, protein ${Math.round(totals.proteins || 0)} g, fat ${Math.round(totals.fats || 0)} g, carbs ${Math.round(totals.carbs || 0)} g
Water: ${totalWater} ml
Meals: ${foodLogs.map((log) => log.description || log.items?.map((item) => item.name).join(', ')).filter(Boolean).join('; ')}`,
  });

  return cleanAiText(result);
}
