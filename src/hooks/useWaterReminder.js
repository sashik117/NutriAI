import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { waterLogRepository } from '@/services/repositories';

const ENABLED_KEY = 'water_reminder';
const INTERVAL_KEY = 'water_reminder_interval';

function getInitialPermission() {
  if (typeof Notification === 'undefined') return 'unsupported';
  return Notification.permission;
}

export function useWaterReminder({ currentMl, goalMl, text }) {
  const [enabled, setEnabled] = useState(() => localStorage.getItem(ENABLED_KEY) === 'true');
  const [intervalMin, setIntervalMin] = useState(() => parseInt(localStorage.getItem(INTERVAL_KEY) || '60', 10));
  const [permission, setPermission] = useState(getInitialPermission);
  const [showInApp, setShowInApp] = useState(false);
  const timerRef = useRef(null);
  const queryClient = useQueryClient();
  const today = format(new Date(), 'yyyy-MM-dd');

  const clearTimer = useCallback(() => {
    clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  const logWater = useCallback(async (ml) => {
    try {
      await waterLogRepository.create({ amount_ml: ml, date: today });
      queryClient.invalidateQueries({ queryKey: ['waterLogs'] });
      toast.success(text(`💧 +${ml} мл додано!`, `💧 +${ml} ml added!`));
      setShowInApp(false);
    } catch (error) {
      toast.error(error.message || text('Не вдалося додати воду', 'Could not add water'));
    }
  }, [queryClient, text, today]);

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      toast.error(text('Ваш браузер не підтримує сповіщення', 'Your browser does not support notifications'));
      return false;
    }
    const result = await Notification.requestPermission();
    setPermission(result);
    return result === 'granted';
  }, [text]);

  const sendNotification = useCallback(() => {
    const remaining = Math.max(goalMl - currentMl, 0);
    if (remaining <= 0) return;

    if (permission === 'granted') {
      const notification = new Notification(text('💧 Час попити воду!', '💧 Time to drink water!'), {
        body: text(`Залишилось: ${remaining} мл. Не забувай про гідратацію!`, `${remaining} ml left. Stay hydrated!`),
        icon: '/nutriai-icon.svg',
        tag: 'water-reminder',
        renotify: true,
        requireInteraction: false,
      });
      notification.onclick = () => {
        window.focus();
        setShowInApp(true);
      };
    } else {
      setShowInApp(true);
    }
  }, [currentMl, goalMl, permission, text]);

  const startTimer = useCallback((minutes) => {
    clearTimer();
    timerRef.current = setInterval(sendNotification, minutes * 60 * 1000);
  }, [clearTimer, sendNotification]);

  const toggleReminder = useCallback(async () => {
    if (!enabled) {
      if (permission !== 'granted') {
        const ok = await requestPermission();
        if (!ok) setShowInApp(true);
      }
      setEnabled(true);
      localStorage.setItem(ENABLED_KEY, 'true');
      startTimer(intervalMin);
      toast.success(text(`🔔 Нагадування кожні ${intervalMin} хв увімкнено`, `🔔 Reminder every ${intervalMin} min enabled`));
    } else {
      clearTimer();
      setEnabled(false);
      localStorage.setItem(ENABLED_KEY, 'false');
      toast(text('🔕 Нагадування вимкнено', '🔕 Reminder disabled'));
    }
  }, [clearTimer, enabled, intervalMin, permission, requestPermission, startTimer, text]);

  const changeInterval = useCallback((minutes) => {
    setIntervalMin(minutes);
    localStorage.setItem(INTERVAL_KEY, String(minutes));
    if (enabled) startTimer(minutes);
  }, [enabled, startTimer]);

  useEffect(() => {
    if (enabled) startTimer(intervalMin);
    return clearTimer;
  }, [clearTimer, enabled, intervalMin, startTimer]);

  return {
    enabled,
    intervalMin,
    showInApp,
    setShowInApp,
    logWater,
    toggleReminder,
    changeInterval,
    sendNotification,
  };
}
