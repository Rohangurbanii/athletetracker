import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useClubs } from '@/hooks/useClubs';
import { Dumbbell, Trophy, Users, Shield } from 'lucide-react';

export const AuthScreen = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, signUp, signUpAdmin } = useAuth();
  const { clubs, loading: clubsLoading } = useClubs();

  const [signInForm, setSignInForm] = useState({
    email: '',
    password: '',
  });

  const [signUpForm, setSignUpForm] = useState({
    email: '',
    password: '',
    fullName: '',
    role: 'athlete' as 'coach' | 'athlete',
    clubId: '',
  });

  const [adminSignUpForm, setAdminSignUpForm] = useState({
    email: '',
    password: '',
    fullName: '',
    clubName: '',
  });

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await signIn(signInForm.email, signInForm.password);
    } catch (error) {
      // Error handled in useAuth
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signUpForm.clubId) return;
    
    setIsLoading(true);
    try {
      await signUp(signUpForm.email, signUpForm.password, signUpForm.fullName, signUpForm.role, signUpForm.clubId);
    } catch (error) {
      // Error handled in useAuth
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdminSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await signUpAdmin(adminSignUpForm.email, adminSignUpForm.password, adminSignUpForm.fullName, adminSignUpForm.clubName);
    } catch (error) {
      // Error handled in useAuth
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mobile-container flex items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-md space-y-6">
        {/* App Header */}
        <div className="text-center space-y-4">
          <div className="gradient-primary w-16 h-16 rounded-full flex items-center justify-center mx-auto animate-pulse-glow">
            <Dumbbell className="w-8 h-8 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">SportSync</h1>
            <p className="text-muted-foreground">Track. Train. Triumph.</p>
          </div>
        </div>

        {/* Auth Tabs */}
        <Tabs defaultValue="signin" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="signin">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Join Club</TabsTrigger>
            <TabsTrigger value="admin">Create Club</TabsTrigger>
          </TabsList>

          {/* Sign In Tab */}
          <TabsContent value="signin">
            <Card className="sport-card">
              <CardHeader className="text-center">
                <CardTitle>Welcome Back</CardTitle>
                <CardDescription>Sign in to your account</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="Enter your email"
                      value={signInForm.email}
                      onChange={(e) => setSignInForm({ ...signInForm, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Password</Label>
                    <Input
                      id="signin-password"
                      type="password"
                      placeholder="Enter your password"
                      value={signInForm.password}
                      onChange={(e) => setSignInForm({ ...signInForm, password: e.target.value })}
                      required
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full gradient-primary text-primary-foreground font-semibold"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Signing In...' : 'Sign In'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Join Club Tab */}
          <TabsContent value="signup">
            <Card className="sport-card">
              <CardHeader className="text-center">
                <CardTitle>Join a Club</CardTitle>
                <CardDescription>Join an existing sports club</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Full Name</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="Enter your full name"
                      value={signUpForm.fullName}
                      onChange={(e) => setSignUpForm({ ...signUpForm, fullName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="Enter your email"
                      value={signUpForm.email}
                      onChange={(e) => setSignUpForm({ ...signUpForm, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="Create a password"
                      value={signUpForm.password}
                      onChange={(e) => setSignUpForm({ ...signUpForm, password: e.target.value })}
                      required
                    />
                  </div>
                  
                  {/* Club Selection */}
                  <div className="space-y-2">
                    <Label htmlFor="club-select">Select Club</Label>
                    <Select 
                      value={signUpForm.clubId} 
                      onValueChange={(value) => setSignUpForm({ ...signUpForm, clubId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={clubsLoading ? "Loading clubs..." : "Choose a club"} />
                      </SelectTrigger>
                      <SelectContent>
                        {clubs.map((club) => (
                          <SelectItem key={club.id} value={club.id}>
                            {club.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Role Selection */}
                  <div className="space-y-3">
                    <Label>I am a...</Label>
                    <RadioGroup 
                      value={signUpForm.role} 
                      onValueChange={(value: 'coach' | 'athlete') => 
                        setSignUpForm({ ...signUpForm, role: value })
                      }
                      className="grid grid-cols-2 gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="athlete" id="signup-athlete" />
                        <Label htmlFor="signup-athlete" className="flex items-center space-x-2 cursor-pointer">
                          <Trophy className="w-4 h-4" />
                          <span>Athlete</span>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="coach" id="signup-coach" />
                        <Label htmlFor="signup-coach" className="flex items-center space-x-2 cursor-pointer">
                          <Users className="w-4 h-4" />
                          <span>Coach</span>
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full gradient-primary text-primary-foreground font-semibold"
                    disabled={isLoading || !signUpForm.clubId || clubsLoading}
                  >
                    {isLoading ? 'Joining Club...' : 'Join Club'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Admin Sign Up Tab */}
          <TabsContent value="admin">
            <Card className="sport-card">
              <CardHeader className="text-center">
                <CardTitle>Create Your Club</CardTitle>
                <CardDescription>Start your own sports club and invite members</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAdminSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="admin-name">Full Name</Label>
                    <Input
                      id="admin-name"
                      type="text"
                      placeholder="Enter your full name"
                      value={adminSignUpForm.fullName}
                      onChange={(e) => setAdminSignUpForm({ ...adminSignUpForm, fullName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="admin-email">Email</Label>
                    <Input
                      id="admin-email"
                      type="email"
                      placeholder="Enter your email"
                      value={adminSignUpForm.email}
                      onChange={(e) => setAdminSignUpForm({ ...adminSignUpForm, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="admin-password">Password</Label>
                    <Input
                      id="admin-password"
                      type="password"
                      placeholder="Create a password"
                      value={adminSignUpForm.password}
                      onChange={(e) => setAdminSignUpForm({ ...adminSignUpForm, password: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="club-name">Club Name</Label>
                    <Input
                      id="club-name"
                      type="text"
                      placeholder="Enter your club name"
                      value={adminSignUpForm.clubName}
                      onChange={(e) => setAdminSignUpForm({ ...adminSignUpForm, clubName: e.target.value })}
                      required
                    />
                  </div>
                  
                  {/* Admin Role Display */}
                  <div className="space-y-3">
                    <Label>Your Role</Label>
                    <div className="flex items-center space-x-2 p-3 rounded-md bg-muted">
                      <Shield className="w-5 h-5 text-primary" />
                      <span className="font-medium">Club Administrator</span>
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full gradient-primary text-primary-foreground font-semibold"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Creating Club...' : 'Create Club'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};