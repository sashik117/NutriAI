import { nutriApi } from '@/api/nutriApi';

function cleanAiText(value, fallback = '') {
  return String(value || fallback)
    .replace(/```json|```/gi, '')
    .replace(/[#*_`>~]/g, '')
    .replace(/^\s*[-•]\s*/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function generateWeightForecast({ chartData = [], latestWeight, profile = {} }) {
  const result = await nutriApi.integrations.Core.InvokeLLM({
    model: 'gemini_3_flash',
    task: 'weight_forecast',
    data: { chartData, latestWeight, profile },
  });

  return cleanAiText(result);
}

export async function generateDayNutritionSummary({ profile = {}, totals = {}, totalWater = 0, foodLogs = [] }) {
  const result = await nutriApi.integrations.Core.InvokeLLM({
    model: 'gemini_3_flash',
    task: 'day_nutrition_summary',
    data: { profile, totals, totalWater, foodLogs },
  });

  return cleanAiText(result);
}
