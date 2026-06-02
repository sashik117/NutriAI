import { useState } from 'react';

const STORAGE_KEY = 'nutriai_onboarding_done';

export function useOnboardingSlides(totalSlides) {
  const [visible, setVisible] = useState(() => localStorage.getItem(STORAGE_KEY) !== 'true');
  const [index, setIndex] = useState(0);

  const close = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setVisible(false);
  };

  const next = () => {
    if (index >= totalSlides - 1) {
      close();
      return;
    }
    setIndex((current) => current + 1);
  };

  return {
    visible,
    index,
    close,
    next,
  };
}
