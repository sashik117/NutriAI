import { Calendar, Loader2 } from 'lucide-react';
import MealCard from '@/components/dashboard/MealCard';

export default function HistoryMealList({ foodLogs, isLoading, text }) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (foodLogs.length > 0) {
    return (
      <div className="space-y-2">
        {foodLogs.map((log, index) => (
          <MealCard key={log.id} log={log} index={index} />
        ))}
      </div>
    );
  }

  return (
    <div className="py-8 text-center text-muted-foreground">
      <Calendar className="mx-auto mb-2 h-8 w-8 opacity-50" />
      <p className="text-sm">{text('Немає записів за цей день', 'No entries for this day')}</p>
    </div>
  );
}
