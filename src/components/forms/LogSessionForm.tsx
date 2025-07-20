import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, Star, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export const LogSessionForm = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    date: new Date().toISOString().split('T')[0],
    time: '',
    duration: '',
    type: '',
    description: '',
    athleteRpe: '',
    athleteNotes: ''
  });

  const sessionTypes = [
    'Strength Training',
    'Cardio',
    'Technical',
    'Tactical',
    'Recovery',
    'Competition'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!profile) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please log in to record a session.",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Get the athlete record for this profile
      console.log('Looking for athlete record for profile:', profile.id);
      const { data: athleteData, error: athleteError } = await supabase
        .from('athletes')
        .select('id')
        .eq('profile_id', profile.id)
        .maybeSingle(); // Use maybeSingle instead of single

      console.log('Athlete query result:', { athleteData, athleteError });

      if (athleteError) {
        console.error('Error querying athlete:', athleteError);
        throw athleteError;
      }

      if (!athleteData) {
        throw new Error('No athlete record found for your profile. Please contact your coach or admin.');
      }

      // Insert RPE log
      const { error: rpeError } = await supabase
        .from('rpe_logs')
        .insert({
          athlete_id: athleteData.id,
          club_id: profile.club_id,
          log_date: formData.date,
          rpe_score: parseInt(formData.athleteRpe),
          duration_minutes: parseInt(formData.duration),
          activity_type: formData.type,
          notes: `${formData.title}: ${formData.description}. Personal notes: ${formData.athleteNotes}`
        });

      if (rpeError) throw rpeError;

      toast({
        title: "Session logged successfully!",
        description: "Your training session has been recorded.",
      });
      
      navigate('/practice');
    } catch (error: any) {
      console.error('Error logging session:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to log session. Please try again.",
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
          <h1 className="text-2xl font-bold">Log Training Session</h1>
          <p className="text-muted-foreground">Record your workout details and performance</p>
        </div>
      </div>

      <Card className="sport-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Session Details</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Session Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="e.g., Morning Conditioning"
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
                placeholder="Describe the exercises, sets, reps, or activities performed..."
                rows={3}
                className="bg-background"
              />
            </div>

            {/* Performance */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rpe">Rate of Perceived Exertion (1-10)</Label>
                <Select value={formData.athleteRpe} onValueChange={(value) => handleInputChange('athleteRpe', value)}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select RPE" />
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
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Personal Notes</Label>
              <Textarea
                id="notes"
                value={formData.athleteNotes}
                onChange={(e) => handleInputChange('athleteNotes', e.target.value)}
                placeholder="How did you feel? Any observations or goals for next time..."
                rows={3}
                className="bg-background"
              />
            </div>

            {/* Submit */}
            <div className="flex space-x-3">
              <Button 
                type="submit" 
                className="gradient-primary text-primary-foreground flex-1"
                disabled={isLoading}
              >
                <Clock className="h-4 w-4 mr-2" />
                {isLoading ? 'Logging...' : 'Log Session'}
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

export default LogSessionForm;