import { useMemo, useState } from 'react';
import { addMonths, endOfMonth, format, isAfter, isBefore, isSameMonth, startOfMonth, subMonths } from 'date-fns';
import { uk } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/lib/LanguageContext';

function dayTone(ratio, hasLog) {
  if (!hasLog) return { className: 'bg-muted text-muted-foreground/60', label: 'Немає записів' };
  if (ratio < 0.5) return { className: 'bg-red-500 text-white shadow-red-500/20', label: 'Критичний недобір' };
  if (ratio < 0.8) return { className: 'bg-orange-400 text-white shadow-orange-400/20', label: 'Середнячок' };
  if (ratio <= 1.05) return { className: 'bg-green-500 text-white shadow-green-500/20', label: 'Ідеально' };
  return { className: 'bg-purple-500 text-white shadow-purple-500/20', label: 'Перебір' };
}

export default function ActivityHeatmap({ foodLogs = [], caloriesGoal = 2000 }) {
  const { isEnglish, text } = useLanguage();
  const today = new Date();
  const firstLogDate = useMemo(() => {
    const dates = foodLogs.map((log) => log.date).filter(Boolean).sort();
    return dates[0] ? new Date(`${dates[0]}T00:00:00`) : today;
  }, [foodLogs, today]);

  const [visibleMonth, setVisibleMonth] = useState(startOfMonth(today));
  const minMonth = startOfMonth(firstLogDate);
  const maxMonth = startOfMonth(today);
  const canGoPrev = isAfter(visibleMonth, minMonth);
  const canGoNext = isBefore(visibleMonth, maxMonth);

  const days = useMemo(() => {
    const start = startOfMonth(visibleMonth);
    const end = endOfMonth(visibleMonth);
    const count = Number(format(end, 'd'));

    return Array.from({ length: count }, (_, index) => {
      const date = new Date(start);
      date.setDate(index + 1);
      const key = format(date, 'yyyy-MM-dd');
      const calories = foodLogs
        .filter((log) => log.date === key)
        .reduce((sum, log) => sum + (log.total_calories || 0), 0);
      const hasLog = calories > 0;
      const ratio = caloriesGoal ? calories / caloriesGoal : 0;
      return { key, day: index + 1, calories, ratio, hasLog };
    });
  }, [caloriesGoal, foodLogs, visibleMonth]);

  const monthHasAnyData = foodLogs.some((log) => isSameMonth(new Date(`${log.date}T00:00:00`), visibleMonth));

  return (
    <section className="rounded-2xl border border-border bg-card p-3.5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-extrabold">{text('Активність харчування', 'Food activity')}</p>
          <p className="text-[11px] text-muted-foreground capitalize">
            {format(visibleMonth, 'LLLL yyyy', isEnglish ? undefined : { locale: uk })}
          </p>
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            disabled={!canGoPrev}
            onClick={() => canGoPrev && setVisibleMonth((month) => subMonths(month, 1))}
            className="rounded-full p-1.5 text-muted-foreground transition hover:bg-muted disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            disabled={!canGoNext}
            onClick={() => canGoNext && setVisibleMonth((month) => addMonths(month, 1))}
            className="rounded-full p-1.5 text-muted-foreground transition hover:bg-muted disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {days.map((day) => {
          const tone = dayTone(day.ratio, day.hasLog);
          return (
            <div
              key={day.key}
              title={`${day.key}: ${Math.round(day.calories)} ${text('ккал', 'kcal')}`}
              className={cn(
                'flex aspect-square items-center justify-center rounded-lg text-[10px] font-extrabold shadow-sm transition',
                tone.className
              )}
            >
              {day.day}
            </div>
          );
        })}
      </div>

      {!monthHasAnyData && (
        <p className="mt-3 text-center text-xs text-muted-foreground">
          {text('У цьому місяці ще немає записів.', 'No entries for this month yet.')}
        </p>
      )}

      <div className="mt-3 grid grid-cols-4 gap-1 text-[9px] text-muted-foreground">
        <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-red-500" />&lt;50%</span>
        <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-orange-400" />50-80%</span>
        <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-green-500" />80-105%</span>
        <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-purple-500" />105%+</span>
      </div>
    </section>
  );
}
