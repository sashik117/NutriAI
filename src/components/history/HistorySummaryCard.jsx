import { motion } from 'framer-motion';

export default function HistorySummaryCard({ date, totalWater, totals, text }) {
  return (
    <motion.div key={date} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl border border-border bg-card p-4">
      <div className="grid grid-cols-4 gap-3 text-center">
        <div>
          <p className="text-lg font-extrabold text-primary">{Math.round(totals.calories)}</p>
          <p className="text-[10px] font-medium text-muted-foreground">{text('ккал', 'kcal')}</p>
        </div>
        <div>
          <p className="text-lg font-bold">{Math.round(totals.proteins)}{text('г', 'g')}</p>
          <p className="text-[10px] text-muted-foreground">{text('білки', 'protein')}</p>
        </div>
        <div>
          <p className="text-lg font-bold">{Math.round(totals.fats)}{text('г', 'g')}</p>
          <p className="text-[10px] text-muted-foreground">{text('жири', 'fats')}</p>
        </div>
        <div>
          <p className="text-lg font-bold">{Math.round(totals.carbs)}{text('г', 'g')}</p>
          <p className="text-[10px] text-muted-foreground">{text('вуглеводи', 'carbs')}</p>
        </div>
      </div>
      <div className="mt-3 border-t border-border pt-3 text-center">
        <p className="text-sm">💧 {totalWater} {text('мл води', 'ml water')}</p>
      </div>
    </motion.div>
  );
}
