import { useEffect, useRef } from 'react';
import { format, isSameDay, subDays } from 'date-fns';
import { uk } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const DAYS_BACK = 30;
const DAYS_FORWARD = 3;

function progressTone(ratio) {
  if (ratio < 0.5) return { color: '#ef4444', label: 'Критичний недобір' };
  if (ratio < 0.8) return { color: '#f97316', label: 'Ще треба добрати' };
  if (ratio <= 1.05) return { color: '#22c55e', label: 'Норма закрита' };
  return { color: '#8b5cf6', label: 'Перебір' };
}

function DayProgress({ dayNumber, ratio, hasLog, isSelected }) {
  const size = 38;
  const stroke = 4;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const tone = progressTone(ratio);
  const mainProgress = Math.min(ratio, 1);
  const mainOffset = circumference * (1 - mainProgress);
  const overProgress = Math.min(Math.max(ratio - 1.05, 0) / 0.45, 1);
  const overOffset = circumference * (1 - overProgress);

  if (!hasLog) {
    return (
      <span
        className={cn(
          'flex h-[38px] w-[38px] items-center justify-center rounded-full text-base font-extrabold leading-tight',
          isSelected ? 'bg-primary/10 text-primary' : 'text-foreground'
        )}
      >
        {dayNumber}
      </span>
    );
  }

  return (
    <span className="relative flex h-[38px] w-[38px] items-center justify-center">
      <svg width={size} height={size} className="absolute inset-0 -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={stroke}
        />
        {ratio > 1.05 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#22c55e"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={0}
          />
        )}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={tone.color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={ratio > 1.05 ? overOffset : mainOffset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <span
        className={cn(
          'relative z-10 text-base font-extrabold leading-tight',
          isSelected ? 'text-foreground' : ''
        )}
      >
        {dayNumber}
      </span>
    </span>
  );
}

export default function ScrollableCalendar({ selectedDate, onSelectDate, logDates = [], dayStats = {} }) {
  const scrollRef = useRef(null);
  const today = new Date();

  const days = Array.from({ length: DAYS_BACK + DAYS_FORWARD + 1 }, (_, index) => {
    return subDays(today, DAYS_BACK - index);
  });

  useEffect(() => {
    if (scrollRef.current) {
      const todayIndex = DAYS_BACK;
      const itemWidth = 52;
      const containerWidth = scrollRef.current.clientWidth;
      scrollRef.current.scrollLeft = todayIndex * itemWidth - containerWidth / 2 + itemWidth / 2;
    }
  }, []);

  return (
    <div className="rounded-2xl border border-border bg-card px-3 py-3">
      <p className="mb-2 px-1 text-xs font-bold text-muted-foreground">
        {format(selectedDate, 'LLLL yyyy', { locale: uk })}
      </p>
      <div
        ref={scrollRef}
        className="scrollbar-hide flex gap-1.5 overflow-x-auto pb-1"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {days.map((day) => {
          const isSelected = isSameDay(day, selectedDate);
          const isToday = isSameDay(day, today);
          const key = format(day, 'yyyy-MM-dd');
          const hasLog = logDates.includes(key);
          const ratio = dayStats[key]?.ratio || 0;
          const tone = hasLog ? progressTone(ratio) : { label: 'Немає записів' };

          return (
            <button
              key={key}
              onClick={() => onSelectDate(day)}
              title={`${format(day, 'd MMMM', { locale: uk })}: ${tone.label}`}
              className={cn(
                'flex min-w-[50px] shrink-0 flex-col items-center rounded-xl py-2 transition-all duration-200 active:scale-95',
                isSelected
                  ? 'bg-muted shadow-sm scale-105 ring-1 ring-border'
                  : isToday
                    ? 'bg-primary/10 text-primary'
                    : 'hover:bg-muted'
              )}
            >
              <span className="text-[9px] font-semibold uppercase opacity-70">
                {format(day, 'EEE', { locale: uk })}
              </span>
              <DayProgress
                dayNumber={format(day, 'd')}
                ratio={ratio}
                hasLog={hasLog}
                isSelected={isSelected}
              />
              <span
                className={cn(
                  'mt-0.5 h-1.5 w-1.5 rounded-full transition-all',
                  hasLog ? 'opacity-100' : 'opacity-0'
                )}
                style={{ backgroundColor: hasLog ? progressTone(ratio).color : 'transparent' }}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
