import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Plus, Clock, Star } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

export const Practice = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const isCoach = profile?.role === 'coach';
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSessions = async () => {
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
          setSessions([]);
          setLoading(false);
          return;
        }

        // Get RPE logs for the selected date
        const { data: rpeData, error: rpeError } = await supabase
          .from('rpe_logs')
          .select('*')
          .eq('athlete_id', athleteData.id)
          .eq('log_date', selectedDate)
          .order('created_at', { ascending: false });

        if (rpeError) {
          console.error('Error fetching sessions:', rpeError);
          setSessions([]);
        } else {
          // Transform RPE logs to session format
          const transformedSessions = (rpeData || []).map(log => ({
            id: log.id,
            title: log.activity_type || 'Training Session',
            time: 'Logged',
            duration: `${log.duration_minutes || 0} mins`,
            type: log.activity_type || 'Training',
            athleteRpe: log.rpe_score,
            status: 'completed',
            notes: log.notes
          }));
          setSessions(transformedSessions);
        }
      } catch (error) {
        console.error('Error:', error);
        setSessions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, [profile, selectedDate]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Practice Sessions</h1>
          <p className="text-muted-foreground">
            {isCoach ? 'Manage your athletes\' training' : 'Track your training sessions'}
          </p>
        </div>
        {!isCoach && (
          <Button 
            className="gradient-primary text-primary-foreground"
            onClick={() => navigate('/log-session')}
          >
            <Plus className="h-4 w-4 mr-2" />
            Log Session
          </Button>
        )}
      </div>

      {/* Date Selector */}
      <Card className="sport-card">
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <Calendar className="h-5 w-5 text-primary" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent border border-border rounded-lg px-3 py-2 text-foreground"
            />
          </div>
        </CardContent>
      </Card>

      {/* Sessions List */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {sessions.map((session) => (
          <Card key={session.id} className="sport-card">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">{session.title}</CardTitle>
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                    <span className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      {session.time}
                    </span>
                    <span>{session.duration}</span>
                    <Badge variant="outline">{session.type}</Badge>
                  </div>
                </div>
                <Badge 
                  className={session.status === 'completed' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'}
                >
                  {session.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {session.status === 'completed' ? (
                <div>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="stat-card">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Athlete RPE</span>
                        <div className="flex items-center">
                          <Star className="h-4 w-4 text-blue-500 mr-1" />
                          <span className="font-semibold">{session.athleteRpe}/10</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  {session.notes && (
                    <div className="stat-card mt-2">
                      <p className="text-sm text-muted-foreground">Notes:</p>
                      <p className="text-sm">{session.notes}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => navigate('/log-session')}
                  >
                    Log Session
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && sessions.length === 0 && (
        <Card className="sport-card">
          <CardContent className="text-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No sessions scheduled</h3>
            <p className="text-muted-foreground mb-4">
              No training sessions logged for {new Date(selectedDate).toLocaleDateString()}
            </p>
            {!isCoach && (
              <Button 
                className="gradient-primary text-primary-foreground"
                onClick={() => navigate('/log-session')}
              >
                <Plus className="h-4 w-4 mr-2" />
                Log Your First Session
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};