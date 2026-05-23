import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, ListChecks, Sparkles } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';

const slides = [
  {
    icon: Camera,
    title: 'Фоткайте їжу',
    text: 'Наведіть камеру на тарілку, і Gemini розпізнає страви та порції.',
  },
  {
    icon: Sparkles,
    title: 'Ми рахуємо КБЖУ',
    text: 'Білки, жири, вуглеводи, калорії, грами і мілілітри збираються в один зрозумілий прийом їжі.',
  },
  {
    icon: ListChecks,
    title: 'Складаємо покупки',
    text: 'Обирайте страви в плані, а NutriAI збере список продуктів без зайвого шуму.',
  },
];

export default function OnboardingSlides() {
  const { isEnglish, text } = useLanguage();
  const [visible, setVisible] = useState(() => localStorage.getItem('nutriai_onboarding_done') !== 'true');
  const [index, setIndex] = useState(0);

  if (!visible) return null;

  const slide = slides[index];
  const englishSlides = [
    { title: 'Scan food', text: 'Point the camera at your plate and Gemini detects meals and portions.' },
    { title: 'We calculate macros', text: 'Protein, fats, carbs, calories, grams, and milliliters are grouped into one clear meal entry.' },
    { title: 'Build shopping lists', text: 'Choose meals in the plan and NutriAI turns them into a clean grocery list.' },
  ];
  const visibleSlide = isEnglish ? englishSlides[index] : slide;
  const Icon = slide.icon;
  const close = () => {
    localStorage.setItem('nutriai_onboarding_done', 'true');
    setVisible(false);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-background/90 p-5 backdrop-blur-md">
      <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-5 text-center shadow-2xl">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <Icon className="h-7 w-7 text-primary" />
        </div>
        <p className="text-xl font-extrabold">{visibleSlide.title}</p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{visibleSlide.text}</p>
        <div className="mt-5 flex justify-center gap-1.5">
          {slides.map((item, dotIndex) => (
            <span key={item.title} className={`h-2 rounded-full transition-all ${dotIndex === index ? 'w-6 bg-primary' : 'w-2 bg-muted'}`} />
          ))}
        </div>
        <div className="mt-5 flex gap-2">
          <Button variant="outline" className="flex-1 rounded-xl" onClick={close}>{text('Пропустити', 'Skip')}</Button>
          <Button
            className="flex-1 rounded-xl"
            onClick={() => {
              if (index === slides.length - 1) close();
              else setIndex((current) => current + 1);
            }}
          >
            {index === slides.length - 1 ? text('Почати', 'Start') : text('Далі', 'Next')}
          </Button>
        </div>
      </div>
    </div>
  );
}
