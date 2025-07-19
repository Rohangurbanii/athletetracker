import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Trophy, Moon, Target, Activity, TrendingUp, Users, ChevronDown, Plus, Edit, Trash2, BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CreateBatchForm } from '@/components/forms/CreateBatchForm';
import { EditBatchForm } from '@/components/forms/EditBatchForm';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Dashboard = () => {
  const { profile, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [analytics, setAnalytics] = useState({
    weekSessions: 0,
    avgRPE: 0,
    recentSleepHours: 0,
    recentSleepQuality: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [todaysSchedule, setTodaysSchedule] = useState([]);
  const [batches, setBatches] = useState([]);
  const [showCreateBatch, setShowCreateBatch] = useState(false);
  const [showEditBatch, setShowEditBatch] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [batchToDelete, setBatchToDelete] = useState(null);
  const [selectedBatchForAnalytics, setSelectedBatchForAnalytics] = useState('');
  const [selectedAthleteForAnalytics, setSelectedAthleteForAnalytics] = useState('');
  const [availableAthletes, setAvailableAthletes] = useState([]);
  const [athleteAnalytics, setAthleteAnalytics] = useState({
    avgWeeklySleep: 0,
    sleepTrend: 'N/A',
    avgAthleteRPE: 0,
    rpeTrend: 'N/A',
    trainingLoad: 0,
    loadTrend: 'N/A',
    sessionCount: 0
  });

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

      // Get today's scheduled practice sessions for athletes
      if (profile.role === 'athlete') {
        const today = new Date().toISOString().split('T')[0];
        const { data: todaysSessions } = await supabase
          .from('practice_sessions')
          .select('session_type, duration_minutes, notes, session_date')
          .eq('athlete_id', athleteData.id)
          .eq('session_date', today)
          .order('created_at', { ascending: true });

        setTodaysSchedule(todaysSessions || []);
      }

    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  }, [profile]);

  const fetchAthleteAnalytics = useCallback(async (athleteId) => {
    if (!athleteId) return;

    try {
      // Get recent sleep data (last 7 days)
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      const { data: sleepData } = await supabase
        .from('sleep_logs')
        .select('duration_hours, quality_rating')
        .eq('athlete_id', athleteId)
        .gte('sleep_date', weekAgo.toISOString().split('T')[0]);

      // Get recent RPE data (last 7 days)
      const { data: rpeData } = await supabase
        .from('rpe_logs')
        .select('rpe_score, duration_minutes')
        .eq('athlete_id', athleteId)
        .gte('log_date', weekAgo.toISOString().split('T')[0]);

      // Calculate analytics
      const avgSleepHours = sleepData?.length 
        ? sleepData.reduce((sum, sleep) => sum + (sleep.duration_hours || 0), 0) / sleepData.length 
        : 0;

      const avgRPE = rpeData?.length 
        ? rpeData.reduce((sum, session) => sum + (session.rpe_score || 0), 0) / rpeData.length 
        : 0;

      const totalTrainingMinutes = rpeData?.reduce((sum, session) => sum + (session.duration_minutes || 0), 0) || 0;

      setAthleteAnalytics({
        avgWeeklySleep: Math.round(avgSleepHours * 10) / 10,
        sleepTrend: avgSleepHours > 7.5 ? '+5%' : avgSleepHours > 6.5 ? 'Stable' : '-3%',
        avgAthleteRPE: Math.round(avgRPE * 10) / 10,
        rpeTrend: avgRPE > 7 ? '+2%' : avgRPE > 5 ? 'Stable' : '-5%',
        trainingLoad: totalTrainingMinutes,
        loadTrend: totalTrainingMinutes > 300 ? '+12%' : totalTrainingMinutes > 150 ? 'Stable' : '-8%',
        sessionCount: rpeData?.length || 0
      });

    } catch (error) {
      console.error('Error fetching athlete analytics:', error);
    }
  }, []);

  const handleBatchSelect = useCallback(async (batchId) => {
    setSelectedBatchForAnalytics(batchId);
    setSelectedAthleteForAnalytics('');
    
    if (!batchId) {
      setAvailableAthletes([]);
      return;
    }

    try {
      // Get athletes in the selected batch
      const { data: batchAthleteIds } = await supabase
        .from('batch_athletes')
        .select('athlete_id')
        .eq('batch_id', batchId);

      const athleteIds = (batchAthleteIds || []).map(ba => ba.athlete_id);
      
      if (athleteIds.length === 0) {
        setAvailableAthletes([]);
        return;
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

      setAvailableAthletes(athletes || []);
    } catch (error) {
      console.error('Error fetching batch athletes:', error);
    }
  }, []);

  const handleAthleteSelect = useCallback((athleteId) => {
    setSelectedAthleteForAnalytics(athleteId);
    if (athleteId) {
      fetchAthleteAnalytics(athleteId);
    }
  }, [fetchAthleteAnalytics]);

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

      {/* Coach Analytics Selector */}
      {isCoach && (
        <Card className="sport-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5" />
              <span>Athlete Analytics</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Batch</label>
                <Select value={selectedBatchForAnalytics} onValueChange={handleBatchSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a batch" />
                  </SelectTrigger>
                  <SelectContent>
                    {batches.map((batch) => (
                      <SelectItem key={batch.id} value={batch.id}>
                        {batch.name} ({batch.batch_athletes?.length || 0} athletes)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Athlete</label>
                <Select 
                  value={selectedAthleteForAnalytics} 
                  onValueChange={handleAthleteSelect}
                  disabled={!selectedBatchForAnalytics}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an athlete" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableAthletes.map((athlete) => (
                      <SelectItem key={athlete.id} value={athlete.id}>
                        {athlete.profile?.full_name || 'Unknown'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {selectedAthleteForAnalytics && (
              <div className="space-y-4 pt-4 border-t border-border/50">
                {/* Key Metrics */}
                <div className="grid grid-cols-2 gap-4">
                  <Card className="sport-card">
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className="gradient-secondary p-2 rounded-lg">
                          <Moon className="h-5 w-5 text-accent-foreground" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Avg Sleep</p>
                          <div className="flex items-center space-x-2">
                            <span className="text-xl font-bold">{athleteAnalytics.avgWeeklySleep}h</span>
                            <Badge className="bg-green-500/20 text-green-400">{athleteAnalytics.sleepTrend}</Badge>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="sport-card">
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className="gradient-primary p-2 rounded-lg">
                          <Activity className="h-5 w-5 text-primary-foreground" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Training Load</p>
                          <div className="flex items-center space-x-2">
                            <span className="text-xl font-bold">{athleteAnalytics.trainingLoad}min</span>
                            <Badge className="bg-blue-500/20 text-blue-400">{athleteAnalytics.loadTrend}</Badge>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* RPE Analysis */}
                <Card className="sport-card">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <BarChart3 className="h-5 w-5" />
                      <span>Training Analysis</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-4 h-4 bg-blue-500 rounded"></div>
                          <span className="text-sm">Average RPE</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold">{athleteAnalytics.avgAthleteRPE}/10</span>
                          <Badge variant="outline">{athleteAnalytics.rpeTrend}</Badge>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-4 h-4 bg-orange-500 rounded"></div>
                          <span className="text-sm">Sessions This Week</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold">{athleteAnalytics.sessionCount}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Insights */}
                <Card className="sport-card">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Target className="h-5 w-5" />
                      <span>Performance Insights</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {athleteAnalytics.avgWeeklySleep > 7 ? (
                        <div className="flex items-start space-x-3 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                          <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                          <div>
                            <p className="text-sm font-medium">Great sleep habits</p>
                            <p className="text-xs text-muted-foreground">Sleep duration is optimal for recovery</p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start space-x-3 p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                          <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
                          <div>
                            <p className="text-sm font-medium">Consider more sleep</p>
                            <p className="text-xs text-muted-foreground">Aim for 7-9 hours per night for better recovery</p>
                          </div>
                        </div>
                      )}
                      
                      {athleteAnalytics.sessionCount > 0 ? (
                        <div className="flex items-start space-x-3 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                          <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                          <div>
                            <p className="text-sm font-medium">Active training week</p>
                            <p className="text-xs text-muted-foreground">Logged {athleteAnalytics.sessionCount} training sessions this week</p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start space-x-3 p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                          <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
                          <div>
                            <p className="text-sm font-medium">No sessions logged</p>
                            <p className="text-xs text-muted-foreground">Encourage athlete to track training sessions</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </CardContent>
        </Card>
      )}

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
          {todaysSchedule.length > 0 ? (
            todaysSchedule.map((session, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-card/50 rounded-lg border border-border/50">
                <div>
                  <p className="font-medium">{session.session_type || 'Training Session'}</p>
                  <p className="text-sm text-muted-foreground">
                    {session.duration_minutes ? `${session.duration_minutes} minutes` : 'Duration not specified'}
                  </p>
                  {session.notes && (
                    <p className="text-xs text-muted-foreground mt-1">{session.notes}</p>
                  )}
                </div>
                <Badge variant="outline">Scheduled</Badge>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No sessions scheduled for today</p>
              <p className="text-sm text-muted-foreground">Check your practice schedule or coach announcements</p>
            </div>
          )}
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
                onClick={() => navigate('/schedule-practice')}
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
                  <div key={batch.id} className="p-4 bg-card/50 rounded-lg border border-border/50">
                    <div className="flex items-center justify-between">
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
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedBatch(batch);
                            setShowEditBatch(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setBatchToDelete(batch);
                            setShowDeleteDialog(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
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

      {/* Edit Batch Dialog */}
      <Dialog open={showEditBatch} onOpenChange={setShowEditBatch}>
        <DialogContent className="max-w-2xl">
          {selectedBatch && (
            <EditBatchForm 
              batch={selectedBatch}
              onSuccess={() => {
                setShowEditBatch(false);
                setSelectedBatch(null);
                fetchData();
              }}
              onCancel={() => {
                setShowEditBatch(false);
                setSelectedBatch(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Batch Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Batch</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the batch "{batchToDelete?.name}"? 
              This will remove all athlete assignments from this batch. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowDeleteDialog(false);
              setBatchToDelete(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!batchToDelete) return;
                
                try {
                  // Delete all batch_athletes first
                  await supabase
                    .from('batch_athletes')
                    .delete()
                    .eq('batch_id', batchToDelete.id);
                  
                  // Then delete the batch
                  const { error } = await supabase
                    .from('batches')
                    .delete()
                    .eq('id', batchToDelete.id);
                  
                  if (error) throw error;
                  
                  toast({
                    title: "Success",
                    description: `Batch "${batchToDelete.name}" deleted successfully`,
                  });
                  
                  setShowDeleteDialog(false);
                  setBatchToDelete(null);
                  fetchData();
                } catch (error) {
                  console.error('Error deleting batch:', error);
                  toast({
                    title: "Error",
                    description: "Failed to delete batch",
                    variant: "destructive",
                  });
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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