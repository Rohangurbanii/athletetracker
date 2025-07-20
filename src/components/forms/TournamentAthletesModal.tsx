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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-background rounded-lg shadow-lg w-full max-w-2xl max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-2">
            <Users className="h-5 w-5 text-primary" />
            <div>
              <h2 className="text-lg font-semibold">Participating Athletes</h2>
              <p className="text-sm text-muted-foreground">{tournamentName}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 bg-muted rounded-full"></div>
                      <div className="space-y-2 flex-1">
                        <div className="h-4 bg-muted rounded w-1/3"></div>
                        <div className="h-3 bg-muted rounded w-1/2"></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : athletes.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Athletes Participating</h3>
              <p className="text-muted-foreground">
                No athletes have signed up for this tournament yet.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-muted-foreground">
                  {athletes.length} athlete{athletes.length !== 1 ? 's' : ''} participating
                </h3>
                <Badge variant="secondary">
                  {athletes.length} confirmed
                </Badge>
              </div>
              
              <div className="space-y-3">
                {athletes.map((athlete) => (
                  <Card key={athlete.id} className="sport-card">
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium">{athlete.profiles.full_name}</h4>
                          <p className="text-sm text-muted-foreground">{athlete.profiles.email}</p>
                        </div>
                        <Badge className="bg-green-500/20 text-green-400">
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

        <div className="flex justify-end p-6 border-t">
          <Button onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};