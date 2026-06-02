import { format } from 'date-fns';
import { uk } from 'date-fns/locale';
import { motion } from 'framer-motion';
import ThemeToggle from '@/components/layout/ThemeToggle';

export default function DashboardHeader({ isEnglish, isToday, selectedDate, text }) {
  return (
    <motion.header initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs font-medium capitalize text-muted-foreground">
          {format(selectedDate, 'EEEE, d MMMM', isEnglish ? undefined : { locale: uk })}
        </p>
        <h1 className="mt-0.5 truncate text-2xl font-extrabold">
          {isToday ? text('Сьогодні 👋', 'Today 👋') : format(selectedDate, 'd MMMM', isEnglish ? undefined : { locale: uk })}
        </h1>
      </div>
      <ThemeToggle />
    </motion.header>
  );
}
