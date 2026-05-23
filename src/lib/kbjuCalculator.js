// Mifflin-St Jeor formula
export function calculateBMR(gender, weight, height, age) {
  if (gender === 'male') {
    return 10 * weight + 6.25 * height - 5 * age + 5;
  }
  return 10 * weight + 6.25 * height - 5 * age - 161;
}

const activityMultipliers = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

const goalAdjustments = {
  lose: 0.82,
  maintain: 1,
  gain: 1.12,
};

const macroTargetsByGoal = {
  lose: {
    proteinPerKg: 2.1,
    fatPerKg: 0.9,
  },
  maintain: {
    proteinPerKg: 1.7,
    fatPerKg: 1,
  },
  gain: {
    proteinPerKg: 2,
    fatPerKg: 1.1,
  },
};

export function deriveGoalFromWeights(weight, targetWeight) {
  const current = Number(weight);
  const target = Number(targetWeight);

  if (!Number.isFinite(current) || !Number.isFinite(target) || current <= 0 || target <= 0) {
    return 'maintain';
  }

  if (target < current - 0.5) return 'lose';
  if (target > current + 0.5) return 'gain';
  return 'maintain';
}

export function calculateDailyNeeds(gender, weight, height, age, activityLevel, targetWeight) {
  const safeWeight = Number(weight) > 0 ? Number(weight) : 70;
  const safeHeight = Number(height) > 0 ? Number(height) : 170;
  const safeAge = Number(age) > 0 ? Number(age) : 25;
  const goal = deriveGoalFromWeights(safeWeight, targetWeight || safeWeight);
  const bmr = calculateBMR(gender, safeWeight, safeHeight, safeAge);
  const tdee = bmr * (activityMultipliers[activityLevel] || 1.55);
  const adjustedCalories = tdee * (goalAdjustments[goal] || 1);
  const calories = Math.round(goal === 'lose' ? Math.max(adjustedCalories, bmr) : adjustedCalories);

  const macroTargets = macroTargetsByGoal[goal] || macroTargetsByGoal.maintain;
  const proteins = Math.round(safeWeight * macroTargets.proteinPerKg);
  const fats = Math.round(safeWeight * macroTargets.fatPerKg);
  const caloriesAfterProteinAndFat = calories - proteins * 4 - fats * 9;
  const carbs = Math.max(Math.round(caloriesAfterProteinAndFat / 4), 0);
  const water = Math.round(safeWeight * 35); // 30-35ml per kg, use upper bound as active wellness default.

  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    goal,
    calories,
    proteins,
    fats,
    carbs,
    water,
    proteinPerKg: macroTargets.proteinPerKg,
    fatPerKg: macroTargets.fatPerKg,
  };
}
