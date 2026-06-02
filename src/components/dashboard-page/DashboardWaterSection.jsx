import WaterPlant from '@/components/dashboard/WaterPlant';

export default function DashboardWaterSection({ addWaterMutation, goals, isToday, totalWater }) {
  if (!isToday) return null;

  return (
    <WaterPlant
      current={totalWater}
      goal={goals.water}
      onAddWater={(ml) => addWaterMutation.mutate(ml)}
    />
  );
}
