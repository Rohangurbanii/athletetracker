import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { User } from 'lucide-react';

interface AthleteResult {
  id: string;
  athlete_id: string;
  position?: string;
  areas_of_improvement?: string;
  strong_points?: string;
  coach_comments?: string;
  athletes: {
    profile_id: string;
    profiles: {
      full_name: string;
    };
  };
}

interface TournamentCommentsModalProps {
  tournamentId: string;
  tournamentName: string;
  onClose: () => void;
  onCommentsCompleted: () => void;
}

export const TournamentCommentsModal = ({
  tournamentId,
  tournamentName,
  onClose,
  onCommentsCompleted
}: TournamentCommentsModalProps) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [athleteResults, setAthleteResults] = useState<AthleteResult[]>([]);
  const [comments, setComments] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchAthleteResults();
  }, [tournamentId, profile]);

  const fetchAthleteResults = async () => {
    if (!profile) return;

    try {
      setLoading(true);

      // Get coach ID
      const { data: coachData } = await supabase
        .from('coaches')
        .select('id')
        .eq('profile_id', profile.id)
        .single();

      if (!coachData) return;

      // First get batch athlete IDs for this coach
      const { data: batchData } = await supabase
        .from('batches')
        .select('id')
        .eq('coach_id', coachData.id);

      const batchIds = batchData?.map(b => b.id) || [];

      const { data: batchAthleteData } = await supabase
        .from('batch_athletes')
        .select('athlete_id')
        .in('batch_id', batchIds);

      const athleteIds = batchAthleteData?.map(ba => ba.athlete_id) || [];

      // Get athletes in coach's batches who have submitted results for this tournament
      const { data: results } = await supabase
        .from('tournament_results')
        .select(`
          id,
          athlete_id,
          position,
          areas_of_improvement,
          strong_points,
          coach_comments,
          athletes!inner(
            profile_id,
            profiles!inner(full_name)
          )
        `)
        .eq('tournament_id', tournamentId)
        .not('athlete_completed_at', 'is', null)
        .in('athlete_id', athleteIds);

      setAthleteResults(results || []);
      
      // Initialize comments with existing coach comments
      const initialComments: Record<string, string> = {};
      results?.forEach(result => {
        if (result.coach_comments) {
          initialComments[result.id] = result.coach_comments;
        }
      });
      setComments(initialComments);
    } catch (error) {
      console.error('Error fetching athlete results:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComments = async () => {
    try {
      setSubmitting(true);

      // Update coach comments for each athlete result
      for (const [resultId, comment] of Object.entries(comments)) {
        if (comment.trim()) {
          const { error } = await supabase
            .from('tournament_results')
            .update({
              coach_comments: comment,
              coach_completed_at: new Date().toISOString()
            })
            .eq('id', resultId);

          if (error) throw error;
        }
      }

      toast({
        title: "Success",
        description: "Comments submitted successfully"
      });

      onCommentsCompleted();
      onClose();
    } catch (error) {
      console.error('Error submitting comments:', error);
      toast({
        title: "Error",
        description: "Failed to submit comments",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tournament Comments - {tournamentName}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-muted rounded w-1/3"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="h-4 bg-muted rounded"></div>
                    <div className="h-4 bg-muted rounded w-2/3"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : athleteResults.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No athlete results</h3>
              <p className="text-muted-foreground">
                No athletes have submitted their results for this tournament yet
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {athleteResults.map((result) => (
              <Card key={result.id} className="sport-card">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      {result.athletes.profiles.full_name}
                    </CardTitle>
                    {result.position && (
                      <Badge className="bg-yellow-500/20 text-yellow-400">
                        {result.position}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {result.strong_points && (
                    <div>
                      <h4 className="font-semibold text-green-400 mb-2">Strong Points</h4>
                      <p className="text-sm text-muted-foreground">{result.strong_points}</p>
                    </div>
                  )}
                  
                  {result.areas_of_improvement && (
                    <div>
                      <h4 className="font-semibold text-orange-400 mb-2">Areas of Improvement</h4>
                      <p className="text-sm text-muted-foreground">{result.areas_of_improvement}</p>
                    </div>
                  )}

                  <div>
                    <Label htmlFor={`comment-${result.id}`} className="text-blue-400 font-semibold">
                      Coach Comments
                    </Label>
                    <Textarea
                      id={`comment-${result.id}`}
                      value={comments[result.id] || ''}
                      onChange={(e) => setComments(prev => ({
                        ...prev,
                        [result.id]: e.target.value
                      }))}
                      placeholder="Add your comments on the athlete's performance..."
                      rows={3}
                      className="mt-2"
                    />
                  </div>
                </CardContent>
              </Card>
            ))}

            <div className="flex space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                onClick={handleSubmitComments} 
                disabled={submitting || Object.keys(comments).length === 0}
                className="gradient-primary text-primary-foreground"
              >
                {submitting ? 'Submitting...' : 'Submit Comments'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};