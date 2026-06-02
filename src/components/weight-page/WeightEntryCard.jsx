import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function WeightEntryCard({ addMutation, newWeight, profile, setNewWeight, text, todayLog }) {
  const parsedWeight = parseFloat(newWeight);

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
      <div>
        <p className="text-sm font-bold">
          {todayLog ? text(`Сьогодні: ${todayLog.weight} кг ✅`, `Today: ${todayLog.weight} kg ✅`) : text('Додати вагу сьогодні', 'Add today weight')}
        </p>
        {profile?.weight && (
          <p className="mt-0.5 text-xs text-muted-foreground">
            {text(`Початкова вага у профілі: ${profile.weight} кг`, `Profile start weight: ${profile.weight} kg`)}
          </p>
        )}
      </div>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            type="number"
            step="0.1"
            placeholder="70.5"
            value={newWeight}
            onChange={(event) => setNewWeight(event.target.value)}
            className="rounded-xl pr-10"
            aria-label={text('Нова вага', 'New weight')}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">{text('кг', 'kg')}</span>
        </div>
        <Button className="rounded-xl px-5" onClick={() => addMutation.mutate(parsedWeight)} disabled={!newWeight || Number.isNaN(parsedWeight)}>
          <Plus className="mr-1 h-4 w-4" /> {text('Додати', 'Add')}
        </Button>
      </div>
    </div>
  );
}
