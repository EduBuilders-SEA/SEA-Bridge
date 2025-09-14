'use client';

import { translateDocument } from '@/app/actions/translate-document';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { Download, Globe, Loader2 } from 'lucide-react';
import { useState } from 'react';

interface DocumentTranslatorProps {
  fileUrl: string;
  fileName: string;
  sourceLanguage?: string;
}

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'ms', name: 'Malay' },
  { code: 'id', name: 'Indonesian' },
  { code: 'th', name: 'Thai' },
  { code: 'vi', name: 'Vietnamese' },
  { code: 'tl', name: 'Tagalog' },
  { code: 'my', name: 'Burmese' },
  { code: 'km', name: 'Khmer' },
  { code: 'lo', name: 'Lao' },
  { code: 'ta', name: 'Tamil' },
  { code: 'zh', name: 'Mandarin' },
];

export function DocumentTranslator({
  fileUrl,
  fileName,
  sourceLanguage,
}: DocumentTranslatorProps) {
  const [isTranslating, setIsTranslating] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
  const { toast } = useToast();

  const handleTranslate = async (targetLanguage: string) => {
    setIsTranslating(true);
    setSelectedLanguage(targetLanguage);

    try {
      const result = await translateDocument({
        fileUrl,
        fileName,
        targetLanguage,
        sourceLanguage,
      });

      if (result.success && 'downloadUrl' in result) {
        // Trigger download
        const link = document.createElement('a');
        link.href = result.downloadUrl;
        link.download = result.fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast({
          title: 'Translation Complete',
          description: (
            <div className='flex items-center gap-2'>
              <span>Document translated to {targetLanguage}</span>
              <Badge variant='outline' className='text-xs'>
                {result.model === 'sea-lion' ? '🦁 Sea-Lion' : '✨ Gemini'}
              </Badge>
            </div>
          ),
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Translation Failed',
          description:
            'error' in result ? result.error : 'Unknown error occurred',
        });
      }
    } catch (error) {
      console.error('Translation error:', error);
      toast({
        variant: 'destructive',
        title: 'Translation Failed',
        description: 'Could not translate the document. Please try again.',
      });
    } finally {
      setIsTranslating(false);
      setSelectedLanguage(null);
    }
  };

  return (
    <div className='inline-flex items-center gap-2'>
      <Button
        variant='outline'
        size='sm'
        onClick={() => {
          // Direct download in original language
          const link = document.createElement('a');
          link.href = fileUrl;
          link.download = fileName;
          link.click();
        }}
      >
        <Download className='w-4 h-4 mr-2' />
        Download
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant='outline' size='sm' disabled={isTranslating}>
            {isTranslating ? (
              <>
                <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                Translating...
              </>
            ) : (
              <>
                <Globe className='w-4 h-4 mr-2' />
                Translate & Download
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end' className='w-56'>
          <div className='px-2 py-1.5 text-xs font-semibold text-muted-foreground'>
            Select Language
          </div>
          {LANGUAGES.map((lang) => (
            <DropdownMenuItem
              key={lang.code}
              onClick={() => handleTranslate(lang.name)}
              disabled={isTranslating && selectedLanguage === lang.name}
            >
              {lang.name}
              {selectedLanguage === lang.name && (
                <Loader2 className='w-3 h-3 ml-auto animate-spin' />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Sea-Lion indicator */}
      <Badge variant='secondary' className='text-xs'>
        🦁 Powered by Sea-Lion
      </Badge>
    </div>
  );
}
