import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Plus, Clock, Star } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export const Practice = () => {
  const { profile } = useAuth();
  const isCoach = profile?.role === 'coach';

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const mockSessions = [
    {
      id: '1',
      title: 'Morning Conditioning',
      time: '8:00 AM',
      duration: '90 mins',
      type: 'Strength Training',
      coachRpe: 7,
      athleteRpe: 8,
      status: 'completed',
    },
    {
      id: '2',
      title: 'Technique Drills',
      time: '2:00 PM',
      duration: '60 mins',
      type: 'Technical',
      coachRpe: null,
      athleteRpe: null,
      status: 'upcoming',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Practice Sessions</h1>
          <p className="text-muted-foreground">
            {isCoach ? 'Manage your athletes\' training' : 'Track your training sessions'}
          </p>
        </div>
        {isCoach && (
          <Button className="gradient-primary text-primary-foreground">
            <Plus className="h-4 w-4 mr-2" />
            Schedule Session
          </Button>
        )}
      </div>

      {/* Date Selector */}
      <Card className="sport-card">
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <Calendar className="h-5 w-5 text-primary" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent border border-border rounded-lg px-3 py-2 text-foreground"
            />
          </div>
        </CardContent>
      </Card>

      {/* Sessions List */}
      <div className="space-y-4">
        {mockSessions.map((session) => (
          <Card key={session.id} className="sport-card">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">{session.title}</CardTitle>
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                    <span className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      {session.time}
                    </span>
                    <span>{session.duration}</span>
                    <Badge variant="outline">{session.type}</Badge>
                  </div>
                </div>
                <Badge 
                  className={session.status === 'completed' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'}
                >
                  {session.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {session.status === 'completed' ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="stat-card">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Coach RPE</span>
                      <div className="flex items-center">
                        <Star className="h-4 w-4 text-yellow-500 mr-1" />
                        <span className="font-semibold">{session.coachRpe}/10</span>
                      </div>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Athlete RPE</span>
                      <div className="flex items-center">
                        <Star className="h-4 w-4 text-blue-500 mr-1" />
                        <span className="font-semibold">{session.athleteRpe}/10</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex space-x-2">
                  <Button variant="outline" className="flex-1">
                    Start Session
                  </Button>
                  {isCoach && (
                    <Button variant="outline">
                      Edit
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {mockSessions.length === 0 && (
        <Card className="sport-card">
          <CardContent className="text-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No sessions scheduled</h3>
            <p className="text-muted-foreground mb-4">
              {isCoach ? 'Schedule your first training session' : 'No training sessions for today'}
            </p>
            {isCoach && (
              <Button className="gradient-primary text-primary-foreground">
                <Plus className="h-4 w-4 mr-2" />
                Schedule Session
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};