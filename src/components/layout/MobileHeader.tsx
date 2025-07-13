import { Bell, Search, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

export const MobileHeader = () => {
  const { profile, signOut } = useAuth();

  return (
    <div className="mobile-header">
      <div className="flex items-center space-x-3">
        <div className="gradient-primary w-10 h-10 rounded-full flex items-center justify-center">
          <span className="text-primary-foreground font-bold text-lg">S</span>
        </div>
        <div>
          <h1 className="text-lg font-bold">SportSync</h1>
          <p className="text-xs text-muted-foreground capitalize">
            {profile?.role} Dashboard
          </p>
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
        <Button variant="ghost" size="icon" className="h-10 w-10">
          <Search className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-10 w-10">
          <Bell className="h-5 w-5" />
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-10 w-10"
          onClick={signOut}
        >
          <User className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};