import { motion } from 'framer-motion';

export default function WeightHeader({ text }) {
  return (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
      <h1 className="text-2xl font-extrabold">{text('Вага ⚖️', 'Weight ⚖️')}</h1>
      <p className="mt-0.5 text-sm text-muted-foreground">{text('Відстежуйте свій прогрес', 'Track your progress')}</p>
    </motion.div>
  );
}
