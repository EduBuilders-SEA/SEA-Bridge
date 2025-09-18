// Quick AWS credentials test
require('dotenv').config();
const { STSClient, GetCallerIdentityCommand } = require('@aws-sdk/client-sts');

async function testCredentials() {
    try {
        const credentials = {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        };

        // Add session token if it exists (for temporary credentials)
        if (process.env.AWS_SESSION_TOKEN) {
            credentials.sessionToken = process.env.AWS_SESSION_TOKEN;
        }

        const client = new STSClient({
            region: process.env.AWS_REGION,
            credentials,
        });

        console.log('🔍 Testing AWS credentials...');
        console.log('Region:', process.env.AWS_REGION);
        console.log('Access Key ID:', `${process.env.AWS_ACCESS_KEY_ID?.substring(0, 8)}...`);
        console.log("Secret Access Key:", `${process.env.AWS_SECRET_ACCESS_KEY?.substring(0, 8)}...`);

        const command = new GetCallerIdentityCommand({});
        const result = await client.send(command);

        console.log('✅ AWS Credentials are valid!');
        console.log('Account:', result.Account);
        console.log('User ARN:', result.Arn);

    } catch (error) {
        console.error('❌ AWS Credentials test failed:', error.message);

        if (error.message.includes('security token')) {
            console.error('💡 This looks like a credential/token issue. Check:');
            console.error('   1. Access Key ID and Secret Key are correct');
            console.error('   2. If using temporary credentials, ensure AWS_SESSION_TOKEN is set');
            console.error('   3. Check if credentials have expired');
        }
    }
}

testCredentials();