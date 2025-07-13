import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trophy, Calendar, MapPin, Plus, Star } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export const Tournaments = () => {
  const { profile } = useAuth();
  const isCoach = profile?.role === 'coach';

  const [activeTab, setActiveTab] = useState<'upcoming' | 'completed'>('upcoming');

  const mockTournaments = {
    upcoming: [
      {
        id: '1',
        name: 'Regional Championships',
        date: '2024-02-15',
        endDate: '2024-02-17',
        location: 'Sports Complex Arena',
        status: 'registered',
        description: 'Annual regional competition',
      },
      {
        id: '2',
        name: 'Spring Invitational',
        date: '2024-03-10',
        endDate: '2024-03-10',
        location: 'University Stadium',
        status: 'available',
        description: 'Open tournament for all levels',
      },
    ],
    completed: [
      {
        id: '3',
        name: 'Winter Classic',
        date: '2024-01-20',
        endDate: '2024-01-21',
        location: 'Metro Sports Center',
        result: '2nd Place',
        coachRating: 4,
        athleteRating: 4,
        keyLearnings: 'Improved mental focus under pressure',
        improvements: 'Work on closing out tight matches',
      },
    ],
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, index) => (
      <Star
        key={index}
        className={`h-4 w-4 ${
          index < rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'
        }`}
      />
    ));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tournaments</h1>
          <p className="text-muted-foreground">
            {isCoach ? 'Manage tournament schedules and results' : 'Track your competition journey'}
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-muted p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('upcoming')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'upcoming'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Upcoming
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'completed'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Completed
        </button>
      </div>

      {/* Upcoming Tournaments */}
      {activeTab === 'upcoming' && (
        <div className="space-y-4">
          {mockTournaments.upcoming.map((tournament) => (
            <Card key={tournament.id} className="sport-card">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <CardTitle className="text-lg">{tournament.name}</CardTitle>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <span className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        {new Date(tournament.date).toLocaleDateString()} 
                        {tournament.endDate !== tournament.date && 
                          ` - ${new Date(tournament.endDate).toLocaleDateString()}`
                        }
                      </span>
                      <span className="flex items-center">
                        <MapPin className="h-4 w-4 mr-1" />
                        {tournament.location}
                      </span>
                    </div>
                  </div>
                  <Badge 
                    className={
                      tournament.status === 'registered' 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-blue-500/20 text-blue-400'
                    }
                  >
                    {tournament.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">{tournament.description}</p>
                <div className="flex space-x-2">
                  {tournament.status === 'available' ? (
                    <Button className="gradient-primary text-primary-foreground">
                      Register
                    </Button>
                  ) : (
                    <Button variant="outline">
                      View Details
                    </Button>
                  )}
                  <Button variant="outline">
                    <Calendar className="h-4 w-4 mr-2" />
                    Add to Calendar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Completed Tournaments */}
      {activeTab === 'completed' && (
        <div className="space-y-4">
          {mockTournaments.completed.map((tournament) => (
            <Card key={tournament.id} className="sport-card">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <CardTitle className="text-lg">{tournament.name}</CardTitle>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <span className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        {new Date(tournament.date).toLocaleDateString()}
                      </span>
                      <span className="flex items-center">
                        <MapPin className="h-4 w-4 mr-1" />
                        {tournament.location}
                      </span>
                    </div>
                  </div>
                  <Badge className="bg-yellow-500/20 text-yellow-400">
                    <Trophy className="h-3 w-3 mr-1" />
                    {tournament.result}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Ratings */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="stat-card">
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">Coach Rating</p>
                        <div className="flex items-center">
                          {renderStars(tournament.coachRating!)}
                        </div>
                      </div>
                    </div>
                    <div className="stat-card">
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">Athlete Rating</p>
                        <div className="flex items-center">
                          {renderStars(tournament.athleteRating!)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Key Learnings */}
                  <div className="stat-card">
                    <p className="text-sm text-muted-foreground mb-2">Key Learnings</p>
                    <p className="text-sm">{tournament.keyLearnings}</p>
                  </div>

                  {/* Improvement Areas */}
                  <div className="stat-card">
                    <p className="text-sm text-muted-foreground mb-2">Areas for Improvement</p>
                    <p className="text-sm">{tournament.improvements}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty States */}
      {activeTab === 'upcoming' && mockTournaments.upcoming.length === 0 && (
        <Card className="sport-card">
          <CardContent className="text-center py-12">
            <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No upcoming tournaments</h3>
            <p className="text-muted-foreground mb-4">
              Explore available tournaments and register for competitions
            </p>
            <Button className="gradient-primary text-primary-foreground">
              <Plus className="h-4 w-4 mr-2" />
              Find Tournaments
            </Button>
          </CardContent>
        </Card>
      )}

      {activeTab === 'completed' && mockTournaments.completed.length === 0 && (
        <Card className="sport-card">
          <CardContent className="text-center py-12">
            <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No completed tournaments</h3>
            <p className="text-muted-foreground">
              Your tournament results will appear here after you compete
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};