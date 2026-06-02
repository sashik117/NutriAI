import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  buildHistoryDate,
  buildHistoryDays,
  summarizeHistoryFood,
  summarizeHistoryWater,
} from '@/domain/history/historyModel';
import { generateDayNutritionSummary } from '@/services/progressInsightService';
import { foodLogRepository, userProfileRepository, waterLogRepository } from '@/services/repositories';

export function useHistoryPage({ isEnglish }) {
  const [selectedDay, setSelectedDay] = useState(0);
  const [aiSummary, setAiSummary] = useState('');
  const [loadingSummary, setLoadingSummary] = useState(false);
  const date = buildHistoryDate(selectedDay);

  const { data: profiles } = useQuery({
    queryKey: ['userProfile'],
    queryFn: () => userProfileRepository.list(),
    initialData: [],
  });

  const { data: foodLogs, isLoading } = useQuery({
    queryKey: ['foodLogs', date],
    queryFn: () => foodLogRepository.filter({ date }),
    initialData: [],
  });

  const { data: waterLogs } = useQuery({
    queryKey: ['waterLogs', date],
    queryFn: () => waterLogRepository.filter({ date }),
    initialData: [],
  });

  const profile = profiles[0];
  const totals = useMemo(() => summarizeHistoryFood(foodLogs), [foodLogs]);
  const totalWater = useMemo(() => summarizeHistoryWater(waterLogs), [waterLogs]);
  const days = useMemo(() => buildHistoryDays({ isEnglish }), [isEnglish]);

  const selectDay = (offset) => {
    setSelectedDay(offset);
    setAiSummary('');
  };

  const generateSummary = async () => {
    setLoadingSummary(true);
    try {
      setAiSummary(await generateDayNutritionSummary({ profile, totals, totalWater, foodLogs }));
    } finally {
      setLoadingSummary(false);
    }
  };

  return {
    selectedDay,
    selectDay,
    aiSummary,
    loadingSummary,
    date,
    foodLogs,
    isLoading,
    totals,
    totalWater,
    days,
    generateSummary,
  };
}
