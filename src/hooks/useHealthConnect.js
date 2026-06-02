import { useEffect, useState } from 'react';
import {
  buildActivityPayload,
  clearStoredActivity,
  readStoredActivity,
  stepsToCalories,
  storeActivity,
} from '@/domain/health/activityModel';

export function useHealthConnect({ onActivityUpdate, weightKg = 70 }) {
  const [connected, setConnected] = useState(false);
  const [activity, setActivity] = useState(null);
  const [manualSteps, setManualSteps] = useState('');
  const [showManual, setShowManual] = useState(false);

  const applyActivity = (data) => {
    setActivity(data);
    storeActivity(data);
    setConnected(true);
    onActivityUpdate?.(data.active_calories || 0);
  };

  useEffect(() => {
    const stored = readStoredActivity();
    if (stored) {
      setActivity(stored);
      setConnected(true);
      onActivityUpdate?.(stored.active_calories || 0);
    }
  }, [onActivityUpdate]);

  const tryNativeConnect = async () => {
    if (navigator.health) {
      try {
        await navigator.health.requestPermission(['steps', 'activeCalories']);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const steps = await navigator.health.query({ type: 'steps', startDate: today, endDate: new Date() });
        applyActivity(buildActivityPayload(steps?.total || 0, weightKg, 'HealthConnect'));
        return true;
      } catch {
        return false;
      }
    }
    return false;
  };

  const handleConnect = async () => {
    const ok = await tryNativeConnect();
    if (!ok) setShowManual(true);
  };

  const handleManualSubmit = () => {
    applyActivity(buildActivityPayload(manualSteps, weightKg, 'manual'));
    setShowManual(false);
    setManualSteps('');
  };

  const reset = () => {
    clearStoredActivity();
    setActivity(null);
    setConnected(false);
    onActivityUpdate?.(0);
  };

  return {
    connected,
    activity,
    manualSteps,
    setManualSteps,
    showManual,
    handleConnect,
    handleManualSubmit,
    reset,
    estimatedManualCalories: stepsToCalories(parseInt(manualSteps, 10) || 0, weightKg),
  };
}
