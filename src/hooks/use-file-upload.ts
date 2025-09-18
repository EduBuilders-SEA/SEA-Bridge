'use client';

import { createClient } from '@/lib/supabase/client';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from './use-auth';
import { useToast } from './use-toast';

interface UploadResult {
  path: string;
  fileName: string;
  size: number;
  type: string;
  signedUrl?: string;
}

export function useFileUpload() {
  const supabase = createClient();
  const { user } = useAuth();
  const { toast } = useToast();

  const uploadFile = async (file: File): Promise<UploadResult> => {
    if (!user?.uid) throw new Error('User not authenticated');

    // Validate file size (50MB limit)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      throw new Error('File size must be less than 50MB');
    }

    // Generate unique filename with Firebase UID
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const fileExt = file.name.split('.').pop() ?? 'bin';
    const fileName = `${user.uid}/${timestamp}_${randomId}.${fileExt}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('chat-files')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }

    // Get signed URL for download
    const { data: signedUrlData, error: urlError } = await supabase.storage
      .from('chat-files')
      .createSignedUrl(data.path, 3600); // 1 hour expiry

    if (urlError) {
      console.warn('⚠️ Could not create signed URL:', urlError);
    }

    return {
      path: data.path,
      fileName: file.name,
      size: file.size,
      type: file.type,
      signedUrl: signedUrlData?.signedUrl,
    };
  };

  const mutation = useMutation({
    mutationFn: uploadFile,
    onSuccess: (data) => {
      toast({
        title: 'Upload successful',
        description: `${data.fileName} has been uploaded`,
      });
    },
    onError: (error: Error) => {
      let errorMessage = 'Failed to upload file. Please try again.';

      if (error.message?.includes('size') || error.message?.includes('50MB')) {
        errorMessage = 'File is too large. Maximum size is 50MB.';
      } else if (
        error.message?.includes('policy') ||
        error.message?.includes('permission')
      ) {
        errorMessage =
          'You do not have permission to upload files. Make sure you are logged in.';
      } else if (error.message?.includes('bucket')) {
        errorMessage =
          'Storage not configured properly. Please contact support.';
      }

      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: errorMessage,
      });
    },
  });

  return {
    uploadFile: mutation.mutate,
    uploadFileAsync: mutation.mutateAsync,
    isUploading: mutation.isPending,
    uploadError: mutation.error,
  };
}
