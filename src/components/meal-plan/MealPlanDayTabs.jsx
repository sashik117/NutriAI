export default function MealPlanDayTabs({ plan, selectDay, selectedDayIndex, text, visibleDayName }) {
  return (
    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
      {plan.days.map((day, index) => (
        <button
          key={day.day}
          type="button"
          onClick={() => selectDay(index)}
          className={`min-w-[112px] rounded-2xl border p-3 text-left transition ${
            selectedDayIndex === index ? 'border-primary bg-primary/10 shadow-sm' : 'border-border bg-card'
          }`}
        >
          <p className="text-[11px] font-bold text-muted-foreground">{index + 1}</p>
          <p className="truncate text-sm font-extrabold">{visibleDayName(day, index)}</p>
          <p className="mt-1 text-xs text-muted-foreground">{day.total_calories} {text('ккал', 'kcal')}</p>
        </button>
      ))}
    </div>
  );
}
