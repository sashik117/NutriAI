import { motion } from 'framer-motion';

export default function WaterHeader({ text }) {
  return (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
      <h1 className="text-2xl font-extrabold">{text('Трекер води 💧', 'Water tracker 💧')}</h1>
    </motion.div>
  );
}
