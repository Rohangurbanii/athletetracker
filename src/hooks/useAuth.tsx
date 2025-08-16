import { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { sanitizeInput, isValidEmail, isStrongPassword, checkRateLimit, clearSensitiveData } from '@/utils/security';
import { detectStaleCache, clearAuthCache } from '@/utils/cacheUtils';

interface Profile {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  role: 'admin' | 'coach' | 'athlete';
  club_id: string | null;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string, role: 'coach' | 'athlete', clubId: string) => Promise<void>;
  signUpAdmin: (email: string, password: string, fullName: string, clubName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  

  useEffect(() => {
    let mounted = true;
    let initController: AbortController | null = null;
    
    const initAuth = async () => {
      try {
        // Clear any stale auth data on fresh page load
        if (detectStaleCache()) {
          clearAuthCache();
          await supabase.auth.refreshSession();
        }

        initController = new AbortController();
        const timeoutId = setTimeout(() => {
          initController?.abort();
        }, 8000); // 8s timeout for session

        const { data: { session }, error } = await supabase.auth.getSession();
        clearTimeout(timeoutId);
        
        if (!mounted) return;
        
        if (error) {
          console.error('Session error:', error);
          setLoading(false);
          return;
        }

        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initAuth();

    // Listen for auth changes with error handling
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        try {
          setUser(session?.user ?? null);
          if (session?.user) {
            await fetchProfile(session.user.id);
          } else {
            setProfile(null);
            setLoading(false);
          }
        } catch (error) {
          console.error('Auth state change error:', error);
          if (mounted) {
            setLoading(false);
          }
        }
      }
    );

    return () => {
      mounted = false;
      initController?.abort();
      subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (userId: string) => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      // Create AbortController for proper request cancellation
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.error('Profile fetch timeout');
        controller.abort();
      }, 5000); // Reduced timeout to 5s
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .abortSignal(controller.signal)
        .single();

      clearTimeout(timeoutId);

      if (error) {
        if (error.code === 'PGRST116') {
          console.log('No profile found for user, this may be an incomplete signup');
          setProfile(null);
        } else if (error.name === 'AbortError') {
          console.warn('Profile fetch was aborted due to timeout');
          setProfile(null);
        } else {
          console.error('Error fetching profile:', error);
          setProfile(null);
        }
      } else {
        setProfile(data as Profile);
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Error fetching profile:', error);
      }
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, fullName: string, role: 'coach' | 'athlete', clubId: string) => {
    try {
      // Rate limiting check
      if (!checkRateLimit(`signup_${email}`, 3, 300000)) { // 3 attempts per 5 minutes
        throw new Error('Too many signup attempts. Please try again later.');
      }

      // Input validation and sanitization
      const sanitizedEmail = sanitizeInput(email.trim().toLowerCase());
      const sanitizedFullName = sanitizeInput(fullName.trim());

      if (!isValidEmail(sanitizedEmail)) {
        throw new Error('Please enter a valid email address.');
      }

      const passwordCheck = isStrongPassword(password);
      if (!passwordCheck.isValid) {
        throw new Error(passwordCheck.message);
      }

      const { error } = await supabase.auth.signUp({
        email: sanitizedEmail,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: sanitizedFullName,
            role: role,
            club_id: clubId,
          },
        },
      });

      if (error) throw error;

      toast({
        title: "Account created!",
        description: "Please check your email to verify your account.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
      throw error;
    }
  };

  const signUpAdmin = async (email: string, password: string, fullName: string, clubName: string) => {
    try {
      // Rate limiting check
      if (!checkRateLimit(`signup_admin_${email}`, 3, 300000)) {
        throw new Error('Too many signup attempts. Please try again later.');
      }

      // Input validation and sanitization
      const sanitizedEmail = sanitizeInput(email.trim().toLowerCase());
      const sanitizedFullName = sanitizeInput(fullName.trim());
      const sanitizedClubName = sanitizeInput(clubName.trim());

      if (!isValidEmail(sanitizedEmail)) {
        throw new Error('Please enter a valid email address.');
      }

      const passwordCheck = isStrongPassword(password);
      if (!passwordCheck.isValid) {
        throw new Error(passwordCheck.message);
      }

      const { error } = await supabase.auth.signUp({
        email: sanitizedEmail,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: sanitizedFullName,
            role: 'admin',
            club_name: sanitizedClubName,
          },
        },
      });

      if (error) throw error;

      toast({
        title: "Admin account created!",
        description: "Please check your email to verify your account. Your club will be created after verification.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
      throw error;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      // Rate limiting check
      if (!checkRateLimit(`signin_${email}`, 5, 900000)) { // 5 attempts per 15 minutes
        throw new Error('Too many login attempts. Please try again later.');
      }

      // Input validation and sanitization
      const sanitizedEmail = sanitizeInput(email.trim().toLowerCase());

      if (!isValidEmail(sanitizedEmail)) {
        throw new Error('Please enter a valid email address.');
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: sanitizedEmail,
        password,
      });

      if (error) throw error;

      toast({
        title: "Welcome back!",
        description: "You have successfully signed in.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
      throw error;
    }
  };

  const signOut = async () => {
    try {
      // Clear sensitive data before signing out
      clearSensitiveData();
      
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      toast({
        title: "Signed out",
        description: "You have been successfully signed out.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const value = {
    user,
    profile,
    loading,
    signUp,
    signUpAdmin,
    signIn,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};