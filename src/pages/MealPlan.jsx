import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowRight, CalendarDays, Check, Loader2, Plus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import ShoppingList from '../components/meal-plan/ShoppingList';
import MealPlanSkeleton from '../components/meal-plan/MealPlanSkeleton';
import { useLanguage } from '@/lib/LanguageContext';
import { generateWeeklyMealPlan, regenerateMealPlanDay } from '@/services/mealPlanService';
import { userProfileRepository, foodLogRepository, mealPlanRepository } from '@/services/repositories';

import {
  PLAN_STORAGE_KEY,
  GENERATION_STEPS,
  GENERATION_STEPS_EN,
  PLAN_MODES,
  MEAL_SLOTS,
  MEAL_SLOT_LABELS_EN,
  displayMealTitle,
  displayIngredientName,
  displayUnit,
  normalizeDay,
  normalizePlan,
  getCachedModePlan,
  setCachedModePlan,
} from '@/domain/meal-plan/mealPlanModel';

export default function MealPlan() {
  const { isEnglish, text } = useLanguage();
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
  const visibleModeLabel = (mode) => (isEnglish ? { classic: 'Classic', light: 'Light', plant: 'Plant-based' }[mode.key] : mode.label);
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

    try {
      const localPlan = JSON.parse(localStorage.getItem(PLAN_STORAGE_KEY) || 'null');
      if (localPlan?.plan?.days?.length) {
        const normalized = normalizePlan(localPlan.plan, localPlan.plan.mode || 'classic');
        setPlan(normalized);
        setPlanMode(normalized.mode || 'classic');
        setSelectedMeals(normalized.selectedMeals || localPlan.selectedMeals || []);
        setSelectedDayIndex(Math.min(Math.max(Number(localPlan.selectedDayIndex) || 0, 0), 6));
      }
    } catch {
      // Database is primary, localStorage is fallback.
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
      toast.error(error.message || 'План збережено локально, але БД не відповіла');
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

      const normalized = normalizePlan({ ...result, mode: mode.key, generatedAt: new Date().toISOString(), selectedMeals: [] }, mode.key);
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

  return (
    <div className="space-y-5 pb-8 pt-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-extrabold">{text('План харчування', 'Meal plan')}</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">{text('Gemini генерує раціон під вибраний режим', 'Gemini builds meals for the selected style')}</p>
      </motion.div>

      <div className="grid grid-cols-3 gap-2">
        {PLAN_MODES.map((mode) => (
          <button
            key={mode.key}
            type="button"
            className={`rounded-2xl border px-2 py-3 text-sm font-bold transition ${
              planMode === mode.key ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card'
            }`}
            onClick={() => generatePlan(mode.key)}
            disabled={generating}
          >
            {visibleModeLabel(mode)}
          </button>
        ))}
      </div>

      {generating ? (
        <MealPlanSkeleton status={generationStatus} />
      ) : !plan ? (
        <div className="space-y-4">
          {profile && (
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-xs font-bold text-muted-foreground">{text('Ваші цілі на день', 'Your daily goals')}</p>
              <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                <p>{profile.goal === 'lose' ? text('Схуднення', 'Weight loss') : profile.goal === 'gain' ? text('Набір маси', 'Muscle gain') : text('Підтримка', 'Maintenance')}</p>
                <p>{profile.daily_calories || 2000} {text('ккал', 'kcal')}</p>
                <p>{text('Б', 'P')}: {profile.daily_proteins || 150} {text('г', 'g')}</p>
                <p>{text('Ж', 'F')}: {profile.daily_fats || 67} {text('г', 'g')}</p>
                <p>{text('В', 'C')}: {profile.daily_carbs || 200} {text('г', 'g')}</p>
              </div>
            </div>
          )}

          <Button className="h-12 w-full rounded-xl text-base" onClick={() => generatePlan(planMode)} disabled={generating}>
            {generating ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Sparkles className="mr-2 h-5 w-5" />}
            {generating ? text('Складаю план...', 'Building plan...') : text('Згенерувати план', 'Generate plan')}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <Button variant="outline" size="sm" className="w-full rounded-xl" onClick={() => generatePlan(planMode, true)} disabled={generating}>
            {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            {text('Оновити план', 'Refresh plan')} {visibleModeLabel(activeMode)}
          </Button>

          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {plan.days.map((day, index) => (
              <button
                key={day.day}
                type="button"
                onClick={() => selectDay(index)}
                className={`min-w-[112px] rounded-2xl border p-3 text-left transition ${
                  selectedDayIndex === index ? 'border-primary bg-primary/10 shadow-sm' : 'border-border bg-card'
                }`}
              >
                <p className="text-[11px] font-bold text-muted-foreground">{index + 1}</p>
                <p className="truncate text-sm font-extrabold">{visibleDayName(day, index)}</p>
                <p className="mt-1 text-xs text-muted-foreground">{day.total_calories} {text('ккал', 'kcal')}</p>
              </button>
            ))}
          </div>

          {selectedDay && (
            <>
              <div className="rounded-3xl border border-border bg-card p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="flex items-center gap-2 text-sm font-extrabold">
                      <CalendarDays className="h-4 w-4 text-primary" />
                      {visibleDayName(selectedDay, selectedDayIndex)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {selectedDay.total_calories} {text('ккал', 'kcal')} · {text('Б', 'P')} {selectedDay.total_proteins} {text('г', 'g')} · {text('Ж', 'F')} {selectedDay.total_fats} {text('г', 'g')} · {text('В', 'C')}{' '}
                      {selectedDay.total_carbs} {text('г', 'g')}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <span className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">{selectedMealsForDay.length} {text('вибрано', 'selected')}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 rounded-full px-3 text-xs"
                      onClick={regenerateSelectedDay}
                      disabled={regeneratingDay}
                    >
                      {regeneratingDay ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-1 h-3.5 w-3.5" />}
                      {text('Інший день', 'Another day')}
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  {selectedDay.meals.map((meal) => {
                    const slot = MEAL_SLOTS.find((item) => item.key === meal.slot) || MEAL_SLOTS[1];
                    const selected = selectedMeals.includes(meal.id);
                    const descriptionOpen = Boolean(openDescriptions[meal.id]);
                    const slotLabel = isEnglish ? MEAL_SLOT_LABELS_EN[slot.key] : slot.label;

                    return (
                      <div key={meal.id} className={`rounded-2xl p-3 transition ${selected ? 'bg-primary/10 ring-1 ring-primary/30' : 'bg-muted/35'}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-extrabold uppercase tracking-wide text-muted-foreground">{slotLabel}</p>
                            <button
                              type="button"
                              className="mt-1 text-left text-sm font-bold"
                              onClick={() => setOpenDescriptions((current) => ({ ...current, [meal.id]: !current[meal.id] }))}
                            >
                              {displayMealTitle(meal.title, isEnglish)}
                            </button>
                            {descriptionOpen && (
                              <div className="mt-2 rounded-xl bg-background p-3 text-xs leading-relaxed text-muted-foreground">
                                <p>{isEnglish ? 'Balanced meal matched to your current goals.' : meal.description}</p>
                                <p className="mt-2 font-semibold text-foreground">{text('Склад', 'Ingredients')}</p>
                                <p>{meal.ingredients.map((item) => [displayIngredientName(item.name, isEnglish), item.amount, displayUnit(item.unit, isEnglish)].filter(Boolean).join(' ')).join(', ')}</p>
                              </div>
                            )}
                            <div className="mt-2 flex flex-wrap gap-2 text-xs">
                              <span className="rounded-full bg-primary/10 px-2 py-1 font-bold text-primary">{meal.calories} {text('ккал', 'kcal')}</span>
                              <span className="rounded-full bg-sky-100 px-2 py-1 text-sky-700">{text('Б', 'P')}: {meal.proteins} {text('г', 'g')}</span>
                              <span className="rounded-full bg-amber-100 px-2 py-1 text-amber-700">{text('Ж', 'F')}: {meal.fats} {text('г', 'g')}</span>
                              <span className="rounded-full bg-rose-100 px-2 py-1 text-rose-700">{text('В', 'C')}: {meal.carbs} {text('г', 'g')}</span>
                              <span className="rounded-full bg-background px-2 py-1 text-muted-foreground">{meal.grams} {text('г', 'g')}</span>
                            </div>
                          </div>
                          <div className="flex shrink-0 flex-col gap-2">
                            <Button
                              size="icon"
                              variant={selected ? 'default' : 'outline'}
                              className="h-9 w-9 rounded-full"
                              onClick={() => toggleMeal(meal)}
                              title={selected ? text('Вибрано', 'Selected') : text('Вибрати страву', 'Select meal')}
                            >
                              {selected ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                            </Button>
                            {selected && (
                              <Button
                                size="icon"
                                variant="outline"
                                className="h-9 w-9 rounded-full"
                                onClick={() => focusMealProducts(meal)}
                                title={text('Продукти для цієї страви', 'Products for this meal')}
                              >
                                <ArrowRight className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <ShoppingList
                day={selectedDay}
                dayIndex={selectedDayIndex}
                meals={selectedMealsForPlan}
                activeMeals={activeShoppingMeals}
                autoGenerateToken={shoppingListToken}
                onGenerateRequest={() => makeShoppingList(selectedMealsForPlan)}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}
