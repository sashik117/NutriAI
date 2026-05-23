import { motion } from 'framer-motion';
import { Utensils, Coffee, Sun, Moon, Cookie, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';

const mealIcons = {
  breakfast: Coffee,
  lunch: Sun,
  dinner: Moon,
  snack: Cookie,
};

const mealLabels = {
  breakfast: 'Сніданок',
  lunch: 'Обід',
  dinner: 'Вечеря',
  snack: 'Перекус',
  snack1: 'Перекус 1',
  snack2: 'Перекус 2',
  snack3: 'Перекус 3',
};

const formatItem = (item) => {
  const amount = item.amount ?? item.weight_g;
  const unit = item.unit === 'ml' ? 'мл' : 'г';
  return [item.name, amount ? `${amount} ${unit}` : ''].filter(Boolean).join(' ');
};

export default function MealCard({ log, index, onEdit }) {
  const Icon = mealIcons[log.meal_type] || Utensils;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.99 }}
      transition={{ delay: index * 0.07, type: 'spring', stiffness: 260, damping: 22 }}
      className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 shadow-inner">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{mealLabels[log.meal_type] || log.meal_type}</p>
        <p className="truncate text-xs text-muted-foreground">{log.items?.map(formatItem).join(', ') || log.description}</p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-sm font-bold">{log.total_calories}</p>
        <p className="text-[10px] text-muted-foreground">ккал</p>
      </div>
      {onEdit && (
        <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0 rounded-full text-muted-foreground" onClick={() => onEdit(log)}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      )}
    </motion.div>
  );
}
