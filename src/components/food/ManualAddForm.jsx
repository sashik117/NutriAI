import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Check } from 'lucide-react';
import { useManualFoodForm } from '@/hooks/useManualFoodForm';
import { useLanguage } from '@/lib/LanguageContext';

export default function ManualAddForm({ onAdd }) {
  const { form, canSubmit, setField, submit } = useManualFoodForm(onAdd);
  const { text } = useLanguage();

  return (
    <div className="space-y-3 rounded-xl bg-muted/40 p-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2">
          <Label className="text-[10px] text-muted-foreground">{text('Назва продукту', 'Product name')}</Label>
          <Input
            value={form.name}
            onChange={(event) => setField('name', event.target.value)}
            placeholder={text('Назва...', 'Name...')}
            className="mt-0.5 h-8 rounded-lg text-sm"
            aria-label={text('Назва продукту', 'Product name')}
          />
        </div>

        <div>
          <Label className="text-[10px] text-muted-foreground">{text('Кількість', 'Amount')}</Label>
          <Input
            type="number"
            value={form.amount}
            onChange={(event) => setField('amount', event.target.value)}
            className="mt-0.5 h-8 rounded-lg text-sm"
            aria-label={text('Кількість', 'Amount')}
          />
        </div>

        <div>
          <Label className="text-[10px] text-muted-foreground">{text('Одиниця', 'Unit')}</Label>
          <select
            value={form.unit}
            onChange={(event) => setField('unit', event.target.value)}
            className="mt-0.5 h-8 w-full rounded-lg border border-input bg-background px-2 text-sm"
            aria-label={text('Одиниця', 'Unit')}
          >
            <option value="g">{text('г', 'g')}</option>
            <option value="ml">{text('мл', 'ml')}</option>
          </select>
        </div>

        <div>
          <Label className="text-[10px] text-muted-foreground">{text('Калорії', 'Calories')}</Label>
          <Input
            type="number"
            value={form.calories}
            onChange={(event) => setField('calories', event.target.value)}
            className="mt-0.5 h-8 rounded-lg text-sm"
            aria-label={text('Калорії', 'Calories')}
          />
        </div>

        <div>
          <Label className="text-[10px] text-muted-foreground">{text('Білки, г', 'Protein, g')}</Label>
          <Input
            type="number"
            value={form.proteins}
            onChange={(event) => setField('proteins', event.target.value)}
            className="mt-0.5 h-8 rounded-lg text-sm"
            aria-label={text('Білки, г', 'Protein, g')}
          />
        </div>

        <div>
          <Label className="text-[10px] text-muted-foreground">{text('Жири, г', 'Fats, g')}</Label>
          <Input
            type="number"
            value={form.fats}
            onChange={(event) => setField('fats', event.target.value)}
            className="mt-0.5 h-8 rounded-lg text-sm"
            aria-label={text('Жири, г', 'Fats, g')}
          />
        </div>

        <div>
          <Label className="text-[10px] text-muted-foreground">{text('Вуглеводи, г', 'Carbs, g')}</Label>
          <Input
            type="number"
            value={form.carbs}
            onChange={(event) => setField('carbs', event.target.value)}
            className="mt-0.5 h-8 rounded-lg text-sm"
            aria-label={text('Вуглеводи, г', 'Carbs, g')}
          />
        </div>
      </div>

      <Button size="sm" className="h-9 w-full rounded-xl" onClick={submit} disabled={!canSubmit}>
        <Check className="mr-1 h-4 w-4" /> {text('Додати вручну', 'Add manually')}
      </Button>
    </div>
  );
}
