import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Check } from 'lucide-react';

const emptyItem = { name: '', unit: 'g', amount: 100, weight_g: 100, calories: 0, proteins: 0, fats: 0, carbs: 0 };

export default function ManualAddForm({ onAdd }) {
  const [form, setForm] = useState(emptyItem);
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const handleAdd = () => {
    if (!form.name.trim()) return;
    const amount = Number(form.amount) || Number(form.weight_g) || 100;
    const unit = form.unit === 'ml' ? 'ml' : 'g';
    onAdd({
      ...form,
      unit,
      amount,
      weight_g: unit === 'g' ? amount : Number(form.weight_g) || amount,
      calories: Number(form.calories),
      proteins: Number(form.proteins),
      fats: Number(form.fats),
      carbs: Number(form.carbs),
    });
    setForm(emptyItem);
  };

  return (
    <div className="space-y-3 rounded-xl bg-muted/40 p-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2">
          <Label className="text-[10px] text-muted-foreground">Назва продукту</Label>
          <Input value={form.name} onChange={(event) => set('name', event.target.value)} placeholder="Назва..." className="mt-0.5 h-8 rounded-lg text-sm" />
        </div>
        <div>
          <Label className="text-[10px] text-muted-foreground">Кількість</Label>
          <Input type="number" value={form.amount} onChange={(event) => set('amount', event.target.value)} className="mt-0.5 h-8 rounded-lg text-sm" />
        </div>
        <div>
          <Label className="text-[10px] text-muted-foreground">Одиниця</Label>
          <select value={form.unit} onChange={(event) => set('unit', event.target.value)} className="mt-0.5 h-8 w-full rounded-lg border border-input bg-background px-2 text-sm">
            <option value="g">г</option>
            <option value="ml">мл</option>
          </select>
        </div>
        <div>
          <Label className="text-[10px] text-muted-foreground">Калорії</Label>
          <Input type="number" value={form.calories} onChange={(event) => set('calories', event.target.value)} className="mt-0.5 h-8 rounded-lg text-sm" />
        </div>
        <div>
          <Label className="text-[10px] text-muted-foreground">Білки, г</Label>
          <Input type="number" value={form.proteins} onChange={(event) => set('proteins', event.target.value)} className="mt-0.5 h-8 rounded-lg text-sm" />
        </div>
        <div>
          <Label className="text-[10px] text-muted-foreground">Жири, г</Label>
          <Input type="number" value={form.fats} onChange={(event) => set('fats', event.target.value)} className="mt-0.5 h-8 rounded-lg text-sm" />
        </div>
        <div>
          <Label className="text-[10px] text-muted-foreground">Вуглеводи, г</Label>
          <Input type="number" value={form.carbs} onChange={(event) => set('carbs', event.target.value)} className="mt-0.5 h-8 rounded-lg text-sm" />
        </div>
      </div>
      <Button size="sm" className="h-9 w-full rounded-xl" onClick={handleAdd} disabled={!form.name.trim()}>
        <Check className="mr-1 h-4 w-4" /> Додати вручну
      </Button>
    </div>
  );
}
