import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Check } from 'lucide-react';
import { useManualFoodForm } from '@/hooks/useManualFoodForm';

export default function ManualAddForm({ onAdd }) {
  const { form, canSubmit, setField, submit } = useManualFoodForm(onAdd);

  return (
    <div className="space-y-3 rounded-xl bg-muted/40 p-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2">
          <Label className="text-[10px] text-muted-foreground">Назва продукту</Label>
          <Input
            value={form.name}
            onChange={(event) => setField('name', event.target.value)}
            placeholder="Назва..."
            className="mt-0.5 h-8 rounded-lg text-sm"
          />
        </div>

        <div>
          <Label className="text-[10px] text-muted-foreground">Кількість</Label>
          <Input
            type="number"
            value={form.amount}
            onChange={(event) => setField('amount', event.target.value)}
            className="mt-0.5 h-8 rounded-lg text-sm"
          />
        </div>

        <div>
          <Label className="text-[10px] text-muted-foreground">Одиниця</Label>
          <select
            value={form.unit}
            onChange={(event) => setField('unit', event.target.value)}
            className="mt-0.5 h-8 w-full rounded-lg border border-input bg-background px-2 text-sm"
          >
            <option value="g">г</option>
            <option value="ml">мл</option>
          </select>
        </div>

        <div>
          <Label className="text-[10px] text-muted-foreground">Калорії</Label>
          <Input
            type="number"
            value={form.calories}
            onChange={(event) => setField('calories', event.target.value)}
            className="mt-0.5 h-8 rounded-lg text-sm"
          />
        </div>

        <div>
          <Label className="text-[10px] text-muted-foreground">Білки, г</Label>
          <Input
            type="number"
            value={form.proteins}
            onChange={(event) => setField('proteins', event.target.value)}
            className="mt-0.5 h-8 rounded-lg text-sm"
          />
        </div>

        <div>
          <Label className="text-[10px] text-muted-foreground">Жири, г</Label>
          <Input
            type="number"
            value={form.fats}
            onChange={(event) => setField('fats', event.target.value)}
            className="mt-0.5 h-8 rounded-lg text-sm"
          />
        </div>

        <div>
          <Label className="text-[10px] text-muted-foreground">Вуглеводи, г</Label>
          <Input
            type="number"
            value={form.carbs}
            onChange={(event) => setField('carbs', event.target.value)}
            className="mt-0.5 h-8 rounded-lg text-sm"
          />
        </div>
      </div>

      <Button size="sm" className="h-9 w-full rounded-xl" onClick={submit} disabled={!canSubmit}>
        <Check className="mr-1 h-4 w-4" /> Додати вручну
      </Button>
    </div>
  );
}
