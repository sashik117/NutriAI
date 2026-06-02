import { motion } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

function MacroInput({ label, value, colorClass, onChange }) {
  return (
    <label className={`block rounded-2xl border p-2 ${colorClass}`}>
      <span className="mb-1 block text-[10px] font-extrabold uppercase tracking-wide opacity-75">
        {label}
      </span>
      <Input
        type="number"
        inputMode="decimal"
        value={value ?? 0}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 rounded-xl border-white/60 bg-white/80 text-center text-base font-extrabold shadow-sm dark:bg-background/80"
      />
    </label>
  );
}

export default function FoodResultItemEditor({ item, index, onUpdate, onRemove }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-3 rounded-2xl border border-border/70 bg-card/90 p-3 shadow-sm"
    >
      <div className="flex gap-2">
        <Field label="Назва страви">
          <Input
            value={item.name || ''}
            onChange={(event) => onUpdate(index, 'name', event.target.value)}
            placeholder="Наприклад: Макарони Болоньєзе"
            className="h-10 rounded-xl text-sm font-semibold"
          />
        </Field>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="mt-5 h-10 w-10 shrink-0 rounded-xl text-muted-foreground hover:text-destructive"
          onClick={() => onRemove(index)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Field label="Порція">
          <Input
            type="number"
            inputMode="decimal"
            value={item.amount ?? item.weight_g ?? 0}
            onChange={(event) => onUpdate(index, 'amount', event.target.value)}
            placeholder="г/мл"
            className="h-10 rounded-xl text-sm font-bold"
          />
        </Field>
        <Field label="Одиниці">
          <select
            value={item.unit || 'g'}
            onChange={(event) => onUpdate(index, 'unit', event.target.value)}
            className="h-10 w-full rounded-xl border border-input bg-background px-2 text-sm font-bold"
          >
            <option value="g">г</option>
            <option value="ml">мл</option>
          </select>
        </Field>
      </div>

      <div className="rounded-2xl bg-muted/35 p-2">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-extrabold">Редагувати КБЖУ</p>
          <p className="text-[10px] text-muted-foreground">тапни на число</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <MacroInput
            label="Ккал"
            value={item.calories}
            colorClass="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/25 dark:text-emerald-300"
            onChange={(value) => onUpdate(index, 'calories', value)}
          />
          <MacroInput
            label="Білки"
            value={item.proteins}
            colorClass="border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950/25 dark:text-sky-300"
            onChange={(value) => onUpdate(index, 'proteins', value)}
          />
          <MacroInput
            label="Жири"
            value={item.fats}
            colorClass="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/25 dark:text-amber-300"
            onChange={(value) => onUpdate(index, 'fats', value)}
          />
          <MacroInput
            label="Вуглеводи"
            value={item.carbs}
            colorClass="border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/25 dark:text-rose-300"
            onChange={(value) => onUpdate(index, 'carbs', value)}
          />
        </div>
      </div>
    </motion.div>
  );
}
