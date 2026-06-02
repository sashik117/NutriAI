export const entityConfig = {
  UserProfile: {
    table: 'user_profiles',
    columns: ['gender', 'age', 'weight', 'target_weight', 'height', 'activity_level', 'goal', 'daily_calories', 'daily_proteins', 'daily_fats', 'daily_carbs', 'daily_water_ml', 'ai_personality', 'quick_presets'],
    jsonColumns: ['quick_presets'],
  },
  FoodLog: {
    table: 'food_logs',
    columns: ['meal_type', 'description', 'items', 'total_calories', 'total_proteins', 'total_fats', 'total_carbs', 'date'],
    jsonColumns: ['items'],
  },
  WaterLog: {
    table: 'water_logs',
    columns: ['amount_ml', 'date'],
  },
  WeightLog: {
    table: 'weight_logs',
    columns: ['weight', 'date', 'note'],
  },
  BodyMeasurement: {
    table: 'body_measurements',
    columns: ['date', 'waist', 'hips', 'chest'],
  },
  Achievement: {
    table: 'achievements',
    columns: ['type', 'title', 'description', 'emoji', 'unlocked_date'],
    uniqueBy: 'type',
  },
  MealPlan: {
    table: 'meal_plans',
    columns: ['title', 'plan', 'selected_day_index'],
    jsonColumns: ['plan'],
  },
};

export function getEntityConfig(entityName) {
  const config = entityConfig[entityName];
  if (!config) {
    const error = new Error(`Unknown entity: ${entityName}`);
    error.status = 404;
    throw error;
  }
  return config;
}
