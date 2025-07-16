import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Plus, Clock, Star } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export const Practice = () => {
  const { profile } = useAuth();
  const isCoach = profile?.role === 'coach';

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSessions = async () => {
      if (!profile?.club_id) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // Create a timeout promise
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout')), 10000)
        );

        // Create the actual query promise
        const queryPromise = supabase
          .from('practice_sessions')
          .select('*')
          .eq('club_id', profile.club_id)
          .eq('date', selectedDate)
          .order('created_at', { ascending: false });

        // Race between timeout and query
        const { data, error } = await Promise.race([queryPromise, timeoutPromise]) as any;

        if (error) {
          console.error('Error fetching sessions:', error);
          setError('Failed to load practice sessions');
        } else {
          setSessions(data || []);
        }
      } catch (error: any) {
        console.error('Error:', error);
        if (error.message === 'Request timeout') {
          setError('Request timed out. Please try again.');
        } else {
          setError('Failed to load practice sessions');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, [profile?.club_id, selectedDate]);

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
        {isCoach && (
          <Button className="gradient-primary text-primary-foreground">
            <Plus className="h-4 w-4 mr-2" />
            Schedule Session
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
      <div className="space-y-4">
        {loading ? (
          <Card className="sport-card">
            <CardContent className="text-center py-12">
              <p className="text-muted-foreground">Loading sessions...</p>
            </CardContent>
          </Card>
        ) : error ? (
          <Card className="sport-card">
            <CardContent className="text-center py-12">
              <p className="text-destructive mb-4">{error}</p>
              <Button 
                variant="outline" 
                onClick={() => window.location.reload()}
              >
                Try Again
              </Button>
            </CardContent>
          </Card>
        ) : sessions.map((session) => (
          <Card key={session.id} className="sport-card">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">{session.title}</CardTitle>
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                    <span className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      {new Date(session.date).toLocaleDateString()}
                    </span>
                    {session.description && <span>{session.description}</span>}
                  </div>
                </div>
                <Badge 
                  className={session.coach_rpe || session.athlete_rpe ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'}
                >
                  {session.coach_rpe || session.athlete_rpe ? 'completed' : 'pending'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {session.coach_rpe || session.athlete_rpe ? (
                <div className="grid grid-cols-2 gap-4">
                  {session.coach_rpe && (
                    <div className="stat-card">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Coach RPE</span>
                        <div className="flex items-center">
                          <Star className="h-4 w-4 text-yellow-500 mr-1" />
                          <span className="font-semibold">{session.coach_rpe}/10</span>
                        </div>
                      </div>
                    </div>
                  )}
                  {session.athlete_rpe && (
                    <div className="stat-card">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Athlete RPE</span>
                        <div className="flex items-center">
                          <Star className="h-4 w-4 text-blue-500 mr-1" />
                          <span className="font-semibold">{session.athlete_rpe}/10</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex space-x-2">
                  <Button variant="outline" className="flex-1">
                    Start Session
                  </Button>
                  {isCoach && (
                    <Button variant="outline">
                      Edit
                    </Button>
                  )}
                </div>
              )}
              {session.coach_notes && (
                <div className="mt-4 p-3 bg-muted/30 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Coach Notes:</p>
                  <p className="text-sm">{session.coach_notes}</p>
                </div>
              )}
              {session.athlete_notes && (
                <div className="mt-4 p-3 bg-muted/30 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Athlete Notes:</p>
                  <p className="text-sm">{session.athlete_notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {!loading && !error && sessions.length === 0 && (
        <Card className="sport-card">
          <CardContent className="text-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No practice sessions logged</h3>
            <p className="text-muted-foreground mb-4">
              {isCoach ? 'No training sessions have been scheduled for this date' : 'No training sessions have been logged for this date'}
            </p>
            {isCoach && (
              <Button className="gradient-primary text-primary-foreground">
                <Plus className="h-4 w-4 mr-2" />
                Schedule Session
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};