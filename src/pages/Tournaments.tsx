import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trophy, Calendar, MapPin, Plus, Star } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type Tournament = Database['public']['Tables']['tournaments']['Row'];
type TournamentResult = Database['public']['Tables']['tournament_results']['Row'] & {
  tournament: Tournament;
};

type UpcomingTournament = Tournament;
type CompletedTournament = TournamentResult;

export const Tournaments = () => {
  const { profile } = useAuth();
  const isCoach = profile?.role === 'coach';

  const [activeTab, setActiveTab] = useState<'upcoming' | 'completed'>('upcoming');
  const [upcomingTournaments, setUpcomingTournaments] = useState<UpcomingTournament[]>([]);
  const [completedTournaments, setCompletedTournaments] = useState<CompletedTournament[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTournaments();
  }, [profile]);

  const fetchTournaments = async () => {
    if (!profile) return;

    try {
      setLoading(true);

      // Fetch upcoming tournaments
      const { data: upcomingData } = await supabase
        .from('tournaments')
        .select('*')
        .gte('start_date', new Date().toISOString().split('T')[0])
        .order('start_date', { ascending: true });

      // Fetch completed tournaments with results for the current athlete
      const { data: completedData } = await supabase
        .from('tournament_results')
        .select(`
          *,
          tournament:tournaments(*)
        `)
        .eq('athlete_id', profile.id)
        .order('created_at', { ascending: false });

      setUpcomingTournaments(upcomingData || []);
      setCompletedTournaments(completedData || []);
    } catch (error) {
      console.error('Error fetching tournaments:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, index) => (
      <Star
        key={index}
        className={`h-4 w-4 ${
          index < rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'
        }`}
      />
    ));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tournaments</h1>
          <p className="text-muted-foreground">
            {isCoach ? 'Manage tournament schedules and results' : 'Track your competition journey'}
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-muted p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('upcoming')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'upcoming'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Upcoming
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'completed'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Completed
        </button>
      </div>

      {/* Upcoming Tournaments */}
      {activeTab === 'upcoming' && (
        <div className="space-y-4">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="sport-card animate-pulse">
                  <CardHeader className="pb-3">
                    <div className="h-6 bg-muted rounded mb-2"></div>
                    <div className="h-4 bg-muted rounded w-1/2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-4 bg-muted rounded mb-4"></div>
                    <div className="flex space-x-2">
                      <div className="h-8 bg-muted rounded w-20"></div>
                      <div className="h-8 bg-muted rounded w-32"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            upcomingTournaments.map((tournament) => (
              <Card key={tournament.id} className="sport-card">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <CardTitle className="text-lg">{tournament.name}</CardTitle>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <span className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          {new Date(tournament.start_date).toLocaleDateString()} 
                          {tournament.end_date !== tournament.start_date && 
                            ` - ${new Date(tournament.end_date).toLocaleDateString()}`
                          }
                        </span>
                        {tournament.location && (
                          <span className="flex items-center">
                            <MapPin className="h-4 w-4 mr-1" />
                            {tournament.location}
                          </span>
                        )}
                      </div>
                    </div>
                    <Badge 
                      className={
                        tournament.status === 'registered' 
                          ? 'bg-green-500/20 text-green-400' 
                          : 'bg-blue-500/20 text-blue-400'
                      }
                    >
                      {tournament.status || 'available'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {tournament.description && (
                    <p className="text-sm text-muted-foreground mb-4">{tournament.description}</p>
                  )}
                  <div className="flex space-x-2">
                    {tournament.status === 'available' ? (
                      <Button className="gradient-primary text-primary-foreground">
                        Register
                      </Button>
                    ) : (
                      <Button variant="outline">
                        View Details
                      </Button>
                    )}
                    <Button variant="outline">
                      <Calendar className="h-4 w-4 mr-2" />
                      Add to Calendar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Completed Tournaments */}
      {activeTab === 'completed' && (
        <div className="space-y-4">
          {loading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <Card key={i} className="sport-card animate-pulse">
                  <CardHeader className="pb-3">
                    <div className="h-6 bg-muted rounded mb-2"></div>
                    <div className="h-4 bg-muted rounded w-1/2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="h-16 bg-muted rounded"></div>
                        <div className="h-16 bg-muted rounded"></div>
                      </div>
                      <div className="h-20 bg-muted rounded"></div>
                      <div className="h-20 bg-muted rounded"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            completedTournaments.map((result) => (
              <Card key={result.id} className="sport-card">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <CardTitle className="text-lg">{result.tournament.name}</CardTitle>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <span className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          {new Date(result.tournament.start_date).toLocaleDateString()}
                        </span>
                        {result.tournament.location && (
                          <span className="flex items-center">
                            <MapPin className="h-4 w-4 mr-1" />
                            {result.tournament.location}
                          </span>
                        )}
                      </div>
                    </div>
                    <Badge className="bg-yellow-500/20 text-yellow-400">
                      <Trophy className="h-3 w-3 mr-1" />
                      {result.result}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Key Learnings */}
                    {result.key_learnings && (
                      <div className="stat-card">
                        <p className="text-sm text-muted-foreground mb-2">Key Learnings</p>
                        <p className="text-sm">{result.key_learnings}</p>
                      </div>
                    )}

                    {/* Improvement Areas */}
                    {result.improvement_areas && (
                      <div className="stat-card">
                        <p className="text-sm text-muted-foreground mb-2">Areas for Improvement</p>
                        <p className="text-sm">{result.improvement_areas}</p>
                      </div>
                    )}

                    {/* Notes */}
                    {result.athlete_notes && (
                      <div className="stat-card">
                        <p className="text-sm text-muted-foreground mb-2">Athlete Notes</p>
                        <p className="text-sm">{result.athlete_notes}</p>
                      </div>
                    )}

                    {result.coach_notes && (
                      <div className="stat-card">
                        <p className="text-sm text-muted-foreground mb-2">Coach Notes</p>
                        <p className="text-sm">{result.coach_notes}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Empty States */}
      {!loading && activeTab === 'upcoming' && upcomingTournaments.length === 0 && (
        <Card className="sport-card">
          <CardContent className="text-center py-12">
            <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No upcoming tournaments</h3>
            <p className="text-muted-foreground mb-4">
              Explore available tournaments and register for competitions
            </p>
            <Button className="gradient-primary text-primary-foreground">
              <Plus className="h-4 w-4 mr-2" />
              Find Tournaments
            </Button>
          </CardContent>
        </Card>
      )}

      {!loading && activeTab === 'completed' && completedTournaments.length === 0 && (
        <Card className="sport-card">
          <CardContent className="text-center py-12">
            <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No completed tournaments</h3>
            <p className="text-muted-foreground">
              Your tournament results will appear here after you compete
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};