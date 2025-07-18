import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Club {
  id: string;
  name: string;
}

export const useClubs = () => {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchClubs = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('clubs').select('id, name');
    if (error) {
      console.error('Error fetching clubs:', error);
      setLoading(false);
      return;
    }
    setClubs(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchClubs();
  }, []);

  return { clubs, loading, refetch: fetchClubs };
};