import { Droplets } from 'lucide-react';
import { Button } from '@/components/ui/button';

const QUICK_AMOUNTS = [150, 250, 330, 500];

export default function WaterQuickAdd({ addWaterMutation, text }) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-muted-foreground">{text('Додати воду', 'Add water')}</p>
      <div className="grid grid-cols-4 gap-2">
        {QUICK_AMOUNTS.map((amount) => (
          <Button
            key={amount}
            variant="outline"
            className="flex h-14 flex-col gap-0.5 rounded-xl"
            onClick={() => addWaterMutation.mutate(amount)}
            disabled={addWaterMutation.isPending}
          >
            <Droplets className="h-4 w-4 text-chart-5" />
            <span className="text-xs font-bold">{amount} {text('мл', 'ml')}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}
