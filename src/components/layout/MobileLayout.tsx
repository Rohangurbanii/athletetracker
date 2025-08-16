import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { BottomNavigation } from './BottomNavigation';
import { MobileHeader } from './MobileHeader';

export const MobileLayout = () => {
  useEffect(() => {
    let mounted = true;
    
    const preloadModules = async () => {
      try {
        if (!mounted) return;
        
        const idle = (cb: () => void) => {
          const ric = (window as any).requestIdleCallback;
          if (typeof ric === 'function') {
            ric(cb, { timeout: 5000 });
          } else {
            setTimeout(cb, 100);
          }
        };
        
        idle(() => {
          if (!mounted) return;
          
          // Preload critical pages first
          Promise.all([
            import('@/pages/Dashboard'),
            import('@/pages/Practice'),
            import('@/pages/Sleep'),
          ]).then(() => {
            if (!mounted) return;
            
            // Then preload secondary pages
            Promise.all([
              import('@/pages/Tournaments'),
              import('@/pages/Progress'),
              import('@/components/forms/LogSessionForm'),
              import('@/components/forms/LogSleepForm'),
              import('@/components/forms/SetGoalForm'),
              import('@/components/forms/SchedulePracticeForm'),
            ]);
          });
        });
      } catch (error) {
        console.error('Module preload error:', error);
      }
    };

    preloadModules();
    
    return () => {
      mounted = false;
    };
  }, []);
  return (
    <div className="mobile-container">
      <MobileHeader />
      <main className="mobile-content space-y-6">
        <Outlet />
      </main>
      <BottomNavigation />
    </div>
  );
};