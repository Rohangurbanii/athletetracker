import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X, Users, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Athlete {
  id: string;
  profile_id: string;
  profiles: {
    full_name: string;
    email: string;
  };
}

interface TournamentAthletesModalProps {
  tournamentId: string;
  tournamentName: string;
  onClose: () => void;
}

export const TournamentAthletesModal = ({ tournamentId, tournamentName, onClose }: TournamentAthletesModalProps) => {
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchParticipatingAthletes();
  }, [tournamentId]);

  const fetchParticipatingAthletes = async () => {
    try {
      setLoading(true);
      
      // First get the participating athlete IDs
      const { data: participationData } = await supabase
        .from('tournament_participation')
        .select('athlete_id')
        .eq('tournament_id', tournamentId)
        .eq('is_participating', true);

      if (participationData && participationData.length > 0) {
        const athleteIds = participationData.map(p => p.athlete_id);
        
        // Then get the athlete details with profiles
        const { data: athletesData } = await supabase
          .from('athletes')
          .select(`
            id,
            profile_id,
            profiles:profile_id(
              full_name,
              email
            )
          `)
          .in('id', athleteIds);

        if (athletesData) {
          setAthletes(athletesData as Athlete[]);
        }
      }
    } catch (error) {
      console.error('Error fetching participating athletes:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-2 sm:p-4 z-50">
      <div className="bg-background rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] sm:max-h-[80vh] overflow-hidden m-2">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b">
          <div className="flex items-center space-x-2 min-w-0 flex-1">
            <Users className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-semibold truncate">Participating Athletes</h2>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">{tournamentName}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 touch-target flex-shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto max-h-[60vh] sm:max-h-[65vh]">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-center space-x-3">
                      <div className="h-8 w-8 sm:h-10 sm:w-10 bg-muted rounded-full"></div>
                      <div className="space-y-2 flex-1">
                        <div className="h-3 sm:h-4 bg-muted rounded w-1/3"></div>
                        <div className="h-2 sm:h-3 bg-muted rounded w-1/2"></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : athletes.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <Users className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-3 sm:mb-4" />
              <h3 className="text-base sm:text-lg font-semibold mb-2">No Athletes Participating</h3>
              <p className="text-sm text-muted-foreground px-4">
                No athletes have signed up for this tournament yet.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs sm:text-sm font-medium text-muted-foreground">
                  {athletes.length} athlete{athletes.length !== 1 ? 's' : ''} participating
                </h3>
                <Badge variant="secondary" className="text-xs">
                  {athletes.length} confirmed
                </Badge>
              </div>
              
              <div className="space-y-2 sm:space-y-3">
                {athletes.map((athlete) => (
                  <Card key={athlete.id} className="sport-card">
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex items-center space-x-3">
                        <div className="h-8 w-8 sm:h-10 sm:w-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                          <User className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm sm:text-base truncate">{athlete.profiles.full_name}</h4>
                          <p className="text-xs sm:text-sm text-muted-foreground truncate">
                            {athlete.profiles.email || 'Contact details protected'}
                          </p>
                        </div>
                        <Badge className="bg-green-500/20 text-green-400 text-xs flex-shrink-0">
                          Participating
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end p-4 sm:p-6 border-t">
          <Button onClick={onClose} className="touch-target">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};