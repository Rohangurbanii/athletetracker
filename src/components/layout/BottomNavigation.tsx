import { Link, useLocation } from 'react-router-dom';
import { Home, Calendar, Moon, Trophy, BarChart3, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

const navigationItems = [
  { href: '/dashboard', icon: Home, label: 'Home' },
  { href: '/practice', icon: Calendar, label: 'Practice' },
  { href: '/sleep', icon: Moon, label: 'Sleep' },
  { href: '/tournaments', icon: Trophy, label: 'Tournaments' },
  { href: '/progress', icon: Target, label: 'Progress' },
]; 
const prefetch = (href: string) => {
  switch (href) {
    case '/dashboard': import('@/pages/Dashboard'); break;
    case '/practice': import('@/pages/Practice'); break;
    case '/sleep': import('@/pages/Sleep'); break;
    case '/tournaments': import('@/pages/Tournaments'); break;
    case '/progress': import('@/pages/Progress'); break;
  }
};

export const BottomNavigation = () => {
  const location = useLocation();

  return (
    <div className="mobile-bottom-nav">
      <nav className="flex items-center justify-around py-2 px-2 safe-area-padding">
        {navigationItems.map((item) => {
          const isActive = location.pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              to={item.href}
              onMouseEnter={() => prefetch(item.href)}
              onTouchStart={() => prefetch(item.href)}
              className={cn(
                'flex flex-col items-center justify-center space-y-1 py-2 px-2 rounded-lg transition-all duration-200 min-h-[44px] min-w-[44px]',
                isActive 
                  ? 'bg-primary/20 text-primary scale-105' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
              )}
            >
              <Icon className={cn('h-4 w-4 sm:h-5 sm:w-5', isActive && 'scale-110')} />
              <span className="text-xs font-medium leading-tight">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
};