import { ArrowRight, Check, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  MEAL_SLOT_LABELS_EN,
  MEAL_SLOTS,
  displayIngredientName,
  displayMealTitle,
  displayUnit,
} from '@/domain/meal-plan/mealPlanModel';

export default function MealPlanMealCard({
  focusMealProducts,
  isEnglish,
  meal,
  openDescriptions,
  selectedMeals,
  setOpenDescriptions,
  text,
  toggleMeal,
}) {
  const slot = MEAL_SLOTS.find((item) => item.key === meal.slot) || MEAL_SLOTS[1];
  const selected = selectedMeals.includes(meal.id);
  const descriptionOpen = Boolean(openDescriptions[meal.id]);
  const slotLabel = isEnglish ? MEAL_SLOT_LABELS_EN[slot.key] : slot.label;
  const title = displayMealTitle(meal.title, isEnglish);

  return (
    <div className={`rounded-2xl p-3 transition ${selected ? 'bg-primary/10 ring-1 ring-primary/30' : 'bg-muted/35'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-extrabold uppercase tracking-wide text-muted-foreground">{slotLabel}</p>
          <button
            type="button"
            className="mt-1 text-left text-sm font-bold"
            onClick={() => setOpenDescriptions((current) => ({ ...current, [meal.id]: !current[meal.id] }))}
          >
            {title}
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
            aria-label={`${selected ? text('Обрано', 'Selected') : text('Вибрати страву', 'Select meal')} ${title}`}
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
              aria-label={`${text('Продукти для страви', 'Products for meal')} ${title}`}
              title={text('Продукти для цієї страви', 'Products for this meal')}
            >
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
