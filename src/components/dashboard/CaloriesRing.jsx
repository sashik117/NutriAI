import { motion } from 'framer-motion';
import { useLanguage } from '@/lib/LanguageContext';

function ringStatus(current, goal) {
  const ratio = goal ? current / goal : 0;
  if (ratio > 1.05) {
    return {
      color: '#8b5cf6',
      baseColor: '#22c55e',
      glow: 'rgba(139, 92, 246, 0.24)',
      label: 'Перебір калорій',
      helper: 'Чітміл зона',
      mode: 'over',
      ratio,
    };
  }
  if (ratio >= 0.8) {
    return {
      color: '#22c55e',
      glow: 'rgba(34, 197, 94, 0.22)',
      label: 'Ти в нормі! ✨',
      helper: 'Ідеальний баланс',
      mode: 'done',
      ratio,
    };
  }
  if (ratio >= 0.5) {
    return {
      color: '#f97316',
      glow: 'rgba(249, 115, 22, 0.2)',
      label: 'Ще трохи добрати',
      helper: 'Середня зона',
      mode: 'mid',
      ratio,
    };
  }
  return {
    color: '#ef4444',
    glow: 'rgba(239, 68, 68, 0.18)',
    label: 'Критичний недобір',
    helper: 'Треба поїсти',
    mode: 'low',
    ratio,
  };
}

export default function CaloriesRing({ current, goal }) {
  const { isEnglish, text } = useLanguage();
  const size = 188;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const status = ringStatus(current, goal);
  const progress = Math.min(status.ratio, 1);
  const overProgress = Math.min(Math.max(status.ratio - 1.05, 0) / 0.45, 1);
  const offset = circumference * (1 - progress);
  const overOffset = circumference * (1 - overProgress);
  const remaining = Math.max(goal - current, 0);
  const over = Math.max(current - goal, 0);

  return (
    <div className="flex flex-col items-center">
      <motion.div
        className="relative rounded-full"
        style={{ width: size, height: size, boxShadow: `0 0 34px ${status.glow}` }}
        animate={{ boxShadow: `0 0 34px ${status.glow}` }}
        transition={{ duration: 0.6 }}
      >
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth={strokeWidth}
          />
          {status.mode === 'over' && (
            <motion.circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={status.baseColor}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: 0 }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          )}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={status.color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: status.mode === 'over' ? overOffset : offset }}
            transition={{ duration: 1.15, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
          <span className="text-3xl font-extrabold">{status.mode === 'over' ? over : remaining}</span>
          <span className="text-xs font-semibold text-muted-foreground">
            {status.mode === 'over' ? text('ккал перебір', 'kcal over') : text('ккал залишилось', 'kcal left')}
          </span>
          <span className="mt-1 text-[11px] font-bold" style={{ color: status.color }}>
            {isEnglish
              ? {
                  over: 'Calories over',
                  done: 'You are on track! ✨',
                  mid: 'A little more to go',
                  low: 'Critical under-eating',
                }[status.mode]
              : status.label}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {isEnglish
              ? {
                  over: 'Treat zone',
                  done: 'Perfect balance',
                  mid: 'Middle zone',
                  low: 'Time to eat',
                }[status.mode]
              : status.helper}
          </span>
        </div>
      </motion.div>
    </div>
  );
}
