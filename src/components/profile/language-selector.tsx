'use client';

import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCurrentProfile } from '@/hooks/use-profile';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

const SEA_LANGUAGES = [
  { code: 'en', name: 'English', seaLionSupport: 'excellent' },
  { code: 'ms', name: 'Malay', seaLionSupport: 'excellent' },
  { code: 'id', name: 'Indonesian', seaLionSupport: 'excellent' },
  { code: 'th', name: 'Thai', seaLionSupport: 'excellent' },
  { code: 'vi', name: 'Vietnamese', seaLionSupport: 'excellent' },
  { code: 'tl', name: 'Tagalog', seaLionSupport: 'good' },
  { code: 'my', name: 'Burmese', seaLionSupport: 'good' },
  { code: 'km', name: 'Khmer', seaLionSupport: 'good' },
  { code: 'lo', name: 'Lao', seaLionSupport: 'good' },
  { code: 'ta', name: 'Tamil', seaLionSupport: 'moderate' },
  { code: 'zh', name: 'Mandarin', seaLionSupport: 'moderate' },
];

export function LanguageSelector() {
  const { data: profile } = useCurrentProfile();
  const [isUpdating, setIsUpdating] = useState(false);
  const supabase = createClient();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleLanguageChange = async (language: string) => {
    if (!profile) return;

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ preferred_language: language })
        .eq('id', profile.id);

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ['profile'] });

      toast({
        title: 'Language Updated',
        description: `Messages will now be automatically translated to ${language}`,
      });
    } catch (error) {
      console.error('Failed to update language:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not update language preference',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className='space-y-2'>
      <label className='text-sm font-medium'>Preferred Language</label>
      <Select
        value={profile?.preferred_language || 'English'}
        onValueChange={handleLanguageChange}
        disabled={isUpdating}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SEA_LANGUAGES.map((lang) => (
            <SelectItem key={lang.code} value={lang.name}>
              <div className='flex items-center justify-between w-full'>
                <span>{lang.name}</span>
                {lang.seaLionSupport === 'excellent' && (
                  <Badge variant='default' className='ml-2 text-xs'>
                    🦁 Best
                  </Badge>
                )}
                {lang.seaLionSupport === 'good' && (
                  <Badge variant='secondary' className='ml-2 text-xs'>
                    🦁 Good
                  </Badge>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className='text-xs text-muted-foreground'>
        Messages will be automatically translated to your preferred language
        using Sea-Lion AI
      </p>
    </div>
  );
}

