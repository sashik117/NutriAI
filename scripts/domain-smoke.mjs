import assert from 'node:assert/strict';
import {
  buildCalendarStats,
  buildDashboardGoals,
  getFoodLogDates,
  summarizeFoodLogs,
  summarizeWaterLogs,
} from '../src/domain/dashboard/dashboardModel.js';
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

console.log('domain smoke ok');
