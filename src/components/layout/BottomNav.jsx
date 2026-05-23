import { Link, useLocation } from 'react-router-dom';
import { Home, MessageSquarePlus, Droplets, Trophy, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { haptic } from '@/lib/haptic';
import { useLanguage } from '@/lib/LanguageContext';

const navItems = [
  { path: '/', icon: Home, label: 'Головна' },
  { path: '/log', icon: MessageSquarePlus, label: 'Додати' },
  { path: '/water', icon: Droplets, label: 'Вода' },
  { path: '/gamification', icon: Trophy, label: 'Нагороди' },
  { path: '/profile', icon: User, label: 'Профіль' },
];

export default function BottomNav() {
  const location = useLocation();
  const { isEnglish } = useLanguage();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-card/90 backdrop-blur-xl border-t border-border"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="max-w-lg mx-auto flex items-center justify-around py-1.5 px-2">
        {navItems.map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path;
          const englishLabels = {
            'Головна': 'Home',
            'Додати': 'Add',
            'Вода': 'Water',
            'Нагороди': 'Rewards',
            'Профіль': 'Profile',
          };
          const visibleLabel = isEnglish ? englishLabels[label] : label;
          return (
            <Link
              key={path}
              to={path}
              onClick={() => haptic('light')}
              className={cn(
                'flex flex-col items-center gap-0.5 px-3 py-2 rounded-2xl select-none',
                'transition-all duration-150 active:scale-90 active:bg-muted',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground'
              )}
            >
              <div className={cn(
                'w-10 h-6 flex items-center justify-center rounded-full transition-all duration-200',
                isActive && 'bg-primary/15'
              )}>
                <Icon className={cn('w-5 h-5', isActive && 'stroke-[2.5px]')} />
              </div>
              <span className={cn('text-[10px] font-semibold', isActive && 'text-primary')}>
                {visibleLabel}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
