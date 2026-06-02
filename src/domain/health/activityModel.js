export const HEALTH_ACTIVITY_STORAGE_KEY = 'health_activity_today';

export function todayKey() {
  return new Date().toISOString().split('T')[0];
}

export function stepsToCalories(steps, weightKg = 70) {
  return Math.round((Number(steps) || 0) * 0.04 * ((Number(weightKg) || 70) / 70));
}

export function buildActivityPayload(steps, weightKg = 70, source = 'manual') {
  const stepCount = Number(steps) || 0;
  return {
    steps: stepCount,
    active_calories: stepsToCalories(stepCount, weightKg),
    source,
  };
}

export function readStoredActivity(storage = localStorage) {
  try {
    const stored = JSON.parse(storage.getItem(HEALTH_ACTIVITY_STORAGE_KEY) || '{}');
    if (stored.date === todayKey()) return stored;
  } catch {
    // Ignore malformed local storage.
  }
  return null;
}

export function storeActivity(data, storage = localStorage) {
  storage.setItem(HEALTH_ACTIVITY_STORAGE_KEY, JSON.stringify({ ...data, date: todayKey() }));
}

export function clearStoredActivity(storage = localStorage) {
  storage.removeItem(HEALTH_ACTIVITY_STORAGE_KEY);
}
