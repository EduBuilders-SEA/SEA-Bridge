import type { ContactCreate } from '@/lib/schemas/contact';
import { createClient } from '@/lib/supabase/client';
import type { Tables } from '@/lib/supabase/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './use-auth';

export type ContactWithJoins = (Tables<'contacts'> & { label?: string }) & {
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

      const phone = input.phoneNumber.trim();
      const { data, error } = await supabase.rpc('create_contact_by_phone', {
        target_phone: phone,
        child_name: input.childName ?? null,
      });

      if (error) {
        // Handle specific error cases with user-friendly messages
        if (error.message === 'CONTACT_ALREADY_EXISTS') {
          throw new Error('This contact already exists');
        } else if (error.message === 'NO_TARGET') {
          throw new Error('No user found with this phone number');
        } else if (error.message === 'CHILD_NAME_REQUIRED') {
          throw new Error('Child name is required');
        } else if (error.message === 'PROFILE_NOT_FOUND') {
          throw new Error('Your profile was not found');
        }
        throw error;
      }
      return data; // inserted contact row
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts', user?.uid] });
    },
  });

  const updateContactMutation = useMutation({
    mutationFn: async ({
      id,
      student_name,
      label,
    }: {
      id: string;
      student_name?: string;
      label?: string;
    }) => {
      const { data, error } = await supabase
        .from('contacts')
        .update({ student_name, label })
        .eq('id', id)
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

  const deleteContactMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc('delete_contact', { p_id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts', user?.uid] });
    },
  });

  return {
    contacts: contactsQuery.data ?? [],
    isLoading: contactsQuery.isLoading,
    createContact: createContactMutation.mutate,
    createContactAsync: createContactMutation.mutateAsync,
    updateContact: updateContactMutation.mutate,
    updateContactAsync: updateContactMutation.mutateAsync,
    deleteContact: deleteContactMutation.mutate,
    deleteContactAsync: deleteContactMutation.mutateAsync,
  };
}
