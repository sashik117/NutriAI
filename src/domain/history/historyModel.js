import { format, subDays } from 'date-fns';
import { uk } from 'date-fns/locale';

export function summarizeHistoryFood(foodLogs = []) {
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

export function summarizeHistoryWater(waterLogs = []) {
  return waterLogs.reduce((acc, log) => acc + (log.amount_ml || 0), 0);
}

export function buildHistoryDate(selectedDay = 0, baseDate = new Date()) {
  return format(subDays(baseDate, selectedDay), 'yyyy-MM-dd');
}

export function buildHistoryDays({ baseDate = new Date(), count = 7, isEnglish = false } = {}) {
  return Array.from({ length: count }, (_, offset) => ({
    offset,
    label: offset === 0
      ? (isEnglish ? 'Today' : 'Сьогодні')
      : offset === 1
        ? (isEnglish ? 'Yesterday' : 'Вчора')
        : format(subDays(baseDate, offset), 'EEE', isEnglish ? undefined : { locale: uk }),
    date: format(subDays(baseDate, offset), 'd'),
  }));
}
