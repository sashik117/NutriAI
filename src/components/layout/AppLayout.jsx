import { Outlet } from 'react-router-dom';
import BottomNav from './BottomNav';

export default function AppLayout() {
  return (
    <div
      className="min-h-screen min-h-dvh bg-background font-nunito"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <main className="mx-auto max-w-[390px] px-4 pb-32">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
