export function buildDashboardGoals(profile, { activityCalories = 0, isToday = false } = {}) {
  return {
    calories: (profile?.daily_calories || 2000) + (isToday ? activityCalories : 0),
    proteins: profile?.daily_proteins || 150,
    fats: profile?.daily_fats || 67,
    carbs: profile?.daily_carbs || 200,
    water: profile?.daily_water_ml || 2000,
  };
}

export function summarizeFoodLogs(foodLogs = []) {
  return foodLogs.reduce(
    (acc, log) => ({
      calories: acc.calories + (log.total_calories || 0),
      proteins: acc.proteins + (log.total_proteins || 0),
      fats: acc.fats + (log.total_fats || 0),
      carbs: acc.carbs + (log.total_carbs || 0),
    }),
    { calories: 0, proteins: 0, fats: 0, carbs: 0 }
  );
}

export function summarizeWaterLogs(waterLogs = []) {
  return waterLogs.reduce((acc, log) => acc + (log.amount_ml || 0), 0);
}

export function getFoodLogDates(foodLogs = []) {
  return foodLogs.map((log) => String(log.date).slice(0, 10));
}

export function buildCalendarStats(foodLogs = [], goals = {}) {
  return foodLogs.reduce((acc, log) => {
    const date = String(log.date).slice(0, 10);
    acc[date] = acc[date] || { calories: 0, proteins: 0, fats: 0, carbs: 0, ratio: 0 };
    acc[date].calories += log.total_calories || 0;
    acc[date].proteins += log.total_proteins || 0;
    acc[date].fats += log.total_fats || 0;
    acc[date].carbs += log.total_carbs || 0;

    const ratios = [
      acc[date].calories / (goals.calories || 1),
      acc[date].proteins / (goals.proteins || 1),
      acc[date].fats / (goals.fats || 1),
      acc[date].carbs / (goals.carbs || 1),
    ];
    acc[date].ratio = ratios.reduce((sum, value) => sum + Math.min(value, 1.3), 0) / ratios.length;
    return acc;
  }, {});
}
