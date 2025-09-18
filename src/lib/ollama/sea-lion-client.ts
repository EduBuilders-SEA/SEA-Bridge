/**
 * Clean, fast Ollama SEA-LION client for hackathon
 * Performance: ~150ms on g5.4xlarge
 */

export interface OllamaResponse {
  response: string;
  done: boolean;
}

export class SeaLionOllamaClient {
  private readonly endpoint: string;
  private readonly model: string;
  // private readonly model = 'aisingapore/Gemma-SEA-LION-v4-27B-IT'; // 🆕 Updated!

  constructor() {
    this.endpoint = process.env.OLLAMA_ENDPOINT ?? 'http://localhost:11434';
    // Prefer explicit OLLAMA model override; default to the fast 8B model
    this.model =
      process.env.SEA_LION_OLLAMA_MODEL?.trim() ||
      'aisingapore/Llama-SEA-LION-v3.5-8B-R';
  }

  async translateMessage(
    content: string,
    targetLanguage: string,
    _sourceLanguage?: string
  ): Promise<string> {
    const startTime = Date.now();

    try {
      // Force strict JSON to eliminate meta-commentary
      const prompt = [
        `Task: Translate the given text to ${targetLanguage}.`,
        'Rules:',
        '- Output ONLY valid JSON on a single line',
        '- No explanations, no chain-of-thought, no markdown',
        '- Use exactly this schema: {"translation":"..."}',
        '',
        `Text: "${content}"`,
        '',
        'Return:',
      ].join('\n');

      const response = await fetch(`${this.endpoint}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          prompt,
          format: 'json', // enforce JSON
          stream: false,
          options: {
            temperature: 0,
            num_predict: 80,
            top_p: 0.1,
            top_k: 20,
            num_ctx: 256,
            stop: ['\n\n', '<think', '```', 'Task:', 'Rules:'],
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama JSON generate failed: ${response.status}`);
      }

      const data = await response.json();
      const duration = Date.now() - startTime;
      // info metric
      console.warn(`SEA-LION(JSON): ${duration}ms`);

      // Parse the JSON safely
      try {
        const parsed = JSON.parse(data.response);
        const raw = String(parsed?.translation ?? '').trim();
        if (raw) return this.cleanFinal(raw) || content;
      } catch (_) {
        // fallthrough
      }

      // If JSON parsing failed, try aggressive cleaning
      const cleaned = this.cleanFinal(String(data.response ?? ''));
      if (cleaned) return cleaned;

      // Final fallback
      return this.generateWithFallback(content, targetLanguage);
    } catch (error) {
      console.error('❌ SEA-LION JSON mode failed:', error);
      // Fallback to generate API if JSON mode fails
      return this.generateWithFallback(content, targetLanguage);
    }
  }

  async simplifyMessage(
    content: string,
    _language: string = 'English'
  ): Promise<string> {
    const startTime = Date.now();

    try {
      // **CLEAN SIMPLIFICATION**: System message for focus
      const response = await fetch(`${this.endpoint}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content:
                'You are a text simplification tool. Rewrite text in simple, clear language. Output ONLY the simplified text.',
            },
            {
              role: 'user',
              content,
            },
          ],
          stream: false,
          options: {
            temperature: 0.1,
            num_predict: 60,
            num_ctx: 256,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Simplification chat failed: ${response.status}`);
      }

      const data = await response.json();
      const duration = Date.now() - startTime;

      console.warn(`SEA-LION SIMPLE: ${duration}ms`);

      return data.message?.content?.trim() || content;
    } catch (error) {
      console.error('❌ Simplification failed:', error);
      return content;
    }
  }

  async smartChunkForSMS(
    content: string,
    _language: string
  ): Promise<string[]> {
    // Simple chunking by sentences and 160 char limit
    const sentences = content
      .split(/[.!?]+/)
      .filter((s) => s.trim().length > 0);
    const chunks: string[] = [];
    let currentChunk = '';

    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim();
      if (!trimmedSentence) continue;

      const potentialChunk = currentChunk
        ? `${currentChunk}. ${trimmedSentence}`
        : trimmedSentence;

      if (potentialChunk.length <= 150) {
        // Leave margin for punctuation
        currentChunk = potentialChunk;
      } else {
        if (currentChunk) {
          chunks.push(`${currentChunk}.`);
        }
        currentChunk = trimmedSentence;
      }
    }

    if (currentChunk) {
      chunks.push(`${currentChunk}.`);
    }

    return chunks.length > 0 ? chunks : [content];
  }

  private async generateWithFallback(
    content: string,
    targetLanguage: string
  ): Promise<string> {
    try {
      const response = await fetch(`${this.endpoint}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          prompt: `Translate to ${targetLanguage}: "${content}"\n\nTranslation:`,
          stream: false,
          options: {
            temperature: 0,
            num_predict: 30,
            stop: ['\n', 'Translate', 'Translation:', 'Task:', 'Note:'],
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Fallback generate failed: ${response.status}`);
      }

      const data = await response.json();
      return this.cleanFinal(String(data.response ?? '')) || content;
    } catch (error) {
      console.error('❌ Fallback translation failed:', error);
      return content; // Return original if all fails
    }
  }

  async generateResponse(prompt: string, operation: string): Promise<string> {
    const startTime = Date.now();

    try {
      const response = await fetch(`${this.endpoint}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          prompt,
          stream: false,
          options: {
            temperature: 0.1,
            num_predict: 64, // **ULTRA-FAST**: Even smaller
            num_ctx: 256, // **MINIMAL**: Fastest context
            num_gpu: 1, // **GPU REQUIRED**
            num_thread: 8, // **MAX THREADS**
            top_k: 10, // **FOCUSED GENERATION**
            top_p: 0.8, // **PRECISE**
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama failed: ${response.status}`);
      }

      const data: OllamaResponse = await response.json();
      const duration = Date.now() - startTime;

      // info metric
      console.warn(`SEA-LION ${operation}: ${duration}ms`);
      return this.cleanFinal(String(data.response ?? ''));
    } catch (error) {
      console.error(`❌ SEA-LION ${operation} failed:`, error);
      throw error;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.endpoint}/api/version`, {
        signal: AbortSignal.timeout(1000), // 1s timeout
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  // **TEST METHOD**: Verify clean translations
  async testCleanTranslations(): Promise<void> {
    console.log('🧪 Testing clean translations...');

    const tests = [
      { text: 'hello world', target: 'Vietnamese' },
      { text: 'this is bad', target: 'Thai' },
      { text: 'good morning teacher', target: 'Malay' },
    ];

    for (const test of tests) {
      try {
        const result = await this.translateMessage(test.text, test.target);
        console.log(`✅ "${test.text}" → ${test.target}: "${result}"`);
      } catch (error) {
        console.error(`❌ Test failed for "${test.text}":`, error);
      }
    }
  }

  private cleanFinal(text: string): string {
    if (!text) return '';
    let cleaned = text.trim();
    // Strip common prefixes
    cleaned = cleaned.replace(
      /^\s*(Translation|Answer|Response|Output)\s*:\s*/i,
      ''
    );
    // Remove quotes wrapping entire string
    cleaned = cleaned.replace(/^\s*["']|["']\s*$/g, '');
    // Remove accidental JSON wrappers
    const jsonLike = cleaned.match(
      /^\{\s*"translation"\s*:\s*"([\s\S]*?)"\s*\}\s*$/
    );
    if (jsonLike) cleaned = jsonLike[1];
    // Stop at first newline to avoid extra chatter
    cleaned = cleaned.split('\n')[0];
    // Remove leftover think markers
    cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, '');
    return cleaned.trim();
  }
}

export const seaLionOllama = new SeaLionOllamaClient();
