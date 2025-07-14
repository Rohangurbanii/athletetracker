import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Moon, Star, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

export const LogSleepForm = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    bedtime: '',
    wakeTime: '',
    quality: '',
    notes: ''
  });

  const qualityOptions = [
    { value: '1', label: 'Very Poor', description: 'Barely slept, frequent interruptions' },
    { value: '2', label: 'Poor', description: 'Restless sleep, tired in morning' },
    { value: '3', label: 'Fair', description: 'Some disturbances, moderately rested' },
    { value: '4', label: 'Good', description: 'Solid sleep, woke up refreshed' },
    { value: '5', label: 'Excellent', description: 'Perfect sleep, energized all day' }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Calculate sleep duration
    const bedtimeDate = new Date(`${formData.date}T${formData.bedtime}`);
    const wakeDate = new Date(`${formData.date}T${formData.wakeTime}`);
    
    // If wake time is earlier than bedtime, assume it's the next day
    if (wakeDate < bedtimeDate) {
      wakeDate.setDate(wakeDate.getDate() + 1);
    }
    
    const durationMs = wakeDate.getTime() - bedtimeDate.getTime();
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    
    // Here you would normally save to the database
    toast({
      title: "Sleep logged successfully!",
      description: `${hours}h ${minutes}m of sleep recorded.`,
    });
    
    navigate('/sleep');
  };

  const handleInputChange = (field: string, value: string) => {
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
              <div className="grid gap-3">
                {qualityOptions.map((option) => (
                  <Card 
                    key={option.value}
                    className={`cursor-pointer transition-all ${
                      formData.quality === option.value 
                        ? 'ring-2 ring-primary bg-primary/5' 
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => handleInputChange('quality', option.value)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <div className="flex">
                              {renderStars(parseInt(option.value))}
                            </div>
                            <span className="font-medium">{option.label}</span>
                          </div>
                          <p className="text-sm text-muted-foreground">{option.description}</p>
                        </div>
                        <div className="w-4 h-4 rounded-full border-2 border-primary flex items-center justify-center">
                          {formData.quality === option.value && (
                            <div className="w-2 h-2 rounded-full bg-primary" />
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
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
                disabled={!formData.bedtime || !formData.wakeTime || !formData.quality}
              >
                <Moon className="h-4 w-4 mr-2" />
                Log Sleep
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