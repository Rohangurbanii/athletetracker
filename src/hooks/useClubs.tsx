import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Club {
  id: string;
  name: string;
}

export const useClubs = () => {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchClubs() {
      const { data, error } = await supabase.from('clubs').select('id, name');
      if (error) {
        // Optionally handle error
        return;
      }
      setClubs(data || []);
    }
    fetchClubs();
  }, []);

  return { clubs, loading };
};