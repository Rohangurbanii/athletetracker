import { Link, useLocation } from 'react-router-dom';
import { Home, Calendar, Moon, Trophy, BarChart3, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

const navigationItems = [
  { href: '/dashboard', icon: Home, label: 'Home' },
  { href: '/practice', icon: Calendar, label: 'Practice' },
  { href: '/sleep', icon: Moon, label: 'Sleep' },
  { href: '/tournaments', icon: Trophy, label: 'Tournaments' },
  { href: '/analytics', icon: BarChart3, label: 'Analytics' },
  { href: '/progress', icon: Target, label: 'Progress' },
];

export const BottomNavigation = () => {
  const location = useLocation();

  return (
    <div className="mobile-bottom-nav">
      <nav className="flex items-center justify-around py-2 px-4">
        {navigationItems.map((item) => {
          const isActive = location.pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                'flex flex-col items-center space-y-1 py-2 px-3 rounded-lg transition-all duration-200',
                isActive 
                  ? 'bg-primary/20 text-primary' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
              )}
            >
              <Icon className={cn('h-5 w-5', isActive && 'scale-110')} />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
};