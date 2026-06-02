export default function HistoryDaySelector({ days, selectedDay, selectDay }) {
  return (
    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
      {days.map((day) => (
        <button
          key={day.offset}
          onClick={() => selectDay(day.offset)}
          className={`flex min-w-[60px] flex-col items-center rounded-xl px-3 py-2 transition-all ${
            selectedDay === day.offset ? 'bg-primary text-primary-foreground' : 'border border-border bg-card'
          }`}
        >
          <span className="text-[10px] font-medium">{day.label}</span>
          <span className="text-lg font-bold">{day.date}</span>
        </button>
      ))}
    </div>
  );
}
