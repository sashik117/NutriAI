import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { analyzeFoodDescription } from '@/services/aiNutritionService';
import { buildFoodLogPayload, normalizeFoodItem, normalizeFoodResult } from '@/services/foodLogService';
import { foodLogRepository, userProfileRepository } from '@/services/repositories';

const getSuggestedMealType = () => {
  const hour = new Date().getHours();
  if (hour >= 7 && hour < 11) return 'breakfast';
  if (hour >= 13 && hour < 16) return 'lunch';
  if (hour >= 18 && hour < 22) return 'dinner';
  return 'snack';
};

export function useFoodLogPage({ mealOrder }) {
  const [mealType, setMealType] = useState(() => getSuggestedMealType());
  const [text, setText] = useState('');
  const [aiResult, setAiResult] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [aiTip, setAiTip] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [editingLog, setEditingLog] = useState(null);
  const [addingPreset, setAddingPreset] = useState(null);

  const today = format(new Date(), 'yyyy-MM-dd');
  const queryClient = useQueryClient();

  const { data: profiles } = useQuery({
    queryKey: ['userProfile'],
    queryFn: () => userProfileRepository.list(),
    initialData: [],
  });

  const { data: todayLogs } = useQuery({
    queryKey: ['foodLogs', today],
    queryFn: () => foodLogRepository.filter({ date: today }),
    initialData: [],
  });

  const profile = profiles[0];
  const goals = {
    calories: profile?.daily_calories || 2000,
    proteins: profile?.daily_proteins || 150,
    fats: profile?.daily_fats || 67,
    carbs: profile?.daily_carbs || 200,
  };
  const totals = todayLogs.reduce(
    (acc, log) => ({
      calories: acc.calories + (log.total_calories || 0),
      proteins: acc.proteins + (log.total_proteins || 0),
      fats: acc.fats + (log.total_fats || 0),
      carbs: acc.carbs + (log.total_carbs || 0),
    }),
    { calories: 0, proteins: 0, fats: 0, carbs: 0 }
  );
  const remainingCalories = Math.max(goals.calories - totals.calories, 0);

  const refreshFoodLogs = () => queryClient.invalidateQueries({ queryKey: ['foodLogs'] });

  const handleAiResult = (result) => {
    const normalized = normalizeFoodResult(result);
    setAiResult(normalized);
    setAiTip(normalized.ai_tip || '');
  };

  const handleBarcodeResult = (result) => {
    const item = normalizeFoodItem({
      name: `${result.brand ? `${result.brand} ` : ''}${result.name}`.trim(),
      unit: result.unit,
      amount: result.amount || result.weight_g || 100,
      weight_g: result.weight_g || 100,
      calories: result.calories,
      proteins: result.proteins,
      fats: result.fats,
      carbs: result.carbs,
    });
    handleAiResult({ description: item.name, items: [item], ai_tip: '' });
  };

  const analyzeFoodText = async (inputText = text) => {
    const value = inputText.trim();
    if (!value) return;

    setAnalyzing(true);
    setAiResult(null);
    setAiTip('');
    try {
      handleAiResult(await analyzeFoodDescription(value));
    } catch (error) {
      toast.error(error?.message || 'Не вдалося проаналізувати опис');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleVoiceTranscribed = (transcribedText) => {
    setText(transcribedText);
  };

  const createFoodLog = async (result) => {
    await foodLogRepository.create(buildFoodLogPayload({ result, mealType, date: today }));
    refreshFoodLogs();
  };

  const handleSearchAdd = async (item) => {
    setSaving(true);
    try {
      const normalized = normalizeFoodItem(item);
      await createFoodLog({
        description: normalized.name,
        items: [normalized],
        total_calories: normalized.calories,
        total_proteins: normalized.proteins,
        total_fats: normalized.fats,
        total_carbs: normalized.carbs,
      });
      toast.success(`${normalized.name} додано`);
      setShowSearch(false);
    } finally {
      setSaving(false);
    }
  };

  const saveLog = async (resultToSave = aiResult) => {
    if (!resultToSave) return;
    const normalized = normalizeFoodResult(resultToSave);
    setSaving(true);
    try {
      await createFoodLog(normalized);
      toast.success('Прийом їжі збережено');
      setText('');
      setAiResult(null);
      setAiTip('');
    } finally {
      setSaving(false);
    }
  };

  const handlePreset = async (preset) => {
    setAddingPreset(preset.name);
    try {
      const item = normalizeFoodItem({ ...preset, amount: preset.weight_g || 100, unit: 'g' });
      await createFoodLog({
        description: item.name,
        items: [item],
        total_calories: item.calories,
        total_proteins: item.proteins,
        total_fats: item.fats,
        total_carbs: item.carbs,
      });
      toast.success(`${item.name} додано`);
    } finally {
      setAddingPreset(null);
    }
  };

  const groupedLogs = mealOrder
    .map((meal) => ({ ...meal, logs: todayLogs.filter((log) => log.meal_type === meal.key) }))
    .filter((group) => group.logs.length > 0);
  const knownMealKeys = mealOrder.map((meal) => meal.key);
  const otherSnacks = todayLogs.filter((log) => !knownMealKeys.includes(log.meal_type));
  const hasLogs = groupedLogs.length > 0 || otherSnacks.length > 0;

  return {
    mealType,
    setMealType,
    text,
    setText,
    aiResult,
    setAiResult,
    analyzing,
    saving,
    aiTip,
    setAiTip,
    showSearch,
    setShowSearch,
    editingLog,
    setEditingLog,
    addingPreset,
    profile,
    remainingCalories,
    handleAiResult,
    handleBarcodeResult,
    analyzeFoodText,
    handleVoiceTranscribed,
    handleSearchAdd,
    saveLog,
    handlePreset,
    groupedLogs,
    otherSnacks,
    hasLogs,
    refreshFoodLogs,
  };
}
