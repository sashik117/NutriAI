import { CalendarDays, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import MealPlanMealCard from './MealPlanMealCard';

export default function MealPlanDayCard({
  focusMealProducts,
  isEnglish,
  openDescriptions,
  regeneratingDay,
  regenerateSelectedDay,
  selectedDay,
  selectedDayIndex,
  selectedMeals,
  selectedMealsForDay,
  setOpenDescriptions,
  text,
  toggleMeal,
  visibleDayName,
}) {
  return (
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
          <Button size="sm" variant="outline" className="h-8 rounded-full px-3 text-xs" onClick={regenerateSelectedDay} disabled={regeneratingDay}>
            {regeneratingDay ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-1 h-3.5 w-3.5" />}
            {text('Інший день', 'Another day')}
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {selectedDay.meals.map((meal) => (
          <MealPlanMealCard
            key={meal.id}
            focusMealProducts={focusMealProducts}
            isEnglish={isEnglish}
            meal={meal}
            openDescriptions={openDescriptions}
            selectedMeals={selectedMeals}
            setOpenDescriptions={setOpenDescriptions}
            text={text}
            toggleMeal={toggleMeal}
          />
        ))}
      </div>
    </div>
  );
}
