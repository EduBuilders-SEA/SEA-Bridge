'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from './use-auth';
import { manualTriggerRiskAssessment } from '@/lib/actions/risk-scheduler';
import { useEffect } from 'react';

export interface Intervention {
  id: string;
  contact_link_id: string;
  trigger_reason: string;
  risk_level: 'low' | 'medium' | 'high';
  target_family_member: {
    name: string;
    role: string;
    phone?: string;
  };
  message_content: string;
  delivery_method: string;
  delivery_status: 'pending' | 'sent' | 'failed' | 'delivered' | 'replied';
  response_content?: string;
  response_received_at?: string;
  created_at: string;
  contacts?: {
    id: string;
    student_name: string;
    teacher_id: string;
    parent_id: string;
  };
}

export function useInterventions(contactLinkId?: string) {
  const { user } = useAuth();
  const supabase = createClient();

  const query = useQuery({
    queryKey: ['interventions', user?.uid, contactLinkId],
    queryFn: async () => {
      if (!user?.uid) return [];

      let query = supabase
        .from('interventions')
        .select(`
          *,
          contacts!interventions_contact_link_id_fkey(
            id,
            student_name,
            teacher_id,
            parent_id
          )
        `)
        .order('created_at', { ascending: false });

      // Filter by contact if specified
      if (contactLinkId) {
        query = query.eq('contact_link_id', contactLinkId);
      } else {
        // Filter by user's contacts (for teacher dashboard)
        const { data: teacherContacts } = await supabase
          .from('contacts')
          .select('id')
          .eq('teacher_id', user.uid);
        
        const contactIds = teacherContacts?.map(c => c.id) || [];
        if (contactIds.length > 0) {
          query = query.in('contact_link_id', contactIds);
        } else {
          // No contacts found, return empty array
          return [];
        }
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching interventions:', error);
        throw error;
      }

      return data as Intervention[];
    },
    enabled: !!user?.uid,
    staleTime: 30 * 1000, // 30 seconds
  });

  return {
    interventions: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
  };
}

export function useInterventionActions() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const triggerAssessmentMutation = useMutation({
    mutationFn: async (contactLinkId: string) => {
      return await manualTriggerRiskAssessment(contactLinkId);
    },
    onSuccess: () => {
      // Invalidate interventions queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['interventions'] });
    },
  });

  return {
    triggerRiskAssessment: triggerAssessmentMutation.mutateAsync,
    isTriggeringAssessment: triggerAssessmentMutation.isPending,
  };
}

export function useRealtimeInterventions(contactLinkId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const supabase = createClient();

  useEffect(() => {
    if (!user?.uid) return;

    // Subscribe to interventions changes
    const channel = supabase
      .channel('interventions_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'interventions',
          filter: contactLinkId ? `contact_link_id=eq.${contactLinkId}` : undefined,
        },
        (payload) => {
          console.log('Interventions change:', payload);
          
          // Invalidate and refetch interventions
          queryClient.invalidateQueries({ queryKey: ['interventions'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.uid, contactLinkId, queryClient, supabase]);
}

export function useFamilyNetworks(contactLinkId?: string) {
  const { user } = useAuth();
  const supabase = createClient();

  const query = useQuery({
    queryKey: ['family_networks', user?.uid, contactLinkId],
    queryFn: async () => {
      if (!user?.uid || !contactLinkId) return null;

      const { data, error } = await supabase
        .from('family_networks')
        .select('*')
        .eq('contact_link_id', contactLinkId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
        console.error('Error fetching family network:', error);
        throw error;
      }

      return data;
    },
    enabled: !!user?.uid && !!contactLinkId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    familyNetwork: query.data,
    isLoading: query.isLoading,
    error: query.error,
  };
}