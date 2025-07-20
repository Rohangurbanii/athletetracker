import { memo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, Target } from 'lucide-react';

interface Goal {
  id: string;
  title: string;
  description: string;
  status: string;
  targetDate: string;
  progress: number;
  createdDate: string;
  coachCompleted: boolean;
  completedByCoachAt: string | null;
}

interface GoalCardProps {
  goal: Goal;
  isCoach: boolean;
  onToggleCoachCompletion: (goalId: string, currentStatus: boolean) => void;
  onUpdateProgress: (goalId: string, newProgress: number) => void;
}

export const GoalCard = memo(({ goal, isCoach, onToggleCoachCompletion, onUpdateProgress }: GoalCardProps) => {
  const getStatusIcon = useCallback((status: string) => {
    return status === 'completed' ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <Clock className="h-4 w-4 text-blue-500" />
    );
  }, []);

  const handleCoachToggle = useCallback(() => {
    onToggleCoachCompletion(goal.id, goal.coachCompleted);
  }, [goal.id, goal.coachCompleted, onToggleCoachCompletion]);

  const handleProgressChange = useCallback((newProgress: number) => {
    onUpdateProgress(goal.id, newProgress);
  }, [goal.id, onUpdateProgress]);

  return (
    <Card className="sport-card">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              {getStatusIcon(goal.status)}
              <CardTitle className="text-xl font-semibold">{goal.title}</CardTitle>
            </div>
            <p className="text-muted-foreground leading-relaxed">{goal.description}</p>
          </div>
          
          <div className="flex flex-col gap-2 ml-4">
            <Badge 
              className={
                goal.status === 'completed' 
                  ? 'bg-green-500/20 text-green-400 border-green-400/20' 
                  : 'bg-blue-500/20 text-blue-400 border-blue-400/20'
              }
            >
              {goal.status === 'completed' ? 'Completed' : 'In Progress'}
            </Badge>
            
            {goal.coachCompleted && (
              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-400/20">
                Coach Approved
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Progress Section */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Progress</span>
            <span className="text-sm text-muted-foreground">{goal.progress}%</span>
          </div>
          <div className="w-full bg-secondary rounded-full h-2">
            <div 
              className="gradient-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${goal.progress}%` }}
            />
          </div>
        </div>

        {/* Target Date */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Target Date:</span>
          <span className="font-medium">
            {new Date(goal.targetDate).toLocaleDateString()}
          </span>
        </div>

        {/* Coach Controls */}
        {isCoach && (
          <div className="flex flex-col gap-3 pt-3 border-t border-border/50">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Coach Actions</span>
            </div>
            
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={goal.coachCompleted ? "default" : "outline"}
                onClick={handleCoachToggle}
                className="flex-1"
              >
                <Target className="h-4 w-4 mr-2" />
                {goal.coachCompleted ? 'Mark Incomplete' : 'Mark Complete'}
              </Button>
            </div>

            {/* Progress Controls */}
            <div className="space-y-2">
              <span className="text-sm font-medium">Update Progress:</span>
              <div className="flex gap-1">
                {[25, 50, 75, 100].map((percent) => (
                  <Button
                    key={percent}
                    size="sm"
                    variant={goal.progress === percent ? "default" : "outline"}
                    onClick={() => handleProgressChange(percent)}
                    className="flex-1 text-xs"
                  >
                    {percent}%
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

GoalCard.displayName = 'GoalCard';

export default GoalCard;