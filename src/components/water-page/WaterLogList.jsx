import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { Check, Droplets, Pencil, Trash2, X } from 'lucide-react';

export default function WaterLogList({
  editingId,
  setEditingId,
  editingAmount,
  setEditingAmount,
  waterLogs,
  deleteWaterMutation,
  startEditing,
  saveEditing,
  text,
}) {
  if (!waterLogs.length) return null;

  return (
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
  );
}
