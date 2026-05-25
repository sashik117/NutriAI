import { useEffect, useState } from 'react';
import { useLanguage } from '@/lib/LanguageContext';

const SPLASH_STORAGE_KEY = 'nutriai:splash-seen';

function hasSeenSplash() {
  try {
    return window.sessionStorage.getItem(SPLASH_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export default function SplashScreen() {
  const { text } = useLanguage();
  const [visible, setVisible] = useState(() => !hasSeenSplash());

  useEffect(() => {
    if (!visible) return undefined;

    try {
      window.sessionStorage.setItem(SPLASH_STORAGE_KEY, '1');
    } catch {
      // Storage can be blocked in private modes; the timer still hides the splash.
    }

    const timer = window.setTimeout(() => setVisible(false), 950);
    const fallbackTimer = window.setTimeout(() => setVisible(false), 1600);

    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(fallbackTimer);
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="nutriai-splash fixed inset-0 z-[999] flex flex-col items-center justify-center gap-4 bg-primary">
      <div className="nutriai-splash-logo flex flex-col items-center gap-3">
        <div className="flex h-24 w-24 items-center justify-center rounded-[28px] bg-white/20 shadow-lg shadow-emerald-900/10">
          <img src="/nutriai-icon.svg" alt="" className="h-16 w-16" />
        </div>
        <div className="text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-white">NutriAI</h1>
          <p className="mt-1 text-sm font-medium text-white/75">
            {text('КБЖУ трекер з ШІ', 'AI nutrition tracker')}
          </p>
        </div>
      </div>
      <div className="mt-4 flex gap-1.5">
        {[0, 1, 2].map((item) => (
          <span
            key={item}
            className="nutriai-splash-dot h-2 w-2 rounded-full bg-white/65"
            style={{ animationDelay: `${item * 0.16}s` }}
          />
        ))}
      </div>
    </div>
  );
}
