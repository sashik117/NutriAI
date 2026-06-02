import { AnimatePresence, motion } from 'framer-motion';
import { Check, Pencil, Plus, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useFoodResultEditor } from '@/hooks/useFoodResultEditor';
import FoodResultItemEditor from './FoodResultItemEditor';
import FoodResultTotals from './FoodResultTotals';

export default function FoodResultCard({ result, onSave, onCancel, saving }) {
  const { items, totals, updateItem, addItem, removeItem, saveEdited } = useFoodResultEditor({
    result,
    onSave,
  });

  if (!result) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="space-y-3"
    >
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
                <FoodResultItemEditor
                  key={`${item.name || 'new'}-${index}`}
                  item={item}
                  index={index}
                  onUpdate={updateItem}
                  onRemove={removeItem}
                />
              ))}
            </AnimatePresence>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-11 w-full rounded-2xl border-dashed text-sm font-bold"
              onClick={addItem}
            >
              <Plus className="mr-1 h-4 w-4" />
              Додати позицію
            </Button>
          </div>

          <FoodResultTotals totals={totals} />
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button onClick={onCancel} variant="outline" className="h-11 flex-1 rounded-2xl" disabled={saving}>
          <X className="mr-1 h-4 w-4" /> Скасувати
        </Button>
        <Button
          onClick={saveEdited}
          className="h-11 flex-1 rounded-2xl shadow-md shadow-primary/20"
          disabled={saving || items.length === 0}
        >
          <Check className="mr-1 h-4 w-4" /> Зберегти
        </Button>
      </div>
    </motion.div>
  );
}
