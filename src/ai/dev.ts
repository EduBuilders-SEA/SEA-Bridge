import { config } from 'dotenv';
config();

import '@/ai/flows/summarize-message.ts';
import '@/ai/flows/translate-message.ts';
import '@/ai/flows/generate-welcome-message.ts';
import '@/ai/flows/send-sms.ts';
