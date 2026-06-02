import { Camera } from 'lucide-react';

export default function FoodLogEmptyState({ tr }) {
  return (
    <div className="rounded-3xl border border-dashed border-border bg-card p-5 text-center">
      <Camera className="mx-auto mb-2 h-8 w-8 text-primary" />
      <p className="text-sm font-bold">{tr("Ще нічого не з'їли?", 'No food yet?')}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {tr('Сфоткайте свою тарілку або знайдіть продукт через пошук.', 'Scan your plate or find a product with search.')}
      </p>
    </div>
  );
}
