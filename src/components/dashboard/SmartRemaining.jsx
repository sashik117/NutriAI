import { Beef, Droplet, Flame, Wheat } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';

const rows = [
  { key: 'calories', label: 'Калорії', unit: 'ккал', icon: Flame },
  { key: 'proteins', label: 'Білки', unit: 'г', icon: Beef },
  { key: 'fats', label: 'Жири', unit: 'г', icon: Droplet },
  { key: 'carbs', label: 'Вуглеводи', unit: 'г', icon: Wheat },
];

function getStatus(current, goal) {
  if (!goal) return { color: 'text-muted-foreground', bar: 'bg-muted-foreground', label: 'немає норми' };
  const ratio = current / goal;
  if (ratio > 1.05) return { color: 'text-red-500', bar: 'bg-red-500', label: 'перебір' };
  if (ratio >= 0.95) return { color: 'text-green-600', bar: 'bg-green-500', label: 'норма' };
  return { color: 'text-orange-500', bar: 'bg-orange-400', label: 'ще добрати' };
}

export default function SmartRemaining({ totals, goals }) {
  const { isEnglish, text } = useLanguage();
  const localizedRows = rows.map((row) => ({
    ...row,
    label: isEnglish
      ? { calories: 'Calories', proteins: 'Protein', fats: 'Fats', carbs: 'Carbs' }[row.key]
      : row.label,
    unit: isEnglish ? (row.unit === 'ккал' ? 'kcal' : 'g') : row.unit,
  }));

  return (
    <section className="rounded-2xl border border-border bg-card p-3.5">
      <div className="mb-3">
        <p className="text-sm font-extrabold">{text('Залишилось на сьогодні', 'Left for today')}</p>
        <p className="text-[11px] text-muted-foreground">{text('Оранжеве - недобір, зелене - норма, червоне - перебір', 'Orange - low, green - goal, red - over')}</p>
      </div>

      <div className="space-y-2.5">
        {localizedRows.map(({ key, label, unit, icon: Icon }) => {
          const current = Math.round(totals[key] || 0);
          const goal = Math.round(goals[key] || 0);
          const remaining = goal - current;
          const progress = goal ? Math.min((current / goal) * 100, 100) : 0;
          const status = getStatus(current, goal);

          return (
            <div key={key} className="rounded-xl bg-muted/35 p-2.5">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-1.5">
                  <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate text-xs font-bold">{label}</span>
                </div>
                <span className={`shrink-0 text-xs font-extrabold ${status.color}`}>
                  {remaining >= 0 ? remaining : `+${Math.abs(remaining)}`} {unit}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-background">
                <div className={`h-full rounded-full ${status.bar}`} style={{ width: `${progress}%` }} />
              </div>
              <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                <span>{current}/{goal} {unit}</span>
                <span>{isEnglish ? { 'немає норми': 'no goal', 'перебір': 'over', 'норма': 'goal', 'ще добрати': 'left' }[status.label] : status.label}</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
