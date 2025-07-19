import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, TrendingDown, Activity, Moon, Target } from "lucide-react";
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

  // Fetch batches for coaches
  const fetchBatches = async () => {
    if (profile?.role !== 'coach') return;
    
    const { data: coachData } = await supabase
      .from('coaches')
      .select('id')
      .eq('profile_id', profile.id)
      .single();

    if (coachData) {
      const { data: batchesData } = await supabase
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
        sleepData.reduce((sum, log) => sum + (Number(log.duration_hours) || 0), 0) / sleepData.length : 0;
      
      const avgRPE = rpeData?.length ?
        rpeData.reduce((sum, log) => sum + (log.rpe_score || 0), 0) / rpeData.length : 0;

      const trainingLoad = rpeData?.length ?
        rpeData.reduce((sum, log) => sum + ((log.rpe_score || 0) * (log.duration_minutes || 0)), 0) / rpeData.length : 0;

      // Calculate trends (comparing latest vs previous day)
      const sleepTrend = sleepData?.length >= 2 ? 
        (Number(sleepData[0]?.duration_hours) || 0) - (Number(sleepData[1]?.duration_hours) || 0) : 0;
      
      const rpeTrend = rpeData?.length >= 2 ?
        (rpeData[0]?.rpe_score || 0) - (rpeData[1]?.rpe_score || 0) : 0;

      const analyticsResult = {
        avgSleep: Number(avgSleep.toFixed(1)),
        avgRPE: Number(avgRPE.toFixed(1)),
        trainingLoad: Number(trainingLoad.toFixed(0)),
        sleepTrend,
        rpeTrend,
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
      setLoading(false);
    }
  };

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
    }
  }, [selectedAthlete]);

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
        </div>
      )}

      {displayData ? (
        <>
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Sleep Quality</CardTitle>
                <Moon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-2xl font-bold">{displayData.avgSleep}h</div>
                  <p className="text-xs text-muted-foreground">
                    {displayData.sleepTrend >= 0 ? (
                      <span className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        +{displayData.sleepTrend.toFixed(1)}h from yesterday
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <TrendingDown className="h-3 w-3" />
                        {displayData.sleepTrend.toFixed(1)}h from yesterday
                      </span>
                    )}
                  </p>
                  <Badge 
                    variant={getInsight('sleep', displayData.avgSleep, displayData.sleepTrend).variant}
                    className="mt-2"
                  >
                    {getInsight('sleep', displayData.avgSleep, displayData.sleepTrend).text}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Training Load</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-2xl font-bold">{displayData.trainingLoad}</div>
                  <p className="text-xs text-muted-foreground">
                    RPE × Duration average
                  </p>
                  <Badge 
                    variant={getInsight('load', displayData.trainingLoad, 0).variant}
                    className="mt-2"
                  >
                    {getInsight('load', displayData.trainingLoad, 0).text}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">RPE Average</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-2xl font-bold">{displayData.avgRPE}/10</div>
                  <p className="text-xs text-muted-foreground">
                    {displayData.rpeTrend >= 0 ? (
                      <span className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        +{displayData.rpeTrend.toFixed(1)} from yesterday
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <TrendingDown className="h-3 w-3" />
                        {displayData.rpeTrend.toFixed(1)} from yesterday
                      </span>
                    )}
                  </p>
                  <Badge 
                    variant={getInsight('rpe', displayData.avgRPE, displayData.rpeTrend).variant}
                    className="mt-2"
                  >
                    {getInsight('rpe', displayData.avgRPE, displayData.rpeTrend).text}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

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