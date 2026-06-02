import { motion } from 'framer-motion';

export default function WaterProgressCard({ mood, progress, totalWater, goal, text }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center rounded-3xl border border-border bg-card p-8"
    >
      <div className="relative mb-4 h-40 w-40 overflow-hidden rounded-full bg-muted">
        <motion.div
          className="absolute bottom-0 left-0 right-0 bg-chart-5/25"
          animate={{ height: `${progress * 100}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.span className="text-6xl" animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 3, repeat: Infinity }}>
            {mood.emoji}
          </motion.span>
        </div>
      </div>

      <p className={`text-sm font-semibold ${mood.color}`}>{mood.text}</p>
      <div className="mt-4 text-center">
        <span className="text-4xl font-extrabold">{totalWater}</span>
        <span className="text-lg font-medium text-muted-foreground"> / {goal} {text('мл', 'ml')}</span>
      </div>
    </motion.div>
  );
}
