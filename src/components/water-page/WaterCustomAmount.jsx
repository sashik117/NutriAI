import { Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function WaterCustomAmount({ customAmount, setCustomAmount, addWaterMutation, text }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="mb-3 text-xs font-semibold text-muted-foreground">{text("Свій об'єм", 'Custom amount')}</p>
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" className="rounded-full" onClick={() => setCustomAmount(Math.max(50, customAmount - 50))}>
          <Minus className="h-4 w-4" />
        </Button>
        <div className="flex-1 text-center">
          <span className="text-2xl font-extrabold">{customAmount}</span>
          <span className="text-sm text-muted-foreground"> {text('мл', 'ml')}</span>
        </div>
        <Button variant="outline" size="icon" className="rounded-full" onClick={() => setCustomAmount(customAmount + 50)}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <Button className="mt-3 w-full rounded-xl" onClick={() => addWaterMutation.mutate(customAmount)} disabled={addWaterMutation.isPending}>
        <Plus className="mr-1 h-4 w-4" /> {text('Додати', 'Add')} {customAmount} {text('мл', 'ml')}
      </Button>
    </div>
  );
}
