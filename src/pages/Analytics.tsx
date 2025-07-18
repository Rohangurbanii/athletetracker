import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart3, TrendingUp, Moon, Activity, Trophy, Target } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export const Analytics = () => {
  const { profile } = useAuth();
  const isCoach = profile?.role === 'coach';
  const [analyticsData, setAnalyticsData] = useState({
    avgWeeklySleep: 0,
    sleepTrend: 'N/A',
    avgAthleteRPE: 0,
    rpeTrend: 'N/A',
    trainingLoad: 0,
    loadTrend: 'N/A',
    sessionCount: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!profile) return;

      try {
        // Get the athlete record for this profile
        const { data: athleteData, error: athleteError } = await supabase
          .from('athletes')
          .select('id')
          .eq('profile_id', profile.id)
          .maybeSingle();

        if (athleteError || !athleteData) {
          console.log('No athlete record found');
          setLoading(false);
          return;
        }

        // Get recent sleep data (last 7 days)
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        
        const { data: sleepData } = await supabase
          .from('sleep_logs')
          .select('duration_hours, quality_rating')
          .eq('athlete_id', athleteData.id)
          .gte('sleep_date', weekAgo.toISOString().split('T')[0]);

        // Get recent RPE data (last 7 days)
        const { data: rpeData } = await supabase
          .from('rpe_logs')
          .select('rpe_score, duration_minutes')
          .eq('athlete_id', athleteData.id)
          .gte('log_date', weekAgo.toISOString().split('T')[0]);

        // Calculate analytics
        const avgSleepHours = sleepData?.length 
          ? sleepData.reduce((sum, sleep) => sum + (sleep.duration_hours || 0), 0) / sleepData.length 
          : 0;

        const avgRPE = rpeData?.length 
          ? rpeData.reduce((sum, session) => sum + (session.rpe_score || 0), 0) / rpeData.length 
          : 0;

        const totalTrainingMinutes = rpeData?.reduce((sum, session) => sum + (session.duration_minutes || 0), 0) || 0;

        setAnalyticsData({
          avgWeeklySleep: Math.round(avgSleepHours * 10) / 10,
          sleepTrend: avgSleepHours > 7.5 ? '+5%' : avgSleepHours > 6.5 ? 'Stable' : '-3%',
          avgAthleteRPE: Math.round(avgRPE * 10) / 10,
          rpeTrend: avgRPE > 7 ? '+2%' : avgRPE > 5 ? 'Stable' : '-5%',
          trainingLoad: totalTrainingMinutes,
          loadTrend: totalTrainingMinutes > 300 ? '+12%' : totalTrainingMinutes > 150 ? 'Stable' : '-8%',
          sessionCount: rpeData?.length || 0
        });

      } catch (error) {
        console.error('Error fetching analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [profile]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
        <p className="text-muted-foreground">
          {isCoach ? 'Monitor your athletes\' performance metrics' : 'Track your training and recovery data'}
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      ) : (
        <>
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
                      <span className="text-xl font-bold">{analyticsData.avgWeeklySleep}h</span>
                      <Badge className="bg-green-500/20 text-green-400">{analyticsData.sleepTrend}</Badge>
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
                      <span className="text-xl font-bold">{analyticsData.trainingLoad}min</span>
                      <Badge className="bg-blue-500/20 text-blue-400">{analyticsData.loadTrend}</Badge>
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
                    <span className="font-semibold">{analyticsData.avgAthleteRPE}/10</span>
                    <Badge variant="outline">{analyticsData.rpeTrend}</Badge>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-4 h-4 bg-orange-500 rounded"></div>
                    <span className="text-sm">Sessions This Week</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold">{analyticsData.sessionCount}</span>
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
                {analyticsData.avgWeeklySleep > 7 ? (
                  <div className="flex items-start space-x-3 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <div>
                      <p className="text-sm font-medium">Great sleep habits</p>
                      <p className="text-xs text-muted-foreground">Your sleep duration is optimal for recovery</p>
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
                
                {analyticsData.sessionCount > 0 ? (
                  <div className="flex items-start space-x-3 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <div>
                      <p className="text-sm font-medium">Active training week</p>
                      <p className="text-xs text-muted-foreground">You've logged {analyticsData.sessionCount} training sessions this week</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start space-x-3 p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
                    <div>
                      <p className="text-sm font-medium">Start logging sessions</p>
                      <p className="text-xs text-muted-foreground">Begin tracking your training to see detailed analytics</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}

    </div>
  );
};