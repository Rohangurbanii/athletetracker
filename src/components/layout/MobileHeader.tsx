import { Bell, Search, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

export const MobileHeader = () => {
  const { profile, signOut } = useAuth();

  return (
    <div className="mobile-header">
      <div className="flex items-center space-x-2 flex-1 min-w-0">
        <div className="gradient-primary w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center flex-shrink-0">
          <span className="text-primary-foreground font-bold text-sm sm:text-lg">S</span>
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-base sm:text-lg font-bold truncate">SportSync</h1>
          <p className="text-xs text-muted-foreground capitalize truncate">
            {profile?.role} Dashboard
          </p>
        </div>
      </div>
      
      <div className="flex items-center space-x-1 flex-shrink-0">
        <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10 touch-target">
          <Search className="h-4 w-4 sm:h-5 sm:w-5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10 touch-target">
          <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 sm:h-10 sm:w-10 touch-target"
          onClick={signOut}
        >
          <User className="h-4 w-4 sm:h-5 sm:w-5" />
        </Button>
      </div>
    </div>
  );
};