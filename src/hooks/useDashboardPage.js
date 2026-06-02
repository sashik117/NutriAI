import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  buildCalendarStats,
  buildDashboardGoals,
  getFoodLogDates,
  summarizeFoodLogs,
  summarizeWaterLogs,
} from '@/domain/dashboard/dashboardModel';
import { foodLogRepository, userProfileRepository, waterLogRepository } from '@/services/repositories';

export function useDashboardPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activityCalories, setActivityCalories] = useState(0);
  const [editingLog, setEditingLog] = useState(null);
  const queryClient = useQueryClient();

  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const today = format(new Date(), 'yyyy-MM-dd');
  const isToday = dateStr === today;

  const { data: profiles } = useQuery({
    queryKey: ['userProfile'],
    queryFn: () => userProfileRepository.list(),
    initialData: [],
  });

  const { data: foodLogs } = useQuery({
    queryKey: ['foodLogs', dateStr],
    queryFn: () => foodLogRepository.filter({ date: dateStr }),
    initialData: [],
  });

  const { data: allFoodLogs } = useQuery({
    queryKey: ['allFoodLogsForDots'],
    queryFn: () => foodLogRepository.list('-date', 300),
    initialData: [],
  });

  const { data: waterLogs } = useQuery({
    queryKey: ['waterLogs', dateStr],
    queryFn: () => waterLogRepository.filter({ date: dateStr }),
    initialData: [],
  });

  const addWaterMutation = useMutation({
    mutationFn: (amount) => waterLogRepository.create({ amount_ml: amount, date: today }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['waterLogs', today] }),
  });

  const profile = profiles[0];
  const goals = buildDashboardGoals(profile, { activityCalories, isToday });
  const totals = summarizeFoodLogs(foodLogs);
  const totalWater = summarizeWaterLogs(waterLogs);
  const logDates = getFoodLogDates(allFoodLogs);
  const calendarStats = buildCalendarStats(allFoodLogs, goals);
  const refreshSelectedFoodLogs = () => queryClient.invalidateQueries({ queryKey: ['foodLogs', dateStr] });

  return {
    selectedDate,
    setSelectedDate,
    setActivityCalories,
    editingLog,
    setEditingLog,
    dateStr,
    isToday,
    profile,
    foodLogs,
    goals,
    totals,
    totalWater,
    logDates,
    calendarStats,
    addWaterMutation,
    refreshSelectedFoodLogs,
  };
}
