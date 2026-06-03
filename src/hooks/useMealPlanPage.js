import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { generateWeeklyMealPlan, regenerateMealPlanDay } from '@/services/mealPlanService';
import { foodLogRepository, mealPlanRepository, userProfileRepository } from '@/services/repositories';
import {
  GENERATION_STEPS,
  GENERATION_STEPS_EN,
  PLAN_MODES,
  PLAN_STORAGE_KEY,
  getCachedModePlan,
  localPlanDate,
  normalizeDay,
  normalizePlan,
  setCachedModePlan,
} from '@/domain/meal-plan/mealPlanModel';

const MODE_LABELS_EN = {
  classic: 'Classic',
  light: 'Light',
  plant: 'Plant-based',
};

function readLocalPlan() {
  try {
    return JSON.parse(localStorage.getItem(PLAN_STORAGE_KEY) || 'null');
  } catch {
    return null;
  }
}

export function useMealPlanPage({ isEnglish, text }) {
  const [plan, setPlan] = useState(null);
  const [planId, setPlanId] = useState(null);
  const [planMode, setPlanMode] = useState('classic');
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [selectedMeals, setSelectedMeals] = useState([]);
  const [shoppingMeals, setShoppingMeals] = useState(null);
  const [openDescriptions, setOpenDescriptions] = useState({});
  const [generating, setGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);
  const [regeneratingDay, setRegeneratingDay] = useState(false);
  const [shoppingListToken, setShoppingListToken] = useState(0);
  const queryClient = useQueryClient();

  const { data: profiles } = useQuery({
    queryKey: ['userProfile'],
    queryFn: () => userProfileRepository.list(),
    initialData: [],
  });
  const { data: recentLogs } = useQuery({
    queryKey: ['allFoodLogsGamif'],
    queryFn: () => foodLogRepository.list('-date', 50),
    initialData: [],
  });
  const { data: savedPlans, isLoading: loadingSavedPlan } = useQuery({
    queryKey: ['mealPlans'],
    queryFn: () => mealPlanRepository.list('-updated_date', 1),
    initialData: [],
  });

  const profile = profiles[0];
  const selectedDay = plan?.days?.[selectedDayIndex];
  const activeMode = PLAN_MODES.find((mode) => mode.key === planMode) || PLAN_MODES[0];
  const generationStatus = (isEnglish ? GENERATION_STEPS_EN : GENERATION_STEPS)[generationStep % GENERATION_STEPS.length];
  const visibleModeLabel = (mode) => (isEnglish ? MODE_LABELS_EN[mode.key] : mode.label);
  const visibleDayName = (day, index) => (isEnglish ? `Day ${index + 1}` : day.day);

  const recentFoods = useMemo(
    () => [...new Set(recentLogs.slice(0, 20).flatMap((log) => log.items?.map((item) => item.name) || []))].slice(0, 10),
    [recentLogs]
  );
  const selectedMealsForDay = useMemo(() => {
    if (!selectedDay) return [];
    return selectedDay.meals.filter((meal) => selectedMeals.includes(meal.id));
  }, [selectedDay, selectedMeals]);
  const selectedMealsForPlan = useMemo(() => {
    if (!plan?.days?.length) return [];
    return plan.days.flatMap((day) => day.meals || []).filter((meal) => selectedMeals.includes(meal.id));
  }, [plan, selectedMeals]);
  const activeShoppingMeals = shoppingMeals || selectedMealsForPlan;

  useEffect(() => {
    if (!generating) return undefined;
    setGenerationStep(0);
    const timer = setInterval(() => {
      setGenerationStep((step) => step + 1);
    }, 1800);
    return () => clearInterval(timer);
  }, [generating]);

  useEffect(() => {
    if (plan || loadingSavedPlan) return;

    const savedPlan = savedPlans?.[0];
    if (savedPlan?.plan?.days?.length) {
      const normalized = normalizePlan(savedPlan.plan, savedPlan.plan.mode || 'classic');
      setPlan(normalized);
      setPlanId(savedPlan.id);
      setPlanMode(normalized.mode || 'classic');
      setSelectedMeals(normalized.selectedMeals || []);
      setSelectedDayIndex(Math.min(Math.max(Number(savedPlan.selected_day_index) || 0, 0), 6));
      return;
    }

    const localPlan = readLocalPlan();
    if (localPlan?.plan?.days?.length) {
      const normalized = normalizePlan(localPlan.plan, localPlan.plan.mode || 'classic');
      setPlan(normalized);
      setPlanMode(normalized.mode || 'classic');
      setSelectedMeals(normalized.selectedMeals || localPlan.selectedMeals || []);
      setSelectedDayIndex(Math.min(Math.max(Number(localPlan.selectedDayIndex) || 0, 0), 6));
    }
  }, [loadingSavedPlan, plan, savedPlans]);

  const persistPlan = async (nextPlan, nextSelectedDayIndex = selectedDayIndex, currentPlanId = planId, nextSelectedMeals = selectedMeals) => {
    const planToSave = { ...nextPlan, selectedMeals: nextSelectedMeals };
    localStorage.setItem(
      PLAN_STORAGE_KEY,
      JSON.stringify({ plan: planToSave, selectedDayIndex: nextSelectedDayIndex, selectedMeals: nextSelectedMeals, savedAt: new Date().toISOString() })
    );
    setCachedModePlan(planToSave.mode || planMode, planToSave, nextSelectedDayIndex, nextSelectedMeals, profile);

    try {
      const payload = { title: `План ${activeMode.label}`, plan: planToSave, selected_day_index: nextSelectedDayIndex };
      const saved = currentPlanId
        ? await mealPlanRepository.update(currentPlanId, payload)
        : await mealPlanRepository.create(payload);
      setPlanId(saved.id);
      queryClient.invalidateQueries({ queryKey: ['mealPlans'] });
      return saved;
    } catch (error) {
      toast.error(error.message || 'План збережено локально, але база даних не відповіла');
      return null;
    }
  };

  const selectDay = (index) => {
    setSelectedDayIndex(index);
    setShoppingMeals(null);
    if (plan) persistPlan(plan, index);
  };

  const toggleMeal = (meal) => {
    const nextSelectedMeals = selectedMeals.includes(meal.id) ? selectedMeals.filter((mealId) => mealId !== meal.id) : [...selectedMeals, meal.id];
    setSelectedMeals(nextSelectedMeals);
    setShoppingMeals(null);
    if (plan) persistPlan(plan, selectedDayIndex, planId, nextSelectedMeals);
  };

  const generatePlan = async (modeKey = planMode, forceRefresh = false) => {
    const mode = PLAN_MODES.find((item) => item.key === modeKey) || PLAN_MODES[0];
    const cached = getCachedModePlan(mode.key, profile);
    if (!forceRefresh && cached?.plan?.days?.length) {
      const normalized = normalizePlan(cached.plan, mode.key);
      setPlan(normalized);
      setPlanMode(mode.key);
      setSelectedMeals(normalized.selectedMeals || cached.selectedMeals || []);
      setShoppingMeals(null);
      setSelectedDayIndex(Math.min(Math.max(Number(cached.selectedDayIndex) || 0, 0), 6));
      toast.success(text(`${mode.label} план відкрито з кешу`, `${visibleModeLabel(mode)} plan opened from cache`));
      return;
    }

    setGenerating(true);
    setPlanMode(mode.key);
    setPlan(null);
    setSelectedMeals([]);
    setShoppingMeals(null);
    setSelectedDayIndex(0);

    try {
      const result = await generateWeeklyMealPlan({ mode, profile, recentFoods });
      const normalized = normalizePlan({ ...result, mode: mode.key, generatedAt: new Date().toISOString(), startDate: localPlanDate(), selectedMeals: [] }, mode.key);
      setPlan(normalized);
      const saved = await persistPlan(normalized, 0, planId, []);
      toast.success(saved ? text(`${mode.label} план готовий і збережений`, `${visibleModeLabel(mode)} plan is ready and saved`) : text(`${mode.label} план готовий`, `${visibleModeLabel(mode)} plan is ready`));
    } catch (error) {
      const fallback = normalizePlan({ mode: mode.key, selectedMeals: [] }, mode.key);
      setPlan(fallback);
      await persistPlan(fallback, 0, planId, []);
      toast.error(error.message || text('Не вдалося скласти план, показую базовий варіант', 'Could not generate the plan, showing a basic version'));
    } finally {
      setGenerating(false);
    }
  };

  const regenerateSelectedDay = async () => {
    if (!plan || !selectedDay) return;
    const mode = PLAN_MODES.find((item) => item.key === planMode) || PLAN_MODES[0];
    const usedMeals = plan.days.flatMap((day, index) => (index === selectedDayIndex ? [] : day.meals.map((meal) => meal.title)));

    setRegeneratingDay(true);
    try {
      const result = await regenerateMealPlanDay({ mode, profile, recentFoods, usedMeals, dayName: selectedDay.day });
      const nextDay = normalizeDay(result?.day ? result : { ...result, day: selectedDay.day }, selectedDayIndex, mode.key);
      const dayPrefix = `${selectedDayIndex}:${mode.key}:`;
      const nextSelectedMeals = selectedMeals.filter((mealId) => !mealId.startsWith(dayPrefix));
      const nextPlan = {
        ...plan,
        days: plan.days.map((day, index) => (index === selectedDayIndex ? nextDay : day)),
        selectedMeals: nextSelectedMeals,
        generatedAt: new Date().toISOString(),
        startDate: plan.startDate || localPlanDate(),
      };

      setPlan(nextPlan);
      setSelectedMeals(nextSelectedMeals);
      setShoppingMeals(null);
      await persistPlan(nextPlan, selectedDayIndex, planId, nextSelectedMeals);
      toast.success(text('Новий варіант дня готовий', 'New day option is ready'));
    } catch (error) {
      toast.error(error.message || text('Не вдалося оновити цей день', 'Could not refresh this day'));
    } finally {
      setRegeneratingDay(false);
    }
  };

  const makeShoppingList = (meals = selectedMealsForPlan) => {
    if (!meals.length) {
      toast.error(text('Спочатку вибери страви галочкою', 'Select meals with a checkmark first'));
      return;
    }
    setShoppingMeals(meals);
    setShoppingListToken(Date.now());
  };

  const focusMealProducts = (meal) => {
    if (!selectedMeals.includes(meal.id)) toggleMeal(meal);
    setShoppingMeals([meal]);
    setShoppingListToken(Date.now());
  };

  return {
    plan,
    planMode,
    selectedDayIndex,
    selectedMeals,
    openDescriptions,
    setOpenDescriptions,
    generating,
    generationStatus,
    regeneratingDay,
    shoppingListToken,
    profile,
    selectedDay,
    activeMode,
    selectedMealsForDay,
    selectedMealsForPlan,
    activeShoppingMeals,
    visibleModeLabel,
    visibleDayName,
    selectDay,
    toggleMeal,
    generatePlan,
    regenerateSelectedDay,
    makeShoppingList,
    focusMealProducts,
  };
}
