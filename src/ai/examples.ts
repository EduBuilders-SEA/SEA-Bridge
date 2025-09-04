// Example usage of the new AWS Bedrock AI implementation
import { z } from 'zod';
import { ai } from './bedrock';
import { translateMessage } from './flows/translate-message';
import { simplifyMessage } from './flows/simplify-message';
import { chunkMessageForSms } from './flows/chunk-message-for-sms';
import { summarizeConversation } from './flows/summarize-conversation';
import { summarizeDocument } from './flows/summarize-document';

// Example 1: Basic text generation
export async function exampleBasicGeneration() {
  const response = await ai.generate({
    prompt: 'Explain the importance of parent-teacher communication in simple terms.'
  });
  
  console.log('Generated text:', response.text);
  return response.text;
}

// Example 1b: Basic text generation with streaming
export async function exampleBasicGenerationStreaming() {
  console.log('Generated text (streaming): ');
  
  const response = await ai.generate({
    prompt: 'Explain the importance of parent-teacher communication in simple terms.',
    stream: true,
    onStream: (chunk: string) => {
      process.stdout.write(chunk);
    }
  });
  
  console.log('\n');
  return response.text;
}

// Example 2: Translation
export async function exampleTranslation() {
  const result = await translateMessage({
    content: 'Dear parents, please remember that the school field trip is scheduled for Friday, November 15th. Students should bring a lunch and wear comfortable shoes.',
    targetLanguage: 'Vietnamese'
  });
  
  console.log('Translation:', result.translation);
  return result;
}

// Example 3: Message simplification
export async function exampleSimplification() {
  const result = await simplifyMessage({
    content: 'The educational institution requires that all guardians complete and remit the necessary documentation pertaining to the forthcoming academic excursion by the designated deadline.'
  });
  
  console.log('Simplified:', result.simplifiedContent);
  return result;
}

// Example 4: SMS chunking
export async function exampleSmsChunking() {
  const result = await chunkMessageForSms({
    content: 'This is a very long message that exceeds the standard SMS character limit of 160 characters and therefore needs to be divided into multiple smaller chunks that can be sent as separate SMS messages to ensure delivery.'
  });
  
  console.log('SMS chunks:', result.chunks);
  return result;
}

// Example 5: Conversation summarization
export async function exampleConversationSummary() {
  const result = await summarizeConversation({
    messages: [
      { sender: 'teacher', content: 'Hello, I wanted to discuss Alex\'s recent performance in math class.' },
      { sender: 'parent', content: 'Hi, I\'ve noticed he\'s been struggling with homework. What can we do?' },
      { sender: 'teacher', content: 'I suggest we schedule extra practice sessions. Also, the math test is next Friday.' },
      { sender: 'parent', content: 'That sounds good. Should I help him study at home too?' },
      { sender: 'teacher', content: 'Yes, that would be very helpful. I\'ll send some practice problems.' }
    ],
    attendance: {
      present: 18,
      absent: 2,
      tardy: 1
    }
  });
  
  console.log('Summary:', result);
  return result;
}

// Example 6: Document summarization
export async function exampleDocumentSummary() {
  const result = await summarizeDocument({
    documentContent: `
    SCHOOL FIELD TRIP PERMISSION FORM
    
    Dear Parents/Guardians,
    
    Our school is organizing an educational field trip to the Science Museum on Friday, November 15th, 2024. This trip is designed to enhance our students' understanding of science concepts through interactive exhibits and hands-on activities.
    
    Trip Details:
    - Date: Friday, November 15th, 2024
    - Departure: 9:00 AM from school
    - Return: 3:00 PM to school
    - Cost: $25 per student (includes transportation and museum admission)
    - Lunch: Students should bring their own lunch
    
    Required Items:
    - Completed permission slip (attached)
    - Payment of $25 (due by November 10th)
    - Emergency contact information
    
    Please ensure your child wears comfortable walking shoes and weather-appropriate clothing.
    
    If you have any questions, please contact the school office at (555) 123-4567.
    
    Sincerely,
    Mrs. Johnson
    Science Department
    `
  });
  
  console.log('Document summary:', result.summary);
  return result;
}

// Example 7: JSON structured output
export async function exampleStructuredOutput() {
  const response = await ai.generate({
    prompt: 'Create a simple lesson plan for teaching basic addition to 1st graders.',
    output: {
      format: 'json',
      schema: z.object({
        title: z.string(),
        objective: z.string(),
        materials: z.array(z.string()),
        activities: z.array(z.object({
          name: z.string(),
          duration: z.string(),
          description: z.string()
        }))
      })
    }
  });
  
  console.log('Structured lesson plan:', response.output);
  return response.output;
}

// Run all examples
export async function runAllExamples() {
  console.log('🚀 Running AWS Bedrock Examples...\n');
  
  try {
    await exampleBasicGeneration();
    console.log('\n---\n');
    
    await exampleBasicGenerationStreaming();
    console.log('\n---\n');
    
    await exampleTranslation();
    console.log('\n---\n');
    
    await exampleSimplification();
    console.log('\n---\n');
    
    await exampleSmsChunking();
    console.log('\n---\n');
    
    await exampleConversationSummary();
    console.log('\n---\n');
    
    await exampleDocumentSummary();
    console.log('\n---\n');
    
    await exampleStructuredOutput();
    
    console.log('✅ All examples completed successfully!');
  } catch (error) {
    console.error('❌ Example failed:', error);
  }
}

if (require.main === module) {
  runAllExamples().catch(console.error);
}