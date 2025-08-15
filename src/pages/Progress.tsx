import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress as ProgressBar } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle, XCircle, Clock, Target, Users, Calendar, TrendingUp, TrendingDown, Activity, Moon, BarChart3, Star, Plus, Info } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SetGoalForm } from "@/components/forms/SetGoalForm";

const Progress = () => {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState("progress");
  const [goals, setGoals] = useState<any[]>([]);
  const [coachComments, setCoachComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentsLoading, setCommentsLoading] = useState(false);
  
  // Analytics state
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [athleteAnalytics, setAthleteAnalytics] = useState<any>(null);
  const [coachLoading, setCoachLoading] = useState(false);
  const [rpeComparisonData, setRpeComparisonData] = useState<any[]>([]);
  
  // Coach-specific state
  const [batches, setBatches] = useState<any[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<string>("");
  const [athletes, setAthletes] = useState<any[]>([]);
  const [selectedAthlete, setSelectedAthlete] = useState<string>("");

  // Fetch batches for coaches
  const fetchBatches = async () => {
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
  };

  // Fetch athletes in selected batch
  const fetchAthletes = async (batchId: string) => {
    try {
      // Get athletes in the selected batch
      const { data: batchAthleteIds } = await supabase
        .from('batch_athletes')
        .select('athlete_id')
        .eq('batch_id', batchId);

      const athleteIds = (batchAthleteIds || []).map(ba => ba.athlete_id);
      
      if (athleteIds.length === 0) {
        setAthletes([]);
        return;
      }

      const { data: athletes } = await supabase
        .from('athletes')
        .select(`
          id,
          profiles!athletes_profile_id_fkey (
            id,
            full_name
          )
        `)
        .in('id', athleteIds);

      const athletesList = (athletes || []).map(athlete => ({
        id: athlete.id,
        profile_id: athlete.profiles?.id,
        name: athlete.profiles?.full_name || 'Unknown'
      }));

      setAthletes(athletesList);
    } catch (error) {
      console.error('Error fetching batch athletes:', error);
      setAthletes([]);
    }
  };

  // Fetch goals for the selected athlete or current user
  const fetchGoals = async (targetAthleteId?: string) => {
    try {
      setLoading(true);
      
      // Get athlete data based on user role
      let athleteId = targetAthleteId;
      if (!athleteId && profile?.role === 'athlete') {
        const { data: athleteData } = await supabase
          .from('athletes')
          .select('id')
          .eq('profile_id', profile.id)
          .single();
        athleteId = athleteData?.id;
      }

      if (!athleteId) {
        setGoals([]);
        return;
      }

      const { data: goalsData } = await supabase
        .from('goals')
        .select('*')
        .eq('athlete_id', athleteId)
        .order('created_at', { ascending: false });

      setGoals(goalsData || []);
    } catch (error) {
      console.error('Error fetching goals:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch analytics for selected athlete (coaches) or current user (athletes)
  const fetchAnalytics = async (targetAthleteId?: string) => {
    try {
      if (targetAthleteId) {
        setCoachLoading(true);
      } else {
        setLoading(true);
      }
      
      // Get athlete data based on user role
      let athleteId = targetAthleteId;
      if (!athleteId && profile?.role === 'athlete') {
        const { data: athleteData } = await supabase
          .from('athletes')
          .select('id')
          .eq('profile_id', profile.id)
          .single();
        athleteId = athleteData?.id;
      }

      if (!athleteId) {
        if (targetAthleteId) {
          setAthleteAnalytics(null);
        } else {
          setAnalyticsData(null);
        }
        return;
      }

      // Fetch sleep data
      const { data: sleepData } = await supabase
        .from('sleep_logs')
        .select('*')
        .eq('athlete_id', athleteId)
        .order('sleep_date', { ascending: false })
        .limit(30);

      // Fetch RPE data
      const { data: rpeData } = await supabase
        .from('rpe_logs')
        .select('*')
        .eq('athlete_id', athleteId)
        .order('log_date', { ascending: false })
        .limit(30);

      // Calculate analytics
      const avgSleep = sleepData?.length ? 
        sleepData.reduce((sum, log) => sum + (parseFloat(String(log.duration_hours)) || 0), 0) / sleepData.length : 0;
      
      const avgRPE = rpeData?.length ?
        rpeData.reduce((sum, log) => sum + (log.rpe_score || 0), 0) / rpeData.length : 0;

      const trainingLoad = rpeData?.length ?
        rpeData.reduce((sum, log) => sum + ((log.rpe_score || 0) * (log.duration_minutes || 0)), 0) / rpeData.length : 0;

      // Calculate trends
      const sleepTrend = sleepData?.length >= 2 ? 
        (parseFloat(String(sleepData[0]?.duration_hours)) || 0) - (parseFloat(String(sleepData[1]?.duration_hours)) || 0) : 0;
      
      const rpeTrend = rpeData?.length >= 2 ?
        (rpeData[0]?.rpe_score || 0) - (rpeData[1]?.rpe_score || 0) : 0;

      const analyticsResult = {
        avgSleep: Number(avgSleep.toFixed(1)),
        avgRPE: Number(avgRPE.toFixed(1)),
        trainingLoad: Number(trainingLoad.toFixed(0)),
        sleepTrend: Number(sleepTrend.toFixed(1)),
        rpeTrend: Number(rpeTrend.toFixed(1)),
        totalSessions: rpeData?.length || 0
      };

      if (targetAthleteId) {
        setAthleteAnalytics(analyticsResult);
      } else {
        setAnalyticsData(analyticsResult);
      }

    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      if (targetAthleteId) {
        setCoachLoading(false);
      } else {
        setLoading(false);
      }
    }
  };

  // Fetch RPE comparison data
  const fetchRpeComparison = async (athleteId?: string) => {
    try {
      let targetAthleteId = athleteId;
      
      if (!targetAthleteId && profile?.role === 'athlete') {
        const { data: athleteData } = await supabase
          .from('athletes')
          .select('id')
          .eq('profile_id', profile.id)
          .single();
        targetAthleteId = athleteData?.id;
      }

      if (!targetAthleteId) {
        setRpeComparisonData([]);
        return;
      }

      // First get RPE logs with both athlete and coach ratings
      const { data: rpeData } = await supabase
        .from('rpe_logs')
        .select('log_date, activity_type, rpe_score, coach_rpe, notes, duration_minutes')
        .eq('athlete_id', targetAthleteId)
        .not('rpe_score', 'is', null)
        .not('coach_rpe', 'is', null)
        .order('log_date', { ascending: false })
        .limit(10);

      // Get practice sessions for the same dates to get session names
      const logDates = (rpeData || []).map(log => log.log_date);
      let practiceSessionsMap: { [key: string]: string } = {};
      
      if (logDates.length > 0) {
        const { data: sessions } = await supabase
          .from('practice_sessions')
          .select('session_date, notes, session_type')
          .eq('athlete_id', targetAthleteId)
          .in('session_date', logDates);
        
        // Create a map of date to practice title (extract just the title, not full notes)
        (sessions || []).forEach(session => {
          // Extract just the practice name from notes (first line or before colon)
          let practiceTitle = session.session_type || 'Practice Session';
          if (session.notes) {
            // Try to extract just the title part (first line or part before colon/details)
            const firstLine = session.notes.split('\n')[0].trim();
            const titlePart = firstLine.split(':')[0].trim();
            practiceTitle = titlePart || session.session_type || 'Practice Session';
          }
          practiceSessionsMap[session.session_date] = practiceTitle;
        });
      }

      const comparisonData = (rpeData || [])
        .filter(log => log.rpe_score && log.coach_rpe)
        .map(log => ({
          date: log.log_date,
          activityType: practiceSessionsMap[log.log_date] || log.activity_type || 'Practice Session',
          athleteRpe: log.rpe_score,
          coachRpe: log.coach_rpe,
          difference: log.rpe_score - log.coach_rpe,
          duration: log.duration_minutes,
          notes: log.notes
        }));

      setRpeComparisonData(comparisonData);
    } catch (error) {
      console.error('Error fetching RPE comparison:', error);
      setRpeComparisonData([]);
    }
  };

  // Fetch coach comments for the selected athlete or current user
  const fetchCoachComments = async (targetAthleteId?: string) => {
    try {
      setCommentsLoading(true);
      
      // Get athlete data based on user role
      let athleteId = targetAthleteId;
      if (!athleteId && profile?.role === 'athlete') {
        const { data: athleteData } = await supabase
          .from('athletes')
          .select('id')
          .eq('profile_id', profile.id)
          .single();
        athleteId = athleteData?.id;
      }

      if (!athleteId) {
        setCoachComments([]);
        return;
      }

      const { data: commentsData } = await supabase
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

      setCoachComments(commentsData || []);
    } catch (error) {
      console.error('Error fetching coach comments:', error);
    } finally {
      setCommentsLoading(false);
    }
  };

  // Helper function to get completion status icon
  const getCompletionIcon = (goal: any) => {
    if (goal.coach_completed || goal.progress_percentage === 100) {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    }
    return <Clock className="h-5 w-5 text-blue-500" />;
  };

  // Toggle coach completion status
  const toggleCoachCompletion = async (goalId: string, currentStatus: boolean) => {
    try {
      const updateData = {
        coach_completed: !currentStatus,
        completed_by_coach_at: !currentStatus ? new Date().toISOString() : null,
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

      setGoals(prevGoals => 
        prevGoals.map(goal => 
          goal.id === goalId 
            ? { 
                ...goal, 
                coach_completed: !currentStatus,
                completed_by_coach_at: !currentStatus ? new Date().toISOString() : null,
                progress_percentage: !currentStatus ? 100 : goal.progress_percentage
              }
            : goal
        )
      );
    } catch (error) {
      console.error('Error toggling coach completion:', error);
    }
  };

  // Update goal progress
  const updateProgress = async (goalId: string, newProgress: number) => {
    try {
      const updateData = {
        progress_percentage: newProgress,
        ...(newProgress === 100 && {
          coach_completed: true,
          completed_by_coach_at: new Date().toISOString()
        }),
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

      setGoals(prevGoals => 
        prevGoals.map(goal => 
          goal.id === goalId 
            ? { 
                ...goal, 
                progress_percentage: newProgress,
                coach_completed: newProgress === 100 ? true : (newProgress < 100 ? false : goal.coach_completed),
                completed_by_coach_at: newProgress === 100 ? new Date().toISOString() : (newProgress < 100 ? null : goal.completed_by_coach_at)
              }
            : goal
        )
      );
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  };

  const getInsight = (metric: string, value: number, trend: number) => {
    switch (metric) {
      case 'sleep':
        if (value >= 8) return { text: "Excellent sleep quality", variant: "default" as const };
        if (value >= 7) return { text: "Good sleep quality", variant: "secondary" as const };
        return { text: "Needs improvement", variant: "destructive" as const };
      
      case 'rpe':
        if (value <= 3) return { text: "Light intensity", variant: "secondary" as const };
        if (value <= 6) return { text: "Moderate intensity", variant: "default" as const };
        return { text: "High intensity", variant: "destructive" as const };
      
      case 'load':
        if (trend > 0) return { text: "Increasing load", variant: "default" as const };
        if (trend < 0) return { text: "Decreasing load", variant: "secondary" as const };
        return { text: "Stable load", variant: "outline" as const };
      
      default:
        return { text: "No data", variant: "outline" as const };
    }
  };

  // Effects for data fetching
  useEffect(() => {
    if (profile) {
      if (profile.role === 'coach') {
        fetchBatches();
      } else {
        if (activeTab === 'progress') {
          fetchGoals();
        } else if (activeTab === 'comments') {
          fetchCoachComments();
        } else if (activeTab === 'analytics') {
          fetchAnalytics();
          fetchRpeComparison();
        }
      }
    }
  }, [profile, activeTab]);

  useEffect(() => {
    if (selectedBatch) {
      fetchAthletes(selectedBatch);
      setSelectedAthlete("");
    }
  }, [selectedBatch]);

  useEffect(() => {
    if (selectedAthlete) {
      if (activeTab === 'progress') {
        fetchGoals(selectedAthlete);
      } else if (activeTab === 'comments') {
        fetchCoachComments(selectedAthlete);
      } else if (activeTab === 'analytics') {
        fetchAnalytics(selectedAthlete);
        fetchRpeComparison(selectedAthlete);
      }
    } else if (profile?.role === 'coach') {
      setGoals([]);
      setCoachComments([]);
      setAthleteAnalytics(null);
      setRpeComparisonData([]);
    }
  }, [selectedAthlete, activeTab]);

  if (loading) {
    return (
      <div className="mobile-container flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="mobile-container space-y-6 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Progress</h1>
        {profile?.role === 'athlete' && activeTab === 'progress' && (
          <Button 
            className="gradient-primary text-primary-foreground"
            onClick={() => window.location.href = '/set-goal'}
          >
            <Plus className="h-4 w-4 mr-2" />
            Set Goal
          </Button>
        )}
        <Badge variant="outline" className="px-3 py-1">
          {profile?.role?.charAt(0).toUpperCase() + profile?.role?.slice(1)}
        </Badge>
      </div>

      {/* Coach Selection Section */}
      {profile?.role === 'coach' && (
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
              Select a batch and athlete to view their data
            </div>
          )}
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="progress">Progress</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="comments">Comments</TabsTrigger>
        </TabsList>

        <TabsContent value="progress" className="space-y-4">
          {goals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No goals set yet. {profile?.role === 'athlete' ? 'Click "Set Goal" to create your first goal.' : 'The athlete has not set any goals yet.'}
            </div>
          ) : (
            <div className="space-y-4">
              {goals.map((goal) => {
                return (
                  <Card key={goal.id} className="bg-card/50 backdrop-blur border-border/20">
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            {getCompletionIcon(goal)}
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-xl text-foreground">{goal.title}</h3>
                            </div>
                          </div>
                          
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm" className="ml-4 shrink-0">
                                <Info className="h-4 w-4 mr-1" />
                                Details
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[500px]">
                              <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                  {getCompletionIcon(goal)}
                                  {goal.title}
                                </DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <h4 className="font-medium mb-2">Description</h4>
                                  <p className="text-muted-foreground">{goal.description || "No description provided"}</p>
                                </div>
                                
                                <div>
                                  <h4 className="font-medium mb-2">Progress</h4>
                                  <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                      <span>Completion</span>
                                      <span>{goal.progress_percentage || 0}%</span>
                                    </div>
                                    <ProgressBar value={goal.progress_percentage || 0} className="w-full" />
                                  </div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <h4 className="font-medium mb-1">Target Date</h4>
                                    <p className="text-muted-foreground">
                                      {goal.target_date ? new Date(goal.target_date).toLocaleDateString() : "No date set"}
                                    </p>
                                  </div>
                                  <div>
                                    <h4 className="font-medium mb-1">Created</h4>
                                    <p className="text-muted-foreground">
                                      {goal.created_at ? new Date(goal.created_at).toLocaleDateString() : "Unknown"}
                                    </p>
                                  </div>
                                </div>
                                
                                {goal.priority && (
                                  <div>
                                    <h4 className="font-medium mb-1">Priority</h4>
                                    <Badge variant="outline">{goal.priority}</Badge>
                                  </div>
                                )}
                                
                                {goal.coach_completed && (
                                  <div>
                                    <h4 className="font-medium mb-1">Completion Status</h4>
                                    <div className="flex items-center gap-2">
                                      <CheckCircle className="h-4 w-4 text-green-500" />
                                      <span className="text-sm text-muted-foreground">
                                        Completed by coach on {goal.completed_by_coach_at ? new Date(goal.completed_by_coach_at).toLocaleDateString() : "Unknown date"}
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                        
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground min-w-0">{goal.progress_percentage || 0}%</span>
                            <ProgressBar value={goal.progress_percentage || 0} className="flex-1 h-3" />
                          </div>
                          
                          {profile?.role === 'coach' && (
                            <div className="flex gap-2">
                              {[25, 50, 75, 100].map((percent) => (
                                <Button
                                  key={percent}
                                  variant={percent === 100 && goal.coach_completed ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => {
                                    if (percent === 100) {
                                      updateProgress(goal.id, percent);
                                    } else {
                                      // Reverse completion if clicking other percentages
                                      const updateData = {
                                        progress_percentage: percent,
                                        coach_completed: false,
                                        completed_by_coach_at: null
                                      };
                                      
                                      supabase
                                        .from('goals')
                                        .update(updateData)
                                        .eq('id', goal.id)
                                        .then(({ error }) => {
                                          if (!error) {
                                            setGoals(prevGoals => 
                                              prevGoals.map(g => 
                                                g.id === goal.id 
                                                  ? { ...g, ...updateData }
                                                  : g
                                              )
                                            );
                                          }
                                        });
                                    }
                                  }}
                                  className="flex-1"
                                >
                                  {percent}%
                                </Button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          {profile?.role === 'coach' && !selectedAthlete && (
            <div className="text-center py-8 text-muted-foreground">
              Select a batch and athlete to view analytics
            </div>
          )}

          {coachLoading && selectedAthlete && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full"></div>
            </div>
          )}

          {(profile?.role === 'athlete' ? analyticsData : athleteAnalytics) && (
            <>
              {/* Key Metrics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-card/50 backdrop-blur border-border/20 p-4">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center">
                      <Activity className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground font-medium mb-1">This Week</p>
                      <div className="flex items-baseline space-x-1">
                        <span className="text-3xl font-bold text-foreground">
                          {(profile?.role === 'athlete' ? analyticsData : athleteAnalytics)?.totalSessions}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 font-medium">Sessions</p>
                    </div>
                  </div>
                </Card>

                <Card className="bg-card/50 backdrop-blur border-border/20 p-4">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                      <TrendingUp className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground font-medium mb-1">Avg RPE</p>
                      <div className="flex items-baseline space-x-1">
                        <span className="text-3xl font-bold text-foreground">
                          {(profile?.role === 'athlete' ? analyticsData : athleteAnalytics)?.avgRPE?.toFixed(0)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 font-medium">out of 10</p>
                    </div>
                  </div>
                </Card>

                <Card className="bg-card/50 backdrop-blur border-border/20 p-4">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
                      <Target className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground font-medium mb-1">Training Load</p>
                      <div className="flex items-baseline space-x-1">
                        <span className="text-3xl font-bold text-foreground">
                          {(profile?.role === 'athlete' ? analyticsData : athleteAnalytics)?.trainingLoad}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 font-medium">Total Score</p>
                    </div>
                  </div>
                </Card>

                <Card className="bg-card/50 backdrop-blur border-border/20 p-4">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center">
                      <BarChart3 className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground font-medium mb-1">Sleep Quality</p>
                      <div className="flex items-baseline space-x-1">
                        <span className="text-3xl font-bold text-foreground">
                          {(profile?.role === 'athlete' ? analyticsData : athleteAnalytics)?.avgSleep?.toFixed(1)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 font-medium">Average Hours</p>
                    </div>
                  </div>
                </Card>
              </div>

              {/* RPE Comparison Table */}
              {rpeComparisonData.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Star className="h-5 w-5" />
                      RPE Comparison
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Practice Title</TableHead>
                          <TableHead className="text-center">Athlete RPE</TableHead>
                          <TableHead className="text-center">Coach RPE</TableHead>
                          <TableHead className="text-center">Diff</TableHead>
                          <TableHead className="text-center">Details</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rpeComparisonData.map((entry, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{entry.activityType}</TableCell>
                            <TableCell className="text-center">{entry.athleteRpe}</TableCell>
                            <TableCell className="text-center">{entry.coachRpe}</TableCell>
                            <TableCell className="text-center">
                              <span className={`font-medium ${
                                entry.difference > 0 ? 'text-red-500' : 
                                entry.difference < 0 ? 'text-green-500' : 'text-muted-foreground'
                              }`}>
                                {entry.difference > 0 ? '+' : ''}{entry.difference}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="outline" size="sm">
                                    Details
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-md">
                                  <DialogHeader>
                                    <DialogTitle>Session Details</DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <div>
                                      <h4 className="font-medium mb-1">Practice</h4>
                                      <p className="text-sm">{entry.activityType}</p>
                                    </div>
                                    <div>
                                      <h4 className="font-medium mb-1">Date</h4>
                                      <p className="text-sm">{new Date(entry.date).toLocaleDateString()}</p>
                                    </div>
                                    <div>
                                      <h4 className="font-medium mb-1">RPE Scores</h4>
                                      <div className="flex justify-between items-center text-sm">
                                        <span>Athlete: <strong>{entry.athleteRpe}</strong></span>
                                        <span>Coach: <strong>{entry.coachRpe}</strong></span>
                                        <span className={`font-medium ${
                                          entry.difference > 0 ? 'text-red-500' : 
                                          entry.difference < 0 ? 'text-green-500' : 'text-muted-foreground'
                                        }`}>
                                          Diff: {entry.difference > 0 ? '+' : ''}{entry.difference}
                                        </span>
                                      </div>
                                    </div>
                                    {entry.notes && (
                                      <div>
                                        <h4 className="font-medium mb-1">Notes</h4>
                                        <p className="text-sm text-muted-foreground">{entry.notes}</p>
                                      </div>
                                    )}
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {profile?.role === 'athlete' && !analyticsData && (
            <div className="text-center py-8 text-muted-foreground">
              No analytics data available. Start logging your training sessions and sleep to see insights.
            </div>
          )}
        </TabsContent>

        <TabsContent value="comments" className="space-y-4">
          {commentsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full"></div>
            </div>
          ) : coachComments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No coach comments available yet.
            </div>
          ) : (
            <div className="space-y-4">
              {coachComments.map((comment) => (
                <Card key={comment.id} className="bg-card/50 backdrop-blur border-border/20">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{comment.tournament?.name}</CardTitle>
                        <p className="text-muted-foreground text-sm">
                          {comment.tournament?.location} • {comment.tournament?.start_date ? new Date(comment.tournament.start_date).toLocaleDateString() : 'No date'}
                        </p>
                      </div>
                      {comment.position && (
                        <Badge variant="outline">
                          Position: {comment.position}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium mb-2">Coach Comments</h4>
                        <p className="text-muted-foreground">{comment.coach_comments}</p>
                      </div>
                      
                      {comment.strong_points && (
                        <div>
                          <h4 className="font-medium mb-2 text-green-600">Strong Points</h4>
                          <p className="text-muted-foreground">{comment.strong_points}</p>
                        </div>
                      )}
                      
                      {comment.areas_of_improvement && (
                        <div>
                          <h4 className="font-medium mb-2 text-orange-600">Areas for Improvement</h4>
                          <p className="text-muted-foreground">{comment.areas_of_improvement}</p>
                        </div>
                      )}
                      
                      <div className="text-xs text-muted-foreground">
                        Commented on: {comment.coach_completed_at ? new Date(comment.coach_completed_at).toLocaleDateString() : 'Unknown'}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Progress;