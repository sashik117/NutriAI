import MealPlanContent from '@/components/meal-plan/MealPlanContent';
import MealPlanEmptyState from '@/components/meal-plan/MealPlanEmptyState';
import MealPlanHeader from '@/components/meal-plan/MealPlanHeader';
import MealPlanModeSelector from '@/components/meal-plan/MealPlanModeSelector';
import MealPlanSkeleton from '../components/meal-plan/MealPlanSkeleton';
import { useMealPlanPage } from '@/hooks/useMealPlanPage';
import { useLanguage } from '@/lib/LanguageContext';

export default function MealPlan() {
  const { isEnglish, text } = useLanguage();
  const mealPlan = useMealPlanPage({ isEnglish, text });

  return (
    <div className="space-y-5 pb-8 pt-6">
      <MealPlanHeader text={text} />
      <MealPlanModeSelector
        generatePlan={mealPlan.generatePlan}
        generating={mealPlan.generating}
        planMode={mealPlan.planMode}
        visibleModeLabel={mealPlan.visibleModeLabel}
      />

      {mealPlan.generating ? (
        <MealPlanSkeleton status={mealPlan.generationStatus} />
      ) : !mealPlan.plan ? (
        <MealPlanEmptyState
          generatePlan={mealPlan.generatePlan}
          generating={mealPlan.generating}
          planMode={mealPlan.planMode}
          profile={mealPlan.profile}
          text={text}
        />
      ) : (
        <MealPlanContent
          {...mealPlan}
          isEnglish={isEnglish}
          text={text}
        />
      )}
    </div>
  );
}
