import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Calendar, Plus, Clock, Star, Users, ChevronDown } from 'lucide-react';
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
  const [rpeLogs, setRpeLogs] = useState([]);
  const [expandedSessions, setExpandedSessions] = useState(new Set());
  const [coachRpeInputs, setCoachRpeInputs] = useState({});

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
            setRpeLogs([]);
          } else {
            // Store RPE logs for reference
            setRpeLogs(rpeData || []);

            // Transform practice sessions to session format with RPE info
            const practiceTransformed = (practiceData || []).map(session => {
              // Find matching RPE log for this practice session
              const matchingRpe = (rpeData || []).find(log => 
                log.activity_type === session.session_type && 
                log.notes?.includes('scheduled practice') &&
                log.log_date === session.session_date
              );

              return {
                id: `practice-${session.id}`,
                title: session.notes?.split(':')[0] || 'Practice Session',
                time: 'Scheduled',
                duration: `${session.duration_minutes || 0} mins`,
                type: session.session_type || 'Practice',
                status: matchingRpe ? 'completed' : 'scheduled',
                notes: session.notes,
                athleteRpe: matchingRpe?.rpe_score,
                originalSession: session,
                rpeLogId: matchingRpe?.id // Store the RPE log ID for updates
              };
            });

            // Transform standalone RPE logs (not linked to scheduled practices)
            const standaloneRpe = (rpeData || [])
              .filter(log => !log.notes?.includes('scheduled practice'))
              .map(log => ({
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
            const allSessions = [...practiceTransformed, ...standaloneRpe];
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
            const { data: coachPractices, error: practicesError } = await supabase
              .from('practice_sessions')
              .select(`
                *, 
                athletes!inner(
                  id, 
                  profile_id, 
                  profiles!inner(full_name)
                ),
                batches(name)
              `)
              .eq('coach_id', coach.id)
              .eq('session_date', selectedDate)
              .order('created_at', { ascending: false });

            console.log('Coach practices query error:', practicesError);
            console.log('Coach practices fetched:', coachPractices);

            // Get existing RPE logs for these sessions (both athlete and coach RPE)
            const sessionAthleteIds = (coachPractices || []).map(session => session.athlete_id);
            console.log('Session athlete IDs:', sessionAthleteIds);
            
            const { data: existingRpeLogs } = await supabase
              .from('rpe_logs')
              .select('athlete_id, coach_rpe, rpe_score, log_date, activity_type')
              .in('athlete_id', sessionAthleteIds)
              .eq('log_date', selectedDate);

            console.log('Existing RPE logs:', existingRpeLogs);

            const coachTransformed = (coachPractices || []).map(session => {
              const existingRpeLog = existingRpeLogs?.find(log => 
                log.athlete_id === session.athlete_id && 
                log.log_date === selectedDate &&
                log.activity_type === session.session_type
              );
              
              console.log(`Session ${session.id} - Athlete ${session.athlete_id} - Existing RPE:`, existingRpeLog);
              
              // Session is considered completed if either athlete or coach has filled RPE
              const isCompleted = existingRpeLog && (existingRpeLog.rpe_score || existingRpeLog.coach_rpe);
              
              return {
                id: `coach-${session.id}`,
                title: session.notes?.split(':')[0] || 'Practice Session',
                time: 'Scheduled',
                duration: `${session.duration_minutes || 0} mins`,
                type: session.session_type || 'Practice',
                status: isCompleted ? 'completed' : 'scheduled',
                notes: session.notes,
                athlete: (session.batches as any)?.name || (session.athletes as any)?.profiles?.full_name || 'Unknown',
                originalSession: session,
                existingCoachRpe: existingRpeLog?.coach_rpe || null,
                athleteRpe: existingRpeLog?.rpe_score || null
              };
            });

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

      console.log('RPE Update - Session data:', {
        selectedSession,
        rpeLogId: selectedSession.rpeLogId,
        selectedRpe,
        hasRpeLogId: !!selectedSession.rpeLogId
      });

      // Use the stored RPE log ID if this is an edit of an existing RPE
      if (selectedSession.rpeLogId) {
        // Update existing RPE log
        const { error: updateError } = await supabase
          .from('rpe_logs')
          .update({
            rpe_score: parseInt(selectedRpe),
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedSession.rpeLogId);

        if (updateError) throw updateError;

        toast({
          title: "RPE updated successfully!",
          description: "Your effort rating has been updated.",
        });
      } else {
        // Before creating a new RPE log, check if one already exists for this practice
        const existingRpeCheck = await supabase
          .from('rpe_logs')
          .select('id')
          .eq('athlete_id', athleteData.id)
          .eq('log_date', selectedDate)
          .eq('activity_type', selectedSession.originalSession?.session_type || 'Practice')
          .like('notes', '%scheduled practice%')
          .maybeSingle();

        if (existingRpeCheck.data) {
          // Update the existing RPE log instead of creating a new one
          const { error: updateError } = await supabase
            .from('rpe_logs')
            .update({
              rpe_score: parseInt(selectedRpe),
              updated_at: new Date().toISOString()
            })
            .eq('id', existingRpeCheck.data.id);

          if (updateError) throw updateError;

          toast({
            title: "RPE updated successfully!",
            description: "Your effort rating has been updated.",
          });
        } else {
          // Create new RPE log for this practice session
          const { error: insertError } = await supabase
            .from('rpe_logs')
            .insert({
              athlete_id: athleteData.id,
              club_id: profile.club_id,
              log_date: selectedDate,
              rpe_score: parseInt(selectedRpe),
              duration_minutes: selectedSession.originalSession?.duration_minutes || 0,
              activity_type: selectedSession.originalSession?.session_type || 'Practice',
              notes: `RPE for scheduled practice: ${selectedSession.originalSession?.notes || 'Practice session'}`
            });

          if (insertError) throw insertError;

          toast({
            title: "RPE logged successfully!",
            description: "Your effort rating has been recorded for this practice.",
          });
        }
      }

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
    // If session has an existing RPE, set it as the default value
    if (session.athleteRpe) {
      setSelectedRpe(session.athleteRpe.toString());
    } else {
      setSelectedRpe('');
    }
    setRpeDialogOpen(true);
  };

  const toggleSessionExpansion = (sessionId) => {
    const newExpanded = new Set(expandedSessions);
    if (newExpanded.has(sessionId)) {
      newExpanded.delete(sessionId);
    } else {
      newExpanded.add(sessionId);
    }
    setExpandedSessions(newExpanded);
  };

  const handleCoachRpeChange = (sessionId, athleteId, value) => {
    // Only allow numbers 1-10
    const numValue = parseInt(value);
    if (value === '' || (numValue >= 1 && numValue <= 10)) {
      setCoachRpeInputs(prev => ({
        ...prev,
        [`${sessionId}-${athleteId}`]: value
      }));
    }
  };

  const submitCoachRpe = async (session, athleteId) => {
    const rpeValue = coachRpeInputs[`${session.id}-${athleteId}`];
    if (!rpeValue || !profile) return;

    try {
      // First, get or create the RPE log for this session and athlete
      const { data: existingRpe } = await supabase
        .from('rpe_logs')
        .select('id')
        .eq('athlete_id', athleteId)
        .eq('log_date', selectedDate)
        .eq('activity_type', session.originalSession?.session_type || 'Practice')
        .like('notes', '%scheduled practice%')
        .maybeSingle();

      if (existingRpe) {
        // Update existing RPE log with coach RPE
        const { error: updateError } = await supabase
          .from('rpe_logs')
          .update({
            coach_rpe: parseInt(rpeValue),
            updated_at: new Date().toISOString()
          })
          .eq('id', existingRpe.id);

        if (updateError) throw updateError;
      } else {
        // Create new RPE log with coach RPE
        const { error: insertError } = await supabase
          .from('rpe_logs')
          .insert({
            athlete_id: athleteId,
            club_id: profile.club_id,
            log_date: selectedDate,
            coach_rpe: parseInt(rpeValue),
            duration_minutes: session.originalSession?.duration_minutes || 0,
            activity_type: session.originalSession?.session_type || 'Practice',
            notes: `RPE for scheduled practice: ${session.originalSession?.notes || 'Practice session'}`
          });

        if (insertError) throw insertError;
      }

      toast({
        title: "Coach RPE saved successfully!",
        description: `RPE rating of ${rpeValue} has been recorded for this athlete.`,
      });

      // Clear the input
      setCoachRpeInputs(prev => ({
        ...prev,
        [`${session.id}-${athleteId}`]: ''
      }));

      // Refresh sessions
      await fetchSessions();
    } catch (error) {
      console.error('Error saving coach RPE:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save coach RPE. Please try again.",
      });
    }
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
              </div>
            </CardHeader>
            <CardContent>
              {session.status === 'completed' ? (
                <div className="space-y-4">
                  {/* Session Attended - when no RPE is shown */}
                  {!session.athleteRpe && !(profile?.role === 'coach' && session.existingCoachRpe) && (
                    <div className="flex items-center justify-between p-3 bg-gradient-to-r from-emerald-500/10 to-emerald-600/10 rounded-lg border border-emerald-500/20">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-emerald-500/20 rounded-full flex items-center justify-center">
                          <div className="w-3 h-3 bg-emerald-400 rounded-full" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">Session Completed</p>
                          <p className="text-sm text-muted-foreground">Attendance confirmed</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-emerald-400">Attended</div>
                      </div>
                    </div>
                  )}
                  
                  {/* Session Notes */}
                  {session.notes && (
                    <div className="p-3 bg-muted/30 rounded-lg border border-border/50 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-2 flex-1">
                          <div className="w-4 h-4 mt-0.5 text-muted-foreground">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                              <polyline points="14,2 14,8 20,8"/>
                              <line x1="16" y1="13" x2="8" y2="13"/>
                              <line x1="16" y1="17" x2="8" y2="17"/>
                              <polyline points="10,9 9,9 8,9"/>
                            </svg>
                          </div>
                          <div className="flex-1 space-y-3">
                            <div>
                              <p className="text-sm font-medium text-muted-foreground mb-1">Session Notes</p>
                              <p className="text-sm text-foreground leading-relaxed">
                                {session.notes.split('Coach notes:')[0].replace(/^[^:]*:\s*/, '').trim()}
                              </p>
                            </div>
                            {session.notes.includes('Coach notes:') && (
                              <div>
                                <p className="text-sm font-medium text-muted-foreground mb-1">Coach Notes</p>
                                <p className="text-sm text-foreground leading-relaxed">
                                  {session.notes.split('Coach notes:')[1]?.trim()}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                        {/* Completed Status */}
                        <div className="ml-3 flex-shrink-0">
                          <Badge className="bg-green-500/20 text-green-400 border-green-500/30 px-2 py-1">
                            completed
                          </Badge>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Action Buttons */}
                  <div className="flex flex-col space-y-3 pt-2">
                    {/* Athlete Actions */}
                    {profile?.role === 'athlete' && session.originalSession && (
                      <Button 
                        variant="outline" 
                        className="w-full justify-center bg-blue-500/5 hover:bg-blue-500/10 border-blue-500/20 hover:border-blue-500/30 text-blue-600 hover:text-blue-500"
                        onClick={() => openRpeDialog(session)}
                      >
                        <Star className="h-4 w-4 mr-2" />
                        {session.athleteRpe ? 'Edit RPE' : 'Log RPE'}
                      </Button>
                    )}
                    
                    {/* Coach Actions */}
                    {profile?.role === 'coach' && session.originalSession && (
                      <div className="space-y-3">
                        <Button
                          variant="outline"
                          className="w-full justify-center bg-green-500/5 hover:bg-green-500/10 border-green-500/20 hover:border-green-500/30 text-green-600 hover:text-green-500"
                          onClick={() => toggleSessionExpansion(session.id)}
                        >
                          <Users className="h-4 w-4 mr-2" />
                          <span>Edit Coach RPE</span>
                          <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${
                            expandedSessions.has(session.id) ? 'rotate-180' : ''
                          }`} />
                        </Button>
                        
                        {expandedSessions.has(session.id) && (
                          <div className="p-4 bg-muted/20 rounded-lg border border-border/30 space-y-3">
                            <div className="flex items-center justify-between p-3 bg-card rounded-md border border-border/50">
                              <div className="flex items-center space-x-3">
                                <div className="w-2 h-2 bg-primary rounded-full"></div>
                                <span className="font-medium text-foreground">{session.athlete}</span>
                              </div>
                              <div className="flex items-center space-x-3">
                                {session.existingCoachRpe && !coachRpeInputs[`${session.id}-${session.originalSession.athlete_id}`] ? (
                                  <div className="flex items-center space-x-2">
                                    <div className="bg-green-500/20 text-green-600 px-3 py-1.5 rounded-md text-sm font-medium border border-green-500/30">
                                      RPE: {session.existingCoachRpe}
                                    </div>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-8 px-3 bg-primary/5 hover:bg-primary/10 border-primary/20 hover:border-primary/30"
                                      onClick={() => {
                                        setCoachRpeInputs(prev => ({
                                          ...prev,
                                          [`${session.id}-${session.originalSession.athlete_id}`]: session.existingCoachRpe.toString()
                                        }));
                                      }}
                                    >
                                      Edit
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="flex items-center space-x-2">
                                    <Input
                                      type="number"
                                      min="1"
                                      max="10"
                                      placeholder="RPE (1-10)"
                                      className="w-24 h-8 text-center bg-background border-border/50"
                                      value={coachRpeInputs[`${session.id}-${session.originalSession.athlete_id}`] || ''}
                                      onChange={(e) => handleCoachRpeChange(session.id, session.originalSession.athlete_id, e.target.value)}
                                    />
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-8 px-3 bg-green-500/5 hover:bg-green-500/10 border-green-500/20 hover:border-green-500/30 text-green-600"
                                      onClick={() => submitCoachRpe(session, session.originalSession.athlete_id)}
                                      disabled={!coachRpeInputs[`${session.id}-${session.originalSession.athlete_id}`]}
                                    >
                                      <Star className="h-3 w-3 mr-1" />
                                      Save
                                    </Button>
                                    {session.existingCoachRpe && (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-8 px-2 text-muted-foreground hover:text-foreground"
                                        onClick={() => {
                                          setCoachRpeInputs(prev => {
                                            const newInputs = { ...prev };
                                            delete newInputs[`${session.id}-${session.originalSession.athlete_id}`];
                                            return newInputs;
                                          });
                                        }}
                                      >
                                        Cancel
                                      </Button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : session.status === 'scheduled' ? (
                <div>
                  {session.notes && (
                    <div className="stat-card mb-3">
                      <p className="text-sm text-muted-foreground">Practice Details:</p>
                      <p className="text-sm">{session.notes}</p>
                    </div>
                  )}
                  
                  {/* Athlete RPE Section for Athletes */}
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
                  
                  {/* Coach RPE Section for Coaches */}
                  {profile?.role === 'coach' && session.originalSession && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleSessionExpansion(session.id)}
                          className="flex items-center space-x-2 bg-muted/50 hover:bg-muted/70"
                        >
                          <Users className="h-4 w-4" />
                          <span>Athletes</span>
                          <ChevronDown className={`h-4 w-4 transition-transform ${
                            expandedSessions.has(session.id) ? 'rotate-180' : ''
                          }`} />
                        </Button>
                      </div>
                      
                      {expandedSessions.has(session.id) && (
                        <div className="space-y-2 p-3 bg-muted/30 rounded-lg border">
                          <div className="flex items-center justify-between p-2 bg-card rounded-md">
                            <div className="flex items-center space-x-2">
                              <div className="w-2 h-2 bg-primary rounded-full"></div>
                              <span className="text-sm font-medium">{session.athlete}</span>
                            </div>
                             <div className="flex items-center space-x-2">
                               {session.existingCoachRpe && !coachRpeInputs[`${session.id}-${session.originalSession.athlete_id}`] ? (
                                 <div className="flex items-center space-x-2">
                                   <div className="bg-green-500/20 text-green-400 px-2 py-1 rounded text-sm font-medium">
                                     RPE: {session.existingCoachRpe}
                                   </div>
                                   <Button
                                     size="sm"
                                     variant="outline"
                                     className="h-8 px-2 bg-primary/10 hover:bg-primary/20 border-primary/30"
                                     onClick={() => {
                                       // Pre-fill the input with existing RPE for editing
                                       setCoachRpeInputs(prev => ({
                                         ...prev,
                                         [`${session.id}-${session.originalSession.athlete_id}`]: session.existingCoachRpe.toString()
                                       }));
                                     }}
                                   >
                                     Edit
                                   </Button>
                                 </div>
                               ) : (
                                 <div className="flex items-center space-x-2">
                                   <Input
                                     type="number"
                                     min="1"
                                     max="10"
                                     placeholder="RPE"
                                     className="w-16 h-8 text-center bg-background"
                                     value={coachRpeInputs[`${session.id}-${session.originalSession.athlete_id}`] || ''}
                                     onChange={(e) => handleCoachRpeChange(session.id, session.originalSession.athlete_id, e.target.value)}
                                   />
                                   <Button
                                     size="sm"
                                     variant="outline"
                                     className="h-8 px-2 bg-primary/10 hover:bg-primary/20 border-primary/30"
                                     onClick={() => submitCoachRpe(session, session.originalSession.athlete_id)}
                                     disabled={!coachRpeInputs[`${session.id}-${session.originalSession.athlete_id}`]}
                                   >
                                     <Star className="h-3 w-3" />
                                   </Button>
                                   {session.existingCoachRpe && (
                                     <Button
                                       size="sm"
                                       variant="ghost"
                                       className="h-8 px-2 text-muted-foreground"
                                       onClick={() => {
                                         // Clear the input to go back to saved state
                                         setCoachRpeInputs(prev => {
                                           const newInputs = { ...prev };
                                           delete newInputs[`${session.id}-${session.originalSession.athlete_id}`];
                                           return newInputs;
                                         });
                                       }}
                                     >
                                       Cancel
                                     </Button>
                                   )}
                                 </div>
                               )}
                             </div>
                          </div>
                        </div>
                      )}
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