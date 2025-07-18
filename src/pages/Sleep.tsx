import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Moon, Plus, Star, Clock, TrendingUp } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

export const Sleep = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const isCoach = profile?.role === 'coach';
  const [sleepData, setSleepData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState({
    averageQuality: 0,
    averageDuration: '0h 0m'
  });

  useEffect(() => {
    const fetchSleepData = async () => {
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
          setSleepData([]);
          setLoading(false);
          return;
        }

        // Get sleep logs for the past 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const { data: sleepLogs, error: sleepError } = await supabase
          .from('sleep_logs')
          .select('*')
          .eq('athlete_id', athleteData.id)
          .gte('sleep_date', thirtyDaysAgo.toISOString().split('T')[0])
          .order('sleep_date', { ascending: false });

        if (sleepError) {
          console.error('Error fetching sleep data:', sleepError);
          setSleepData([]);
        } else {
          const transformedData = (sleepLogs || []).map(log => ({
            id: log.id,
            date: log.sleep_date,
            bedtime: log.bedtime,
            wakeTime: log.wake_time,
            duration: `${Math.floor(log.duration_hours)}h ${Math.floor((log.duration_hours % 1) * 60)}m`,
            quality: log.quality_rating,
            notes: log.notes
          }));

          setSleepData(transformedData);

          // Calculate analytics
          if (sleepLogs.length > 0) {
            const avgQuality = sleepLogs.reduce((sum, log) => sum + (log.quality_rating || 0), 0) / sleepLogs.length;
            const avgDurationHours = sleepLogs.reduce((sum, log) => sum + (log.duration_hours || 0), 0) / sleepLogs.length;
            const avgHours = Math.floor(avgDurationHours);
            const avgMinutes = Math.floor((avgDurationHours % 1) * 60);

            setAnalytics({
              averageQuality: Math.round(avgQuality * 10) / 10,
              averageDuration: `${avgHours}h ${avgMinutes}m`
            });
          }
        }
      } catch (error) {
        console.error('Error:', error);
        setSleepData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSleepData();
  }, [profile]);

  const renderStars = (quality: number) => {
    return Array.from({ length: 5 }, (_, index) => (
      <Star
        key={index}
        className={`h-4 w-4 ${
          index < quality ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'
        }`}
      />
    ));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sleep Tracking</h1>
          <p className="text-muted-foreground">
            {isCoach ? 'Monitor your athletes\' sleep patterns' : 'Track your sleep quality and duration'}
          </p>
        </div>
        {!isCoach && (
          <Button 
            className="gradient-primary text-primary-foreground"
            onClick={() => navigate('/log-sleep')}
          >
            <Plus className="h-4 w-4 mr-2" />
            Log Sleep
          </Button>
        )}
      </div>

      {/* Sleep Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="sport-card">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="gradient-secondary p-2 rounded-lg">
                <Clock className="h-5 w-5 text-accent-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Duration</p>
                <p className="text-xl font-bold">{analytics.averageDuration}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="sport-card">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="gradient-primary p-2 rounded-lg">
                <Star className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Quality</p>
                <p className="text-xl font-bold">{analytics.averageQuality}/5</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sleep History */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Sleep History</h2>
          
          {sleepData.map((sleep) => (
          <Card key={sleep.id} className="sport-card">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">
                    {new Date(sleep.date).toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </CardTitle>
                  <div className="flex items-center mt-1">
                    {renderStars(sleep.quality)}
                  </div>
                </div>
                <Badge variant="outline">{sleep.duration}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div className="stat-card">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Bedtime</span>
                    <span className="font-semibold">{sleep.bedtime}</span>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Wake Time</span>
                    <span className="font-semibold">{sleep.wakeTime}</span>
                  </div>
                </div>
              </div>
              
              {sleep.notes && (
                <div className="stat-card">
                  <p className="text-sm text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm">{sleep.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && sleepData.length === 0 && (
        <Card className="sport-card">
          <CardContent className="text-center py-12">
            <Moon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No sleep data</h3>
            <p className="text-muted-foreground mb-4">
              Start tracking your sleep to improve recovery
            </p>
            {!isCoach && (
              <Button 
                className="gradient-primary text-primary-foreground"
                onClick={() => navigate('/log-sleep')}
              >
                <Plus className="h-4 w-4 mr-2" />
                Log Your First Sleep
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};