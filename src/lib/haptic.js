import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

export function haptic(style = 'light') {
  if (Capacitor.isNativePlatform()) {
    const impactStyles = {
      light: ImpactStyle.Light,
      medium: ImpactStyle.Medium,
      heavy: ImpactStyle.Heavy,
    };

    if (impactStyles[style]) {
      Haptics.impact({ style: impactStyles[style] }).catch(() => {});
      return;
    }

    if (style === 'success' || style === 'error') {
      Haptics.notification({
        type: style === 'success' ? NotificationType.Success : NotificationType.Error,
      }).catch(() => {});
      return;
    }
  }

  if (typeof navigator === 'undefined' || !navigator.vibrate) return;

  const patterns = {
    light: [10],
    medium: [20],
    heavy: [30],
    success: [10, 50, 10],
    error: [50, 30, 50],
  };

  navigator.vibrate(patterns[style] || patterns.light);
}
