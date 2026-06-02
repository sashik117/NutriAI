import EditMealDialog from '@/components/food/EditMealDialog';

export default function DashboardEditMealDialog({ editingLog, refreshSelectedFoodLogs, setEditingLog }) {
  if (!editingLog) return null;

  return (
    <EditMealDialog
      log={editingLog}
      open={!!editingLog}
      onClose={() => setEditingLog(null)}
      onSaved={refreshSelectedFoodLogs}
    />
  );
}
