import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trophy, Calendar, MapPin, Plus, Star, Users } from 'lucide-react';
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
};

type UpcomingTournament = Tournament;
type CompletedTournament = TournamentResult;

export const Tournaments = () => {
  const { profile } = useAuth();
  const isCoach = profile?.role === 'coach';
  const isAthlete = profile?.role === 'athlete';

  const [activeTab, setActiveTab] = useState<'upcoming' | 'completed'>('upcoming');
  const [upcomingTournaments, setUpcomingTournaments] = useState<UpcomingTournament[]>([]);
  const [completedTournaments, setCompletedTournaments] = useState<CompletedTournament[]>([]);
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

      // Fetch upcoming tournaments
      let upcomingQuery = supabase
        .from('tournaments')
        .select('*')
        .gte('start_date', new Date().toISOString().split('T')[0])
        .order('start_date', { ascending: true });

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
        // For coaches, get tournaments where they have completed commenting (simple approach like athletes)
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

          // Simple approach: get tournaments where coach has completed at least one comment
          const { data } = await supabase
            .from('tournament_results')
            .select(`
              *,
              tournament:tournaments(*)
            `)
            .not('coach_completed_at', 'is', null)
            .in('athlete_id', athleteIds)
            .order('created_at', { ascending: false });

          // Get unique tournaments (in case multiple athletes from same tournament)
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
                  {tournament.location && (
                    <p className="text-sm text-muted-foreground mb-4">Location: {tournament.location}</p>
                  )}
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
                    {isAthlete && (
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
                    )}

                    {/* Edit Comments Button for Coaches in Completed Tab */}
                    {isCoach && (
                      <div className="pt-4 border-t flex space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setShowCommentsModal({ id: result.tournament.id, name: result.tournament.name })}
                        >
                          <Star className="h-4 w-4 mr-2" />
                          Edit Comments
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => deleteCoachComments(result.tournament.id)}
                        >
                          Delete Comments
                        </Button>
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