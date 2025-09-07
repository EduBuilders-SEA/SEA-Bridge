'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/use-auth';
import { useProfile } from '@/hooks/use-profile';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase/client';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { ProfileUpdateSchema, type ProfileUpdate } from '@/lib/schemas';
const schema = ProfileUpdateSchema;

export function CompleteProfileGate() {
  const { user } = useAuth();
  const { data: profile, isLoading } = useProfile();
  const supabase = createClient();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const form = useForm<ProfileUpdate>({
    resolver: zodResolver(schema),
    defaultValues: { name: '' },
  });

  if (!user || isLoading || profile?.name) return null;

  const onSubmit = async (values: ProfileUpdate) => {
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ name: values.name })
      .eq('id', user.uid);
    setSaving(false);
    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not save your name.',
      });
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ['profile', user.uid] });
    toast({ title: 'Profile updated', description: "Thanks! You're all set." });
  };

  return (
    <Dialog open modal>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>Complete your profile</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
            <FormField
              control={form.control}
              name='name'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full name</FormLabel>
                  <FormControl>
                    <Input placeholder='e.g. Jane Doe' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type='submit' className='w-full' disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
