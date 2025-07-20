import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, TrendingDown, Activity, Moon, Target, BarChart3, Calendar, Users, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Analytics = () => {
  const { profile } = useAuth();
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Coach-specific state for athlete analytics
  const [batches, setBatches] = useState<any[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<string>("");
  const [athletes, setAthletes] = useState<any[]>([]);
  const [selectedAthlete, setSelectedAthlete] = useState<string>("");
  const [athleteAnalytics, setAthleteAnalytics] = useState<any>(null);
  const [coachLoading, setCoachLoading] = useState(false);
  const [rpeComparisonData, setRpeComparisonData] = useState<any[]>([]);

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

  // Fetch analytics for selected athlete (coaches) or current user (athletes)
  const fetchAnalytics = async (targetAthleteId?: string) => {
    try {
      if (targetAthleteId) {
        setCoachLoading(true);
        console.log('Fetching analytics for target athlete:', targetAthleteId);
      } else {
        setLoading(true);
        console.log('Fetching analytics for current user athlete');
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
        console.log('Current user athlete ID:', athleteId);
      }

      if (!athleteId) {
        console.log('No athlete ID found, returning null data');
        if (targetAthleteId) {
          setAthleteAnalytics(null);
        } else {
          setAnalyticsData(null);
        }
        return;
      }

      console.log('Fetching data for athlete ID:', athleteId);

      // Fetch sleep data with better error handling
      const { data: sleepData, error: sleepError } = await supabase
        .from('sleep_logs')
        .select('*')
        .eq('athlete_id', athleteId)
        .order('sleep_date', { ascending: false })
        .limit(30);

      if (sleepError) {
        console.error('Sleep data error:', sleepError);
      }

      // Fetch RPE data with better error handling
      const { data: rpeData, error: rpeError } = await supabase
        .from('rpe_logs')
        .select('*')
        .eq('athlete_id', athleteId)
        .order('log_date', { ascending: false })
        .limit(30);

      if (rpeError) {
        console.error('RPE data error:', rpeError);
      }

      console.log('Raw fetched data for athlete:', athleteId);
      console.log('Sleep data:', sleepData);
      console.log('RPE data:', rpeData);

      // Calculate analytics with null checks
      const avgSleep = sleepData?.length ? 
        sleepData.reduce((sum, log) => sum + (parseFloat(String(log.duration_hours)) || 0), 0) / sleepData.length : 0;
      
      const avgRPE = rpeData?.length ?
        rpeData.reduce((sum, log) => sum + (log.rpe_score || 0), 0) / rpeData.length : 0;

      const trainingLoad = rpeData?.length ?
        rpeData.reduce((sum, log) => sum + ((log.rpe_score || 0) * (log.duration_minutes || 0)), 0) / rpeData.length : 0;

      // Calculate trends (comparing latest vs previous day)
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

      console.log('Calculated analytics:', analyticsResult);

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

  // Fetch RPE comparison data for both athletes and coaches
  const fetchRpeComparison = async (athleteId?: string) => {
    try {
      let targetAthleteId = athleteId;
      
      // If no athleteId provided and user is athlete, get their own athlete ID
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

      const { data: rpeData, error } = await supabase
        .from('rpe_logs')
        .select('log_date, activity_type, rpe_score, coach_rpe, notes, duration_minutes')
        .eq('athlete_id', targetAthleteId)
        .order('log_date', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching RPE comparison:', error);
        return;
      }

      // Filter to only show entries where we have both athlete and coach RPE
      const comparisonData = (rpeData || [])
        .filter(log => log.rpe_score && log.coach_rpe)
        .map(log => ({
          date: log.log_date,
          activityType: log.activity_type,
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

  // Set up real-time subscriptions for analytics updates
  useEffect(() => {
    if (!profile) return;

    let sleepChannel: any;
    let rpeChannel: any;

    const setupRealTimeSubscriptions = () => {
      // Subscribe to sleep_logs changes
      sleepChannel = supabase
        .channel('sleep-logs-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'sleep_logs'
          },
          (payload) => {
            console.log('Sleep logs changed:', payload);
            // Refresh analytics when sleep data changes
            if (profile.role === 'athlete') {
              fetchAnalytics();
            } else if (selectedAthlete) {
              fetchAnalytics(selectedAthlete);
            }
          }
        )
        .subscribe();

      // Subscribe to rpe_logs changes
      rpeChannel = supabase
        .channel('rpe-logs-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'rpe_logs'
          },
          (payload) => {
            console.log('RPE logs changed:', payload);
            // Refresh analytics when RPE data changes
            if (profile.role === 'athlete') {
              fetchAnalytics();
            } else if (selectedAthlete) {
              fetchAnalytics(selectedAthlete);
            }
          }
        )
        .subscribe();
    };

    setupRealTimeSubscriptions();

    return () => {
      if (sleepChannel) supabase.removeChannel(sleepChannel);
      if (rpeChannel) supabase.removeChannel(rpeChannel);
    };
  }, [profile, selectedAthlete]);

  useEffect(() => {
    if (profile) {
      if (profile.role === 'coach') {
        fetchBatches();
      } else {
        fetchAnalytics();
      }
    }
  }, [profile]);

  useEffect(() => {
    if (selectedBatch) {
      fetchAthletes(selectedBatch);
      setSelectedAthlete("");
      setAthleteAnalytics(null);
    }
  }, [selectedBatch]);

  useEffect(() => {
    if (selectedAthlete) {
      fetchAnalytics(selectedAthlete);
      fetchRpeComparison(selectedAthlete);
    } else {
      setAthleteAnalytics(null);
      setRpeComparisonData([]);
    }
  }, [selectedAthlete]);

  // Fetch RPE comparison for athletes on mount
  useEffect(() => {
    if (profile?.role === 'athlete') {
      fetchRpeComparison();
    }
  }, [profile]);

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

  if (loading) {
    return (
      <div className="mobile-container flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  // Show analytics for athletes always, for coaches only when athlete is selected
  const displayData = profile?.role === 'athlete' ? analyticsData : athleteAnalytics;

  return (
    <div className="mobile-container space-y-6 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <Badge variant="outline" className="px-3 py-1">
          {profile?.role?.charAt(0).toUpperCase() + profile?.role?.slice(1)}
        </Badge>
      </div>

      {/* Coach Analytics Section */}
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
              Select a batch and athlete to view analytics
            </div>
          )}

          {coachLoading && selectedAthlete && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full"></div>
            </div>
          )}
        </div>
      )}

      {displayData ? (
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
                    <span className="text-3xl font-bold text-foreground">{displayData.totalSessions}</span>
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
                    <span className="text-3xl font-bold text-foreground">{displayData.avgRPE.toFixed(0)}</span>
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
                    <span className="text-3xl font-bold text-foreground">{displayData.trainingLoad}</span>
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
                    <span className="text-3xl font-bold text-foreground">{displayData.avgSleep.toFixed(1)}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 font-medium">Average Hours</p>
                </div>
              </div>
            </Card>
          </div>

          {/* RPE Comparison Table for Athletes and Coaches */}
          {rpeComparisonData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>Coach vs Athlete RPE Comparison</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-64 overflow-y-auto">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead className="sticky top-0 bg-background z-10">
                        <tr className="border-b border-border">
                          <th className="text-left p-3 text-sm font-medium text-muted-foreground">Date</th>
                          <th className="text-left p-3 text-sm font-medium text-muted-foreground">Activity</th>
                          <th className="text-center p-3 text-sm font-medium text-muted-foreground">Athlete RPE</th>
                          <th className="text-center p-3 text-sm font-medium text-muted-foreground">Coach RPE</th>
                          <th className="text-center p-3 text-sm font-medium text-muted-foreground">Difference</th>
                          <th className="text-left p-3 text-sm font-medium text-muted-foreground">Duration</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rpeComparisonData.map((row, index) => (
                          <tr key={index} className="border-b border-border/50 hover:bg-muted/30">
                            <td className="p-3 text-sm">{new Date(row.date).toLocaleDateString()}</td>
                            <td className="p-3 text-sm">
                              <Badge variant="outline" className="text-xs">
                                {row.activityType}
                              </Badge>
                            </td>
                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center space-x-1">
                                <Star className="h-3 w-3 text-blue-500" />
                                <span className="text-sm font-medium">{row.athleteRpe}</span>
                              </div>
                            </td>
                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center space-x-1">
                                <Star className="h-3 w-3 text-orange-500" />
                                <span className="text-sm font-medium">{row.coachRpe}</span>
                              </div>
                            </td>
                            <td className="p-3 text-center">
                              <div className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                                row.difference > 0 
                                  ? 'bg-red-500/20 text-red-400' 
                                  : row.difference < 0 
                                  ? 'bg-green-500/20 text-green-400'
                                  : 'bg-gray-500/20 text-gray-400'
                              }`}>
                                {row.difference > 0 ? '+' : ''}{row.difference}
                              </div>
                            </td>
                            <td className="p-3 text-sm text-muted-foreground">{row.duration} min</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground">
                    <strong>Legend:</strong> 
                    <span className="ml-2">Positive difference = Athlete rated higher than coach</span>
                    <span className="ml-2">•</span>
                    <span className="ml-2">Negative difference = Coach rated higher than athlete</span>
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Summary Card */}
          <Card>
            <CardHeader>
              <CardTitle>Performance Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center text-muted-foreground">
                {profile?.role === 'coach' 
                  ? `Analytics for selected athlete showing ${displayData.totalSessions} total sessions.`
                  : `Your analytics show ${displayData.totalSessions} total sessions tracked.`
                }
              </p>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">
              {profile?.role === 'coach' 
                ? "Select an athlete to view their analytics."
                : "No data available. Start logging your training sessions and sleep to see analytics."
              }
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Analytics;