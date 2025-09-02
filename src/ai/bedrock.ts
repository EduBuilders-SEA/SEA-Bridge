import { BedrockRuntimeClient, InvokeModelCommand, InvokeModelWithResponseStreamCommand } from '@aws-sdk/client-bedrock-runtime';
import { z } from 'zod';

interface BedrockConfig {
  modelArn: string;
  region: string;
  profile?: string;
  maxGenLen?: number;
  temperature?: number;
}

interface GenerateOptions {
  prompt: string | Array<{ text?: string; media?: { url: string } }>;
  output?: {
    format?: 'json';
    schema?: z.ZodSchema;
  };
  config?: {
    responseModalities?: string[];
  };
  stream?: boolean;
  onStream?: (chunk: string) => void;
}

interface GenerateResponse {
  text?: string;
  output?: any;
}

interface PromptDefinition<TInput, TOutput> {
  name: string;
  input: { schema: z.ZodSchema<TInput> };
  output: { schema: z.ZodSchema<TOutput> };
  prompt: string;
}

interface FlowDefinition<TInput, TOutput> {
  name: string;
  inputSchema: z.ZodSchema<TInput>;
  outputSchema: z.ZodSchema<TOutput>;
}

type FlowFunction<TInput, TOutput> = (input: TInput) => Promise<TOutput>;

class BedrockAI {
  private client: BedrockRuntimeClient;
  private config: Required<BedrockConfig>;

  constructor(config: BedrockConfig) {
    this.config = {
      modelArn: config.modelArn,
      region: config.region,
      profile: config.profile || 'default',
      maxGenLen: config.maxGenLen || 512,
      temperature: config.temperature || 0.5,
    };

    // Initialize AWS client
    this.client = new BedrockRuntimeClient({
      region: this.config.region,
      // Note: For production, use proper AWS credentials configuration
      // This assumes AWS credentials are configured via environment variables or AWS CLI
    });
  }

  async generate(options: GenerateOptions): Promise<GenerateResponse> {
    try {
      let promptText: string;

      // Handle different prompt formats
      if (typeof options.prompt === 'string') {
        promptText = options.prompt;
      } else if (Array.isArray(options.prompt)) {
        // For media inputs, we'll extract text for now
        // Note: AWS Bedrock might handle media differently based on the model
        promptText = options.prompt
          .map(item => item.text || '[Media content]')
          .join(' ');
      } else {
        throw new Error('Unsupported prompt format');
      }

      // If JSON output is requested, modify the prompt to explicitly request JSON
      if (options.output?.format === 'json') {
        promptText += '\n\nPlease respond with valid JSON only, no additional text or formatting. The response should be a JSON object that matches the required schema.';
      }

      const body = JSON.stringify({
        prompt: promptText,
        max_gen_len: this.config.maxGenLen,
        temperature: this.config.temperature,
        stop_sequences: ["Human:", "\nHuman:", "Human :", "\nHuman :"]
      });

      // Use streaming if requested
      if (options.stream) {
        return this.generateStream(body, options);
      }

      const command = new InvokeModelCommand({
        body: new TextEncoder().encode(body),
        modelId: this.config.modelArn,
        accept: 'application/json',
        contentType: 'application/json',
      });

      const response = await this.client.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      
      let generatedText = responseBody.generation?.trim() || '';

      // Clean up the response
      if (generatedText.startsWith('Assistant:')) {
        generatedText = generatedText.substring(10).trim();
      }

      // Remove stop sequences
      for (const stopSeq of ["Human:", "\nHuman:", "Human :", "\nHuman :"]) {
        if (generatedText.includes(stopSeq)) {
          generatedText = generatedText.split(stopSeq)[0].trim();
          break;
        }
      }

      // Handle JSON output format
      if (options.output?.format === 'json' && options.output?.schema) {
        try {
          // Try to extract JSON from the response if it's embedded in text
          let jsonText = generatedText;
          
          // Look for JSON content between code blocks, brackets, or multiple JSON objects
          const jsonMatches = [
            generatedText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/),
            generatedText.match(/(\{[^}]*\})/), // Find first complete JSON object
            generatedText.match(/```\s*(\{[\s\S]*?\})\s*```/),
          ];
          
          for (const match of jsonMatches) {
            if (match) {
              jsonText = match[1];
              break;
            }
          }
          
          // Clean up common formatting issues
          jsonText = jsonText.trim();
          
          // Remove any trailing text after the JSON object
          const jsonEndMatch = jsonText.match(/^(\{[\s\S]*?\})/);
          if (jsonEndMatch) {
            jsonText = jsonEndMatch[1];
          }
          
          const jsonResponse = JSON.parse(jsonText);
          const validatedOutput = options.output.schema.parse(jsonResponse);
          return { output: validatedOutput };
        } catch (error) {
          // If JSON parsing fails, try to prompt again with clearer instructions
          console.warn('Failed to parse JSON, attempting to extract from text response');
          throw new Error(`Failed to parse JSON response. Raw response: "${generatedText}". Error: ${error}`);
        }
      }

