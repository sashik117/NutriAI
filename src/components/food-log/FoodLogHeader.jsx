import { motion } from 'framer-motion';

export default function FoodLogHeader({ tr }) {
  return (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
      <h1 className="text-2xl font-extrabold">{tr('Додати їжу', 'Add food')}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {tr('Опишіть, сфоткайте або знайдіть продукт', 'Describe, scan, or search for food')}
      </p>
    </motion.div>
  );
}
