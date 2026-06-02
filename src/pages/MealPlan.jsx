import { motion } from 'framer-motion';
import { ArrowRight, CalendarDays, Check, Loader2, Plus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ShoppingList from '../components/meal-plan/ShoppingList';
import MealPlanSkeleton from '../components/meal-plan/MealPlanSkeleton';
import { useMealPlanPage } from '@/hooks/useMealPlanPage';
import { useLanguage } from '@/lib/LanguageContext';

import {
  PLAN_MODES,
  MEAL_SLOTS,
  MEAL_SLOT_LABELS_EN,
  displayMealTitle,
  displayIngredientName,
  displayUnit,
} from '@/domain/meal-plan/mealPlanModel';

export default function MealPlan() {
  const { isEnglish, text } = useLanguage();
  const {
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
  } = useMealPlanPage({ isEnglish, text });

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
                              aria-label={`${selected ? text('Обрано', 'Selected') : text('Вибрати страву', 'Select meal')} ${displayMealTitle(meal.title, isEnglish)}`}
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
                                aria-label={`${text('Продукти для страви', 'Products for meal')} ${displayMealTitle(meal.title, isEnglish)}`}
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
