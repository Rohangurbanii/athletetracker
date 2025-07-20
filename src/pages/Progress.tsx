import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Target, MessageSquare, CheckCircle, Clock, Plus, Calendar } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

const Progress = memo(() => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const isCoach = profile?.role === 'coach';
  const [activeTab, setActiveTab] = useState<'goals' | 'comments'>('goals');
  const [goals, setGoals] = useState([]);
  const [coachComments, setCoachComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commentsLoading, setCommentsLoading] = useState(false);

  // Coach-specific state for athlete selection
  const [batches, setBatches] = useState<any[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<string>("");
  const [athletes, setAthletes] = useState<any[]>([]);
  const [selectedAthlete, setSelectedAthlete] = useState<string>("");
  const [coachDataLoading, setCoachDataLoading] = useState(false);

  // Fetch batches for coaches
  const fetchBatches = useCallback(async () => {
    if (profile?.role !== 'coach') return;
    
    setLoading(false); // Stop main loading for coaches
    
    const { data: coachData, error: coachError } = await supabase
      .from('coaches')
      .select('id')
      .eq('profile_id', profile.id)
      .single();

    if (coachData) {
      const { data: batchesData, error: batchesError } = await supabase
        .from('batches')
        .select('*')
        .eq('coach_id', coachData.id);
      
      setBatches(batchesData || []);
    }
  }, [profile]);

  // Fetch athletes in selected batch
  const fetchAthletes = useCallback(async (batchId: string) => {
    try {
      console.log('Fetching athletes for batch:', batchId);
      
      // Get athletes in the selected batch
      const { data: batchAthleteIds, error: batchError } = await supabase
        .from('batch_athletes')
        .select('athlete_id')
        .eq('batch_id', batchId);

      console.log('Batch athletes query result:', { batchAthleteIds, batchError });

      const athleteIds = (batchAthleteIds || []).map(ba => ba.athlete_id);
      console.log('Athlete IDs from batch:', athleteIds);
      
      if (athleteIds.length === 0) {
        console.log('No athletes found in this batch');
        setAthletes([]);
        return;
      }

      const { data: athletes, error: athletesError } = await supabase
        .from('athletes')
        .select(`
          id,
          profiles (
            id,
            full_name
          )
        `)
        .in('id', athleteIds);

      console.log('Athletes query result:', { athletes, athletesError });

      const athletesList = (athletes || []).map(athlete => ({
        id: athlete.id,
        profile_id: athlete.profiles?.id,
        name: athlete.profiles?.full_name || 'Unknown'
      }));

      console.log('Processed athletes list:', athletesList);
      setAthletes(athletesList);
    } catch (error) {
      console.error('Error fetching batch athletes:', error);
      setAthletes([]);
    }
  }, []);

  const fetchGoals = useCallback(async (targetAthleteId?: string) => {
    if (!profile) return;

    try {
      if (targetAthleteId) {
        setCoachDataLoading(true);
      } else {
        setLoading(true);
      }

      // Get athlete data based on user role
      let athleteId = targetAthleteId;
      
      // For coaches, targetAthleteId is the athlete ID directly
      if (!athleteId && profile?.role === 'athlete') {
        const { data: athleteData, error: athleteError } = await supabase
          .from('athletes')
          .select('id')
          .eq('profile_id', profile.id)
          .maybeSingle();

        if (athleteError) {
          console.error('Error fetching athlete:', athleteError);
          if (targetAthleteId) {
            setCoachDataLoading(false);
          } else {
            setLoading(false);
          }
          return;
        }

        athleteId = athleteData?.id;
      }

      if (!athleteId) {
        console.log('No athlete record found');
        setGoals([]);
        if (targetAthleteId) {
          setCoachDataLoading(false);
        } else {
          setLoading(false);
        }
        return;
      }

      console.log('Fetching goals for athlete ID:', athleteId);

      // Get goals for this athlete
      const { data: goalsData, error: goalsError } = await supabase
        .from('goals')
        .select('*')
        .eq('athlete_id', athleteId)
        .order('created_at', { ascending: false });

      console.log('Goals query result:', { goalsData, goalsError });

      if (goalsError) {
        console.error('Error fetching goals:', goalsError);
        setGoals([]);
      } else {
        console.log('Fetched goals:', goalsData);
        const transformedGoals = (goalsData || []).map(goal => ({
          id: goal.id,
          title: goal.title,
          description: goal.description,
          status: goal.status === 'completed' ? 'completed' : 'in_progress',
          targetDate: goal.target_date,
          progress: goal.progress_percentage || 0,
          createdDate: goal.created_at?.split('T')[0] || '',
          coachCompleted: goal.coach_completed || false,
          completedByCoachAt: goal.completed_by_coach_at
        }));
        setGoals(transformedGoals);
        console.log('Transformed goals:', transformedGoals);
      }
    } catch (error) {
      console.error('Error:', error);
      setGoals([]);
    } finally {
      if (targetAthleteId) {
        setCoachDataLoading(false);
      } else {
        setLoading(false);
      }
    }
  }, [profile]);

  const fetchCoachComments = useCallback(async (targetAthleteId?: string) => {
    if (!profile || (isCoach && !targetAthleteId)) return; // Only load for athletes or coaches with selected athlete

    try {
      setCommentsLoading(true);

      // Get athlete data based on user role
      let athleteId = targetAthleteId;
      if (!athleteId && profile?.role === 'athlete') {
        const { data: athleteData, error: athleteError } = await supabase
          .from('athletes')
          .select('id')
          .eq('profile_id', profile.id)
          .maybeSingle();

        if (athleteError || !athleteData) {
          console.error('Error fetching athlete:', athleteError);
          setCoachComments([]);
          return;
        }

        athleteId = athleteData.id;
      }

      if (!athleteId) {
        setCoachComments([]);
        return;
      }

      // Get tournament results with coach comments for this athlete
      const { data: commentsData, error: commentsError } = await supabase
        .from('tournament_results')
        .select(`
          id,
          coach_comments,
          coach_completed_at,
          position,
          strong_points,
          areas_of_improvement,
          tournament:tournaments(name, start_date, location)
        `)
        .eq('athlete_id', athleteId)
        .not('coach_comments', 'is', null)
        .not('coach_comments', 'eq', '')
        .order('coach_completed_at', { ascending: false });

      if (commentsError) {
        console.error('Error fetching coach comments:', commentsError);
        setCoachComments([]);
      } else {
        setCoachComments(commentsData || []);
      }
    } catch (error) {
      console.error('Error fetching coach comments:', error);
      setCoachComments([]);
    } finally {
      setCommentsLoading(false);
    }
  }, [profile, isCoach]);

  // Effects and event handlers
  useEffect(() => {
    if (profile) {
      if (profile.role === 'coach') {
        fetchBatches();
      } else {
        fetchGoals();
      }
    }
  }, [profile]);

  useEffect(() => {
    if (selectedBatch) {
      console.log('Selected batch changed:', selectedBatch);
      fetchAthletes(selectedBatch);
      setSelectedAthlete("");
      setGoals([]);
      setCoachComments([]);
    }
  }, [selectedBatch]);

  useEffect(() => {
    if (selectedAthlete) {
      console.log('Selected athlete changed:', selectedAthlete);
      fetchGoals(selectedAthlete);
      if (activeTab === 'comments') {
        fetchCoachComments(selectedAthlete);
      }
    } else {
      setGoals([]);
      setCoachComments([]);
    }
  }, [selectedAthlete]);

  useEffect(() => {
    if (activeTab === 'comments') {
      if (isCoach && selectedAthlete) {
        fetchCoachComments(selectedAthlete);
      } else if (!isCoach) {
        fetchCoachComments();
      }
    }
  }, [activeTab, selectedAthlete, isCoach]);

  const getStatusIcon = useCallback((status: string) => {
    return status === 'completed' ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <Clock className="h-4 w-4 text-blue-500" />
    );
  }, []);

  const toggleCoachCompletion = useCallback(async (goalId: string, currentStatus: boolean) => {
    try {
      const updateData = {
        coach_completed: !currentStatus,
        completed_by_coach_at: !currentStatus ? new Date().toISOString() : null,
        // If marking as complete, set progress to 100%
        ...((!currentStatus) && { progress_percentage: 100 })
      };

      const { error } = await supabase
        .from('goals')
        .update(updateData)
        .eq('id', goalId);

      if (error) {
        console.error('Error updating goal completion:', error);
        return;
      }

      // Update local state
      setGoals(prevGoals => 
        prevGoals.map(goal => 
          goal.id === goalId 
            ? { 
                ...goal, 
                coachCompleted: !currentStatus,
                completedByCoachAt: !currentStatus ? new Date().toISOString() : null,
                // If marking as complete, set progress to 100%
                progress: !currentStatus ? 100 : goal.progress
              }
            : goal
        )
      );
    } catch (error) {
      console.error('Error toggling coach completion:', error);
    }
  }, []);

  const updateProgress = useCallback(async (goalId: string, newProgress: number) => {
    try {
      const updateData = {
        progress_percentage: newProgress,
        // If setting to 100%, automatically mark as coach completed
        ...(newProgress === 100 && {
          coach_completed: true,
          completed_by_coach_at: new Date().toISOString()
        }),
        // If setting to less than 100%, unmark coach completion
        ...(newProgress < 100 && {
          coach_completed: false,
          completed_by_coach_at: null
        })
      };

      const { error } = await supabase
        .from('goals')
        .update(updateData)
        .eq('id', goalId);

      if (error) {
        console.error('Error updating goal progress:', error);
        return;
      }

      // Update local state
      setGoals(prevGoals => 
        prevGoals.map(goal => 
          goal.id === goalId 
            ? { 
                ...goal, 
                progress: newProgress,
                coachCompleted: newProgress === 100 ? true : (newProgress < 100 ? false : goal.coachCompleted),
                completedByCoachAt: newProgress === 100 ? new Date().toISOString() : (newProgress < 100 ? null : goal.completedByCoachAt)
              }
            : goal
        )
      );
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Progress Tracking</h1>
          <p className="text-muted-foreground">
            {isCoach ? 'Track your athletes\' development journey' : 'Monitor your growth and achievements'}
          </p>
        </div>
        {!isCoach && (
          <Button 
            className="gradient-primary text-primary-foreground"
            onClick={() => navigate('/set-goal')}
          >
            <Plus className="h-4 w-4 mr-2" />
            Set Goal
          </Button>
        )}
      </div>

      {/* Coach Selection Section */}
      {isCoach && (
        <div className="space-y-4">
          <div className="flex gap-4">
            <Select value={selectedBatch} onValueChange={setSelectedBatch}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select Batch" />
              </SelectTrigger>
              <SelectContent>
                {batches.map((batch) => (
                  <SelectItem key={batch.id} value={batch.id}>
                    {batch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select 
              value={selectedAthlete} 
              onValueChange={setSelectedAthlete}
              disabled={!selectedBatch}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select Athlete" />
              </SelectTrigger>
              <SelectContent>
                {athletes.map((athlete) => (
                  <SelectItem key={athlete.id} value={athlete.id}>
                    {athlete.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!selectedAthlete && (
            <div className="text-center py-8 text-muted-foreground">
              Select a batch and athlete to view progress data
            </div>
          )}

          {coachDataLoading && selectedAthlete && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full"></div>
            </div>
          )}
        </div>
      )}

      {/* Tab Navigation - Show for athletes or when coach has selected athlete */}
      {((isCoach && selectedAthlete) || (!isCoach)) && (
        <div className="flex space-x-1 bg-muted p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('goals')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'goals'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Goals Tracker
          </button>
          <button
            onClick={() => setActiveTab('comments')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'comments'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Coach Comments
          </button>
        </div>
      )}

      {/* Goals Tab - Show for athletes or when coach has selected athlete */}
      {((isCoach && selectedAthlete) || (!isCoach)) && activeTab === 'goals' && (
        (loading || coachDataLoading) ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {goals.map((goal) => (
            <Card key={goal.id} className="sport-card">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      {getStatusIcon(goal.status)}
                      <CardTitle className="text-xl font-semibold">{goal.title}</CardTitle>
                    </div>
                    <p className="text-muted-foreground leading-relaxed">{goal.description}</p>
                  </div>
                  
                  <div className="flex flex-col gap-2 ml-4">
                    <Badge 
                      className={
                        goal.status === 'completed' 
                          ? 'bg-green-500/20 text-green-400 border-green-400/20' 
                          : 'bg-blue-500/20 text-blue-400 border-blue-400/20'
                      }
                    >
                      {goal.status === 'completed' ? 'Completed' : 'In Progress'}
                    </Badge>
                    
                    {/* Coach completion badge */}
                    {isCoach && goal.coachCompleted && (
                      <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-400/20 text-xs">
                        Coach Completed
                      </Badge>
                    )}
                  </div>
                </div>
                
                {/* Coach completion status for athletes */}
                {!isCoach && goal.coachCompleted && (
                  <div className="flex items-center gap-2 mt-3 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-green-600 font-medium">
                      Marked complete by coach
                    </span>
                    {goal.completedByCoachAt && (
                      <span className="text-xs text-green-600/70 ml-auto">
                        {new Date(goal.completedByCoachAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                )}
              </CardHeader>
              
              <CardContent className="space-y-6">
                {/* Progress Section */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-muted-foreground">Progress</span>
                    <span className="text-lg font-bold text-foreground">{goal.progress}%</span>
                  </div>
                  
                  {/* For coaches: Clickable percentage buttons */}
                  {isCoach ? (
                    <div className="space-y-3">
                       <div className="flex gap-2">
                         {[0, 25, 50, 75, 100].map((percentage) => (
                           <Button
                             key={percentage}
                             size="sm"
                             variant={goal.progress === percentage ? "default" : "outline"}
                             className={`text-sm px-4 py-2 ${
                               goal.progress === percentage 
                                 ? 'bg-primary text-primary-foreground' 
                                 : 'hover:bg-muted'
                             }`}
                             onClick={() => updateProgress(goal.id, percentage)}
                           >
                             {percentage}%
                           </Button>
                         ))}
                      </div>
                      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                        <div 
                          className="gradient-primary h-full rounded-full transition-all duration-300"
                          style={{ width: `${goal.progress}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    /* For athletes: Static progress bar */
                    <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                      <div 
                        className="gradient-primary h-full rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${goal.progress}%` }}
                      />
                    </div>
                  )}
                </div>

                {/* Goal Details Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Target Date</span>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {new Date(goal.targetDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Created</span>
                    <div className="flex items-center gap-2">
                      <Plus className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {new Date(goal.createdDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions - Only for coaches */}
                {isCoach && (
                  <div className="flex space-x-3 pt-2">
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      disabled
                    >
                      Update Progress
                    </Button>
                    <Button 
                      onClick={() => toggleCoachCompletion(goal.id, goal.coachCompleted)}
                      className={`transition-all duration-200 ${
                        goal.coachCompleted 
                          ? 'bg-green-500 hover:bg-green-600 text-white' 
                          : 'bg-primary hover:bg-primary/90 text-primary-foreground'
                      }`}
                    >
                      {goal.coachCompleted ? (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Complete
                        </>
                      ) : (
                        'Mark Complete'
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          </div>
        )
      )}

      {/* Comments Tab - Show for athletes or when coach has selected athlete */}
      {((isCoach && selectedAthlete) || (!isCoach)) && activeTab === 'comments' && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Tournament Coach Feedback</h2>
          
          {commentsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
            </div>
          ) : coachComments.length > 0 ? (
            <div className="space-y-4">
              {coachComments.map((comment) => (
                <Card key={comment.id} className="sport-card">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">{comment.tournament.name}</CardTitle>
                      <Badge className="bg-blue-500/20 text-blue-400">
                        Coach Feedback
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="stat-card border-l-4 border-blue-400">
                      <div className="flex items-center gap-2 mb-2">
                        <MessageSquare className="h-4 w-4 text-blue-400" />
                        <p className="text-sm text-blue-400 font-semibold">Coach Comments</p>
                      </div>
                      <p className="text-sm">{comment.coach_comments}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="sport-card">
              <CardContent className="text-center py-12">
                <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No coach comments yet</h3>
                <p className="text-muted-foreground">
                  {isCoach ? "This athlete hasn't received any tournament feedback yet" : "Coach feedback from tournaments will appear here after competitions"}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Empty States for Goals */}
      {((isCoach && selectedAthlete) || (!isCoach)) && activeTab === 'goals' && !loading && !coachDataLoading && goals.length === 0 && (
        <Card className="sport-card">
          <CardContent className="text-center py-12">
            <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No goals set</h3>
            <p className="text-muted-foreground mb-4">
              {isCoach ? "This athlete hasn't set any goals yet" : "Start setting specific goals to track your development"}
            </p>
            {!isCoach && (
              <Button 
                className="gradient-primary text-primary-foreground"
                onClick={() => navigate('/set-goal')}
              >
                <Plus className="h-4 w-4 mr-2" />
                Set First Goal
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
});

export default Progress;