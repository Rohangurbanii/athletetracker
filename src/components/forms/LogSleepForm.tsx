import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Moon, Star, ArrowLeft, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export const LogSleepForm = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    bedtime: '',
    wakeTime: '',
    quality: 3,
    recovery: 3,
    notes: ''
  });

  const qualityLabels = ['Very Poor', 'Poor', 'Fair', 'Good', 'Excellent'];
  const recoveryLabels = ['Poor Recovery', 'Low Recovery', 'Moderate Recovery', 'Good Recovery', 'Full Recovery'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!profile) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please log in to record sleep data.",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Get the athlete record for this profile
      const { data: athleteData, error: athleteError } = await supabase
        .from('athletes')
        .select('id')
        .eq('profile_id', profile.id)
        .single();

      if (athleteError || !athleteData) {
        throw new Error('Athlete record not found');
      }

      // Calculate sleep duration
      const bedtimeDate = new Date(`${formData.date}T${formData.bedtime}`);
      const wakeDate = new Date(`${formData.date}T${formData.wakeTime}`);
      
      // If wake time is earlier than bedtime, assume it's the next day
      if (wakeDate < bedtimeDate) {
        wakeDate.setDate(wakeDate.getDate() + 1);
      }
      
      const durationMs = wakeDate.getTime() - bedtimeDate.getTime();
      const hours = durationMs / (1000 * 60 * 60);

      // Insert sleep log
      const { error: sleepError } = await supabase
        .from('sleep_logs')
        .insert({
          athlete_id: athleteData.id,
          club_id: profile.club_id,
          sleep_date: formData.date,
          bedtime: formData.bedtime,
          wake_time: formData.wakeTime,
          duration_hours: hours,
          quality_rating: formData.quality,
          notes: formData.notes
        });

      if (sleepError) throw sleepError;

      const durationHours = Math.floor(hours);
      const durationMinutes = Math.floor((hours % 1) * 60);
      
      toast({
        title: "Sleep logged successfully!",
        description: `${durationHours}h ${durationMinutes}m of sleep recorded.`,
      });
      
      navigate('/sleep');
    } catch (error: any) {
      console.error('Error logging sleep:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to log sleep. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

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
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Log Sleep</h1>
          <p className="text-muted-foreground">Track your sleep quality and recovery</p>
        </div>
      </div>

      <Card className="sport-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Moon className="h-5 w-5" />
            <span>Sleep Details</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="date">Sleep Date</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => handleInputChange('date', e.target.value)}
                required
                className="bg-background"
              />
            </div>

            {/* Sleep Times */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bedtime">Bedtime</Label>
                <Input
                  id="bedtime"
                  type="time"
                  value={formData.bedtime}
                  onChange={(e) => handleInputChange('bedtime', e.target.value)}
                  required
                  className="bg-background"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="wakeTime">Wake Time</Label>
                <Input
                  id="wakeTime"
                  type="time"
                  value={formData.wakeTime}
                  onChange={(e) => handleInputChange('wakeTime', e.target.value)}
                  required
                  className="bg-background"
                />
              </div>
            </div>

            {/* Sleep Quality */}
            <div className="space-y-4">
              <Label>Sleep Quality</Label>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {qualityLabels[formData.quality - 1]}
                  </span>
                  <div className="flex">
                    {renderStars(formData.quality)}
                  </div>
                </div>
                <Slider
                  value={[formData.quality]}
                  onValueChange={(value) => handleInputChange('quality', value[0])}
                  max={5}
                  min={1}
                  step={1}
                  className="w-full"
                />
              </div>
            </div>

            {/* Recovery Status */}
            <div className="space-y-4">
              <Label className="flex items-center space-x-2">
                <Activity className="h-4 w-4" />
                <span>Recovery Status</span>
              </Label>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {recoveryLabels[formData.recovery - 1]}
                  </span>
                  <div className="flex space-x-1">
                    {Array.from({ length: 5 }, (_, index) => (
                      <div
                        key={index}
                        className={`h-3 w-3 rounded-full ${
                          index < formData.recovery ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <Slider
                  value={[formData.recovery]}
                  onValueChange={(value) => handleInputChange('recovery', value[0])}
                  max={5}
                  min={1}
                  step={1}
                  className="w-full"
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Sleep Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="How did you feel when you woke up? Any factors that affected your sleep..."
                rows={3}
                className="bg-background"
              />
            </div>

            {/* Preview */}
            {formData.bedtime && formData.wakeTime && (
              <Card className="bg-muted/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Sleep Duration:</span>
                    <span className="font-medium">
                      {(() => {
                        const bedtimeDate = new Date(`${formData.date}T${formData.bedtime}`);
                        const wakeDate = new Date(`${formData.date}T${formData.wakeTime}`);
                        if (wakeDate < bedtimeDate) {
                          wakeDate.setDate(wakeDate.getDate() + 1);
                        }
                        const durationMs = wakeDate.getTime() - bedtimeDate.getTime();
                        const hours = Math.floor(durationMs / (1000 * 60 * 60));
                        const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
                        return `${hours}h ${minutes}m`;
                      })()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Submit */}
            <div className="flex space-x-3">
              <Button 
                type="submit" 
                className="gradient-primary text-primary-foreground flex-1"
                disabled={!formData.bedtime || !formData.wakeTime || isLoading}
              >
                <Moon className="h-4 w-4 mr-2" />
                {isLoading ? 'Logging...' : 'Log Sleep'}
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