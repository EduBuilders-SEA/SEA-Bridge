"use server";

import { presignInOut, headExists, presignGet, PreserveFormat, uploadToS3 } from "@/lib/s3";
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

const PY_BASE = process.env.TRANSLATE_API_BASE!;
const PY_KEY = process.env.TRANSLATE_API_KEY!;
const BUCKET = process.env.AWS_S3_BUCKET!;

export async function uploadDocument(formData: FormData) {
  const file = formData.get('file') as File;
  const contactId = formData.get('contactId') as string;
  
  if (!file) throw new Error('No file provided');
  
  const timestamp = Date.now();
  const key = `documents/${contactId}/${timestamp}_${file.name}`;
  
  await uploadToS3(file, key);
  
  return { 
    key, 
    fileName: file.name,
    fileType: file.type,
    fileSize: file.size
  };
}

export async function startTranslation(input: {
  bucket: string;
  key: string;
  target_lang: string;
  preserve_format: PreserveFormat;
  contactId: string;
  messageId?: string;
}) {
  const { bucket, key, target_lang, preserve_format, contactId, messageId } = input;

  const { inputUrl, outputUrl, outputKey } = await presignInOut({
    bucket,
    key,
    preserve: preserve_format,
    expiresInSec: 15 * 60,
  });

  const form = new FormData();
  form.set("file_url", inputUrl);
  form.set("output_url", outputUrl);
  form.set("target_lang", target_lang);
  form.set("preserve_format", preserve_format);
  form.set("return_mode", "async");

  const res = await fetch(`${PY_BASE}/v1/translate-file`, {
    method: "POST",
    headers: { Authorization: `Bearer ${PY_KEY}` },
    body: form,
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => "translate service error");
    throw new Error(msg);
  }

  if (messageId) {
    const supabase = await createClient();
    await supabase
      .from('messages')
      .update({
        variants: {
          translation_status: 'processing',
          translation_started: new Date().toISOString(),
          output_key: outputKey,
        }
      })
      .eq('id', messageId);
  }

  return {
    status: "queued" as const,
    bucket,
    outputKey,
  };
}

export async function pollForOutput(input: {
  bucket: string;
  outputKey: string;
  messageId?: string;
}) {
  const { bucket, outputKey, messageId } = input;
  const exists = await headExists({ bucket, key: outputKey });
  
  if (!exists) return { ready: false as const };

  const download_url = await presignGet({ bucket, key: outputKey, expiresInSec: 120 });
  
  if (messageId) {
    const supabase = await createClient();
    await supabase
      .from('messages')
      .update({
        variants: {
          translation_status: 'complete',
          translation_completed: new Date().toISOString(),
          translated_document_url: download_url,
        }
      })
      .eq('id', messageId);
      
    revalidatePath('/parent/chat/[contactId]', 'page');
    revalidatePath('/teacher/chat/[contactId]', 'page');
  }
  
  return { ready: true as const, download_url };
}