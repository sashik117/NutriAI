import { nutriApi } from '@/api/nutriApi';

export const foodAnalysisSchema = {
  type: 'object',
  properties: {
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

export async function analyzeFoodDescription(inputText) {
  return nutriApi.integrations.Core.InvokeLLM({
    task: 'food_analysis',
    data: { inputText },
    response_json_schema: foodAnalysisSchema,
    model: 'gemini_3_flash',
  });
}

export async function refineFoodAnalysis(currentResult, refinement) {
  return nutriApi.integrations.Core.InvokeLLM({
    task: 'food_refinement',
    data: { currentResult, refinement },
    response_json_schema: foodAnalysisSchema,
    model: 'gemini_3_flash',
  });
}
