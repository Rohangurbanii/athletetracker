import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Calendar, Trophy, Moon, Target, Activity, TrendingUp, Users, ChevronDown, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CreateBatchForm } from '@/components/forms/CreateBatchForm';

export const Dashboard = () => {
  const { profile, loading } = useAuth();
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState({
    weekSessions: 0,
    avgRPE: 0,
    recentSleepHours: 0,
    recentSleepQuality: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [batches, setBatches] = useState([]);
  const [showCreateBatch, setShowCreateBatch] = useState(false);

  const fetchData = useCallback(async () => {
    if (!profile) return; // Guard clause inside useEffect instead

    try {
      // If coach, fetch batches
      if (profile.role === 'coach') {
        const { data: coach } = await supabase
          .from('coaches')
          .select('id')
          .eq('profile_id', profile.id)
          .single();

        if (coach) {
          const { data: batchesData } = await supabase
            .from('batches')
            .select('id, name, description, created_at')
            .eq('coach_id', coach.id)
            .order('created_at', { ascending: false });

          // Get athlete count for each batch separately
          const batchesWithAthletes = await Promise.all(
            (batchesData || []).map(async (batch) => {
              // First get the batch_athletes records
              const { data: batchAthleteIds } = await supabase
                .from('batch_athletes')
                .select('athlete_id')
                .eq('batch_id', batch.id);

              // Then get athlete details for those IDs
              const athleteIds = (batchAthleteIds || []).map(ba => ba.athlete_id);
              
              if (athleteIds.length === 0) {
                return {
                  ...batch,
                  batch_athletes: []
                };
              }

              const { data: athletes } = await supabase
                .from('athletes')
                .select(`
                  id,
                  profile:profiles!athletes_profile_id_fkey(
                    full_name
                  )
                `)
                .in('id', athleteIds);

              return {
                ...batch,
                batch_athletes: (athletes || []).map(athlete => ({
                  athlete
                }))
              };
            })
          );

          setBatches(batchesWithAthletes);
        }
        return; // Coach dashboard doesn't need athlete analytics
      }

      // Get the athlete record for this profile (for athletes only)
      const { data: athleteData, error: athleteError } = await supabase
        .from('athletes')
        .select('id')
        .eq('profile_id', profile.id)
        .single();

      if (athleteError || !athleteData) {
        console.error('Athlete record not found:', athleteError);
        return;
      }

      // Get this week's sessions
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const { data: sessionsData } = await supabase
        .from('rpe_logs')
        .select('rpe_score, duration_minutes, activity_type, log_date')
        .eq('athlete_id', athleteData.id)
        .gte('log_date', weekAgo.toISOString().split('T')[0])
        .order('log_date', { ascending: false });

      // Get recent sleep data
      const { data: sleepData } = await supabase
        .from('sleep_logs')
        .select('duration_hours, quality_rating, sleep_date')
        .eq('athlete_id', athleteData.id)
        .order('sleep_date', { ascending: false })
        .limit(7);

      // Calculate analytics
      const weekSessionsCount = sessionsData?.length || 0;
      const avgRPE = sessionsData?.length 
        ? sessionsData.reduce((sum, session) => sum + (session.rpe_score || 0), 0) / sessionsData.length 
        : 0;
      
      const recentSleep = sleepData?.[0];
      const avgSleepHours = sleepData?.length 
        ? sleepData.reduce((sum, sleep) => sum + (sleep.duration_hours || 0), 0) / sleepData.length 
        : 0;

      setAnalytics({
        weekSessions: weekSessionsCount,
        avgRPE: Math.round(avgRPE * 10) / 10,
        recentSleepHours: Math.round(avgSleepHours * 10) / 10,
        recentSleepQuality: recentSleep?.quality_rating || 0
      });

      // Set recent activity
      const recentActivities = [];
      if (sessionsData?.length > 0) {
        recentActivities.push({
          type: 'session',
          activity: `Completed ${sessionsData[0].activity_type?.toLowerCase() || 'training'} session`,
          time: `${Math.abs(new Date().getTime() - new Date(sessionsData[0].log_date).getTime()) / (1000 * 60 * 60)} hours ago`,
          rpe: sessionsData[0].rpe_score
        });
      }
      if (recentSleep) {
        recentActivities.push({
          type: 'sleep',
          activity: `Logged ${Math.floor(recentSleep.duration_hours)}h ${Math.floor((recentSleep.duration_hours % 1) * 60)}m of sleep`,
          time: new Date(recentSleep.sleep_date).toLocaleDateString() === new Date().toLocaleDateString() ? 'Today' : 'Yesterday',
          quality: recentSleep.quality_rating
        });
      }
      setRecentActivity(recentActivities);

    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  }, [profile]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  console.log('Dashboard profile:', profile, 'loading:', loading);
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center space-y-4 p-8">
        <h2 className="text-xl font-semibold text-foreground">Profile not found</h2>
        <p className="text-muted-foreground">Unable to load your profile data.</p>
      </div>
    );
  }

  const isCoach = profile.role === 'coach';

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">
          Welcome back, {profile.full_name || 'Champion'}!
        </h1>
        <p className="text-muted-foreground">
          {isCoach ? 'Ready to guide your athletes to success?' : "Let's crush today's goals!"}
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="sport-card">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="gradient-primary p-2 rounded-lg">
                <Activity className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">This Week</p>
                <p className="text-xl font-bold">{analytics.weekSessions} Sessions</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="sport-card">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="gradient-secondary p-2 rounded-lg">
                <TrendingUp className="h-5 w-5 text-accent-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg RPE</p>
                <p className="text-xl font-bold">{analytics.avgRPE || 'N/A'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Today's Schedule */}
      <Card className="sport-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Today's Schedule</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-card/50 rounded-lg border border-border/50">
            <div>
              <p className="font-medium">Morning Training</p>
              <p className="text-sm text-muted-foreground">8:00 AM - 10:00 AM</p>
            </div>
            <Badge variant="outline">Upcoming</Badge>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-card/50 rounded-lg border border-border/50">
            <div>
              <p className="font-medium">Recovery Session</p>
              <p className="text-sm text-muted-foreground">2:00 PM - 3:00 PM</p>
            </div>
            <Badge className="bg-accent">Active</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-4">
          {isCoach ? (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="gradient-primary text-primary-foreground font-semibold h-12">
                    <Users className="h-5 w-5 mr-2" />
                    Batch Management
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuItem onClick={() => setShowCreateBatch(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Batch
                  </DropdownMenuItem>
                  {batches.map((batch) => (
                    <DropdownMenuItem key={batch.id}>
                      <Users className="h-4 w-4 mr-2" />
                      {batch.name} ({batch.batch_athletes?.length || 0} athletes)
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              
              <Button 
                variant="outline" 
                className="h-12"
                onClick={() => navigate('/tournaments')}
              >
                <Trophy className="h-5 w-5 mr-2" />
                Manage Tournaments
              </Button>
              
              <Button 
                variant="outline" 
                className="h-12"
                onClick={() => navigate('/analytics')}
              >
                <TrendingUp className="h-5 w-5 mr-2" />
                View Analytics
              </Button>
              
              <Button 
                variant="outline" 
                className="h-12"
                onClick={() => navigate('/practice')}
              >
                <Calendar className="h-5 w-5 mr-2" />
                Schedule Practice
              </Button>
            </>
          ) : (
            <>
              <Button 
                className="gradient-primary text-primary-foreground font-semibold h-12"
                onClick={() => navigate('/log-session')}
              >
                <Calendar className="h-5 w-5 mr-2" />
                Log Session
              </Button>
              
              <Button 
                variant="outline" 
                className="h-12"
                onClick={() => navigate('/log-sleep')}
              >
                <Moon className="h-5 w-5 mr-2" />
                Log Sleep
              </Button>
              
              <Button 
                variant="outline" 
                className="h-12"
                onClick={() => navigate('/tournaments')}
              >
                <Trophy className="h-5 w-5 mr-2" />
                View Tournaments
              </Button>
              
              <Button 
                variant="outline" 
                className="h-12"
                onClick={() => navigate('/set-goal')}
              >
                <Target className="h-5 w-5 mr-2" />
                Set Goals
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Batch Management for Coaches */}
      {isCoach && (
        <Card className="sport-card">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                My Batches
              </span>
              <Button 
                size="sm" 
                onClick={() => setShowCreateBatch(true)}
                className="gradient-primary text-primary-foreground"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Batch
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {batches.length > 0 ? (
              <div className="space-y-4">
                {batches.map((batch) => (
                  <div key={batch.id} className="flex items-center justify-between p-4 bg-card/50 rounded-lg border border-border/50">
                    <div className="space-y-1">
                      <h3 className="font-semibold">{batch.name}</h3>
                      {batch.description && (
                        <p className="text-sm text-muted-foreground">{batch.description}</p>
                      )}
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {batch.batch_athletes?.length || 0} athletes
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Created {new Date(batch.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {batch.batch_athletes?.slice(0, 3).map((ba, index) => (
                        <div key={index} className="text-xs bg-accent px-2 py-1 rounded">
                          {ba.athlete?.profile?.full_name || 'Unknown'}
                        </div>
                      ))}
                      {(batch.batch_athletes?.length || 0) > 3 && (
                        <div className="text-xs text-muted-foreground">
                          +{(batch.batch_athletes?.length || 0) - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No batches created yet</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Create your first batch to organize your athletes
                </p>
                <Button onClick={() => setShowCreateBatch(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Batch
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Create Batch Dialog */}
      <Dialog open={showCreateBatch} onOpenChange={setShowCreateBatch}>
        <DialogContent className="max-w-2xl">
          <CreateBatchForm 
            onSuccess={() => {
              setShowCreateBatch(false);
              // Refresh batches
              fetchData();
            }}
            onCancel={() => setShowCreateBatch(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Recent Activity */}
      <Card className="sport-card">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {recentActivity.length > 0 ? (
            recentActivity.map((activity, index) => (
              <div key={index} className="flex items-center space-x-3 p-3 bg-card/50 rounded-lg border border-border/50">
                <div className={`gradient-${activity.type === 'session' ? 'primary' : 'secondary'} p-2 rounded-full`}>
                  {activity.type === 'session' ? (
                    <Activity className="h-4 w-4 text-primary-foreground" />
                  ) : (
                    <Moon className="h-4 w-4 text-accent-foreground" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-medium">{activity.activity}</p>
                  <p className="text-sm text-muted-foreground">{activity.time}</p>
                </div>
                <Badge variant="outline">
                  {activity.type === 'session' ? `RPE ${activity.rpe}` : `Quality: ${activity.quality}/5`}
                </Badge>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No recent activity</p>
              <p className="text-sm text-muted-foreground">Start logging sessions and sleep to see your activity here</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};