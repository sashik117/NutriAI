import { PLAN_MODES } from '@/domain/meal-plan/mealPlanModel';

export default function MealPlanModeSelector({ generatePlan, generating, planMode, visibleModeLabel }) {
  return (
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
  );
}
