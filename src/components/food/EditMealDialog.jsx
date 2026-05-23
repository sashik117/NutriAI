import { useState } from 'react';
import { nutriApi } from '@/api/nutriApi';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Save, Plus } from 'lucide-react';
import { toast } from 'sonner';

const emptyItem = { name: '', unit: 'g', amount: 100, weight_g: 100, calories: 0, proteins: 0, fats: 0, carbs: 0 };
const normalizeItem = (item) => {
  const unit = item?.unit === 'ml' ? 'ml' : 'g';
  const amount = Math.max(Number(item?.amount ?? item?.weight_g ?? 100) || 100, 1);
  return { ...emptyItem, ...item, unit, amount, weight_g: unit === 'g' ? amount : Number(item?.weight_g ?? amount) };
};

export default function EditMealDialog({ log, open, onClose, onSaved }) {
  const [mealType, setMealType] = useState(log?.meal_type || 'lunch');
  const [items, setItems] = useState((log?.items || []).map(normalizeItem));
  const [saving, setSaving] = useState(false);

  const updateItem = (index, key, value) => {
    setItems((current) => current.map((item, itemIndex) => {
      if (itemIndex !== index) return item;
      const next = { ...item, [key]: key === 'name' || key === 'unit' ? value : Number(value) };
      if (key === 'amount' && next.unit === 'g') next.weight_g = Number(value);
      if (key === 'unit' && value === 'g') next.weight_g = Number(next.amount || 100);
      return next;
    }));
  };

  const removeItem = (index) => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index));
  const addItem = () => setItems((current) => [...current, emptyItem]);

  const totals = items.reduce((acc, item) => ({
    calories: acc.calories + (Number(item.calories) || 0),
    proteins: acc.proteins + (Number(item.proteins) || 0),
    fats: acc.fats + (Number(item.fats) || 0),
    carbs: acc.carbs + (Number(item.carbs) || 0),
  }), { calories: 0, proteins: 0, fats: 0, carbs: 0 });

  const handleSave = async () => {
    setSaving(true);
    await nutriApi.entities.FoodLog.update(log.id, {
      meal_type: mealType,
      items: items.map(normalizeItem),
      total_calories: Math.round(totals.calories),
      total_proteins: Math.round(totals.proteins),
      total_fats: Math.round(totals.fats),
      total_carbs: Math.round(totals.carbs),
    });
    toast.success('Збережено');
    setSaving(false);
    onSaved();
    onClose();
  };

  const handleDelete = async () => {
    await nutriApi.entities.FoodLog.delete(log.id);
    toast.success('Видалено');
    onSaved();
    onClose();
  };

  if (!log) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-sm overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle>Редагувати прийом</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Select value={mealType} onValueChange={setMealType}>
            <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="breakfast">Сніданок</SelectItem>
              <SelectItem value="snack1">Перекус 1</SelectItem>
              <SelectItem value="lunch">Обід</SelectItem>
              <SelectItem value="snack2">Перекус 2</SelectItem>
              <SelectItem value="dinner">Вечеря</SelectItem>
              <SelectItem value="snack3">Перекус 3</SelectItem>
              <SelectItem value="snack">Перекус</SelectItem>
            </SelectContent>
          </Select>

          <div className="space-y-2">
            {items.map((item, index) => (
              <div key={index} className="space-y-2 rounded-xl bg-muted/40 p-2.5">
                <div className="flex gap-2">
                  <Input value={item.name} onChange={(event) => updateItem(index, 'name', event.target.value)} placeholder="Назва" className="h-7 rounded-lg text-xs" />
                  <button onClick={() => removeItem(index)} className="shrink-0 text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <div>
                    <Label className="text-[9px] text-muted-foreground">{item.unit === 'ml' ? 'мл' : 'г'}</Label>
                    <Input type="number" value={item.amount} onChange={(event) => updateItem(index, 'amount', event.target.value)} className="mt-0.5 h-7 rounded-lg text-xs" />
                  </div>
                  <div>
                    <Label className="text-[9px] text-muted-foreground">од.</Label>
                    <select value={item.unit} onChange={(event) => updateItem(index, 'unit', event.target.value)} className="mt-0.5 h-7 w-full rounded-lg border border-input bg-background px-1 text-xs">
                      <option value="g">г</option>
                      <option value="ml">мл</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-[9px] text-muted-foreground">ккал</Label>
                    <Input type="number" value={item.calories} onChange={(event) => updateItem(index, 'calories', event.target.value)} className="mt-0.5 h-7 rounded-lg text-xs" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {[
                    ['proteins', 'Б'],
                    ['fats', 'Ж'],
                    ['carbs', 'В'],
                  ].map(([key, label]) => (
                    <div key={key}>
                      <Label className="text-[9px] text-muted-foreground">{label}</Label>
                      <Input type="number" value={item[key]} onChange={(event) => updateItem(index, key, event.target.value)} className="mt-0.5 h-7 rounded-lg text-xs" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <Button variant="outline" size="sm" className="h-8 w-full rounded-xl text-xs" onClick={addItem}>
              <Plus className="mr-1 h-3 w-3" /> Додати продукт
            </Button>
          </div>

          <div className="flex justify-around rounded-xl bg-primary/5 p-2.5 text-center text-xs">
            <div><p className="font-bold text-primary">{Math.round(totals.calories)}</p><p className="text-muted-foreground">ккал</p></div>
            <div><p className="font-bold">{Math.round(totals.proteins)} г</p><p className="text-muted-foreground">білки</p></div>
            <div><p className="font-bold">{Math.round(totals.fats)} г</p><p className="text-muted-foreground">жири</p></div>
            <div><p className="font-bold">{Math.round(totals.carbs)} г</p><p className="text-muted-foreground">вугл</p></div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 rounded-xl border-destructive/30 text-destructive hover:text-destructive" onClick={handleDelete}>
              <Trash2 className="mr-1 h-4 w-4" /> Видалити
            </Button>
            <Button className="flex-1 rounded-xl" onClick={handleSave} disabled={saving}>
              <Save className="mr-1 h-4 w-4" /> Зберегти
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
