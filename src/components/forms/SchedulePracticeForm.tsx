import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
    batchId: '',
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

    if (!formData.batchId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a batch for this practice session.",
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

      // Get athletes in the selected batch
      const { data: batchAthletes } = await supabase
        .from('batch_athletes')
        .select('athlete_id')
        .eq('batch_id', formData.batchId);

      if (!batchAthletes || batchAthletes.length === 0) {
        throw new Error('No athletes found in the selected batch');
      }

      // Create practice sessions for each athlete in the batch
      const practiceSessionsData = batchAthletes.map(({ athlete_id }) => ({
        athlete_id,
        club_id: profile.club_id,
        coach_id: coach.id,
        session_date: formData.date,
        session_type: formData.type,
        duration_minutes: parseInt(formData.duration),
        notes: `${formData.title}: ${formData.description}. Coach notes: ${formData.notes}`
      }));

      const { error: practiceError } = await supabase
        .from('practice_sessions')
        .insert(practiceSessionsData);

      if (practiceError) throw practiceError;

      toast({
        title: "Practice scheduled successfully!",
        description: `Practice session has been scheduled for ${batchAthletes.length} athletes.`,
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
            <div className="space-y-2">
              <Label htmlFor="batch">Select Batch</Label>
              <Select value={formData.batchId} onValueChange={(value) => handleInputChange('batchId', value)}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Choose a batch" />
                </SelectTrigger>
                <SelectContent>
                  {batches.map((batch) => (
                    <SelectItem key={batch.id} value={batch.id}>
                      <div className="flex items-center space-x-2">
                        <Users className="h-4 w-4" />
                        <span>{batch.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {batches.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No batches found. Create a batch first to schedule practices.
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
                disabled={isLoading || batches.length === 0}
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