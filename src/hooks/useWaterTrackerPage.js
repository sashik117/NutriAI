import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { userProfileRepository, waterLogRepository } from '@/services/repositories';

export function useWaterTrackerPage({ text }) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const queryClient = useQueryClient();
  const [customAmount, setCustomAmount] = useState(250);
  const [editingId, setEditingId] = useState(null);
  const [editingAmount, setEditingAmount] = useState('');

  const { data: profiles } = useQuery({
    queryKey: ['userProfile'],
    queryFn: () => userProfileRepository.list(),
    initialData: [],
  });

  const { data: waterLogs } = useQuery({
    queryKey: ['waterLogs', today],
    queryFn: () => waterLogRepository.filter({ date: today }),
    initialData: [],
  });

  const goal = profiles[0]?.daily_water_ml || 2000;
  const totalWater = waterLogs.reduce((acc, log) => acc + (log.amount_ml || 0), 0);
  const progress = Math.min(totalWater / goal, 1);

  const addWaterMutation = useMutation({
    mutationFn: (amount) => waterLogRepository.create({ amount_ml: amount, date: today }),
    onSuccess: (_, amount) => {
      queryClient.invalidateQueries({ queryKey: ['waterLogs', today] });
      toast.success(text(`+${amount} мл додано`, `+${amount} ml added`));
    },
    onError: (error) => toast.error(error.message || text('Не вдалося додати воду', 'Could not add water')),
  });

  const updateWaterMutation = useMutation({
    mutationFn: ({ id, amount }) => waterLogRepository.update(id, { amount_ml: amount }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waterLogs', today] });
      toast.success(text('Запис води оновлено', 'Water entry updated'));
      setEditingId(null);
      setEditingAmount('');
    },
    onError: (error) => toast.error(error.message || text('Не вдалося оновити воду', 'Could not update water')),
  });

  const deleteWaterMutation = useMutation({
    mutationFn: (id) => waterLogRepository.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waterLogs', today] });
      toast.success(text('Запис води видалено', 'Water entry deleted'));
    },
    onError: (error) => toast.error(error.message || text('Не вдалося видалити воду', 'Could not delete water')),
  });

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

  return {
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
  };
}
