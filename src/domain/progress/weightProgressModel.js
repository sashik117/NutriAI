import { format } from 'date-fns';
import { uk } from 'date-fns/locale';

export function buildWeightChartData(weightLogs = [], limit = 30) {
  return [...weightLogs]
    .sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')))
    .slice(-limit)
    .map((log) => ({
      date: format(new Date(log.date), 'd MMM', { locale: uk }),
      weight: Number(log.weight),
    }))
    .filter((point) => Number.isFinite(point.weight));
}

export function getWeightStats(weightLogs = [], profile = {}) {
  const latestWeight = weightLogs[0]?.weight;
  const firstWeight = weightLogs[weightLogs.length - 1]?.weight;
  const diff = latestWeight && firstWeight ? (Number(latestWeight) - Number(firstWeight)).toFixed(1) : null;

  return {
    latestWeight,
    firstWeight,
    diff,
    targetWeight: profile?.target_weight || profile?.weight,
    entriesCount: weightLogs.length,
  };
}

export function findTodayWeightLog(weightLogs = [], today) {
  return weightLogs.find((log) => log.date === today);
}
