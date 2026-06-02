import { ClipboardList, Flame } from 'lucide-react';
import { Link } from 'react-router-dom';

function QuickLink({ children, to }) {
  return (
    <Link to={to} className="min-w-0">
      {children}
    </Link>
  );
}

export default function DashboardQuickLinks({ text }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <QuickLink to="/gamification">
        <div className="flex h-full items-center gap-2 rounded-2xl border border-orange-200/50 bg-orange-50 p-3 dark:border-orange-700/30 dark:bg-orange-900/20">
          <Flame className="h-5 w-5 shrink-0 text-orange-500" />
          <div className="min-w-0">
            <p className="truncate text-xs font-bold text-orange-700 dark:text-orange-400">{text('Серія', 'Streak')}</p>
            <p className="truncate text-[10px] text-muted-foreground">{text('Нагороди', 'Rewards')}</p>
          </div>
        </div>
      </QuickLink>
      <QuickLink to="/meal-plan">
        <div className="flex h-full items-center gap-2 rounded-2xl border border-primary/20 bg-primary/5 p-3">
          <ClipboardList className="h-5 w-5 shrink-0 text-primary" />
          <div className="min-w-0">
            <p className="truncate text-xs font-bold text-primary">{text('План ШІ', 'AI Plan')}</p>
            <p className="truncate text-[10px] text-muted-foreground">{text('На тиждень', 'Weekly')}</p>
          </div>
        </div>
      </QuickLink>
      <QuickLink to="/weight">
        <div className="flex h-full items-center gap-2 rounded-2xl border border-chart-3/20 bg-chart-3/10 p-3">
          <span className="shrink-0 text-base">⚖️</span>
          <div className="min-w-0">
            <p className="truncate text-xs font-bold">{text('Вага', 'Weight')}</p>
            <p className="truncate text-[10px] text-muted-foreground">{text('Графік', 'Chart')}</p>
          </div>
        </div>
      </QuickLink>
    </div>
  );
}
