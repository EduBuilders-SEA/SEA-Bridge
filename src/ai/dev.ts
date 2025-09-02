import { config } from 'dotenv';
import { ai } from './bedrock';
import { translateMessage } from './flows/translate-message';
import { simplifyMessage } from './flows/simplify-message';
import { chunkMessageForSms } from './flows/chunk-message-for-sms';

// Load environment variables
config();

async function testAWSBedrockIntegration() {
  console.log('🤖 Testing AWS Bedrock Integration...\n');

  try {
    // Test basic text generation
    console.log('1. Testing basic text generation...');
    const basicResponse = await ai.generate({
      prompt: 'Hello! Please respond with a simple greeting.'
    });
    console.log('✅ Basic generation:', basicResponse.text);

    // Test translation flow
    console.log('\n2. Testing translation flow...');
    const translationResult = await translateMessage({
      content: 'Hello, this is a test message for translation.',
      targetLanguage: 'Vietnamese'
    });
    console.log('✅ Translation:', translationResult.translation);

    // Test simplification flow
    console.log('\n3. Testing simplification flow...');
    const simplificationResult = await simplifyMessage({
      content: 'The academic institution requests that guardians remit payment for the educational excursion by the specified deadline.'
    });
    console.log('✅ Simplification:', simplificationResult.simplifiedContent);

    // Test SMS chunking flow
    console.log('\n4. Testing SMS chunking flow...');
    const chunkingResult = await chunkMessageForSms({
      content: 'This is a very long message that needs to be split into multiple SMS chunks because it exceeds the 160 character limit that is standard for SMS messages and we need to ensure it is properly divided.'
    });
    console.log('✅ SMS Chunks:', chunkingResult.chunks);

    console.log('\n🎉 All tests completed successfully!');
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  testAWSBedrockIntegration();
}
