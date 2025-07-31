import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trophy, Calendar, MapPin, Plus, Star, Users, User } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { AddTournamentForm } from '@/components/forms/AddTournamentForm';
import { ParticipationDropdown } from '@/components/forms/ParticipationDropdown';
import { TournamentAthletesModal } from '@/components/forms/TournamentAthletesModal';
import { TournamentResultsForm } from '@/components/forms/TournamentResultsForm';
import { TournamentCommentsModal } from '@/components/forms/TournamentCommentsModal';

type Tournament = Database['public']['Tables']['tournaments']['Row'];
type TournamentResult = Database['public']['Tables']['tournament_results']['Row'] & {
  tournament: Tournament;
  athlete?: {
    id: string;
    profile: {
      full_name: string;
    };
  };
};

type UpcomingTournament = Tournament;
type CompletedTournament = TournamentResult;

type CompletedTournamentWithAthletes = {
  tournament: Tournament;
  athletes: Array<{
    id: string;
    name: string;
    result: TournamentResult;
  }>;
};

export const Tournaments = () => {
  const { profile } = useAuth();
  const isCoach = profile?.role === 'coach';
  const isAthlete = profile?.role === 'athlete';

  const [activeTab, setActiveTab] = useState<'upcoming' | 'completed'>('upcoming');
  const [upcomingTournaments, setUpcomingTournaments] = useState<UpcomingTournament[]>([]);
  const [completedTournaments, setCompletedTournaments] = useState<CompletedTournament[]>([]);
  const [completedTournamentsWithAthletes, setCompletedTournamentsWithAthletes] = useState<CompletedTournamentWithAthletes[]>([]);
  const [selectedCompletedTournament, setSelectedCompletedTournament] = useState<string>('');
  const [selectedAthlete, setSelectedAthlete] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState<{ id: string; name: string } | null>(null);
  const [showResultsForm, setShowResultsForm] = useState<{ id: string; name: string } | null>(null);
  const [showCommentsModal, setShowCommentsModal] = useState<{ id: string; name: string } | null>(null);
  const [athleteResults, setAthleteResults] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchTournaments();
  }, [profile]);

  const fetchTournaments = async () => {
    if (!profile) return;

    try {
      setLoading(true);

      // For coaches, we need to show tournaments they can still comment on, regardless of date
      // For athletes, only show future tournaments
      let upcomingQuery = supabase
        .from('tournaments')
        .select('*');

      if (isAthlete) {
        // Athletes only see future tournaments
        upcomingQuery = upcomingQuery.gte('start_date', new Date().toISOString().split('T')[0]);
      }
      
      upcomingQuery = upcomingQuery.order('start_date', { ascending: true });

      // If athlete, exclude tournaments they have submitted results for
      if (isAthlete && profile) {
        const { data: athleteData } = await supabase
          .from('athletes')
          .select('id')
          .eq('profile_id', profile.id)
          .single();

        if (athleteData) {
          const { data: resultsData } = await supabase
            .from('tournament_results')
            .select('tournament_id')
            .eq('athlete_id', athleteData.id)
            .not('athlete_completed_at', 'is', null);

          const completedTournamentIds = (resultsData || []).map(r => r.tournament_id);

          // Exclude completed tournaments from upcoming list
          if (completedTournamentIds.length > 0) {
            upcomingQuery = upcomingQuery.not('id', 'in', `(${completedTournamentIds.join(',')})`);
          }

          const resultsMap = (resultsData || []).reduce((acc, result) => {
            acc[result.tournament_id] = true;
            return acc;
          }, {} as Record<string, boolean>);
          
          setAthleteResults(resultsMap);
        }
      }

      // If coach, exclude tournaments they have completed commenting on
      if (isCoach && profile) {
        const { data: coachData } = await supabase
          .from('coaches')
          .select('id')
          .eq('profile_id', profile.id)
          .single();

        if (coachData) {
          // Get batch athlete IDs for this coach
          const { data: batchData } = await supabase
            .from('batches')
            .select('id')
            .eq('coach_id', coachData.id);

          const batchIds = batchData?.map(b => b.id) || [];

          const { data: batchAthleteData } = await supabase
            .from('batch_athletes')
            .select('athlete_id')
            .in('batch_id', batchIds);

          const athleteIds = batchAthleteData?.map(ba => ba.athlete_id) || [];

          // Get tournaments where coach has completed commenting
          const { data: completedCommentsData } = await supabase
            .from('tournament_results')
            .select('tournament_id')
            .not('coach_completed_at', 'is', null)
            .in('athlete_id', athleteIds);

          const completedTournamentIds = [...new Set((completedCommentsData || []).map(r => r.tournament_id))];

          // Exclude completed tournaments from upcoming list
          if (completedTournamentIds.length > 0) {
            upcomingQuery = upcomingQuery.not('id', 'in', `(${completedTournamentIds.join(',')})`);
          }
        }
      }

      const { data: upcomingData } = await upcomingQuery;

      // Fetch completed tournaments with results for the current user
      let completedData = [];
      
      if (isAthlete) {
        // For athletes, get tournaments they have submitted results for
        const { data: athleteData } = await supabase
          .from('athletes')
          .select('id')
          .eq('profile_id', profile.id)
          .single();

        if (athleteData) {
          const { data } = await supabase
            .from('tournament_results')
            .select(`
              *,
              tournament:tournaments(*)
            `)
            .eq('athlete_id', athleteData.id)
            .not('athlete_completed_at', 'is', null)
            .order('created_at', { ascending: false });
          completedData = data || [];
        }
      } else if (isCoach) {
        // For coaches, get tournaments with athlete details where they have completed commenting
        const { data: coachData } = await supabase
          .from('coaches')
          .select('id')
          .eq('profile_id', profile.id)
          .single();

        if (coachData) {
          // Get batch athlete IDs for this coach
          const { data: batchData } = await supabase
            .from('batches')
            .select('id')
            .eq('coach_id', coachData.id);

          const batchIds = batchData?.map(b => b.id) || [];

          const { data: batchAthleteData } = await supabase
            .from('batch_athletes')
            .select('athlete_id')
            .in('batch_id', batchIds);

          const athleteIds = batchAthleteData?.map(ba => ba.athlete_id) || [];

          // Get tournaments with detailed athlete and profile information
          const { data } = await supabase
            .from('tournament_results')
            .select(`
              *,
              tournament:tournaments(*),
              athlete:athletes(
                id,
                profile:profiles(
                  id,
                  full_name
                )
              )
            `)
            .not('coach_completed_at', 'is', null)
            .in('athlete_id', athleteIds)
            .order('created_at', { ascending: false });

          // Group results by tournament
          const tournamentsWithAthletes: CompletedTournamentWithAthletes[] = [];
          const tournamentMap = new Map<string, CompletedTournamentWithAthletes>();

          data?.forEach(result => {
            const tournamentId = result.tournament.id;
            if (!tournamentMap.has(tournamentId)) {
              tournamentMap.set(tournamentId, {
                tournament: result.tournament,
                athletes: []
              });
            }
            
            const tournamentData = tournamentMap.get(tournamentId)!;
            tournamentData.athletes.push({
              id: result.athlete.id,
              name: result.athlete.profile.full_name,
              result: result
            });
          });

          setCompletedTournamentsWithAthletes(Array.from(tournamentMap.values()));

          // For backward compatibility with existing logic, keep the old format too
          const uniqueTournaments = Array.from(
            new Map(data?.map(item => [item.tournament.id, item]) || []).values()
          );
          completedData = uniqueTournaments;
        }
      }

      setUpcomingTournaments(upcomingData || []);
      setCompletedTournaments(completedData || []);
    } catch (error) {
      console.error('Error fetching tournaments:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteResult = async (resultId: string) => {
    try {
      const { error } = await supabase
        .from('tournament_results')
        .delete()
        .eq('id', resultId);

      if (error) {
        console.error('Delete error:', error);
        throw error;
      }
      
      // Refresh tournaments to move back to upcoming
      await fetchTournaments();
    } catch (error) {
      console.error('Error deleting result:', error);
    }
  };

  const deleteCoachComments = async (tournamentId: string) => {
    try {
      if (!profile) return;

      // Get coach ID
      const { data: coachData } = await supabase
        .from('coaches')
        .select('id')
        .eq('profile_id', profile.id)
        .single();

      if (!coachData) return;

      // Get batch athlete IDs for this coach
      const { data: batchData } = await supabase
        .from('batches')
        .select('id')
        .eq('coach_id', coachData.id);

      const batchIds = batchData?.map(b => b.id) || [];

      const { data: batchAthleteData } = await supabase
        .from('batch_athletes')
        .select('athlete_id')
        .in('batch_id', batchIds);

      const athleteIds = batchAthleteData?.map(ba => ba.athlete_id) || [];

      // Clear coach comments and coach_completed_at for all athletes in this tournament
      const { error } = await supabase
        .from('tournament_results')
        .update({
          coach_comments: null,
          coach_completed_at: null
        })
        .eq('tournament_id', tournamentId)
        .in('athlete_id', athleteIds);

      if (error) {
        console.error('Delete comments error:', error);
        throw error;
      }
      
      // Refresh tournaments to move back to upcoming
      await fetchTournaments();
    } catch (error) {
      console.error('Error deleting coach comments:', error);
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
        <Button 
          className="gradient-primary text-primary-foreground"
          onClick={() => setShowAddForm(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Tournament
        </Button>
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
                    <Badge className="bg-blue-500/20 text-blue-400">
                      Available
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex space-x-2">
                    {isAthlete ? (
                      <ParticipationDropdown tournamentId={tournament.id} />
                    ) : isCoach ? (
                      <Button 
                        variant="outline"
                        onClick={() => setSelectedTournament({ id: tournament.id, name: tournament.name })}
                      >
                        <Users className="h-4 w-4 mr-2" />
                        Athletes
                      </Button>
                    ) : (
                      <Button className="gradient-primary text-primary-foreground">
                        Register
                      </Button>
                     )}
                    {isAthlete && !athleteResults[tournament.id] && (
                      <Button 
                        variant="outline"
                        onClick={() => setShowResultsForm({ id: tournament.id, name: tournament.name })}
                      >
                        <Trophy className="h-4 w-4 mr-2" />
                        Results
                      </Button>
                    )}
                    {isCoach && (
                      <Button 
                        variant="outline"
                        onClick={() => setShowCommentsModal({ id: tournament.id, name: tournament.name })}
                      >
                        <Star className="h-4 w-4 mr-2" />
                        Comments
                      </Button>
                    )}
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
          ) : isCoach ? (
            <div className="space-y-6">
              {/* Tournament and Athlete Selection for Coaches */}
              <Card className="sport-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Select Tournament & Athlete</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Choose a completed tournament and athlete to view detailed stats and comments
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Tournament Dropdown */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Tournament</label>
                      <Select 
                        value={selectedCompletedTournament} 
                        onValueChange={(value) => {
                          setSelectedCompletedTournament(value);
                          setSelectedAthlete(''); // Reset athlete selection
                        }}
                      >
                        <SelectTrigger className="bg-background border border-border">
                          <SelectValue placeholder="Select a tournament" />
                        </SelectTrigger>
                        <SelectContent className="bg-background border border-border z-50">
                          {completedTournamentsWithAthletes.map((tournament) => (
                            <SelectItem key={tournament.tournament.id} value={tournament.tournament.id}>
                              {tournament.tournament.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Athlete Dropdown */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Athlete</label>
                      <Select 
                        value={selectedAthlete} 
                        onValueChange={setSelectedAthlete}
                        disabled={!selectedCompletedTournament}
                      >
                        <SelectTrigger className="bg-background border border-border">
                          <SelectValue placeholder="Select an athlete" />
                        </SelectTrigger>
                        <SelectContent className="bg-background border border-border z-50">
                          {selectedCompletedTournament && 
                            completedTournamentsWithAthletes
                              .find(t => t.tournament.id === selectedCompletedTournament)
                              ?.athletes.map((athlete) => (
                                <SelectItem key={athlete.id} value={athlete.id}>
                                  <div className="flex items-center">
                                    <User className="h-4 w-4 mr-2" />
                                    {athlete.name}
                                  </div>
                                </SelectItem>
                              ))
                          }
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Selected Athlete Stats */}
              {selectedCompletedTournament && selectedAthlete && (() => {
                const tournament = completedTournamentsWithAthletes.find(t => t.tournament.id === selectedCompletedTournament);
                const athlete = tournament?.athletes.find(a => a.id === selectedAthlete);
                const result = athlete?.result;

                if (!result || !tournament) return null;

                return (
                  <Card className="sport-card">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <CardTitle className="text-lg">{tournament.tournament.name}</CardTitle>
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                            <span className="flex items-center">
                              <Calendar className="h-4 w-4 mr-1" />
                              {new Date(tournament.tournament.start_date).toLocaleDateString()}
                            </span>
                            {tournament.tournament.location && (
                              <span className="flex items-center">
                                <MapPin className="h-4 w-4 mr-1" />
                                {tournament.tournament.location}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <User className="h-4 w-4" />
                            <span className="font-medium">{athlete.name}</span>
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
                        {/* Tournament Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {result.position && (
                            <div className="stat-card">
                              <p className="text-sm text-muted-foreground mb-2">Position</p>
                              <p className="text-sm font-semibold">{result.position}</p>
                            </div>
                          )}
                          
                          {result.rank && (
                            <div className="stat-card">
                              <p className="text-sm text-muted-foreground mb-2">Rank</p>
                              <p className="text-sm font-semibold">#{result.rank}</p>
                            </div>
                          )}
                          
                          {result.points_scored && (
                            <div className="stat-card">
                              <p className="text-sm text-muted-foreground mb-2">Points Scored</p>
                              <p className="text-sm font-semibold">{result.points_scored}</p>
                            </div>
                          )}
                        </div>

                        {result.strong_points && (
                          <div className="stat-card">
                            <p className="text-sm text-green-400 mb-2 font-semibold">Strong Points</p>
                            <p className="text-sm">{result.strong_points}</p>
                          </div>
                        )}
                        
                        {result.areas_of_improvement && (
                          <div className="stat-card">
                            <p className="text-sm text-orange-400 mb-2 font-semibold">Areas of Improvement</p>
                            <p className="text-sm">{result.areas_of_improvement}</p>
                          </div>
                        )}
                        
                        {result.coach_comments && (
                          <div className="stat-card">
                            <p className="text-sm text-blue-400 mb-2 font-semibold">Coach Comments</p>
                            <p className="text-sm">{result.coach_comments}</p>
                          </div>
                        )}

                        {result.notes && (
                          <div className="stat-card">
                            <p className="text-sm text-muted-foreground mb-2 font-semibold">Notes</p>
                            <p className="text-sm">{result.notes}</p>
                          </div>
                        )}
                        
                        {/* Action Buttons */}
                        <div className="pt-4 border-t flex space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setShowCommentsModal({ id: tournament.tournament.id, name: tournament.tournament.name })}
                          >
                            <Star className="h-4 w-4 mr-2" />
                            Edit Comments
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => deleteCoachComments(tournament.tournament.id)}
                          >
                            Delete Comments
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })()}
            </div>
          ) : (
            /* Athletes view - unchanged */
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
                    {result.position && (
                      <div className="stat-card">
                        <p className="text-sm text-muted-foreground mb-2">Position</p>
                        <p className="text-sm font-semibold">{result.position}</p>
                      </div>
                    )}
                    
                    {result.strong_points && (
                      <div className="stat-card">
                        <p className="text-sm text-green-400 mb-2 font-semibold">Strong Points</p>
                        <p className="text-sm">{result.strong_points}</p>
                      </div>
                    )}
                    
                    {result.areas_of_improvement && (
                      <div className="stat-card">
                        <p className="text-sm text-orange-400 mb-2 font-semibold">Areas of Improvement</p>
                        <p className="text-sm">{result.areas_of_improvement}</p>
                      </div>
                    )}
                    
                    {result.coach_comments && (
                      <div className="stat-card">
                        <p className="text-sm text-blue-400 mb-2 font-semibold">Coach Comments</p>
                        <p className="text-sm">{result.coach_comments}</p>
                      </div>
                    )}
                    
                    {/* Edit Results Button for Athletes in Completed Tab */}
                    <div className="pt-4 border-t flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setShowResultsForm({ id: result.tournament.id, name: result.tournament.name })}
                      >
                        <Trophy className="h-4 w-4 mr-2" />
                        Edit Results
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => deleteResult(result.id)}
                      >
                        Delete Results
                      </Button>
                    </div>
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
            <p className="text-muted-foreground">
              Use the "Add Tournament" button above to create your first tournament
            </p>
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

      {/* Add Tournament Form */}
      {showAddForm && (
        <AddTournamentForm
          onClose={() => setShowAddForm(false)}
          onTournamentAdded={fetchTournaments}
        />
      )}

      {/* Tournament Athletes Modal */}
      {selectedTournament && (
        <TournamentAthletesModal
          tournamentId={selectedTournament.id}
          tournamentName={selectedTournament.name}
          onClose={() => setSelectedTournament(null)}
        />
      )}

      {/* Tournament Results Form */}
      {showResultsForm && (
        <TournamentResultsForm
          tournamentId={showResultsForm.id}
          tournamentName={showResultsForm.name}
          onClose={() => setShowResultsForm(null)}
          onResultSubmitted={fetchTournaments}
        />
      )}

      {/* Tournament Comments Modal */}
      {showCommentsModal && (
        <TournamentCommentsModal
          tournamentId={showCommentsModal.id}
          tournamentName={showCommentsModal.name}
          onClose={() => setShowCommentsModal(null)}
          onCommentsCompleted={fetchTournaments}
        />
      )}
    </div>
  );
};

export default Tournaments;