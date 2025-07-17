import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Club {
  id: string;
  name: string;
  created_at: string | null;
}

export const useClubs = () => {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClubs = async () => {
      try {
        const { data: clubs, error } = await supabase
          .from('clubs')
          .select('id, name, created_at')
          .order('name');
        console.log('ashwin')
        console.log(clubs,error)
        if (error) throw error;
        setClubs(clubs || []);
      } catch (error) {
        console.error('Error fetching clubs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchClubs();
  }, []);

  return { clubs, loading };
};