import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { findTodayWeightLog, buildWeightChartData, getWeightStats } from '@/domain/progress/weightProgressModel';
import { generateWeightForecast } from '@/services/progressInsightService';
import { userProfileRepository, weightLogRepository } from '@/services/repositories';

export function useWeightTrackerPage() {
  const [newWeight, setNewWeight] = useState('');
  const [forecast, setForecast] = useState('');
  const [loadingForecast, setLoadingForecast] = useState(false);
  const queryClient = useQueryClient();
  const today = format(new Date(), 'yyyy-MM-dd');

  const { data: weightLogs } = useQuery({
    queryKey: ['weightLogs'],
    queryFn: () => weightLogRepository.list('-date', 60),
    initialData: [],
  });

  const { data: profiles } = useQuery({
    queryKey: ['userProfile'],
    queryFn: () => userProfileRepository.list(),
    initialData: [],
  });

  const profile = profiles[0];
  const todayLog = findTodayWeightLog(weightLogs, today);
  const chartData = buildWeightChartData(weightLogs);
  const stats = getWeightStats(weightLogs, profile);

  const addMutation = useMutation({
    mutationFn: (weight) => weightLogRepository.create({ weight, date: today }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weightLogs'] });
      toast.success('Вага збережена! ✅');
      setNewWeight('');
    },
    onError: (error) => toast.error(error.message || 'Не вдалося зберегти вагу'),
  });

  const generateForecast = async () => {
    setLoadingForecast(true);
    try {
      setForecast(await generateWeightForecast({ chartData, latestWeight: stats.latestWeight, profile }));
    } finally {
      setLoadingForecast(false);
    }
  };

  return {
    newWeight,
    setNewWeight,
    forecast,
    setForecast,
    loadingForecast,
    weightLogs,
    profile,
    todayLog,
    chartData,
    stats,
    addMutation,
    generateForecast,
  };
}
