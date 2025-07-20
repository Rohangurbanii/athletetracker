import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TournamentResultsFormProps {
  tournamentId: string;
  tournamentName: string;
  onClose: () => void;
  onResultSubmitted: () => void;
}

export const TournamentResultsForm = ({
  tournamentId,
  tournamentName,
  onClose,
  onResultSubmitted
}: TournamentResultsFormProps) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    position: '',
    areasOfImprovement: '',
    strongPoints: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    try {
      setLoading(true);

      // Get athlete ID
      const { data: athleteData } = await supabase
        .from('athletes')
        .select('id')
        .eq('profile_id', profile.id)
        .single();

      if (!athleteData) {
        toast({
          title: "Error",
          description: "Athlete record not found",
          variant: "destructive"
        });
        return;
      }

      // Insert or update tournament result
      const { error } = await supabase
        .from('tournament_results')
        .upsert({
          tournament_id: tournamentId,
          athlete_id: athleteData.id,
          position: formData.position,
          areas_of_improvement: formData.areasOfImprovement,
          strong_points: formData.strongPoints,
          athlete_completed_at: new Date().toISOString()
        }, {
          onConflict: 'tournament_id,athlete_id'
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Tournament results submitted successfully"
      });

      onResultSubmitted();
      onClose();
    } catch (error) {
      console.error('Error submitting results:', error);
      toast({
        title: "Error",
        description: "Failed to submit results",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Tournament Results - {tournamentName}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="position">Position/Rank</Label>
            <Input
              id="position"
              value={formData.position}
              onChange={(e) => setFormData(prev => ({ ...prev, position: e.target.value }))}
              placeholder="e.g., 1st, 2nd, Quarter-final, etc."
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="strongPoints">Strong Points</Label>
            <Textarea
              id="strongPoints"
              value={formData.strongPoints}
              onChange={(e) => setFormData(prev => ({ ...prev, strongPoints: e.target.value }))}
              placeholder="What went well in this tournament?"
              rows={3}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="areasOfImprovement">Areas of Improvement</Label>
            <Textarea
              id="areasOfImprovement"
              value={formData.areasOfImprovement}
              onChange={(e) => setFormData(prev => ({ ...prev, areasOfImprovement: e.target.value }))}
              placeholder="What areas need improvement?"
              rows={3}
              required
            />
          </div>

          <div className="flex space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="gradient-primary text-primary-foreground">
              {loading ? 'Submitting...' : 'Submit Results'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};