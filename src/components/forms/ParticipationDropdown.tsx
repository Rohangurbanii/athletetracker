import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ChevronDown, Check, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface ParticipationDropdownProps {
  tournamentId: string;
}

export const ParticipationDropdown = ({ tournamentId }: ParticipationDropdownProps) => {
  const { profile } = useAuth();
  const [participation, setParticipation] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [athleteId, setAthleteId] = useState<string | null>(null);

  useEffect(() => {
    fetchAthleteId();
  }, [profile]);

  useEffect(() => {
    if (athleteId) {
      fetchParticipation();
    }
  }, [athleteId, tournamentId]);

  const fetchAthleteId = async () => {
    if (!profile) return;

    try {
      const { data } = await supabase
        .from('athletes')
        .select('id')
        .eq('profile_id', profile.id)
        .single();

      if (data) {
        setAthleteId(data.id);
      }
    } catch (error) {
      console.error('Error fetching athlete ID:', error);
    }
  };

  const fetchParticipation = async () => {
    if (!athleteId) return;

    try {
      const { data } = await supabase
        .from('tournament_participation')
        .select('is_participating')
        .eq('tournament_id', tournamentId)
        .eq('athlete_id', athleteId)
        .maybeSingle();

      if (data) {
        setParticipation(data.is_participating);
      }
    } catch (error) {
      console.error('Error fetching participation:', error);
    }
  };

  const updateParticipation = async (isParticipating: boolean) => {
    if (!athleteId) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('tournament_participation')
        .upsert({
          tournament_id: tournamentId,
          athlete_id: athleteId,
          is_participating: isParticipating
        });

      if (error) throw error;

      setParticipation(isParticipating);
      toast({
        title: "Participation Updated",
        description: `You are ${isParticipating ? 'now participating' : 'not participating'} in this tournament.`
      });
    } catch (error) {
      console.error('Error updating participation:', error);
      toast({
        title: "Error",
        description: "Failed to update participation. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (participation === true) {
    return (
      <Button className="bg-green-600 hover:bg-green-700 text-white touch-target">
        <Check className="h-4 w-4 mr-2" />
        Participating
      </Button>
    );
  }

  if (participation === false) {
    return (
      <Button className="bg-red-600 hover:bg-red-700 text-white touch-target">
        <X className="h-4 w-4 mr-2" />
        Not Participating
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={loading} className="touch-target">
          Participation
          <ChevronDown className="h-4 w-4 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-48">
        <DropdownMenuItem 
          onClick={() => updateParticipation(true)}
          className="touch-target"
        >
          <Check className="h-4 w-4 mr-2 text-green-600" />
          Yes, I'm participating
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => updateParticipation(false)}
          className="touch-target"
        >
          <X className="h-4 w-4 mr-2 text-red-600" />
          No, I'm not participating
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};