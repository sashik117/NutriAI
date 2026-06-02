export default function FoodResultTotals({ totals }) {
  return (
    <div className="grid grid-cols-4 gap-2 rounded-2xl bg-background/80 p-3 text-center shadow-inner">
      <div>
        <p className="text-lg font-extrabold text-primary">{Math.round(totals.total_calories)}</p>
        <p className="text-[10px] font-medium text-muted-foreground">ккал</p>
      </div>
      <div>
        <p className="text-sm font-bold">{Math.round(totals.total_proteins)} г</p>
        <p className="text-[10px] text-muted-foreground">білки</p>
      </div>
      <div>
        <p className="text-sm font-bold">{Math.round(totals.total_fats)} г</p>
        <p className="text-[10px] text-muted-foreground">жири</p>
      </div>
      <div>
        <p className="text-sm font-bold">{Math.round(totals.total_carbs)} г</p>
        <p className="text-[10px] text-muted-foreground">вугл.</p>
      </div>
    </div>
  );
}
