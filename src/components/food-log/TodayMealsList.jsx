import { Pencil } from 'lucide-react';
import MealCard from '@/components/dashboard/MealCard';

function EditableMealCard({ log, index, onEdit }) {
  return (
    <div className="relative">
      <MealCard log={log} index={index} />
      <button
        onClick={() => onEdit(log)}
        className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-muted/80 hover:bg-muted"
      >
        <Pencil className="h-3 w-3 text-muted-foreground" />
      </button>
    </div>
  );
}

export default function TodayMealsList({ tr, groupedLogs, otherSnacks, setEditingLog }) {
  return (
    <div className="space-y-3 pt-2">
      <h2 className="text-sm font-bold">{tr('Сьогоднішній раціон', 'Today meals')}</h2>

      {groupedLogs.map((group) => (
        <div key={group.key}>
          <p className="mb-1.5 text-xs font-semibold text-muted-foreground">{group.label}</p>
          <div className="space-y-1.5">
            {group.logs.map((log, index) => (
              <EditableMealCard key={log.id} log={log} index={index} onEdit={setEditingLog} />
            ))}
          </div>
        </div>
      ))}

      {otherSnacks.map((log, index) => (
        <EditableMealCard key={log.id} log={log} index={index} onEdit={setEditingLog} />
      ))}
    </div>
  );
}
