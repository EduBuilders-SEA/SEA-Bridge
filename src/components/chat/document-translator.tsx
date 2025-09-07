"use client";

import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { FileText, Download, Loader2, Languages } from 'lucide-react';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { startTranslation, pollForOutput } from '@/app/actions/document-translation';
import { languages } from '@/lib/languages';
import { useToast } from '@/hooks/use-toast';

const TranslateSchema = z.object({
  target_lang: z.string().min(2),
  preserve_format: z.enum(['markdown', 'text']),
});

type TranslateForm = z.infer<typeof TranslateSchema>;

export function DocumentTranslator({ 
  s3Key,
  fileName,
  messageId,
  contactId,
  initialLanguage = 'Vietnamese'
}: { 
  s3Key: string;
  fileName: string;
  messageId?: string;
  contactId: string;
  initialLanguage?: string;
}) {
  const [status, setStatus] = useState<'idle' | 'translating' | 'ready' | 'error'>('idle');
  const [downloadUrl, setDownloadUrl] = useState<string>('');
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { toast } = useToast();
  
  const { register, handleSubmit, setValue, watch } = useForm<TranslateForm>({
    resolver: zodResolver(TranslateSchema),
    defaultValues: {
      target_lang: initialLanguage,
      preserve_format: 'markdown',
    }
  });

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const onSubmit = async (values: TranslateForm) => {
    setStatus('translating');
    
    try {
      const job = await startTranslation({
        bucket: process.env.NEXT_PUBLIC_AWS_S3_BUCKET!,
        key: s3Key,
        target_lang: values.target_lang,
        preserve_format: values.preserve_format,
        contactId,
        messageId,
      });

      pollingRef.current = setInterval(async () => {
        const res = await pollForOutput({ 
          bucket: job.bucket, 
          outputKey: job.outputKey,
          messageId 
        });
        
        if (res.ready) {
          if (pollingRef.current) clearInterval(pollingRef.current);
          setStatus('ready');
          setDownloadUrl(res.download_url);
          
          const a = document.createElement('a');
          a.href = res.download_url;
          a.download = `${fileName.split('.')[0]}_${values.target_lang}.${values.preserve_format === 'markdown' ? 'md' : 'txt'}`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          
          toast({
            title: 'Translation Complete',
            description: 'Your document has been translated and downloaded.',
          });
        }
      }, 3000);
      
      setTimeout(() => {
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          if (status === 'translating') {
            setStatus('error');
            toast({
              variant: 'destructive',
              title: 'Translation Timeout',
              description: 'The translation took too long. Please try again.',
            });
          }
        }
      }, 120000);
      
    } catch (error) {
      console.error('Translation error:', error);
      setStatus('error');
      toast({
        variant: 'destructive',
        title: 'Translation Failed',
        description: 'Could not translate the document. Please try again.',
      });
    }
  };

  if (status === 'idle') {
    return (
      <form onSubmit={handleSubmit(onSubmit)} className="flex items-center gap-2 p-2 border rounded-md">
        <Select onValueChange={(v) => setValue('target_lang', v)} defaultValue={watch('target_lang')}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Language" /></SelectTrigger>
          <SelectContent>{languages.map(lang => <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>)}</SelectContent>
        </Select>
        <Select onValueChange={(v) => setValue('preserve_format', v as any)} defaultValue={watch('preserve_format')}>
          <SelectTrigger className="w-[120px]"><SelectValue placeholder="Format" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="markdown">Markdown</SelectItem>
            <SelectItem value="text">Plain Text</SelectItem>
          </SelectContent>
        </Select>
        <Button type="submit" size="sm" variant="outline"><Languages className="w-4 h-4 mr-2" />Translate</Button>
      </form>
    );
  }

  if (status === 'translating') return <Button disabled size="sm" variant="outline"><Loader2 className="w-4 h-4 mr-2 animate-spin" />Translating...</Button>;
  if (status === 'ready') return <Button asChild size="sm" variant="outline" className="text-green-600"><a href={downloadUrl} download><Download className="w-4 h-4 mr-2" />Download Translation</a></Button>;
  return <Button onClick={() => setStatus('idle')} size="sm" variant="destructive">Retry Translation</Button>;
}