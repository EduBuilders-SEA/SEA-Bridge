import type { ContactCreate } from '@/lib/schemas/contact';
import { createClient } from '@/lib/supabase/client';
import type { Tables } from '@/lib/supabase/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './use-auth';

export type ContactWithJoins = Tables<'contacts'> & {
  parent: Pick<Tables<'profiles'>, 'id' | 'name' | 'phone'> | null;
  teacher: Pick<Tables<'profiles'>, 'id' | 'name' | 'phone'> | null;
};

export function useContacts() {
  const { user } = useAuth();
  const supabase = createClient();
  const queryClient = useQueryClient();

  const contactsQuery = useQuery<ContactWithJoins[]>({
    queryKey: ['contacts', user?.uid],
    queryFn: async () => {
      if (!user) return [] as ContactWithJoins[];
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.uid)
        .single();

      const { data, error } = await supabase
        .from('contacts')
        .select(
          `
          *,
          parent:parent_id(id, name, phone),
          teacher:teacher_id(id, name, phone)
        `
        )
        .or(
          profile?.role === 'teacher'
            ? `teacher_id.eq.${user.uid}`
            : `parent_id.eq.${user.uid}`
        );

      if (error) throw error;
      return (data ?? []) as ContactWithJoins[];
    },
    enabled: !!user,
  });

  const createContactMutation = useMutation({
    mutationFn: async (input: ContactCreate) => {
      if (!user) throw new Error('Not authenticated');

      // Find the parent profile by phone
      const phone = input.phoneNumber.trim();
      const { data: parent, error: parentErr } = await supabase
        .from('profiles')
        .select('id')
        .eq('phone', phone)
        .eq('role', 'parent')
        .single();

      if (parentErr || !parent) {
        throw new Error(
          'No parent profile found for that phone. Ask them to onboard first.'
        );
      }
      if (!input.childName) {
        throw new Error("Child's name is required");
      }

      // Insert with correct DB column names
      const { data, error } = await supabase
        .from('contacts')
        .insert({
          parent_id: parent.id,
          teacher_id: user.uid,
          student_name: input.childName,
          relationship: 'parent',
        })
        .select(
          `
          *,
          parent:parent_id(id, name, phone),
          teacher:teacher_id(id, name, phone)
        `
        )
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts', user?.uid] });
    },
  });

  return {
    contacts: contactsQuery.data ?? [],
    isLoading: contactsQuery.isLoading,
    createContact: createContactMutation.mutate,
  };
}
