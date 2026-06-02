import { motion } from 'framer-motion';

export default function MealPlanHeader({ text }) {
  return (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
      <h1 className="text-2xl font-extrabold">{text('План харчування', 'Meal plan')}</h1>
      <p className="mt-0.5 text-sm text-muted-foreground">
        {text('Gemini генерує раціон під вибраний режим', 'Gemini builds meals for the selected style')}
      </p>
    </motion.div>
  );
}
