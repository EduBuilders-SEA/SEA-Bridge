"use client";

import { useState } from 'react';
import { ArrowLeft, Loader2, MessageSquareText } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { sendSms } from '@/ai/flows/send-sms';
import Logo from '@/components/logo';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function SmsPage() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [message, setMessage] = useState('');
  const [senderRole, setSenderRole] = useState<'teacher' | 'parent'>('teacher');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber || !message) {
      toast({
        variant: 'destructive',
        title: 'Missing Information',
        description: 'Please enter a phone number and a message.',
      });
      return;
    }
    setIsLoading(true);
    try {
      const result = await sendSms({ phoneNumber, message, senderRole });
      toast({
        title: 'Message Sent!',
        description: `${result.status} (ID: ${result.confirmationId})`,
      });
      setPhoneNumber('');
      setMessage('');
    } catch (error) {
      console.error('Failed to send SMS:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to Send',
        description: 'Could not send the message at this time.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <header className="flex items-center justify-between p-4 border-b bg-card shadow-sm sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/">
              <ArrowLeft className="w-5 h-5" />
              <span className="sr-only">Back to Home</span>
            </Link>
          </Button>
          <div className="flex items-center gap-3">
             <MessageSquareText className="w-6 h-6 text-primary" />
            <div>
              <h1 className="text-lg font-headline font-semibold">Send SMS / WhatsApp</h1>
              <p className="text-sm text-muted-foreground">Low-connectivity Fallback</p>
            </div>
          </div>
        </div>
        <Link href="/" className="hidden sm:block">
            <Logo className="w-24 h-auto" />
        </Link>
      </header>
      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8">
        <Card className="w-full max-w-lg">
            <CardHeader>
                <CardTitle className="font-headline">Send a message</CardTitle>
                <CardDescription>This message will be sent via SMS/WhatsApp. Standard carrier rates may apply.</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <Label htmlFor="senderRole">Who is sending this message?</Label>
                        <RadioGroup
                            id="senderRole"
                            value={senderRole}
                            onValueChange={(value: 'teacher' | 'parent') => setSenderRole(value)}
                            className="mt-2 flex gap-4"
                            >
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="teacher" id="r1" />
                                <Label htmlFor="r1">Teacher</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="parent" id="r2" />
                                <Label htmlFor="r2">Parent</Label>
                            </div>
                        </RadioGroup>
                    </div>

                    <div>
                        <Label htmlFor="phoneNumber">Recipient's Phone Number</Label>
                        <Input
                        id="phoneNumber"
                        type="tel"
                        placeholder="+1 (555) 123-4567"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        disabled={isLoading}
                        className="mt-1"
                        />
                    </div>

                    <div>
                        <Label htmlFor="message">Message</Label>
                        <Textarea
                        id="message"
                        placeholder="Type your message here..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        disabled={isLoading}
                        className="mt-1"
                        rows={5}
                        />
                    </div>

                    <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Send Message
                    </Button>
                </form>
            </CardContent>
        </Card>
      </main>
    </div>
  );
}
