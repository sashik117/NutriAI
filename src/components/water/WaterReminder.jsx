import { useState, useEffect, useRef } from 'react';
import { Bell, BellOff, Droplets } from 'lucide-react';
import { nutriApi } from '@/api/nutriApi';
import { format } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

const REMINDER_INTERVALS = [30, 60, 90, 120]; // minutes

export default function WaterReminder({ currentMl, goalMl }) {
  const [enabled, setEnabled] = useState(() => localStorage.getItem('water_reminder') === 'true');
  const [intervalMin, setIntervalMin] = useState(() => parseInt(localStorage.getItem('water_reminder_interval') || '60'));
  const [permission, setPermission] = useState(() =>
    typeof Notification === 'undefined' ? 'unsupported' : Notification.permission
  );
  const [showInApp, setShowInApp] = useState(false);
  const timerRef = useRef(null);
  const queryClient = useQueryClient();
  const today = format(new Date(), 'yyyy-MM-dd');

  const logWater = async (ml) => {
    try {
      await nutriApi.entities.WaterLog.create({ amount_ml: ml, date: today });
      queryClient.invalidateQueries({ queryKey: ['waterLogs'] });
      toast.success(`💧 +${ml} мл додано!`);
      setShowInApp(false);
    } catch (error) {
      toast.error(error.message || 'Не вдалося додати воду');
    }
  };

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      toast.error('Ваш браузер не підтримує сповіщення');
      return false;
    }
    const result = await Notification.requestPermission();
    setPermission(result);
    return result === 'granted';
  };

  const sendNotification = () => {
    const remaining = Math.max(goalMl - currentMl, 0);
    if (remaining <= 0) return;

    if (permission === 'granted') {
      const n = new Notification('💧 Час попити воду!', {
        body: `Залишилось: ${remaining} мл. Не забувай про гідратацію!`,
        icon: '/nutriai-icon.svg',
        tag: 'water-reminder',
        renotify: true,
        // Actions work only in Service Worker notifications
        requireInteraction: false,
      });
      n.onclick = () => { window.focus(); setShowInApp(true); };
    } else {
      // Fallback: in-app banner
      setShowInApp(true);
    }
  };

  const startTimer = (min) => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(sendNotification, min * 60 * 1000);
  };

  const toggleReminder = async () => {
    if (!enabled) {
      if (permission !== 'granted') {
        const ok = await requestPermission();
        if (!ok) setShowInApp(true);
      }
      setEnabled(true);
      localStorage.setItem('water_reminder', 'true');
      startTimer(intervalMin);
      toast.success(`🔔 Нагадування кожні ${intervalMin} хв увімкнено`);
    } else {
      clearInterval(timerRef.current);
      setEnabled(false);
      localStorage.setItem('water_reminder', 'false');
      toast('🔕 Нагадування вимкнено');
    }
  };

  const changeInterval = (min) => {
    setIntervalMin(min);
    localStorage.setItem('water_reminder_interval', String(min));
    if (enabled) startTimer(min);
  };

  useEffect(() => {
    if (enabled) startTimer(intervalMin);
    return () => clearInterval(timerRef.current);
  }, []);

  return (
    <div className="space-y-2">
      {/* In-app notification banner */}
      <AnimatePresence>
        {showInApp && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700/50 rounded-2xl p-4"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-800/40 flex items-center justify-center">
                <Droplets className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="font-bold text-sm">💧 Час попити воду!</p>
                <p className="text-xs text-muted-foreground">Скільки випити зараз?</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[150, 200, 300, 350, 500, 750].map(ml => (
                <button
                  key={ml}
                  onClick={() => logWater(ml)}
                  className="bg-blue-500 hover:bg-blue-600 active:scale-95 text-white rounded-xl py-2 text-sm font-bold transition-all"
                >
                  +{ml} мл
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowInApp(false)}
              className="mt-2 w-full text-xs text-muted-foreground py-1"
            >
              Нагадати пізніше
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reminder toggle */}
      <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {enabled ? <Bell className="w-4 h-4 text-primary" /> : <BellOff className="w-4 h-4 text-muted-foreground" />}
            <span className="text-sm font-semibold">
              {enabled ? `Нагадування кожні ${intervalMin} хв` : 'Нагадування про воду'}
            </span>
          </div>
          <button
            onClick={toggleReminder}
            className={`w-12 h-6 rounded-full transition-all ${enabled ? 'bg-primary' : 'bg-muted'} relative`}
          >
            <div className={`w-5 h-5 rounded-full bg-white shadow transition-all absolute top-0.5 ${enabled ? 'left-6' : 'left-0.5'}`} />
          </button>
        </div>

        {enabled && (
          <div className="flex gap-2">
            {REMINDER_INTERVALS.map(min => (
              <button
                key={min}
                onClick={() => changeInterval(min)}
                className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  intervalMin === min ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}
              >
                {min}хв
              </button>
            ))}
          </div>
        )}

        {/* Test button */}
        {enabled && (
          <button
            onClick={sendNotification}
            className="w-full text-xs text-muted-foreground underline"
          >
            Тест сповіщення
          </button>
        )}
      </div>
    </div>
  );
}
