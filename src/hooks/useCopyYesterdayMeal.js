import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, subDays } from 'date-fns';
import { toast } from 'sonner';
import { foodLogRepository } from '@/services/repositories';

const MEAL_LABELS = {
  breakfast: '☕ Сніданок',
  lunch: '🌞 Обід',
  dinner: '🌙 Вечеря',
  snack: '🍪 Перекус',
  snack1: '🍎 Перекус 1',
  snack2: '🧃 Перекус 2',
  snack3: '🍫 Перекус 3',
};

function buildCopiedFoodLog(log, today) {
  return {
    meal_type: log.meal_type,
    description: log.description,
    items: log.items,
    total_calories: log.total_calories,
    total_proteins: log.total_proteins,
    total_fats: log.total_fats,
    total_carbs: log.total_carbs,
    date: today,
  };
}

export function useCopyYesterdayMeal() {
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
  const today = format(new Date(), 'yyyy-MM-dd');
  const queryClient = useQueryClient();
  const [copying, setCopying] = useState(null);

  const { data: yesterdayLogs } = useQuery({
    queryKey: ['foodLogs', yesterday],
    queryFn: () => foodLogRepository.filter({ date: yesterday }),
    initialData: [],
  });

  const copyMeal = async (log) => {
    setCopying(log.id);
    try {
      await foodLogRepository.create(buildCopiedFoodLog(log, today));
      queryClient.invalidateQueries({ queryKey: ['foodLogs', today] });
      toast.success(`${MEAL_LABELS[log.meal_type] || 'Прийом'} скопійовано ✅`);
    } finally {
      setCopying(null);
    }
  };

  const getMealLabel = (mealType) => MEAL_LABELS[mealType] || mealType;

  return {
    yesterdayLogs,
    copying,
    copyMeal,
    getMealLabel,
  };
}
