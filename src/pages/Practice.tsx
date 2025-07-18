import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Calendar, Plus, Clock, Star } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

export const Practice = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isCoach = profile?.role === 'coach';
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [sessions, setSessions] = useState([]);
  const [upcomingPractices, setUpcomingPractices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rpeDialogOpen, setRpeDialogOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [selectedRpe, setSelectedRpe] = useState('');

  const fetchSessions = async () => {
      if (!profile) return;

      try {
        if (profile.role === 'athlete') {
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
            setUpcomingPractices([]);
            setLoading(false);
            return;
          }

          // Get scheduled practice sessions for the athlete (selected date)
          const { data: practiceData, error: practiceError } = await supabase
            .from('practice_sessions')
            .select('*')
            .eq('athlete_id', athleteData.id)
            .eq('session_date', selectedDate)
            .order('created_at', { ascending: false });

          // Get upcoming practice sessions (next 7 days)
          const nextWeek = new Date();
          nextWeek.setDate(nextWeek.getDate() + 7);
          const { data: upcomingData, error: upcomingError } = await supabase
            .from('practice_sessions')
            .select('*')
            .eq('athlete_id', athleteData.id)
            .gte('session_date', new Date().toISOString().split('T')[0])
            .lte('session_date', nextWeek.toISOString().split('T')[0])
            .order('session_date', { ascending: true });

          // Get RPE logs for the selected date
          const { data: rpeData, error: rpeError } = await supabase
            .from('rpe_logs')
            .select('*')
            .eq('athlete_id', athleteData.id)
            .eq('log_date', selectedDate)
            .order('created_at', { ascending: false });

          if (practiceError || rpeError || upcomingError) {
            console.error('Error fetching sessions:', { practiceError, rpeError, upcomingError });
            setSessions([]);
            setUpcomingPractices([]);
          } else {
            // Transform practice sessions to session format
            const practiceTransformed = (practiceData || []).map(session => ({
              id: `practice-${session.id}`,
              title: session.notes?.split(':')[0] || 'Practice Session',
              time: 'Scheduled',
              duration: `${session.duration_minutes || 0} mins`,
              type: session.session_type || 'Practice',
              status: 'scheduled',
              notes: session.notes
            }));

            // Transform RPE logs to session format
            const rpeTransformed = (rpeData || []).map(log => ({
              id: `rpe-${log.id}`,
              title: log.activity_type || 'Training Session',
              time: 'Logged',
              duration: `${log.duration_minutes || 0} mins`,
              type: log.activity_type || 'Training',
              athleteRpe: log.rpe_score,
              status: 'completed',
              notes: log.notes
            }));

            // Transform upcoming practices
            const upcomingTransformed = (upcomingData || []).map(session => ({
              id: `upcoming-${session.id}`,
              title: session.notes?.split(':')[0] || 'Practice Session',
              date: session.session_date,
              duration: `${session.duration_minutes || 0} mins`,
              type: session.session_type || 'Practice',
              status: 'scheduled',
              notes: session.notes
            }));

            // Combine and sort sessions for selected date
            const allSessions = [...practiceTransformed, ...rpeTransformed];
            setSessions(allSessions);
            setUpcomingPractices(upcomingTransformed);
          }
        } else if (profile.role === 'coach') {
          // For coaches, show practices they've scheduled
          const { data: coach } = await supabase
            .from('coaches')
            .select('id')
            .eq('profile_id', profile.id)
            .maybeSingle();

          if (coach) {
            const { data: coachPractices } = await supabase
              .from('practice_sessions')
              .select('*, athletes!inner(profile_id, profiles!inner(full_name))')
              .eq('coach_id', coach.id)
              .eq('session_date', selectedDate)
              .order('created_at', { ascending: false });

            const coachTransformed = (coachPractices || []).map(session => ({
              id: `coach-${session.id}`,
              title: session.notes?.split(':')[0] || 'Practice Session',
              time: 'Scheduled',
              duration: `${session.duration_minutes || 0} mins`,
              type: session.session_type || 'Practice',
              status: 'scheduled',
              notes: session.notes,
              athlete: session.athletes?.profiles?.full_name || 'Athlete'
            }));

            setSessions(coachTransformed);
          }
          setUpcomingPractices([]);
        } else {
          setSessions([]);
          setUpcomingPractices([]);
        }
      } catch (error) {
        console.error('Error:', error);
        setSessions([]);
        setUpcomingPractices([]);
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    fetchSessions();
  }, [profile, selectedDate]);

  const handleRpeSubmit = async () => {
    if (!selectedSession || !selectedRpe || !profile) return;

    try {
      // Get the athlete record for this profile
      const { data: athleteData } = await supabase
        .from('athletes')
        .select('id')
        .eq('profile_id', profile.id)
        .maybeSingle();

      if (!athleteData) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Athlete record not found.",
        });
        return;
      }

      // Create RPE log for this practice session
      const { error: rpeError } = await supabase
        .from('rpe_logs')
        .insert({
          athlete_id: athleteData.id,
          club_id: profile.club_id,
          log_date: selectedDate,
          rpe_score: parseInt(selectedRpe),
          duration_minutes: selectedSession.duration_minutes || 0,
          activity_type: selectedSession.session_type || 'Practice',
          notes: `RPE for scheduled practice: ${selectedSession.notes || 'Practice session'}`
        });

      if (rpeError) throw rpeError;

      toast({
        title: "RPE logged successfully!",
        description: "Your effort rating has been recorded for this practice.",
      });

      setRpeDialogOpen(false);
      setSelectedSession(null);
      setSelectedRpe('');
      
      // Refresh the sessions data without page reload
      await fetchSessions();
    } catch (error: any) {
      console.error('Error logging RPE:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to log RPE. Please try again.",
      });
    }
  };

  const openRpeDialog = (session) => {
    setSelectedSession(session);
    setRpeDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Practice Sessions</h1>
          <p className="text-muted-foreground">
            {isCoach ? 'View scheduled practices and team sessions' : 'Track your training sessions and upcoming practices'}
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

      {/* Upcoming Practices Section (for athletes) */}
      {profile?.role === 'athlete' && upcomingPractices.length > 0 && (
        <Card className="sport-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>Upcoming Practices</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingPractices.slice(0, 3).map((practice) => (
                <div key={practice.id} className="flex items-center justify-between p-3 bg-card/50 rounded-lg border">
                  <div>
                    <p className="font-medium">{practice.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(practice.date).toLocaleDateString()} • {practice.duration} • {practice.type}
                    </p>
                  </div>
                  <Badge variant="outline" className="bg-blue-500/20 text-blue-400">
                    {practice.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
                    {session.athlete && (
                      <span className="text-xs bg-muted px-2 py-1 rounded">
                        {session.athlete}
                      </span>
                    )}
                  </div>
                </div>
                <Badge 
                  className={
                    session.status === 'completed' ? 'bg-green-500/20 text-green-400' : 
                    session.status === 'scheduled' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-gray-500/20 text-gray-400'
                  }
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
              ) : session.status === 'scheduled' ? (
                <div>
                  {session.notes && (
                    <div className="stat-card mb-3">
                      <p className="text-sm text-muted-foreground">Practice Details:</p>
                      <p className="text-sm">{session.notes}</p>
                    </div>
                  )}
                  {profile?.role === 'athlete' && (
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        className="flex-1 bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/30"
                        onClick={() => openRpeDialog(session)}
                      >
                        <Star className="h-4 w-4 mr-2" />
                        Log RPE
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  {session.notes && (
                    <div className="stat-card mb-3">
                      <p className="text-sm text-muted-foreground">Session Details:</p>
                      <p className="text-sm">{session.notes}</p>
                    </div>
                  )}
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => navigate('/log-session')}
                    >
                      Log Session
                    </Button>
                  </div>
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

      {/* RPE Dialog */}
      <Dialog open={rpeDialogOpen} onOpenChange={setRpeDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Star className="h-5 w-5" />
              <span>Log RPE for Practice</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedSession && (
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="font-medium">{selectedSession.title}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedSession.duration} • {selectedSession.type}
                </p>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="rpe">Rate of Perceived Exertion (1-10)</Label>
              <Select value={selectedRpe} onValueChange={setSelectedRpe}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your effort level" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((num) => (
                    <SelectItem key={num} value={num.toString()}>
                      <div className="flex items-center space-x-2">
                        <Star className="h-4 w-4" />
                        <span>{num} - {num <= 3 ? 'Easy' : num <= 6 ? 'Moderate' : num <= 8 ? 'Hard' : 'Maximum'}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex space-x-2 pt-4">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setRpeDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                className="flex-1 gradient-primary text-primary-foreground"
                onClick={handleRpeSubmit}
                disabled={!selectedRpe}
              >
                <Star className="h-4 w-4 mr-2" />
                Log RPE
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};