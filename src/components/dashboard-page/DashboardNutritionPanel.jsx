import { motion } from 'framer-motion';
import CaloriesRing from '@/components/dashboard/CaloriesRing';
import MacroRing from '@/components/dashboard/MacroRing';

export default function DashboardNutritionPanel({ goals, text, totals }) {
  return (
    <motion.section
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center rounded-3xl border border-border bg-card p-6"
    >
      <CaloriesRing current={totals.calories} goal={goals.calories} />
      <div className="mt-5 flex w-full justify-around">
        <MacroRing label={text('Білки', 'Protein')} current={Math.round(totals.proteins)} goal={goals.proteins} color="proteins" />
        <MacroRing label={text('Жири', 'Fats')} current={Math.round(totals.fats)} goal={goals.fats} color="fats" />
        <MacroRing label={text('Вуглеводи', 'Carbs')} current={Math.round(totals.carbs)} goal={goals.carbs} color="carbs" />
      </div>
    </motion.section>
  );
}
