import { NextRequest, NextResponse } from 'next/server';
import { processSmsWebhook } from '@/lib/actions/sms-handler';

export async function POST(request: NextRequest) {
  try {
    // Parse the incoming webhook data
    const body = await request.json();
    
    console.log('SMS webhook received:', body);
    
    // Process the SMS reply
    const result = await processSmsWebhook(body);
    
    if (result.success) {
      return NextResponse.json(
        { message: result.message },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error processing SMS webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handle GET requests (for webhook verification if needed)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  // Some SMS providers require webhook verification via GET request
  const verifyToken = searchParams.get('verify_token');
  const challenge = searchParams.get('challenge');
  
  if (verifyToken && challenge) {
    // Add your verification logic here
    // For now, just return the challenge for testing
    return NextResponse.json({ challenge });
  }
  
  return NextResponse.json({ message: 'SMS webhook endpoint' });
}