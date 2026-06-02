import {
  createFallbackFromSchema,
  normalizeNutritionResult,
  normalizeSchemaResult,
} from '../domain/nutritionRules.js';

export class NutritionService {
  canFallback(payload) {
    return Boolean(payload?.response_json_schema || payload?.prompt);
  }

  normalize(rawResult, payload = {}) {
    const schemaNormalized = normalizeSchemaResult(rawResult, payload.response_json_schema, payload.prompt);
    return normalizeNutritionResult(this.coerceNutritionShape(schemaNormalized), payload.prompt);
  }

  coerceNutritionShape(result) {
    if (!result || typeof result !== 'object' || Array.isArray(result)) return result;
    if (Array.isArray(result.items) || !Array.isArray(result.dishes)) return result;

    const items = result.dishes.flatMap((dish) => {
      const ingredients = Array.isArray(dish.ingredients) ? dish.ingredients : [];
      if (ingredients.length === 0) {
        return [{
          name: dish.dish_name || dish.name || 'Food',
          weight_g: dish.weight_g || 150,
          calories: dish.calories || dish.total_calories,
          proteins: dish.proteins || dish.protein_g || dish.total_protein_g,
          fats: dish.fats || dish.fat_g || dish.total_fat_g,
          carbs: dish.carbs || dish.carbs_g || dish.total_carbs_g,
        }];
      }

      return ingredients.map((ingredient) => ({
        name: ingredient.name || ingredient.ingredient_name || ingredient.food_name || 'Ingredient',
        weight_g: ingredient.weight_g || ingredient.grams || 100,
        calories: ingredient.calories,
        proteins: ingredient.proteins || ingredient.protein_g,
        fats: ingredient.fats || ingredient.fat_g,
        carbs: ingredient.carbs || ingredient.carbs_g,
      }));
    });

    const totals = items.reduce((acc, item) => ({
      calories: acc.calories + (Number(item.calories) || 0),
      proteins: acc.proteins + (Number(item.proteins) || 0),
      fats: acc.fats + (Number(item.fats) || 0),
      carbs: acc.carbs + (Number(item.carbs) || 0),
    }), { calories: 0, proteins: 0, fats: 0, carbs: 0 });

    return {
      ...result,
      description: result.description || result.dishes.map((dish) => dish.dish_name || dish.name).filter(Boolean).join(', '),
      items,
      total_calories: result.total_calories || Math.round(totals.calories),
      total_proteins: result.total_proteins || result.total_protein_g || Math.round(totals.proteins * 10) / 10,
      total_fats: result.total_fats || result.total_fat_g || Math.round(totals.fats * 10) / 10,
      total_carbs: result.total_carbs || result.total_carbs_g || Math.round(totals.carbs * 10) / 10,
    };
  }

  fallback(payload = {}) {
    return this.normalize(
      createFallbackFromSchema(payload.response_json_schema, payload.prompt),
      payload
    );
  }

  async invoke(payload, aiService) {
    const aiResult = await aiService.invoke(payload);
    return this.normalize(aiResult || createFallbackFromSchema(payload.response_json_schema, payload.prompt), payload);
  }
}
