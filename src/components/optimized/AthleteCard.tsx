import { memo, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User, TrendingUp, Activity } from 'lucide-react';

interface Athlete {
  id: string;
  name: string;
  email?: string;
  status?: string;
  lastActivity?: string;
  avgRpe?: number;
  totalSessions?: number;
}

interface AthleteCardProps {
  athlete: Athlete;
  onSelect?: (athleteId: string) => void;
  onViewProfile?: (athleteId: string) => void;
  selected?: boolean;
}

export const AthleteCard = memo(({ athlete, onSelect, onViewProfile, selected = false }: AthleteCardProps) => {
  const handleSelect = useCallback(() => {
    onSelect?.(athlete.id);
  }, [athlete.id, onSelect]);

  const handleViewProfile = useCallback(() => {
    onViewProfile?.(athlete.id);
  }, [athlete.id, onViewProfile]);

  return (
    <Card 
      className={`sport-card cursor-pointer transition-all ${
        selected ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/50'
      }`}
      onClick={handleSelect}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="gradient-primary p-2 rounded-full">
              <User className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <h3 className="font-semibold">{athlete.name}</h3>
              {athlete.email && (
                <p className="text-sm text-muted-foreground">{athlete.email}</p>
              )}
            </div>
          </div>
          
          <div className="flex flex-col gap-2">
            {athlete.status && (
              <Badge variant={athlete.status === 'active' ? 'default' : 'secondary'}>
                {athlete.status}
              </Badge>
            )}
            {selected && (
              <Badge className="bg-primary/20 text-primary">
                Selected
              </Badge>
            )}
          </div>
        </div>

        {/* Stats */}
        {(athlete.avgRpe || athlete.totalSessions) && (
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border/50">
            {athlete.avgRpe && (
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  Avg RPE: <span className="font-medium">{athlete.avgRpe}</span>
                </span>
              </div>
            )}
            {athlete.totalSessions && (
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  Sessions: <span className="font-medium">{athlete.totalSessions}</span>
                </span>
              </div>
            )}
          </div>
        )}

        {/* Last Activity */}
        {athlete.lastActivity && (
          <div className="mt-2">
            <p className="text-xs text-muted-foreground">
              Last activity: {athlete.lastActivity}
            </p>
          </div>
        )}

        {/* Actions */}
        {onViewProfile && (
          <div className="mt-3">
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                handleViewProfile();
              }}
              className="w-full"
            >
              View Profile
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

AthleteCard.displayName = 'AthleteCard';

export default AthleteCard;