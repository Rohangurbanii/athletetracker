import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Target, MessageSquare, CheckCircle, Clock, Plus, Calendar } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

export const Progress = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const isCoach = profile?.role === 'coach';
  const [activeTab, setActiveTab] = useState<'goals' | 'comments'>('goals');
  const [goals, setGoals] = useState([]);
  const [coachComments, setCoachComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commentsLoading, setCommentsLoading] = useState(false);

  useEffect(() => {
    const fetchGoals = async () => {
      if (!profile) return;

      try {
        // Get the athlete record for this profile
        const { data: athleteData, error: athleteError } = await supabase
          .from('athletes')
          .select('id')
          .eq('profile_id', profile.id)
          .maybeSingle();

        if (athleteError) {
          console.error('Error fetching athlete:', athleteError);
          setLoading(false);
          return;
        }

        if (!athleteData) {
          console.log('No athlete record found');
          setGoals([]);
          setLoading(false);
          return;
        }

        // Get goals for this athlete
        const { data: goalsData, error: goalsError } = await supabase
          .from('goals')
          .select('*')
          .eq('athlete_id', athleteData.id)
          .order('created_at', { ascending: false });

        if (goalsError) {
          console.error('Error fetching goals:', goalsError);
          setGoals([]);
        } else {
          const transformedGoals = (goalsData || []).map(goal => ({
            id: goal.id,
            title: goal.title,
            description: goal.description,
            status: goal.status === 'completed' ? 'completed' : 'in_progress',
            targetDate: goal.target_date,
            progress: goal.progress_percentage || 0,
            createdDate: goal.created_at?.split('T')[0] || ''
          }));
          setGoals(transformedGoals);
        }
      } catch (error) {
        console.error('Error:', error);
        setGoals([]);
      } finally {
        setLoading(false);
      }
    };

    fetchGoals();
  }, [profile]);

  useEffect(() => {
    const fetchCoachComments = async () => {
      if (!profile || isCoach) return; // Only load for athletes

      try {
        setCommentsLoading(true);

        // Get the athlete record for this profile
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
          .eq('athlete_id', athleteData.id)
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
    };

    if (activeTab === 'comments') {
      fetchCoachComments();
    }
  }, [profile, isCoach, activeTab]);

  const getStatusIcon = (status: string) => {
    return status === 'completed' ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <Clock className="h-4 w-4 text-blue-500" />
    );
  };

  const getTypeIcon = (type: string) => {
    return type === 'tournament' ? (
      <Target className="h-4 w-4 text-yellow-500" />
    ) : (
      <MessageSquare className="h-4 w-4 text-blue-500" />
    );
  };

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

      {/* Tab Navigation */}
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

      {/* Goals Tab */}
      {activeTab === 'goals' && (
        loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {goals.map((goal) => (
            <Card key={goal.id} className="sport-card">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(goal.status)}
                      <CardTitle className="text-lg">{goal.title}</CardTitle>
                    </div>
                    <p className="text-sm text-muted-foreground">{goal.description}</p>
                  </div>
                  <Badge 
                    className={
                      goal.status === 'completed' 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-blue-500/20 text-blue-400'
                    }
                  >
                    {goal.status === 'completed' ? 'Completed' : 'In Progress'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">{goal.progress}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="gradient-primary h-2 rounded-full transition-all duration-300"
                        style={{ width: `${goal.progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Goal Details */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="stat-card">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Target Date</span>
                        <span className="text-sm font-medium">
                          {new Date(goal.targetDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="stat-card">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Created</span>
                        <span className="text-sm font-medium">
                          {new Date(goal.createdDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  {goal.status === 'in_progress' && (
                    <div className="flex space-x-2">
                      {isCoach ? (
                        <>
                          <Button variant="outline" className="flex-1">
                            Update Progress
                          </Button>
                          <Button variant="outline">
                            Mark Complete
                          </Button>
                        </>
                      ) : (
                        <Button variant="outline" className="flex-1">
                          View Details
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          </div>
        )
      )}

      {/* Comments Tab */}
      {activeTab === 'comments' && (
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
                      <div className="space-y-2">
                        <CardTitle className="text-lg">{comment.tournament.name}</CardTitle>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <span className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            {new Date(comment.tournament.start_date).toLocaleDateString()}
                          </span>
                          {comment.tournament.location && (
                            <span>{comment.tournament.location}</span>
                          )}
                        </div>
                      </div>
                      <Badge className="bg-blue-500/20 text-blue-400">
                        Coach Feedback
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {comment.position && (
                      <div className="stat-card">
                        <p className="text-sm text-muted-foreground mb-1">Position</p>
                        <p className="text-sm font-semibold">{comment.position}</p>
                      </div>
                    )}
                    
                    {comment.strong_points && (
                      <div className="stat-card">
                        <p className="text-sm text-green-400 mb-2 font-semibold">Your Strong Points</p>
                        <p className="text-sm">{comment.strong_points}</p>
                      </div>
                    )}
                    
                    {comment.areas_of_improvement && (
                      <div className="stat-card">
                        <p className="text-sm text-orange-400 mb-2 font-semibold">Areas to Improve</p>
                        <p className="text-sm">{comment.areas_of_improvement}</p>
                      </div>
                    )}
                    
                    <div className="stat-card border-l-4 border-blue-400">
                      <div className="flex items-center gap-2 mb-2">
                        <MessageSquare className="h-4 w-4 text-blue-400" />
                        <p className="text-sm text-blue-400 font-semibold">Coach Comments</p>
                      </div>
                      <p className="text-sm">{comment.coach_comments}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(comment.coach_completed_at).toLocaleDateString()}
                      </p>
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
                  Coach feedback from tournaments will appear here after competitions
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Empty States */}
      {activeTab === 'goals' && !loading && goals.length === 0 && (
        <Card className="sport-card">
          <CardContent className="text-center py-12">
            <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No goals set</h3>
            <p className="text-muted-foreground mb-4">
              Start setting specific goals to track your development
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
};