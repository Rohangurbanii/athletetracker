import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Trophy, Moon, Target, Activity, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Dashboard = () => {
  const { profile, loading, user } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!profile && user) {
    return (
      <div className="space-y-6">
        <Card className="sport-card">
          <CardContent className="p-6 text-center">
            <h2 className="text-lg font-semibold mb-2">Profile Not Found</h2>
            <p className="text-muted-foreground mb-4">
              We couldn't load your profile information. This might be a temporary issue.
            </p>
            <Button onClick={() => window.location.reload()}>
              Refresh Page
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  const isCoach = profile.role === 'coach';

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">
          Welcome back, {profile.full_name || 'Champion'}!
        </h1>
        <p className="text-muted-foreground">
          {isCoach ? 'Ready to guide your athletes to success?' : "Let's crush today's goals!"}
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="sport-card">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="gradient-primary p-2 rounded-lg">
                <Activity className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">This Week</p>
                <p className="text-xl font-bold">12 Sessions</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="sport-card">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="gradient-secondary p-2 rounded-lg">
                <TrendingUp className="h-5 w-5 text-accent-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg RPE</p>
                <p className="text-xl font-bold">7.2</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Today's Schedule */}
      <Card className="sport-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Today's Schedule</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-card/50 rounded-lg border border-border/50">
            <div>
              <p className="font-medium">Morning Training</p>
              <p className="text-sm text-muted-foreground">8:00 AM - 10:00 AM</p>
            </div>
            <Badge variant="outline">Upcoming</Badge>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-card/50 rounded-lg border border-border/50">
            <div>
              <p className="font-medium">Recovery Session</p>
              <p className="text-sm text-muted-foreground">2:00 PM - 3:00 PM</p>
            </div>
            <Badge className="bg-accent">Active</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-4">
          <Button 
            className="gradient-primary text-primary-foreground font-semibold h-12"
            onClick={() => navigate('/log-session')}
          >
            <Calendar className="h-5 w-5 mr-2" />
            Log Session
          </Button>
          
          <Button 
            variant="outline" 
            className="h-12"
            onClick={() => navigate('/log-sleep')}
          >
            <Moon className="h-5 w-5 mr-2" />
            Log Sleep
          </Button>
          
          <Button 
            variant="outline" 
            className="h-12"
            onClick={() => navigate('/tournaments')}
          >
            <Trophy className="h-5 w-5 mr-2" />
            View Tournaments
          </Button>
          
          <Button 
            variant="outline" 
            className="h-12"
            onClick={() => navigate('/set-goal')}
          >
            <Target className="h-5 w-5 mr-2" />
            Set Goals
          </Button>
        </div>
      </div>

      {/* Recent Activity */}
      <Card className="sport-card">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center space-x-3 p-3 bg-card/50 rounded-lg border border-border/50">
            <div className="gradient-primary p-2 rounded-full">
              <Activity className="h-4 w-4 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <p className="font-medium">Completed endurance training</p>
              <p className="text-sm text-muted-foreground">2 hours ago</p>
            </div>
            <Badge variant="outline">RPE 8</Badge>
          </div>
          
          <div className="flex items-center space-x-3 p-3 bg-card/50 rounded-lg border border-border/50">
            <div className="gradient-secondary p-2 rounded-full">
              <Moon className="h-4 w-4 text-accent-foreground" />
            </div>
            <div className="flex-1">
              <p className="font-medium">Logged 8.5 hours of sleep</p>
              <p className="text-sm text-muted-foreground">Yesterday</p>
            </div>
            <Badge variant="outline">Quality: 4/5</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};