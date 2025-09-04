// Example usage of streaming with AWS Bedrock AI
import { z } from 'zod';
import { ai } from './bedrock';

// Example 1: Basic streaming text generation
export async function exampleStreamingGeneration() {
  console.log('🌊 Starting streaming generation...\n');
  
  let fullResponse = '';
  
  const response = await ai.generate({
    prompt: 'Write a short story about a parent-teacher conference that goes surprisingly well. Make it heartwarming and realistic.',
    stream: true,
    onStream: (chunk: string) => {
      process.stdout.write(chunk); // Stream to console in real-time
      fullResponse += chunk;
    }
  });
  
  console.log('\n\n✅ Streaming completed!');
  console.log(`Final response length: ${fullResponse.length} characters`);
  return response.text;
}

// Example 2: Streaming with timeout handling
export async function exampleStreamingWithTimeout() {
  console.log('⏱️ Streaming with timeout handling...\n');
  
  let chunks: string[] = [];
  let lastChunkTime = Date.now();
  
  const response = await ai.generate({
    prompt: 'Explain the benefits of regular parent-teacher communication in detail.',
    stream: true,
    onStream: (chunk: string) => {
      chunks.push(chunk);
      lastChunkTime = Date.now();
      process.stdout.write(chunk);
    }
  });
  
  console.log(`\n\n✅ Received ${chunks.length} chunks`);
  return response.text;
}

// Example 3: Streaming for real-time translation
export async function exampleStreamingTranslation() {
  console.log('🔄 Streaming translation...\n');
  
  const originalText = `Dear parents, I wanted to share some exciting news about your child's progress in mathematics. Over the past month, they have shown remarkable improvement in problem-solving skills and have been actively participating in class discussions. Their enthusiasm for learning is truly inspiring, and I believe with continued support at home, they will achieve even greater success. Please feel free to contact me if you have any questions or would like to discuss strategies to further support their learning journey.`;
  
  let translatedChunks: string[] = [];
  
  const response = await ai.generate({
    prompt: `Translate the following English text to Vietnamese, maintaining the warm and encouraging tone:

"${originalText}"

Please provide a natural, fluent Vietnamese translation:`,
    stream: true,
    onStream: (chunk: string) => {
      translatedChunks.push(chunk);
      process.stdout.write(chunk);
    }
  });
  
  console.log(`\n\n✅ Translation completed in ${translatedChunks.length} chunks`);
  return response.text;
}

// Example 4: Streaming with progress indicators
export async function exampleStreamingWithProgress() {
  console.log('📊 Streaming with progress tracking...\n');
  
  let totalChunks = 0;
  let totalLength = 0;
  const startTime = Date.now();
  
  const response = await ai.generate({
    prompt: 'Create a comprehensive guide for parents on how to support their children\'s homework at home. Include practical tips, common challenges, and solutions.',
    stream: true,
    onStream: (chunk: string) => {
      totalChunks++;
      totalLength += chunk.length;
      
      // Show progress every 10 chunks
      if (totalChunks % 10 === 0) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`\n[Progress: ${totalChunks} chunks, ${totalLength} chars, ${elapsed}s]`);
      }
      
      process.stdout.write(chunk);
    }
  });
  
  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n\n✅ Completed: ${totalChunks} chunks, ${totalLength} characters in ${totalTime}s`);
  
  return response.text;
}

// Example 5: Non-streaming for comparison
export async function exampleNonStreaming() {
  console.log('⏳ Non-streaming generation (for comparison)...\n');
  
  const startTime = Date.now();
  
  const response = await ai.generate({
    prompt: 'Write a brief guide on effective parent-teacher communication strategies.',
    stream: false // Explicitly disable streaming
  });
  
  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`Response received in ${totalTime}s:`);
  console.log(response.text);
  
  return response.text;
}

// Example 6: Streaming with error handling
export async function exampleStreamingWithErrorHandling() {
  console.log('🛡️ Streaming with error handling...\n');
  
  try {
    let chunkCount = 0;
    const maxChunks = 100; // Set a reasonable limit
    
    const response = await ai.generate({
      prompt: 'Describe the importance of building trust between parents and teachers.',
      stream: true,
      onStream: (chunk: string) => {
        chunkCount++;
        
        if (chunkCount > maxChunks) {
          console.log('\n⚠️ Maximum chunk limit reached');
          return;
        }
        
        process.stdout.write(chunk);
      }
    });
    
    console.log(`\n\n✅ Successfully handled ${chunkCount} chunks`);
    return response.text;
    
  } catch (error) {
    console.error('\n❌ Streaming error:', error);
    throw error;
  }
}

// Run all streaming examples
export async function runStreamingExamples() {
  console.log('🚀 Running AWS Bedrock Streaming Examples...\n');
  
  try {
    console.log('═'.repeat(60));
    console.log('Example 1: Basic Streaming');
    console.log('═'.repeat(60));
    await exampleStreamingGeneration();
    
    console.log('\n\n' + '═'.repeat(60));
    console.log('Example 2: Streaming with Timeout');
    console.log('═'.repeat(60));
    await exampleStreamingWithTimeout();
    
    console.log('\n\n' + '═'.repeat(60));
    console.log('Example 3: Streaming Translation');
    console.log('═'.repeat(60));
    await exampleStreamingTranslation();
    
    console.log('\n\n' + '═'.repeat(60));
    console.log('Example 4: Streaming with Progress');
    console.log('═'.repeat(60));
    await exampleStreamingWithProgress();
    
    console.log('\n\n' + '═'.repeat(60));
    console.log('Example 5: Non-Streaming (Comparison)');
    console.log('═'.repeat(60));
    await exampleNonStreaming();
    
    console.log('\n\n' + '═'.repeat(60));
    console.log('Example 6: Streaming with Error Handling');
    console.log('═'.repeat(60));
    await exampleStreamingWithErrorHandling();
    
    console.log('\n\n🎉 All streaming examples completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Streaming example failed:', error);
  }
}

// Quick streaming test
export async function quickStreamingTest() {
  console.log('⚡ Quick streaming test...\n');
  
  const response = await ai.generate({
    prompt: 'Count from 1 to 10 with explanations.',
    stream: true,
    onStream: (chunk: string) => {
      process.stdout.write(chunk);
    }
  });
  
  console.log('\n\n✅ Quick test completed!');
  return response.text;
}

if (require.main === module) {
  // Run a quick test by default, or all examples with argument
  const runAll = process.argv.includes('--all');
  
  if (runAll) {
    runStreamingExamples().catch(console.error);
  } else {
    quickStreamingTest().catch(console.error);
  }
}