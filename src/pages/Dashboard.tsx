import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Calendar, Trophy, Moon, Target, Activity, TrendingUp, Users, ChevronDown, Plus, Edit, Trash2, BarChart3, CalendarDays } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
// Dynamic imports for heavy components
import { DynamicCreateBatchForm, DynamicEditBatchForm } from '@/components/forms/DynamicForms';
import { DynamicCalendar } from '@/components/ui/DynamicCalendar';
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
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [attendanceData, setAttendanceData] = useState([]);

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

          // Fetch attendance data for coaches
          await fetchAttendanceData(coach.id, selectedDate);
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
          time: `${Math.round(Math.abs(new Date().getTime() - new Date(sessionsData[0].log_date).getTime()) / (1000 * 60 * 60))} hours ago`,
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
  }, [profile, selectedDate]);

  const fetchAttendanceData = async (coachId, date) => {
    try {
      const dateStr = format(date, 'yyyy-MM-dd');
      
      // First get all batches for this coach
      const { data: coachBatches } = await supabase
        .from('batches')
        .select('id')
        .eq('coach_id', coachId);

      if (!coachBatches || coachBatches.length === 0) {
        setAttendanceData([]);
        return;
      }

      const batchIds = coachBatches.map(b => b.id);

      // Get all athletes in coach's batches
      const { data: batchAthletes } = await supabase
        .from('batch_athletes')
        .select('athlete_id')
        .in('batch_id', batchIds);

      if (!batchAthletes || batchAthletes.length === 0) {
        setAttendanceData([]);
        return;
      }

      const athleteIds = batchAthletes.map(ba => ba.athlete_id);

      // Get athlete details
      const { data: athletes } = await supabase
        .from('athletes')
        .select(`
          id,
          profiles!inner(
            full_name
          )
        `)
        .in('id', athleteIds);

      // Get RPE logs for selected date from coach
      const { data: rpeData } = await supabase
        .from('rpe_logs')
        .select('athlete_id, coach_rpe')
        .eq('log_date', dateStr)
        .not('coach_rpe', 'is', null);

      // Create attendance array
      const attendance = (athletes || []).map(athlete => {
        const hasCoachRpe = rpeData?.find(rpe => rpe.athlete_id === athlete.id);
        return {
          athlete_id: athlete.id,
          athlete_name: athlete.profiles?.full_name || 'Unknown',
          status: hasCoachRpe ? 'attended' : 'absent',
          coach_rpe: hasCoachRpe?.coach_rpe
        };
      });

      setAttendanceData(attendance);
    } catch (error) {
      console.error('Error fetching attendance data:', error);
    }
  };

  // Refresh attendance data when date changes
  useEffect(() => {
    if (profile?.role === 'coach') {
      const getCoachData = async () => {
        const { data: coach } = await supabase
          .from('coaches')
          .select('id')
          .eq('profile_id', profile.id)
          .single();
        
        if (coach) {
          await fetchAttendanceData(coach.id, selectedDate);
        }
      };
      getCoachData();
    }
  }, [selectedDate, profile]);


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

      {/* Quick Actions - Moved to top */}
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

      {/* Today's Schedule / Attendance */}
      <Card className="sport-card">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>{isCoach ? 'Attendance' : "Today's Schedule"}</span>
            </div>
            {isCoach && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[240px] justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarDays className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <DynamicCalendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isCoach ? (
            // Coach: Show attendance data with fixed height and scroll
            <div className="h-64">
              {attendanceData.length > 0 ? (
                <div className="h-full overflow-y-auto space-y-2">
                  {attendanceData.map((athlete, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-card/50 rounded-lg border border-border/50">
                      <div>
                        <p className="font-medium">{athlete.athlete_name}</p>
                        {athlete.status === 'attended' && athlete.coach_rpe && (
                          <p className="text-sm text-muted-foreground">Coach RPE: {athlete.coach_rpe}</p>
                        )}
                      </div>
                      <Badge variant={athlete.status === 'attended' ? 'default' : 'secondary'}>
                        {athlete.status === 'attended' ? 'Attended' : 'Absent'}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center">
                  <Users className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No athletes found for selected date</p>
                  <p className="text-sm text-muted-foreground">Make sure you have athletes assigned to your batches</p>
                </div>
              )}
            </div>
          ) : (
            // Athlete: Show today's schedule
            todaysSchedule.length > 0 ? (
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
            )
          )}
        </CardContent>
      </Card>

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

      {/* Analytics Stats - Moved below My Batches */}
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

      {/* Create Batch Dialog */}
      <Dialog open={showCreateBatch} onOpenChange={setShowCreateBatch}>
        <DialogContent className="max-w-2xl">
          <DynamicCreateBatchForm 
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
            <DynamicEditBatchForm 
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

export default Dashboard;