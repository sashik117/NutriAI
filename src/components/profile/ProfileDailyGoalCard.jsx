import { motion } from 'framer-motion';

export default function ProfileDailyGoalCard({ calculated, text }) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
      <p className="mb-3 text-xs font-bold text-primary">{text('Денна норма', 'Daily goal')}</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-card p-3 text-center">
          <p className="text-2xl font-extrabold text-primary">{calculated.calories}</p>
          <p className="text-[10px] text-muted-foreground">{text('ккал', 'kcal')}</p>
        </div>
        <div className="rounded-xl bg-card p-3 text-center">
          <p className="text-2xl font-extrabold">{calculated.water}</p>
          <p className="text-[10px] text-muted-foreground">{text('мл води', 'ml water')}</p>
        </div>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-card p-2.5 text-center">
          <p className="text-lg font-bold">{calculated.proteins} {text('г', 'g')}</p>
          <p className="text-[10px] text-muted-foreground">{text('білки', 'protein')}</p>
        </div>
        <div className="rounded-xl bg-card p-2.5 text-center">
          <p className="text-lg font-bold">{calculated.fats} {text('г', 'g')}</p>
          <p className="text-[10px] text-muted-foreground">{text('жири', 'fats')}</p>
        </div>
        <div className="rounded-xl bg-card p-2.5 text-center">
          <p className="text-lg font-bold">{calculated.carbs} {text('г', 'g')}</p>
          <p className="text-[10px] text-muted-foreground">{text('вуглеводи', 'carbs')}</p>
        </div>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 text-center text-[10px] text-muted-foreground">
        <div className="rounded-xl bg-card p-2">BMR: {calculated.bmr} {text('ккал', 'kcal')}</div>
        <div className="rounded-xl bg-card p-2">TDEE: {calculated.tdee} {text('ккал', 'kcal')}</div>
      </div>
    </motion.div>
  );
}