      return { text: generatedText };
    } catch (error) {
      throw new Error(`Failed to generate response: ${error}`);
    }
  }

  private async generateStream(body: string, options: GenerateOptions): Promise<GenerateResponse> {
    try {
      const command = new InvokeModelWithResponseStreamCommand({
        body: new TextEncoder().encode(body),
        modelId: this.config.modelArn,
        accept: 'application/json',
        contentType: 'application/json',
      });

      const response = await this.client.send(command);
      let fullText = '';

      if (response.body) {
        for await (const chunk of response.body) {
          if (chunk.chunk?.bytes) {
            const chunkText = new TextDecoder().decode(chunk.chunk.bytes);
            try {
              const chunkData = JSON.parse(chunkText);
              const delta = chunkData.generation || chunkData.delta?.text || '';
              
              if (delta) {
                fullText += delta;
                // Call the streaming callback if provided
                if (options.onStream) {
                  options.onStream(delta);
                }
              }
            } catch (parseError) {
              // Skip malformed chunks
              console.warn('Failed to parse chunk:', chunkText);
            }
          }
        }
      }

      // Clean up the response
      if (fullText.startsWith('Assistant:')) {
        fullText = fullText.substring(10).trim();
      }

      // Remove stop sequences
      for (const stopSeq of ["Human:", "\nHuman:", "Human :", "\nHuman :"]) {
        if (fullText.includes(stopSeq)) {
          fullText = fullText.split(stopSeq)[0].trim();
          break;
        }
      }

      // Handle JSON output format for streaming
      if (options.output?.format === 'json' && options.output?.schema) {
        try {
          let jsonText = fullText;
          
          // Look for JSON content
          const jsonMatches = [
            fullText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/),
            fullText.match(/(\{[^}]*\})/),
            fullText.match(/```\s*(\{[\s\S]*?\})\s*```/),
          ];
          
          for (const match of jsonMatches) {
            if (match) {
              jsonText = match[1];
              break;
            }
          }
          
          jsonText = jsonText.trim();
          const jsonEndMatch = jsonText.match(/^(\{[\s\S]*?\})/);
          if (jsonEndMatch) {
            jsonText = jsonEndMatch[1];
          }
          
          const jsonResponse = JSON.parse(jsonText);
          const validatedOutput = options.output.schema.parse(jsonResponse);
          return { output: validatedOutput };
        } catch (error) {
          throw new Error(`Failed to parse streamed JSON response. Raw response: "${fullText}". Error: ${error}`);
        }
      }

      return { text: fullText };
    } catch (error) {
      throw new Error(`Failed to generate streaming response: ${error}`);
    }
  }

  definePrompt<TInput, TOutput>(
    definition: PromptDefinition<TInput, TOutput>
  ): (input: TInput) => Promise<{ output?: TOutput }> {
    return async (input: TInput) => {
      // Validate input
      definition.input.schema.parse(input);

      // Replace template variables in prompt
      let processedPrompt = definition.prompt;
      
      // Simple template replacement - replace {{key}} with values from input
      const inputObj = input as Record<string, any>;
      for (const [key, value] of Object.entries(inputObj)) {
        const regex = new RegExp(`{{${key}}}`, 'g');
        processedPrompt = processedPrompt.replace(regex, String(value));
      }

      // Handle Handlebars-style loops (simplified)
      processedPrompt = this.processHandlebarsTemplates(processedPrompt, inputObj);

      const response = await this.generate({
        prompt: processedPrompt,
        output: {
          format: 'json',
          schema: definition.output.schema,
        },
      });

      return { output: response.output };
    };
  }

  defineFlow<TInput, TOutput>(
    definition: FlowDefinition<TInput, TOutput>,
    flowFunction: FlowFunction<TInput, TOutput>
  ): FlowFunction<TInput, TOutput> {
    return async (input: TInput) => {
      // Validate input
      definition.inputSchema.parse(input);
      
      const result = await flowFunction(input);
      
      // Validate output
      definition.outputSchema.parse(result);
      
      return result;
    };
  }

  private processHandlebarsTemplates(template: string, data: Record<string, any>): string {
    let processed = template;

    // Handle {{#each array}} loops
    const eachRegex = /{{#each\s+(\w+)}}([\s\S]*?){{\/each}}/g;
    processed = processed.replace(eachRegex, (match, arrayName, content) => {
      const array = data[arrayName];
      if (!Array.isArray(array)) {
        return '';
      }

      return array
        .map(item => {
          let itemContent = content;
          // Replace {{property}} with item.property
          if (typeof item === 'object') {
            for (const [key, value] of Object.entries(item)) {
              const regex = new RegExp(`{{${key}}}`, 'g');
              itemContent = itemContent.replace(regex, String(value));
            }
          }
          return itemContent;
        })
        .join('');
    });

    // Handle {{#if condition}} blocks
    const ifRegex = /{{#if\s+(\w+)}}([\s\S]*?){{\/if}}/g;
    processed = processed.replace(ifRegex, (match, conditionName, content) => {
      const condition = data[conditionName];
      return condition ? content : '';
    });

    // Handle nested object properties like {{object.property}}
    const nestedRegex = /{{(\w+)\.(\w+)}}/g;
    processed = processed.replace(nestedRegex, (match, objName, propName) => {
      const obj = data[objName];
      return obj && typeof obj === 'object' ? String(obj[propName] || '') : '';
    });

    return processed;
  }
}

// Create and export the AI instance
export const ai = new BedrockAI({
  modelArn: process.env.AWS_BEDROCK_MODEL_ARN || "arn:aws:bedrock:us-east-1:071564565652:imported-model/18wtka1nexym",
  region: process.env.AWS_REGION || "us-east-1",
  profile: process.env.AWS_PROFILE || "ADMIN",
  maxGenLen: parseInt(process.env.AWS_BEDROCK_MAX_GEN_LEN || "512"),
  temperature: parseFloat(process.env.AWS_BEDROCK_TEMPERATURE || "0.5"),
});
