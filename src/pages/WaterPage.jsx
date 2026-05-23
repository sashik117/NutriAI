import { useState } from 'react';
import { nutriApi } from '@/api/nutriApi';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Check, Droplets, Minus, Pencil, Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import WaterReminder from '../components/water/WaterReminder';
import { useLanguage } from '@/lib/LanguageContext';

export default function WaterPage() {
  const { text } = useLanguage();
  const today = format(new Date(), 'yyyy-MM-dd');
  const queryClient = useQueryClient();
  const [customAmount, setCustomAmount] = useState(250);
  const [editingId, setEditingId] = useState(null);
  const [editingAmount, setEditingAmount] = useState('');

  const { data: profiles } = useQuery({
    queryKey: ['userProfile'],
    queryFn: () => nutriApi.entities.UserProfile.list(),
    initialData: [],
  });

  const { data: waterLogs } = useQuery({
    queryKey: ['waterLogs', today],
    queryFn: () => nutriApi.entities.WaterLog.filter({ date: today }),
    initialData: [],
  });

  const goal = profiles[0]?.daily_water_ml || 2000;
  const totalWater = waterLogs.reduce((acc, log) => acc + (log.amount_ml || 0), 0);
  const progress = Math.min(totalWater / goal, 1);

  const addWaterMutation = useMutation({
    mutationFn: (amount) => nutriApi.entities.WaterLog.create({ amount_ml: amount, date: today }),
    onSuccess: (_, amount) => {
      queryClient.invalidateQueries({ queryKey: ['waterLogs', today] });
      toast.success(text(`+${amount} мл додано`, `+${amount} ml added`));
    },
    onError: (error) => toast.error(error.message || text('Не вдалося додати воду', 'Could not add water')),
  });

  const updateWaterMutation = useMutation({
    mutationFn: ({ id, amount }) => nutriApi.entities.WaterLog.update(id, { amount_ml: amount }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waterLogs', today] });
      toast.success(text('Запис води оновлено', 'Water entry updated'));
      setEditingId(null);
      setEditingAmount('');
    },
    onError: (error) => toast.error(error.message || text('Не вдалося оновити воду', 'Could not update water')),
  });

  const deleteWaterMutation = useMutation({
    mutationFn: (id) => nutriApi.entities.WaterLog.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waterLogs', today] });
      toast.success(text('Запис води видалено', 'Water entry deleted'));
    },
    onError: (error) => toast.error(error.message || text('Не вдалося видалити воду', 'Could not delete water')),
  });

  const quickAmounts = [150, 250, 330, 500];

  const mood =
    progress >= 1
      ? { emoji: '🌺', text: text('Чудово! План по воді виконано.', 'Great! Water goal is complete.'), color: 'text-green-500' }
      : progress >= 0.75
        ? { emoji: '🌸', text: text('Майже! Ще трішки.', 'Almost there! A little more.'), color: 'text-primary' }
        : progress >= 0.5
          ? { emoji: '🌿', text: text('Половина пройдена, так тримати.', 'Halfway done, keep going.'), color: 'text-chart-5' }
          : progress >= 0.25
            ? { emoji: '🌱', text: text('Добрий початок, продовжуй.', 'Good start, keep going.'), color: 'text-secondary-foreground' }
            : { emoji: '🥀', text: text('Рослинка просить води.', 'The plant needs water.'), color: 'text-muted-foreground' };

  const startEditing = (log) => {
    setEditingId(log.id);
    setEditingAmount(String(log.amount_ml || ''));
  };

  const saveEditing = () => {
    const amount = Number(editingAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error(text('Вкажіть коректну кількість мл', 'Enter a valid amount in ml'));
      return;
    }
    updateWaterMutation.mutate({ id: editingId, amount });
  };

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
                        <Check className="h-4 w-4" />
                      </button>
                      <button onClick={() => setEditingId(null)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted">
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
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => deleteWaterMutation.mutate(log.id)} className="rounded-lg p-1.5 text-red-500 hover:bg-muted">
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
