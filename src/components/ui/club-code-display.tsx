import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ClubCodeDisplayProps {
  clubId: string;
}

export const ClubCodeDisplay = ({ clubId }: ClubCodeDisplayProps) => {
  const [clubCode, setClubCode] = useState<string>('');
  const [clubName, setClubName] = useState<string>('');
  const [isVisible, setIsVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchClubData = async () => {
      try {
        const { data, error } = await supabase
          .from('clubs')
          .select('club_code, name')
          .eq('id', clubId)
          .single();

        if (error) throw error;

        setClubCode(data.club_code || '');
        setClubName(data.name || '');
      } catch (error) {
        console.error('Error fetching club data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchClubData();
  }, [clubId]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(clubCode);
      toast({
        title: "Copied!",
        description: "Club code copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Could not copy club code",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card className="w-64">
        <CardContent className="p-4">
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-muted rounded w-20"></div>
            <div className="h-6 bg-muted rounded w-16"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-64 border-primary/20">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">Club Code</span>
          <Badge variant="secondary" className="text-xs">
            Admin
          </Badge>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="font-mono text-lg font-bold tracking-wider text-primary">
            {isVisible ? clubCode : '••••••'}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsVisible(!isVisible)}
            className="h-8 w-8 p-0"
          >
            {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={copyToClipboard}
            className="h-8 w-8 p-0"
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="text-xs text-muted-foreground">
          Share this code with athletes and coaches to join {clubName}
        </div>
      </CardContent>
    </Card>
  );
};