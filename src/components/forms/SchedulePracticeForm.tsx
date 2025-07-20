import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar, Clock, Users, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export const SchedulePracticeForm = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [batches, setBatches] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    date: new Date().toISOString().split('T')[0],
    time: '',
    duration: '',
    type: '',
    description: '',
    selectedBatches: [],
    notes: ''
  });

  const sessionTypes = [
    'Strength Training',
    'Cardio',
    'Technical',
    'Tactical',
    'Recovery',
    'Competition',
    'Team Meeting'
  ];

  useEffect(() => {
    const fetchBatches = async () => {
      if (!profile) return;

      try {
        // Get coach record
        const { data: coach } = await supabase
          .from('coaches')
          .select('id')
          .eq('profile_id', profile.id)
          .maybeSingle();

        if (!coach) return;

        // Get batches for this coach
        const { data: batchesData } = await supabase
          .from('batches')
          .select('id, name, description')
          .eq('coach_id', coach.id)
          .order('name');

        setBatches(batchesData || []);
      } catch (error) {
        console.error('Error fetching batches:', error);
      }
    };

    fetchBatches();
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!profile) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please log in to schedule a practice.",
      });
      return;
    }

    if (!formData.selectedBatches || formData.selectedBatches.length === 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select at least one batch for this practice session.",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Get coach record
      const { data: coach } = await supabase
        .from('coaches')
        .select('id')
        .eq('profile_id', profile.id)
        .maybeSingle();

      if (!coach) {
        throw new Error('Coach record not found');
      }

      // Get all athletes from selected batches and remove duplicates
      const { data: batchAthletes } = await supabase
        .from('batch_athletes')
        .select('athlete_id, batch_id')
        .in('batch_id', formData.selectedBatches);

      if (!batchAthletes || batchAthletes.length === 0) {
        throw new Error('No athletes found in the selected batches');
      }

      // Remove duplicate athletes (in case an athlete is in multiple selected batches)
      const uniqueAthletes = batchAthletes.reduce((acc, curr) => {
        if (!acc.find(item => item.athlete_id === curr.athlete_id)) {
          acc.push(curr);
        }
        return acc;
      }, []);

      // Generate a session group ID to group all related sessions
      const sessionGroupId = crypto.randomUUID();

      // Create practice sessions for each unique athlete
      const practiceSessionsData = uniqueAthletes.map(({ athlete_id }) => ({
        athlete_id,
        club_id: profile.club_id,
        coach_id: coach.id,
        batch_id: null, // No single batch ID since this is multi-batch
        session_date: formData.date,
        session_type: formData.type,
        duration_minutes: parseInt(formData.duration),
        session_group_id: sessionGroupId,
        notes: `${formData.title}: ${formData.description}. Coach notes: ${formData.notes}`
      }));

      const { data: insertedSessions, error: practiceError } = await supabase
        .from('practice_sessions')
        .insert(practiceSessionsData)
        .select('id');

      if (practiceError) throw practiceError;

      // Create session_batches entries to link this session group with all selected batches
      const sessionBatchesData = [];
      for (const sessionId of insertedSessions.map(s => s.id)) {
        for (const batchId of formData.selectedBatches) {
          sessionBatchesData.push({
            session_id: sessionId,
            batch_id: batchId
          });
        }
      }

      const { error: sessionBatchesError } = await supabase
        .from('session_batches')
        .insert(sessionBatchesData);

      if (sessionBatchesError) throw sessionBatchesError;

      toast({
        title: "Practice scheduled successfully!",
        description: `Practice session has been scheduled for ${uniqueAthletes.length} athletes across ${formData.selectedBatches.length} batch(es).`,
      });
      
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Error scheduling practice:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to schedule practice. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleBatchToggle = (batchId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedBatches: prev.selectedBatches.includes(batchId)
        ? prev.selectedBatches.filter(id => id !== batchId)
        : [...prev.selectedBatches, batchId]
    }));
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Schedule Practice</h1>
          <p className="text-muted-foreground">Create a practice session for your batch</p>
        </div>
      </div>

      <Card className="sport-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Practice Details</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Practice Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="e.g., Technical Skills Training"
                  required
                  className="bg-background"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="type">Session Type</Label>
                <Select value={formData.type} onValueChange={(value) => handleInputChange('type', value)}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {sessionTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Batch Selection */}
            <div className="space-y-4">
              <Label>Select Batches (can select multiple)</Label>
              <div className="space-y-3 max-h-40 overflow-y-auto border rounded-lg p-3 bg-background">
                {batches.map((batch) => (
                  <div key={batch.id} className="flex items-center space-x-3">
                    <Checkbox
                      id={`batch-${batch.id}`}
                      checked={formData.selectedBatches.includes(batch.id)}
                      onCheckedChange={() => handleBatchToggle(batch.id)}
                    />
                    <Label
                      htmlFor={`batch-${batch.id}`}
                      className="flex items-center space-x-2 cursor-pointer flex-1"
                    >
                      <Users className="h-4 w-4" />
                      <span>{batch.name}</span>
                      {batch.description && (
                        <span className="text-sm text-muted-foreground">
                          - {batch.description}
                        </span>
                      )}
                    </Label>
                  </div>
                ))}
              </div>
              {batches.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No batches found. Create a batch first to schedule practices.
                </p>
              )}
              {formData.selectedBatches.length > 0 && (
                <p className="text-sm text-primary">
                  {formData.selectedBatches.length} batch(es) selected
                </p>
              )}
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleInputChange('date', e.target.value)}
                  required
                  className="bg-background"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="time">Start Time</Label>
                <Input
                  id="time"
                  type="time"
                  value={formData.time}
                  onChange={(e) => handleInputChange('time', e.target.value)}
                  required
                  className="bg-background"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Input
                  id="duration"
                  type="number"
                  value={formData.duration}
                  onChange={(e) => handleInputChange('duration', e.target.value)}
                  placeholder="90"
                  required
                  className="bg-background"
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Session Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Describe the practice objectives, drills, and activities..."
                rows={3}
                className="bg-background"
              />
            </div>

            {/* Coach Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Coach Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Any additional notes for athletes or coaching staff..."
                rows={3}
                className="bg-background"
              />
            </div>

            {/* Submit */}
            <div className="flex space-x-3">
              <Button 
                type="submit" 
                className="gradient-primary text-primary-foreground flex-1"
                disabled={isLoading || batches.length === 0 || formData.selectedBatches.length === 0}
              >
                <Clock className="h-4 w-4 mr-2" />
                {isLoading ? 'Scheduling...' : 'Schedule Practice'}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate('/dashboard')}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default SchedulePracticeForm;