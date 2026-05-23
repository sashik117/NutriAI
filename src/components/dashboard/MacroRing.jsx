import { motion } from 'framer-motion';

const macroColors = {
  proteins: { soft: '#93c5fd', bright: '#2563eb', over: '#8b5cf6' },
  fats: { soft: '#fde68a', bright: '#f59e0b', over: '#8b5cf6' },
  carbs: { soft: '#f9a8d4', bright: '#ec4899', over: '#8b5cf6' },
  calories: { soft: '#86efac', bright: '#22c55e', over: '#8b5cf6' },
};

export default function MacroRing({ label, current, goal, color, size = 80, strokeWidth = 8 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const ratio = goal ? current / goal : 0;
  const progress = Math.min(ratio, 1);
  const offset = circumference * (1 - progress);
  const palette = macroColors[color] || macroColors.calories;
  const ringColor = ratio > 1.05 ? palette.over : ratio >= 0.95 ? palette.bright : palette.soft;
  const glow = ratio >= 0.95 ? `${ringColor}44` : 'transparent';

  return (
    <div className="flex min-w-0 flex-col items-center gap-1">
      <motion.div
        className="relative rounded-full"
        style={{ width: size, height: size, boxShadow: `0 0 18px ${glow}` }}
        animate={{ boxShadow: `0 0 18px ${glow}` }}
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
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={ringColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 0.95, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-sm font-extrabold">{current}</span>
          <span className="text-[9px] text-muted-foreground">/{goal}</span>
        </div>
      </motion.div>
      <span className="max-w-20 truncate text-[11px] font-semibold text-muted-foreground">{label}</span>
    </div>
  );
}
