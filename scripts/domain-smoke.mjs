import assert from 'node:assert/strict';
import {
  buildCalendarStats,
  buildDashboardGoals,
  getFoodLogDates,
  summarizeFoodLogs,
  summarizeWaterLogs,
} from '../src/domain/dashboard/dashboardModel.js';
import { normalizePlan } from '../src/domain/meal-plan/mealPlanModel.js';
import { sanitizeNickname, sanitizeVerificationCode, validateRegistration } from '../src/domain/auth/authModel.js';
import {
  buildActivityPayload,
  readStoredActivity,
  stepsToCalories,
  storeActivity,
} from '../src/domain/health/activityModel.js';
import {
  buildHistoryDate,
  buildHistoryDays,
  summarizeHistoryFood,
  summarizeHistoryWater,
} from '../src/domain/history/historyModel.js';
import {
  buildMealUpdatePayload,
  normalizeEditableMealItem,
  summarizeEditableMealItems,
  updateEditableMealItem,
} from '../src/domain/food/editMealModel.js';
import {
  buildFoodResultSavePayload,
  normalizeFoodResultItem,
  summarizeFoodResultItems,
  updateFoodResultItem,
} from '../src/domain/food/foodResultModel.js';
import {
  buildSearchResults,
  cleanProduct,
  stripBrandNoise,
} from '../src/domain/food/productSearchModel.js';
import {
  buildBodyMeasurementChartData,
  buildBodyMeasurementPayload,
  hasAnyMeasurementValue,
} from '../src/domain/progress/bodyMeasurementModel.js';
import { buildWeightChartData, findTodayWeightLog, getWeightStats } from '../src/domain/progress/weightProgressModel.js';
import { buildListFromMeals } from '../src/services/shoppingListService.js';

const foodLogs = [
  { date: '2026-06-01', total_calories: 500, total_proteins: 30, total_fats: 12, total_carbs: 60 },
  { date: '2026-06-01', total_calories: 700, total_proteins: 40, total_fats: 20, total_carbs: 80 },
];

assert.deepEqual(summarizeFoodLogs(foodLogs), {
  calories: 1200,
  proteins: 70,
  fats: 32,
  carbs: 140,
});
assert.equal(summarizeWaterLogs([{ amount_ml: 250 }, { amount_ml: 500 }]), 750);

const goals = buildDashboardGoals(
  { daily_calories: 1800, daily_proteins: 110, daily_fats: 55, daily_carbs: 210, daily_water_ml: 1700 },
  { activityCalories: 200, isToday: true }
);
assert.equal(goals.calories, 2000);
assert.equal(goals.water, 1700);
assert.deepEqual(getFoodLogDates(foodLogs), ['2026-06-01', '2026-06-01']);
assert.ok(buildCalendarStats(foodLogs, goals)['2026-06-01'].ratio > 0);

const weightLogs = [
  { id: 1, date: '2026-06-02', weight: 50 },
  { id: 2, date: '2026-06-01', weight: 49.5 },
];
assert.equal(findTodayWeightLog(weightLogs, '2026-06-02').weight, 50);
assert.equal(getWeightStats(weightLogs, { target_weight: 54 }).diff, '0.5');
assert.equal(buildWeightChartData(weightLogs).length, 2);

assert.equal(sanitizeNickname('Sa ha!_117'), 'Saha_117');
assert.equal(sanitizeVerificationCode('12a34b567'), '123456');
assert.equal(validateRegistration({ nickname: 'Saha_117', email: 'saha@test.com', password: '123456', confirmPassword: '123456' }), '');
assert.ok(validateRegistration({ nickname: 'са', email: 'bad', password: '1', confirmPassword: '2' }));

assert.deepEqual(buildBodyMeasurementPayload({ waist: '60.5', hips: '', chest: '82' }), { waist: 60.5, hips: 0, chest: 82 });
assert.equal(hasAnyMeasurementValue({ waist: '', hips: '', chest: '' }), false);
assert.equal(buildBodyMeasurementChartData([{ date: '2026-06-01', waist: 60, hips: 90, chest: 82 }]).length, 1);

assert.equal(stepsToCalories(10000, 70), 400);
assert.deepEqual(buildActivityPayload('1000', 70, 'manual'), { steps: 1000, active_calories: 40, source: 'manual' });
const fakeStorage = new Map();
const storage = {
  getItem: (key) => fakeStorage.get(key),
  setItem: (key, value) => fakeStorage.set(key, value),
  removeItem: (key) => fakeStorage.delete(key),
};
storeActivity({ steps: 500, active_calories: 20, source: 'manual' }, storage);
assert.equal(readStoredActivity(storage).steps, 500);

