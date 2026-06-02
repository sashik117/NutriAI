import { Button } from '@/components/ui/button';
import { Copy, Loader2 } from 'lucide-react';
import { useCopyYesterdayMeal } from '@/hooks/useCopyYesterdayMeal';

export default function CopyYesterdayMeal() {
  const { yesterdayLogs, copying, copyMeal, getMealLabel } = useCopyYesterdayMeal();

  if (!yesterdayLogs.length) return null;

  return (
    <div className="space-y-2">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        <Copy className="h-3.5 w-3.5" /> Скопіювати вчора
      </p>
      <div className="flex flex-wrap gap-2">
        {yesterdayLogs.map((log) => (
          <Button
            key={log.id}
            variant="outline"
            size="sm"
            className="h-8 gap-1 rounded-full px-3 text-xs"
            onClick={() => copyMeal(log)}
            disabled={copying === log.id}
          >
            {copying === log.id ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
            {getMealLabel(log.meal_type)}
            <span className="text-muted-foreground">{log.total_calories} ккал</span>
          </Button>
        ))}
      </div>
    </div>
  );
}
