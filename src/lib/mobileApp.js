import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

export function initNativeAppControls() {
  if (!Capacitor.isNativePlatform()) return;

  CapacitorApp.addListener('backButton', () => {
    if (window.location.pathname !== '/') {
      window.history.back();
      return;
    }

    CapacitorApp.exitApp();
  }).catch(() => {});
}
