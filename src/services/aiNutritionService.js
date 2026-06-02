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

export function buildFoodAnalysisPrompt(inputText) {
  return `You are NutriAI, a professional dietitian.
The user described one meal: "${inputText}".

Return only structured JSON matching the schema.
Rules:
- Split complex meals into separate food items.
- Use unit "ml" for liquids and amount in milliliters.
- Use unit "g" for solid food and amount in grams.
- Every item must have realistic calories, proteins, fats, and carbs.
- Do not return zero nutrition when a real food is described.
- Use conservative realistic estimates when exact brand data is unknown.
- Do not use markdown, bullets, stars, or explanations outside JSON.`;
}

export async function analyzeFoodDescription(inputText) {
  return nutriApi.integrations.Core.InvokeLLM({
    prompt: buildFoodAnalysisPrompt(inputText),
    response_json_schema: foodAnalysisSchema,
    model: 'gemini_3_flash',
  });
}

export function buildFoodRefinementPrompt(currentResult, refinement) {
  return `The user already has a structured food log and wants to refine it.

Current food log JSON:
${JSON.stringify(currentResult, null, 2)}

User refinement:
"${refinement}"

Update only the relevant items, recalculate totals, and return the same JSON shape.
Do not add new foods unless the user explicitly requested it.
Return only JSON.`;
}

export async function refineFoodAnalysis(currentResult, refinement) {
  return nutriApi.integrations.Core.InvokeLLM({
    prompt: buildFoodRefinementPrompt(currentResult, refinement),
    response_json_schema: foodAnalysisSchema,
    model: 'gemini_3_flash',
  });
}
