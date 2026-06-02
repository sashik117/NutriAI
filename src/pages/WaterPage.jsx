import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Check, Droplets, Minus, Pencil, Plus, Trash2, X } from 'lucide-react';
import WaterReminder from '../components/water/WaterReminder';
import { useWaterTrackerPage } from '@/hooks/useWaterTrackerPage';
import { useLanguage } from '@/lib/LanguageContext';

export default function WaterPage() {
  const { text } = useLanguage();
  const {
    customAmount,
    setCustomAmount,
    editingId,
    setEditingId,
    editingAmount,
    setEditingAmount,
    waterLogs,
    goal,
    totalWater,
    progress,
    addWaterMutation,
    deleteWaterMutation,
    mood,
    startEditing,
    saveEditing,
  } = useWaterTrackerPage({ text });

  const quickAmounts = [150, 250, 330, 500];

  return (
    <div className="space-y-6 pt-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-extrabold">{text('Трекер води 💧', 'Water tracker 💧')}</h1>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center rounded-3xl border border-border bg-card p-8"
      >
        <div className="relative mb-4 h-40 w-40 overflow-hidden rounded-full bg-muted">
          <motion.div
            className="absolute bottom-0 left-0 right-0 bg-chart-5/25"
            animate={{ height: `${progress * 100}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.span className="text-6xl" animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 3, repeat: Infinity }}>
              {mood.emoji}
            </motion.span>
          </div>
        </div>

        <p className={`text-sm font-semibold ${mood.color}`}>{mood.text}</p>
        <div className="mt-4 text-center">
          <span className="text-4xl font-extrabold">{totalWater}</span>
          <span className="text-lg font-medium text-muted-foreground"> / {goal} {text('мл', 'ml')}</span>
        </div>
      </motion.div>

      <div className="space-y-3">
        <p className="text-sm font-semibold text-muted-foreground">{text('Додати воду', 'Add water')}</p>
        <div className="grid grid-cols-4 gap-2">
          {quickAmounts.map((amount) => (
            <Button
              key={amount}
              variant="outline"
              className="flex h-14 flex-col gap-0.5 rounded-xl"
              onClick={() => addWaterMutation.mutate(amount)}
              disabled={addWaterMutation.isPending}
            >
              <Droplets className="h-4 w-4 text-chart-5" />
              <span className="text-xs font-bold">{amount} {text('мл', 'ml')}</span>
            </Button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="mb-3 text-xs font-semibold text-muted-foreground">{text("Свій об'єм", 'Custom amount')}</p>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" className="rounded-full" onClick={() => setCustomAmount(Math.max(50, customAmount - 50))}>
            <Minus className="h-4 w-4" />
          </Button>
          <div className="flex-1 text-center">
            <span className="text-2xl font-extrabold">{customAmount}</span>
            <span className="text-sm text-muted-foreground"> {text('мл', 'ml')}</span>
          </div>
          <Button variant="outline" size="icon" className="rounded-full" onClick={() => setCustomAmount(customAmount + 50)}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <Button className="mt-3 w-full rounded-xl" onClick={() => addWaterMutation.mutate(customAmount)} disabled={addWaterMutation.isPending}>
          <Plus className="mr-1 h-4 w-4" /> {text('Додати', 'Add')} {customAmount} {text('мл', 'ml')}
        </Button>
      </div>

      <WaterReminder currentMl={totalWater} goalMl={goal} />

      {waterLogs.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-semibold text-muted-foreground">{text('Сьогодні', 'Today')}</p>
          <div className="space-y-1.5">
            {waterLogs.map((log, index) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center justify-between rounded-lg border border-border bg-card p-2.5 text-sm"
              >
                {editingId === log.id ? (
                  <>
                    <div className="flex flex-1 items-center gap-2">
                      <Droplets className="h-3.5 w-3.5 text-chart-5" />
                      <input
                        type="number"
                        min="1"
                        value={editingAmount}
                        onChange={(event) => setEditingAmount(event.target.value)}
                        className="h-8 w-24 rounded-lg border border-input bg-background px-2 text-sm font-medium"
                      />
                      <span className="text-xs text-muted-foreground">{text('мл', 'ml')}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={saveEditing} className="rounded-lg p-1.5 text-green-600 hover:bg-muted">
                        <span className="sr-only">{text('Зберегти запис води', 'Save water entry')}</span>
                        <Check className="h-4 w-4" />
                      </button>
                      <button onClick={() => setEditingId(null)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted">
                        <span className="sr-only">{text('Скасувати редагування води', 'Cancel water edit')}</span>
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <Droplets className="h-3.5 w-3.5 text-chart-5" />
                      <span className="font-medium">{log.amount_ml} {text('мл', 'ml')}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="mr-1 text-xs text-muted-foreground">{format(new Date(log.created_date), 'HH:mm')}</span>
                      <button onClick={() => startEditing(log)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted">
                        <span className="sr-only">{text('Редагувати запис води', 'Edit water entry')}</span>
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => deleteWaterMutation.mutate(log.id)} className="rounded-lg p-1.5 text-red-500 hover:bg-muted">
                        <span className="sr-only">{text('Видалити запис води', 'Delete water entry')}</span>
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
