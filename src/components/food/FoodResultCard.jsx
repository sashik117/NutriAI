import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Check, Pencil, Plus, Sparkles, Trash2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const emptyItem = { name: '', unit: 'g', amount: 100, weight_g: 100, calories: 0, proteins: 0, fats: 0, carbs: 0 };

const normalizeItem = (item) => {
  const unit = item?.unit === 'ml' ? 'ml' : 'g';
  const amount = Math.max(Number(item?.amount ?? item?.weight_g ?? item?.volume_ml ?? 100) || 100, 1);
  return {
    ...item,
    name: String(item?.name || item?.title || item?.dish_name || item?.description || '').replace(/\*/g, '').trim(),
    unit,
    amount,
    weight_g: Math.max(Number(item?.weight_g ?? (unit === 'g' ? amount : item?.grams)) || amount, 1),
    calories: Number(item?.calories) || 0,
    proteins: Number(item?.proteins) || 0,
    fats: Number(item?.fats) || 0,
    carbs: Number(item?.carbs) || 0,
  };
};

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function MacroInput({ label, value, colorClass, onChange }) {
  return (
    <label className={`block rounded-2xl border p-2 ${colorClass}`}>
      <span className="mb-1 block text-[10px] font-extrabold uppercase tracking-wide opacity-75">{label}</span>
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

export default function FoodResultCard({ result, onSave, onCancel, saving }) {
  const [items, setItems] = useState((result?.items || []).map(normalizeItem));

  useEffect(() => {
    setItems((result?.items || []).map(normalizeItem));
  }, [result]);

  const totals = useMemo(() => items.reduce((acc, item) => ({
    total_calories: acc.total_calories + (Number(item.calories) || 0),
    total_proteins: acc.total_proteins + (Number(item.proteins) || 0),
    total_fats: acc.total_fats + (Number(item.fats) || 0),
    total_carbs: acc.total_carbs + (Number(item.carbs) || 0),
  }), { total_calories: 0, total_proteins: 0, total_fats: 0, total_carbs: 0 }), [items]);

  if (!result) return null;

  const updateItem = (index, key, value) => {
    setItems((current) => current.map((item, itemIndex) => {
      if (itemIndex !== index) return item;
      const nextValue = key === 'name' || key === 'unit' ? value : Number(value);
      const next = { ...item, [key]: nextValue };
      if (key === 'amount' && next.unit === 'g') next.weight_g = Number(value);
      if (key === 'unit' && value === 'g') next.weight_g = Number(next.amount || next.weight_g || 100);
      return next;
    }));
  };

  const saveEdited = () => {
    const normalizedItems = items.map(normalizeItem).filter((item) => item.name);
    onSave({
      ...result,
      ...totals,
      total_calories: Math.round(totals.total_calories),
      total_proteins: Math.round(totals.total_proteins),
      total_fats: Math.round(totals.total_fats),
      total_carbs: Math.round(totals.total_carbs),
      items: normalizedItems,
    });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="space-y-3">
      <Card className="overflow-hidden rounded-3xl border-primary/20 bg-gradient-to-br from-primary/10 via-card to-emerald-50/60 shadow-lg shadow-primary/10 dark:to-emerald-950/20">
        <CardContent className="p-4">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="inline-flex items-center gap-1 rounded-full bg-white/70 px-2 py-1 text-[10px] font-bold text-primary shadow-sm dark:bg-background/70">
                <Sparkles className="h-3 w-3" />
                AI Vision
              </p>
              <h3 className="mt-2 text-base font-extrabold">Ось що ШІ розпізнав</h3>
            </div>
            <p className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-[10px] font-medium text-primary">
              <Pencil className="h-3 w-3" />
              Редагується
            </p>
          </div>

          <div className="mb-4 space-y-3">
            <AnimatePresence initial={false}>
              {items.map((item, index) => (
                <motion.div
                  key={`${item.name || 'new'}-${index}`}
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
                        onChange={(event) => updateItem(index, 'name', event.target.value)}
                        placeholder="Наприклад: Макарони Болоньєзе"
                        className="h-10 rounded-xl text-sm font-semibold"
                      />
                    </Field>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="mt-5 h-10 w-10 shrink-0 rounded-xl text-muted-foreground hover:text-destructive"
                      onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Порція">
                      <Input type="number" inputMode="decimal" value={item.amount ?? item.weight_g ?? 0} onChange={(event) => updateItem(index, 'amount', event.target.value)} placeholder="г/мл" className="h-10 rounded-xl text-sm font-bold" />
                    </Field>
                    <Field label="Одиниці">
                      <select value={item.unit || 'g'} onChange={(event) => updateItem(index, 'unit', event.target.value)} className="h-10 w-full rounded-xl border border-input bg-background px-2 text-sm font-bold">
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
                      <MacroInput label="Ккал" value={item.calories} colorClass="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/25 dark:text-emerald-300" onChange={(value) => updateItem(index, 'calories', value)} />
                      <MacroInput label="Білки" value={item.proteins} colorClass="border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950/25 dark:text-sky-300" onChange={(value) => updateItem(index, 'proteins', value)} />
                      <MacroInput label="Жири" value={item.fats} colorClass="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/25 dark:text-amber-300" onChange={(value) => updateItem(index, 'fats', value)} />
                      <MacroInput label="Вуглеводи" value={item.carbs} colorClass="border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/25 dark:text-rose-300" onChange={(value) => updateItem(index, 'carbs', value)} />
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            <Button type="button" variant="outline" size="sm" className="h-11 w-full rounded-2xl border-dashed text-sm font-bold" onClick={() => setItems((current) => [...current, emptyItem])}>
              <Plus className="mr-1 h-4 w-4" />
              Додати позицію
            </Button>
          </div>

          <div className="grid grid-cols-4 gap-2 rounded-2xl bg-background/80 p-3 text-center shadow-inner">
            <div><p className="text-lg font-extrabold text-primary">{Math.round(totals.total_calories)}</p><p className="text-[10px] font-medium text-muted-foreground">ккал</p></div>
            <div><p className="text-sm font-bold">{Math.round(totals.total_proteins)} г</p><p className="text-[10px] text-muted-foreground">білки</p></div>
            <div><p className="text-sm font-bold">{Math.round(totals.total_fats)} г</p><p className="text-[10px] text-muted-foreground">жири</p></div>
            <div><p className="text-sm font-bold">{Math.round(totals.total_carbs)} г</p><p className="text-[10px] text-muted-foreground">вугл.</p></div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button onClick={onCancel} variant="outline" className="h-11 flex-1 rounded-2xl" disabled={saving}>
          <X className="mr-1 h-4 w-4" /> Скасувати
        </Button>
        <Button onClick={saveEdited} className="h-11 flex-1 rounded-2xl shadow-md shadow-primary/20" disabled={saving || items.length === 0}>
          <Check className="mr-1 h-4 w-4" /> Зберегти
        </Button>
      </div>
    </motion.div>
  );
}
