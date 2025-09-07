import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/types";
import { useQuery } from "@tanstack/react-query";

export function useProfilesByRole(role: 'teacher' | 'parent', enabled = true) {
    const supabase = createClient();
  
    return useQuery({
      queryKey: ['profiles-by-role', role],
      queryFn: async (): Promise<Tables<'profiles'>[]> => {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('role', role);
        if (error) throw error;
        return data ?? [];
      },
      enabled,
      staleTime: 5 * 60 * 1000,
    });
  }
  
  export function useTeacherProfiles(enabled = true) {
    return useProfilesByRole('teacher', enabled);
  }
  
  export function useParentProfiles(enabled = true) {
    return useProfilesByRole('parent', enabled);
  }