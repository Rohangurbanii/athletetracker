import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { BottomNavigation } from './BottomNavigation';
import { MobileHeader } from './MobileHeader';

export const MobileLayout = () => {
  useEffect(() => {
    const idle = (cb: () => void) => {
      const ric = (window as any).requestIdleCallback;
      if (typeof ric === 'function') {
        ric(cb);
      } else {
        setTimeout(cb, 0);
      }
    };
    idle(() => {
      // Slight delay to avoid competing with initial paint
      setTimeout(() => {
        import('@/pages/Dashboard');
        import('@/pages/Practice');
        import('@/pages/Sleep');
        import('@/pages/Tournaments');
        import('@/pages/Progress');
      }, 1200);
    });
  }, []);
  return (
    <div className="mobile-container">
      <MobileHeader />
      <main className="mobile-content">
        <Outlet />
      </main>
      <BottomNavigation />
    </div>
  );
};