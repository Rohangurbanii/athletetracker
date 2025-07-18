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
    console.log('Fetching clubs...');
    const { data, error } = await supabase.from('clubs').select('id, name');
    console.log('Clubs query result:', { data, error });
    if (error) {
      console.error('Error fetching clubs:', error);
      setLoading(false);
      return;
    }
    console.log('Setting clubs:', data);
    setClubs(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchClubs();
  }, []);

  return { clubs, loading, refetch: fetchClubs };
};