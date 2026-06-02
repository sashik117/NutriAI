import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

function EditField({ label, icon, value, onChange }) {
  return (
    <label className="rounded-2xl border border-border bg-background/80 p-2">
      <span className="mb-1 block text-[10px] font-extrabold text-muted-foreground">{icon} {label}</span>
      <Input
        type="number"
        inputMode="decimal"
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 rounded-xl text-sm font-bold"
      />
    </label>
  );
}

export default function ProductSearchEditPanel({ draftProduct, saveDraft, text, updateDraft }) {
  return (
    <div className="mt-3 space-y-2 rounded-2xl bg-card/90 p-3">
      <label className="block">
        <span className="mb-1 block text-[10px] font-extrabold text-muted-foreground">{text('Назва продукту', 'Product name')}</span>
        <Input
          value={draftProduct?.name ?? ''}
          onChange={(event) => updateDraft('name', event.target.value)}
          className="h-10 rounded-xl text-sm font-bold"
        />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <EditField label={text('Порція', 'Serving')} icon={text('г', 'g')} value={draftProduct?.amount} onChange={(value) => updateDraft('amount', value)} />
        <EditField label={text('Ккал', 'Kcal')} icon={text('ккал', 'kcal')} value={draftProduct?.calories} onChange={(value) => updateDraft('calories', value)} />
        <EditField label={text('Білки', 'Protein')} icon={text('Б', 'P')} value={draftProduct?.proteins} onChange={(value) => updateDraft('proteins', value)} />
        <EditField label={text('Жири', 'Fats')} icon={text('Ж', 'F')} value={draftProduct?.fats} onChange={(value) => updateDraft('fats', value)} />
        <EditField label={text('Вуглеводи', 'Carbs')} icon={text('В', 'C')} value={draftProduct?.carbs} onChange={(value) => updateDraft('carbs', value)} />
      </div>
      <Button type="button" className="h-10 w-full gap-2 rounded-2xl text-xs" onClick={saveDraft}>
        <Check className="h-3.5 w-3.5" />
        {text('Зберегти правки', 'Save edits')}
      </Button>
    </div>
  );
}
