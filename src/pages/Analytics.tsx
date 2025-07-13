import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart3, TrendingUp, Moon, Activity, Trophy, Target } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export const Analytics = () => {
  const { profile } = useAuth();
  const isCoach = profile?.role === 'coach';

  // Mock data - would come from Supabase
  const analyticsData = {
    avgWeeklySleep: 7.8,
    sleepTrend: '+5%',
    avgCoachRPE: 7.2,
    avgAthleteRPE: 7.8,
    rpeTrend: '-3%',
    trainingLoad: 156,
    loadTrend: '+12%',
    winRate: 73,
    tournaments: { wins: 8, losses: 3 },
  };

  const weeklyData = [
    { day: 'Mon', coachRPE: 6, athleteRPE: 7, sleep: 8.2 },
    { day: 'Tue', coachRPE: 8, athleteRPE: 8, sleep: 7.5 },
    { day: 'Wed', coachRPE: 7, athleteRPE: 6, sleep: 8.0 },
    { day: 'Thu', coachRPE: 9, athleteRPE: 9, sleep: 7.8 },
    { day: 'Fri', coachRPE: 6, athleteRPE: 7, sleep: 8.1 },
    { day: 'Sat', coachRPE: 8, athleteRPE: 9, sleep: 8.5 },
    { day: 'Sun', coachRPE: 5, athleteRPE: 6, sleep: 8.2 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
        <p className="text-muted-foreground">
          {isCoach ? 'Monitor your athletes\' performance metrics' : 'Track your training and recovery data'}
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="sport-card">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="gradient-secondary p-2 rounded-lg">
                <Moon className="h-5 w-5 text-accent-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Sleep</p>
                <div className="flex items-center space-x-2">
                  <span className="text-xl font-bold">{analyticsData.avgWeeklySleep}h</span>
                  <Badge className="bg-green-500/20 text-green-400">{analyticsData.sleepTrend}</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="sport-card">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="gradient-primary p-2 rounded-lg">
                <Activity className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Training Load</p>
                <div className="flex items-center space-x-2">
                  <span className="text-xl font-bold">{analyticsData.trainingLoad}</span>
                  <Badge className="bg-blue-500/20 text-blue-400">{analyticsData.loadTrend}</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* RPE Comparison */}
      <Card className="sport-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5" />
            <span>Coach vs Athlete RPE</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-4 h-4 bg-orange-500 rounded"></div>
                <span className="text-sm">Coach RPE</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="font-semibold">{analyticsData.avgCoachRPE}/10</span>
                <Badge variant="outline">{analyticsData.rpeTrend}</Badge>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-4 h-4 bg-blue-500 rounded"></div>
                <span className="text-sm">Athlete RPE</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="font-semibold">{analyticsData.avgAthleteRPE}/10</span>
                <Badge variant="outline">+2%</Badge>
              </div>
            </div>

            {/* Weekly Chart Visualization */}
            <div className="mt-6 space-y-2">
              <p className="text-sm text-muted-foreground">Weekly Comparison</p>
              <div className="grid grid-cols-7 gap-2">
                {weeklyData.map((day) => (
                  <div key={day.day} className="text-center">
                    <p className="text-xs text-muted-foreground mb-2">{day.day}</p>
                    <div className="space-y-1">
                      <div 
                        className="w-full bg-orange-500 rounded-sm"
                        style={{ height: `${day.coachRPE * 4}px` }}
                      />
                      <div 
                        className="w-full bg-blue-500 rounded-sm"
                        style={{ height: `${day.athleteRPE * 4}px` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="sport-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Trophy className="h-5 w-5" />
              <span>Competition</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Win Rate</span>
                <span className="font-semibold">{analyticsData.winRate}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Wins</span>
                <Badge className="bg-green-500/20 text-green-400">
                  {analyticsData.tournaments.wins}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Losses</span>
                <Badge className="bg-red-500/20 text-red-400">
                  {analyticsData.tournaments.losses}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="sport-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <span>Trends</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Recovery</span>
                <Badge className="bg-green-500/20 text-green-400">Improving</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Consistency</span>
                <Badge className="bg-blue-500/20 text-blue-400">Good</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Load Balance</span>
                <Badge className="bg-yellow-500/20 text-yellow-400">Monitor</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sleep Quality Chart */}
      <Card className="sport-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Moon className="h-5 w-5" />
            <span>Sleep Quality Trends</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-7 gap-2">
              {weeklyData.map((day) => (
                <div key={day.day} className="text-center">
                  <p className="text-xs text-muted-foreground mb-2">{day.day}</p>
                  <div 
                    className="w-full bg-purple-500 rounded-sm mx-auto"
                    style={{ height: `${day.sleep * 8}px` }}
                  />
                  <p className="text-xs mt-1">{day.sleep}h</p>
                </div>
              ))}
            </div>
            
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <span className="text-sm text-muted-foreground">Weekly Average</span>
              <span className="font-semibold">{analyticsData.avgWeeklySleep} hours</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Insights */}
      <Card className="sport-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Target className="h-5 w-5" />
            <span>Key Insights</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start space-x-3 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
              <div>
                <p className="text-sm font-medium">Sleep improving consistently</p>
                <p className="text-xs text-muted-foreground">Your sleep quality has increased by 15% this month</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
              <div>
                <p className="text-sm font-medium">Training load well balanced</p>
                <p className="text-xs text-muted-foreground">Good correlation between coach and athlete RPE ratings</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3 p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
              <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
              <div>
                <p className="text-sm font-medium">Monitor Thursday sessions</p>
                <p className="text-xs text-muted-foreground">Highest RPE discrepancy between coach and athlete</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};