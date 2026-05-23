import { useState } from 'react';
import { nutriApi } from '@/api/nutriApi';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, subDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Copy, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const MEAL_LABELS = {
  breakfast: '☕ Сніданок',
  lunch: '🌞 Обід',
  dinner: '🌙 Вечеря',
  snack: '🍪 Перекус',
  snack1: '🍎 Перекус 1',
  snack2: '🧃 Перекус 2',
  snack3: '🍫 Перекус 3',
};

export default function CopyYesterdayMeal() {
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
  const today = format(new Date(), 'yyyy-MM-dd');
  const queryClient = useQueryClient();
  const [copying, setCopying] = useState(null);

  const { data: yesterdayLogs } = useQuery({
    queryKey: ['foodLogs', yesterday],
    queryFn: () => nutriApi.entities.FoodLog.filter({ date: yesterday }),
    initialData: [],
  });

  if (!yesterdayLogs.length) return null;

  const copyMeal = async (log) => {
    setCopying(log.id);
    await nutriApi.entities.FoodLog.create({
      meal_type: log.meal_type,
      description: log.description,
      items: log.items,
      total_calories: log.total_calories,
      total_proteins: log.total_proteins,
      total_fats: log.total_fats,
      total_carbs: log.total_carbs,
      date: today,
    });
    queryClient.invalidateQueries({ queryKey: ['foodLogs', today] });
    toast.success(`${MEAL_LABELS[log.meal_type] || 'Прийом'} скопійовано ✅`);
    setCopying(null);
  };

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
        <Copy className="w-3.5 h-3.5" /> Скопіювати вчора
      </p>
      <div className="flex flex-wrap gap-2">
        {yesterdayLogs.map(log => (
          <Button
            key={log.id}
            variant="outline"
            size="sm"
            className="rounded-full text-xs h-8 px-3 gap-1"
            onClick={() => copyMeal(log)}
            disabled={copying === log.id}
          >
            {copying === log.id
              ? <Loader2 className="w-3 h-3 animate-spin" />
              : null}
            {MEAL_LABELS[log.meal_type] || log.meal_type}
            <span className="text-muted-foreground">{log.total_calories} ккал</span>
          </Button>
        ))}
      </div>
    </div>
  );
}