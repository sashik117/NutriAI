import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/lib/LanguageContext';

export default function SplashScreen() {
  const { text } = useLanguage();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 1400);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          className="fixed inset-0 z-[999] flex flex-col items-center justify-center gap-4 bg-primary"
        >
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', damping: 14, stiffness: 190, delay: 0.1 }}
            className="flex flex-col items-center gap-3"
          >
            <div className="flex h-24 w-24 items-center justify-center rounded-[28px] bg-white/20 shadow-lg shadow-emerald-900/10">
              <img src="/nutriai-icon.svg" alt="" className="h-16 w-16" />
            </div>
            <div className="text-center">
              <h1 className="text-3xl font-extrabold tracking-tight text-white">NutriAI</h1>
              <p className="mt-1 text-sm font-medium text-white/75">{text('КБЖУ трекер з ШІ', 'AI nutrition tracker')}</p>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45 }}
            className="mt-4 flex gap-1.5"
          >
            {[0, 1, 2].map((item) => (
              <motion.div
                key={item}
                className="h-2 w-2 rounded-full bg-white/65"
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 0.8, delay: item * 0.2, repeat: Infinity }}
              />
            ))}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