assert.deepEqual(summarizeHistoryFood(foodLogs), {
  calories: 1200,
  proteins: 70,
  fats: 32,
  carbs: 140,
});
assert.equal(summarizeHistoryWater([{ amount_ml: 100 }, { amount_ml: 250 }]), 350);
assert.equal(buildHistoryDate(1, new Date('2026-06-02T12:00:00')), '2026-06-01');
assert.equal(buildHistoryDays({ baseDate: new Date('2026-06-02T12:00:00'), isEnglish: true })[1].label, 'Yesterday');

const editableItem = normalizeEditableMealItem({ name: 'Milk', unit: 'ml', amount: 200, calories: 120 });
assert.equal(editableItem.unit, 'ml');
assert.equal(updateEditableMealItem({ unit: 'g', amount: 100, weight_g: 100 }, 'amount', '150').weight_g, 150);
assert.deepEqual(summarizeEditableMealItems([{ calories: 100, proteins: 10, fats: 3, carbs: 15 }]), {
  calories: 100,
  proteins: 10,
  fats: 3,
  carbs: 15,
});
assert.equal(buildMealUpdatePayload({ mealType: 'lunch', items: [{ calories: 120.4, proteins: 8.2, fats: 3.2, carbs: 15.8 }] }).total_calories, 120);

const foodResultItem = normalizeFoodResultItem({ title: '*Pasta*', amount: '150', calories: '220', proteins: '8' });
assert.equal(foodResultItem.name, 'Pasta');
assert.equal(updateFoodResultItem({ unit: 'g', amount: 100, weight_g: 100 }, 'amount', '180').weight_g, 180);
assert.deepEqual(summarizeFoodResultItems([{ calories: 200, proteins: 10, fats: 4, carbs: 32 }]), {
  total_calories: 200,
  total_proteins: 10,
  total_fats: 4,
  total_carbs: 32,
});
assert.equal(buildFoodResultSavePayload({ source: 'ai' }, [{ name: 'Milk', unit: 'ml', amount: 200, calories: 120 }]).total_calories, 120);

const cleanedPastaName = stripBrandNoise('Макарони &quot;Spaghetti&quot; De Luxe', 'De Luxe');
assert.equal(cleanedPastaName, 'Спагетті');
const repairedSnickers = cleanProduct({ name: 'Snickers', calories: 200, proteins: 8, fats: 6, carbs: 28 }, 'snickers');
assert.ok(repairedSnickers.calories > 400, 'suspicious product template should be replaced with realistic estimate');
const dedupedSearch = buildSearchResults([
  { name: 'Макарони Spaghetti', calories: 356, proteins: 9, fats: 1, carbs: 77 },
  { name: 'Spaghetti pasta', calories: 360, proteins: 10, fats: 1, carbs: 76 },
], 'спагетті');
assert.equal(dedupedSearch.length, 1);

const shoppingList = buildListFromMeals([
  {
    title: 'Oats with banana',
    ingredients: [
      { name: 'Oats', amount: 50, unit: 'g' },
      { name: 'Milk', amount: 200, unit: 'ml' },
    ],
  },
  {
    title: 'Protein oats',
    ingredients: [
      { name: 'Oats', amount: 40, unit: 'g' },
      { name: 'Milk', amount: 100, unit: 'ml' },
    ],
  },
]);

const shoppingItems = shoppingList.categories.flatMap((category) => category.items);
assert.equal(shoppingItems.find((item) => item.name === 'Oats')?.amount, 90);
assert.equal(shoppingItems.find((item) => item.name === 'Milk')?.amount, 300);

const normalizedPlan = normalizePlan({
  days: [{
    day: 'Понеділок',
    meals: [{
      slot: 'lunch',
      title: 'Рис з куркою',
      calories: 500,
      ingredients: [
        { name: 'Рис', amount: '90', unit: 'г', weight_g: 90 },
        { name: 'Куряче філе', amount: '150', unit: 'г', weight_g: 150 },
      ],
    }],
  }],
}, 'classic');
const lunchIngredients = normalizedPlan.days[0].meals.find((meal) => meal.slot === 'lunch').ingredients;
assert.ok(lunchIngredients.some((item) => item.name === 'Рис'), 'meal plan should keep rice as a real ingredient');

console.log('domain smoke ok');
