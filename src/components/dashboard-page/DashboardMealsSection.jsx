import MealCard from '@/components/dashboard/MealCard';

export default function DashboardMealsSection({ foodLogs, setEditingLog, text }) {
  if (!foodLogs.length) {
    return <div className="py-6 text-center text-sm text-muted-foreground">{text('Записів немає', 'No entries yet')}</div>;
  }

  return (
    <section>
      <h2 className="mb-2 text-sm font-bold">{text('Прийоми їжі', 'Meals')}</h2>
      <div className="space-y-2">
        {foodLogs.map((log, index) => (
          <MealCard key={log.id} log={log} index={index} onEdit={setEditingLog} />
        ))}
      </div>
    </section>
  );
}
