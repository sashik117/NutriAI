import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function DashboardAddFoodCta({ isToday, text }) {
  if (!isToday) return null;

  return (
    <Link to="/log" className="block">
      <motion.div
        whileTap={{ scale: 0.97 }}
        className="flex items-center justify-center gap-3 rounded-3xl bg-primary px-5 py-4 text-primary-foreground shadow-lg shadow-primary/20"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/20">
          <Plus className="h-5 w-5" />
        </span>
        <div className="text-left">
          <p className="text-sm font-extrabold">{text('Додати їжу', 'Add food')}</p>
          <p className="text-xs opacity-80">{text('Сканер, пошук або текст для ШІ', 'Scanner, search, or AI text')}</p>
        </div>
      </motion.div>
    </Link>
  );
}
