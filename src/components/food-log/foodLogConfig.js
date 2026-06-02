import { Coffee, Cookie, Moon, Sparkles, Sun } from 'lucide-react';

export const MEAL_ORDER = [
  { key: 'breakfast', label: 'Сніданок', emoji: '🥐', Icon: Coffee, tone: 'bg-amber-100 text-amber-700 border-amber-200' },
  { key: 'snack1', label: 'Перекус 1', emoji: '🍓', Icon: Cookie, tone: 'bg-rose-100 text-rose-700 border-rose-200' },
  { key: 'lunch', label: 'Обід', emoji: '🍲', Icon: Sun, tone: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { key: 'snack2', label: 'Перекус 2', emoji: '🫐', Icon: Sparkles, tone: 'bg-sky-100 text-sky-700 border-sky-200' },
  { key: 'dinner', label: 'Вечеря', emoji: '🥗', Icon: Moon, tone: 'bg-violet-100 text-violet-700 border-violet-200' },
  { key: 'snack3', label: 'Перекус 3', emoji: '🍪', Icon: Cookie, tone: 'bg-orange-100 text-orange-700 border-orange-200' },
];

export const ADD_MEAL_OPTIONS = [
  { key: 'breakfast', label: 'Сніданок', emoji: '🥐' },
  { key: 'lunch', label: 'Обід', emoji: '🍲' },
  { key: 'dinner', label: 'Вечеря', emoji: '🥗' },
  { key: 'snack', label: 'Перекус', emoji: '🍪' },
];

export const ENGLISH_MEAL_LABELS = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};
