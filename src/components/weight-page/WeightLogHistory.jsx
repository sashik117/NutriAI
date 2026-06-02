import { format } from 'date-fns';
import { uk } from 'date-fns/locale';
import { motion } from 'framer-motion';

export default function WeightLogHistory({ isEnglish, text, weightLogs }) {
  if (!weightLogs.length) return null;

  return (
    <div className="space-y-2">
      <p className="text-sm font-bold text-muted-foreground">{text('Останні записи', 'Recent entries')}</p>
      {weightLogs.slice(0, 10).map((log, index) => (
        <motion.div
          key={log.id}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.04 }}
          className="flex items-center justify-between rounded-xl border border-border bg-card p-3"
        >
          <span className="text-sm text-muted-foreground">
            {format(new Date(log.date), 'd MMMM', isEnglish ? undefined : { locale: uk })}
          </span>
          <span className="font-bold">{log.weight} {text('кг', 'kg')}</span>
        </motion.div>
      ))}
    </div>
  );
}
