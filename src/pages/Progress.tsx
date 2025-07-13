import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Target, MessageSquare, CheckCircle, Clock, Plus, Calendar } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export const Progress = () => {
  const { profile } = useAuth();
  const isCoach = profile?.role === 'coach';

  const [activeTab, setActiveTab] = useState<'goals' | 'comments'>('goals');

  const mockGoals = [
    {
      id: '1',
      title: 'Improve Backhand Consistency',
      description: 'Focus on follow-through and footwork positioning',
      status: 'in_progress',
      targetDate: '2024-03-01',
      progress: 75,
      createdDate: '2024-01-15',
    },
    {
      id: '2',
      title: 'Increase Mental Resilience',
      description: 'Work on staying focused during pressure situations',
      status: 'in_progress',
      targetDate: '2024-02-28',
      progress: 60,
      createdDate: '2024-01-10',
    },
    {
      id: '3',
      title: 'Master Drop Shot Technique',
      description: 'Perfect the drop shot for tournament play',
      status: 'completed',
      targetDate: '2024-01-30',
      progress: 100,
      createdDate: '2024-01-01',
    },
  ];

  const mockComments = [
    {
      id: '1',
      date: '2024-01-20',
      type: 'practice',
      source: 'Coach Sarah',
      comment: 'Excellent improvement in backhand consistency today. Keep focusing on the follow-through.',
      session: 'Morning Training',
    },
    {
      id: '2',
      date: '2024-01-18',
      type: 'tournament',
      source: 'Coach Sarah',
      comment: 'Great mental toughness in the final set. Your patience paid off in key moments.',
      session: 'Winter Classic Tournament',
    },
    {
      id: '3',
      date: '2024-01-15',
      type: 'practice',
      source: 'Coach Sarah',
      comment: 'Need to work on footwork positioning. Focus on getting to the ball earlier.',
      session: 'Technical Session',
    },
    {
      id: '4',
      date: '2024-01-12',
      type: 'practice',
      source: 'Coach Sarah',
      comment: 'Drop shot technique is looking much better. Ready to use it in match situations.',
      session: 'Strategy Session',
    },
  ];

  const getStatusIcon = (status: string) => {
    return status === 'completed' ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <Clock className="h-4 w-4 text-blue-500" />
    );
  };

  const getTypeIcon = (type: string) => {
    return type === 'tournament' ? (
      <Target className="h-4 w-4 text-yellow-500" />
    ) : (
      <MessageSquare className="h-4 w-4 text-blue-500" />
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Progress Tracking</h1>
          <p className="text-muted-foreground">
            {isCoach ? 'Track your athletes\' development journey' : 'Monitor your growth and achievements'}
          </p>
        </div>
        {isCoach && (
          <Button className="gradient-primary text-primary-foreground">
            <Plus className="h-4 w-4 mr-2" />
            Set Goal
          </Button>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-muted p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('goals')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'goals'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Goals Tracker
        </button>
        <button
          onClick={() => setActiveTab('comments')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'comments'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Coach Comments
        </button>
      </div>

      {/* Goals Tab */}
      {activeTab === 'goals' && (
        <div className="space-y-4">
          {mockGoals.map((goal) => (
            <Card key={goal.id} className="sport-card">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(goal.status)}
                      <CardTitle className="text-lg">{goal.title}</CardTitle>
                    </div>
                    <p className="text-sm text-muted-foreground">{goal.description}</p>
                  </div>
                  <Badge 
                    className={
                      goal.status === 'completed' 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-blue-500/20 text-blue-400'
                    }
                  >
                    {goal.status === 'completed' ? 'Completed' : 'In Progress'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">{goal.progress}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="gradient-primary h-2 rounded-full transition-all duration-300"
                        style={{ width: `${goal.progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Goal Details */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="stat-card">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Target Date</span>
                        <span className="text-sm font-medium">
                          {new Date(goal.targetDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="stat-card">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Created</span>
                        <span className="text-sm font-medium">
                          {new Date(goal.createdDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  {goal.status === 'in_progress' && (
                    <div className="flex space-x-2">
                      {isCoach ? (
                        <>
                          <Button variant="outline" className="flex-1">
                            Update Progress
                          </Button>
                          <Button variant="outline">
                            Mark Complete
                          </Button>
                        </>
                      ) : (
                        <Button variant="outline" className="flex-1">
                          View Details
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Comments Tab */}
      {activeTab === 'comments' && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Timeline of Coach Feedback</h2>
          
          {mockComments.map((comment, index) => (
            <Card key={comment.id} className="sport-card">
              <CardContent className="p-4">
                <div className="flex items-start space-x-4">
                  <div className="flex flex-col items-center">
                    <div className="gradient-primary p-2 rounded-full">
                      {getTypeIcon(comment.type)}
                    </div>
                    {index < mockComments.length - 1 && (
                      <div className="w-px h-8 bg-border mt-2" />
                    )}
                  </div>
                  
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{comment.source}</span>
                        <Badge variant="outline" className="text-xs">
                          {comment.type}
                        </Badge>
                      </div>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3 mr-1" />
                        {new Date(comment.date).toLocaleDateString()}
                      </div>
                    </div>
                    
                    <p className="text-sm">{comment.comment}</p>
                    
                    <div className="flex items-center text-xs text-muted-foreground">
                      <span>From: {comment.session}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty States */}
      {activeTab === 'goals' && mockGoals.length === 0 && (
        <Card className="sport-card">
          <CardContent className="text-center py-12">
            <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No goals set</h3>
            <p className="text-muted-foreground mb-4">
              {isCoach ? 'Set specific goals to track athlete development' : 'Work with your coach to set training goals'}
            </p>
            {isCoach && (
              <Button className="gradient-primary text-primary-foreground">
                <Plus className="h-4 w-4 mr-2" />
                Set First Goal
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'comments' && mockComments.length === 0 && (
        <Card className="sport-card">
          <CardContent className="text-center py-12">
            <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No coach comments</h3>
            <p className="text-muted-foreground">
              Coach feedback from training sessions and tournaments will appear here
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};