import { supabase } from '@/integrations/supabase/client';

export const updateUserProfile = async (userId: string, selectedClubId: string) => {
  // Example for updating the user's profile
  await supabase
    .from('profiles')
    .update({ club_id: selectedClubId })
    .eq('user_id', userId /* from auth context */);
};