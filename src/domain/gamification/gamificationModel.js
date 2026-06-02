import { format, subDays } from 'date-fns';

export const BADGES = [
  { type: 'first_log', emoji: '🍽️', title: 'Перший крок', description: 'Перший запис їжі' },
  { type: 'streak_3', emoji: '🔥', title: '3 дні', description: 'Три дні поспіль' },
  { type: 'streak_7', emoji: '⚡', title: '7 днів', description: 'Тижнева серія' },
  { type: 'streak_30', emoji: '💎', title: '30 днів', description: 'Місячна серія' },
  { type: 'water_5', emoji: '💧', title: 'Вода', description: 'Норма води 5 днів' },
  { type: 'protein_7', emoji: '💪', title: 'Білок', description: 'Норма білка 7 днів' },
  { type: 'logs_50', emoji: '📊', title: '50 записів', description: 'Багато даних' },
  { type: 'weight_logged', emoji: '⚖️', title: 'Вага', description: 'Перший запис ваги' },
];

export function getStreak(foodLogs) {
  const dates = new Set(foodLogs.map((log) => log.date));
  let streak = 0;
  for (let index = 0; index < 365; index += 1) {
    const expected = format(subDays(new Date(), index), 'yyyy-MM-dd');
    if (!dates.has(expected)) break;
    streak += 1;
  }
  return streak;
}

export function getBestStreak(foodLogs) {
  const sorted = [...new Set(foodLogs.map((log) => log.date))].sort();
  let best = 0;
  let current = 0;
  let previous = null;

  sorted.forEach((date) => {
    if (!previous) {
      current = 1;
    } else {
      const expected = format(subDays(new Date(`${date}T00:00:00`), 1), 'yyyy-MM-dd');
      current = previous === expected ? current + 1 : 1;
    }
    best = Math.max(best, current);
    previous = date;
  });

  return best;
}

export function getBadgesToUnlock({ achievements = [], foodLogs = [], waterLogs = [], weightLogs = [], profile = {}, streak = 0 }) {
  if (!foodLogs.length) return [];
  const unlocked = achievements.map((item) => item.type);
  const toUnlock = [];
  const addBadge = (type) => {
    const badge = BADGES.find((item) => item.type === type);
    if (badge && !unlocked.includes(type)) toUnlock.push(badge);
  };

  addBadge('first_log');
  if (streak >= 3) addBadge('streak_3');
  if (streak >= 7) addBadge('streak_7');
  if (streak >= 30) addBadge('streak_30');
  if (foodLogs.length >= 50) addBadge('logs_50');
  if (weightLogs.length >= 1) addBadge('weight_logged');

  const waterGoal = profile?.daily_water_ml || 2000;
  const waterDays = Array.from({ length: 7 }, (_, index) => {
    const date = format(subDays(new Date(), index), 'yyyy-MM-dd');
    return waterLogs.filter((log) => log.date === date).reduce((sum, log) => sum + (log.amount_ml || 0), 0) >= waterGoal;
  }).filter(Boolean).length;
  if (waterDays >= 5) addBadge('water_5');

  const proteinGoal = profile?.daily_proteins || 150;
  const proteinDays = Array.from({ length: 7 }, (_, index) => {
    const date = format(subDays(new Date(), index), 'yyyy-MM-dd');
    return foodLogs.filter((log) => log.date === date).reduce((sum, log) => sum + (log.total_proteins || 0), 0) >= proteinGoal;
  }).filter(Boolean).length;
  if (proteinDays >= 7) addBadge('protein_7');

  return toUnlock;
}

export function translateBadge(badge, isEnglish) {
  if (!isEnglish) return badge;
  const map = {
    first_log: ['First step', 'First food entry'],
    streak_3: ['3 days', 'Three days in a row'],
    streak_7: ['7 days', 'Weekly streak'],
    streak_30: ['30 days', 'Monthly streak'],
    water_5: ['Water', 'Water goal for 5 days'],
    protein_7: ['Protein', 'Protein goal for 7 days'],
    logs_50: ['50 entries', 'Lots of data'],
    weight_logged: ['Weight', 'First weight entry'],
  };
  const [title, description] = map[badge.type] || [badge.title, badge.description];
  return { ...badge, title, description };
}
