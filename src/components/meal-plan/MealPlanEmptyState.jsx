import { Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

function profileGoalLabel(goal, text) {
  if (goal === 'lose') return text('Схуднення', 'Weight loss');
  if (goal === 'gain') return text('Набір маси', 'Muscle gain');
  return text('Підтримка', 'Maintenance');
}

export default function MealPlanEmptyState({ generatePlan, generating, planMode, profile, text }) {
  return (
    <div className="space-y-4">
      {profile && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs font-bold text-muted-foreground">{text('Ваші цілі на день', 'Your daily goals')}</p>
          <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
            <p>{profileGoalLabel(profile.goal, text)}</p>
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
  );
}
