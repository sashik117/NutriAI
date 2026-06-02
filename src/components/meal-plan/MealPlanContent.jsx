import { Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ShoppingList from './ShoppingList';
import MealPlanDayCard from './MealPlanDayCard';
import MealPlanDayTabs from './MealPlanDayTabs';

export default function MealPlanContent({
  activeMode,
  activeShoppingMeals,
  focusMealProducts,
  generatePlan,
  generating,
  isEnglish,
  makeShoppingList,
  openDescriptions,
  plan,
  planMode,
  regeneratingDay,
  regenerateSelectedDay,
  selectDay,
  selectedDay,
  selectedDayIndex,
  selectedMeals,
  selectedMealsForDay,
  selectedMealsForPlan,
  setOpenDescriptions,
  shoppingListToken,
  text,
  toggleMeal,
  visibleDayName,
  visibleModeLabel,
}) {
  return (
    <div className="space-y-4">
      <Button variant="outline" size="sm" className="w-full rounded-xl" onClick={() => generatePlan(planMode, true)} disabled={generating}>
        {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
        {text('Оновити план', 'Refresh plan')} {visibleModeLabel(activeMode)}
      </Button>

      <MealPlanDayTabs plan={plan} selectDay={selectDay} selectedDayIndex={selectedDayIndex} text={text} visibleDayName={visibleDayName} />

      {selectedDay && (
        <>
          <MealPlanDayCard
            focusMealProducts={focusMealProducts}
            isEnglish={isEnglish}
            openDescriptions={openDescriptions}
            regeneratingDay={regeneratingDay}
            regenerateSelectedDay={regenerateSelectedDay}
            selectedDay={selectedDay}
            selectedDayIndex={selectedDayIndex}
            selectedMeals={selectedMeals}
            selectedMealsForDay={selectedMealsForDay}
            setOpenDescriptions={setOpenDescriptions}
            text={text}
            toggleMeal={toggleMeal}
            visibleDayName={visibleDayName}
          />

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
  );
}
