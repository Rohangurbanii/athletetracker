import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Target, ArrowLeft, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export const SetGoalForm = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    targetDate: '',
    category: ''
  });

  const goalCategories = [
    'Technical Skills',
    'Physical Fitness',
    'Mental Toughness',
    'Tactical Awareness',
    'Competition Performance',
    'Recovery & Wellness'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!profile) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please log in to set a goal.",
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

      // Insert goal
      const { error: goalError } = await supabase
        .from('goals')
        .insert({
          athlete_id: athleteData.id,
          title: formData.title,
          description: `${formData.description}\n\nCategory: ${formData.category}`,
          target_date: formData.targetDate,
          status: 'pending',
          priority: 'medium',
          progress_percentage: 0
        });

      if (goalError) throw goalError;

      toast({
        title: "Goal set successfully!",
        description: "Your new goal has been added to your progress tracker.",
      });
      
      navigate('/progress');
    } catch (error: any) {
      console.error('Error setting goal:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to set goal. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Calculate days until target
  const daysUntilTarget = formData.targetDate ? 
    Math.ceil((new Date(formData.targetDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Set New Goal</h1>
          <p className="text-muted-foreground">Define a specific objective to work towards</p>
        </div>
      </div>

      <Card className="sport-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Target className="h-5 w-5" />
            <span>Goal Details</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Goal Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Goal Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="e.g., Improve serve accuracy to 80%"
                required
                className="bg-background"
              />
            </div>

            {/* Category */}
            <div className="space-y-3">
              <Label>Goal Category</Label>
              <div className="grid grid-cols-2 gap-2">
                {goalCategories.map((category) => (
                  <Card 
                    key={category}
                    className={`cursor-pointer transition-all ${
                      formData.category === category 
                        ? 'ring-2 ring-primary bg-primary/5' 
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => handleInputChange('category', category)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{category}</span>
                        <div className="w-3 h-3 rounded-full border border-primary flex items-center justify-center">
                          {formData.category === category && (
                            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Target Date */}
            <div className="space-y-2">
              <Label htmlFor="targetDate">Target Completion Date</Label>
              <Input
                id="targetDate"
                type="date"
                value={formData.targetDate}
                onChange={(e) => handleInputChange('targetDate', e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                required
                className="bg-background"
              />
              {formData.targetDate && (
                <p className="text-sm text-muted-foreground">
                  {daysUntilTarget > 0 
                    ? `${daysUntilTarget} days from now`
                    : daysUntilTarget === 0 
                    ? 'Target date is today'
                    : 'Target date is in the past'
                  }
                </p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Detailed Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Describe what success looks like, specific metrics to track, and action steps you'll take..."
                rows={4}
                required
                className="bg-background"
              />
            </div>

            {/* Goal Preview */}
            {formData.title && formData.category && (
              <Card className="bg-muted/50">
                <CardContent className="p-4">
                  <h3 className="font-medium mb-2">Goal Preview</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Title:</span>
                      <span className="font-medium">{formData.title}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Category:</span>
                      <span className="font-medium">{formData.category}</span>
                    </div>
                    {formData.targetDate && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Target:</span>
                        <span className="font-medium">
                          {new Date(formData.targetDate).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Submit */}
            <div className="flex space-x-3">
              <Button 
                type="submit" 
                className="gradient-primary text-primary-foreground flex-1"
                disabled={!formData.title || !formData.description || !formData.targetDate || !formData.category || isLoading}
              >
                <Target className="h-4 w-4 mr-2" />
                {isLoading ? 'Creating...' : 'Create Goal'}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate('/dashboard')}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Tips */}
      <Card className="sport-card">
        <CardHeader>
          <CardTitle className="text-lg">Goal Setting Tips</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start space-x-3">
            <div className="gradient-primary p-1 rounded-full mt-1">
              <div className="w-2 h-2 bg-primary-foreground rounded-full" />
            </div>
            <div>
              <p className="font-medium">Be Specific</p>
              <p className="text-sm text-muted-foreground">
                Define clear, measurable outcomes rather than vague aspirations
              </p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="gradient-secondary p-1 rounded-full mt-1">
              <div className="w-2 h-2 bg-accent-foreground rounded-full" />
            </div>
            <div>
              <p className="font-medium">Set Realistic Timelines</p>
              <p className="text-sm text-muted-foreground">
                Choose challenging but achievable target dates
              </p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="gradient-primary p-1 rounded-full mt-1">
              <div className="w-2 h-2 bg-primary-foreground rounded-full" />
            </div>
            <div>
              <p className="font-medium">Track Progress</p>
              <p className="text-sm text-muted-foreground">
                Break larger goals into smaller milestones
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SetGoalForm;