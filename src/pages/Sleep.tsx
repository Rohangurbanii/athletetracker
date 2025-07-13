import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Moon, Plus, Star, Clock, TrendingUp } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export const Sleep = () => {
  const { profile } = useAuth();
  const isCoach = profile?.role === 'coach';

  const mockSleepData = [
    {
      id: '1',
      date: '2024-01-15',
      bedtime: '22:30',
      wakeTime: '06:30',
      duration: '8h 0m',
      quality: 4,
      notes: 'Felt well rested',
    },
    {
      id: '2',
      date: '2024-01-14',
      bedtime: '23:15',
      wakeTime: '06:45',
      duration: '7h 30m',
      quality: 3,
      notes: 'Woke up a few times',
    },
    {
      id: '3',
      date: '2024-01-13',
      bedtime: '22:00',
      wakeTime: '06:00',
      duration: '8h 0m',
      quality: 5,
      notes: 'Perfect sleep',
    },
  ];

  const averageQuality = mockSleepData.reduce((sum, sleep) => sum + sleep.quality, 0) / mockSleepData.length;
  const averageDuration = '7h 50m'; // Would be calculated from actual data

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sleep Tracking</h1>
          <p className="text-muted-foreground">
            {isCoach ? 'Monitor your athletes\' sleep patterns' : 'Track your sleep quality and duration'}
          </p>
        </div>
        {!isCoach && (
          <Button className="gradient-primary text-primary-foreground">
            <Plus className="h-4 w-4 mr-2" />
            Log Sleep
          </Button>
        )}
      </div>

      {/* Sleep Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="sport-card">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="gradient-secondary p-2 rounded-lg">
                <Clock className="h-5 w-5 text-accent-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Duration</p>
                <p className="text-xl font-bold">{averageDuration}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="sport-card">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="gradient-primary p-2 rounded-lg">
                <Star className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Quality</p>
                <p className="text-xl font-bold">{averageQuality.toFixed(1)}/5</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sleep History */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Sleep History</h2>
        
        {mockSleepData.map((sleep) => (
          <Card key={sleep.id} className="sport-card">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">
                    {new Date(sleep.date).toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </CardTitle>
                  <div className="flex items-center mt-1">
                    {renderStars(sleep.quality)}
                  </div>
                </div>
                <Badge variant="outline">{sleep.duration}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div className="stat-card">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Bedtime</span>
                    <span className="font-semibold">{sleep.bedtime}</span>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Wake Time</span>
                    <span className="font-semibold">{sleep.wakeTime}</span>
                  </div>
                </div>
              </div>
              
              {sleep.notes && (
                <div className="stat-card">
                  <p className="text-sm text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm">{sleep.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Weekly Trend */}
      <Card className="sport-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>Weekly Trend</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Sleep Quality Improving</span>
              <Badge className="bg-green-500/20 text-green-400">+12%</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Duration Consistent</span>
              <Badge variant="outline">7h 45m avg</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Recovery Score</span>
              <Badge className="bg-blue-500/20 text-blue-400">85%</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Empty State */}
      {mockSleepData.length === 0 && (
        <Card className="sport-card">
          <CardContent className="text-center py-12">
            <Moon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No sleep data</h3>
            <p className="text-muted-foreground mb-4">
              Start tracking your sleep to improve recovery
            </p>
            {!isCoach && (
              <Button className="gradient-primary text-primary-foreground">
                <Plus className="h-4 w-4 mr-2" />
                Log Your First Sleep
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};