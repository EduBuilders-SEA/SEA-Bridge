'use client';

import { AddContactForm } from '@/components/chat/add-contact-form';
import Logo from '@/components/logo';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/use-auth';
import { useContacts } from '@/hooks/use-contacts';
import { useProfile } from '@/hooks/use-profile';
import { type ContactCreate } from '@/lib/schemas/contact';
import { ArrowLeft, PlusCircle, Search } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function TeacherContactsPage() {
  const { contacts, createContact } = useContacts();
  const [searchTerm, setSearchTerm] = useState('');

  const { user, loading: authLoading } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const router = useRouter();

  // Handle auth redirects on client side
  useEffect(() => {
    if (!authLoading && !profileLoading) {
      if (!user) {
        router.push('/onboarding?role=teacher');
      } else if (profile && profile.role !== 'teacher') {
        router.push(`/${profile.role}`); // Redirect to correct role dashboard
      }
    }
  }, [user, profile, authLoading, profileLoading, router]);

  // Show loading state
  if (authLoading || profileLoading) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div>Loading...</div>
      </div>
    );
  }

  // Don't show content until auth is verified
  if (!user || !profile) return null;

  const parentContacts = contacts.filter((c) => c.role === 'parent');

  const filteredContacts = (contacts ?? []).filter((contact: any) =>
    (contact.parent?.name ?? '')
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  const handleAddContact = (newContact: ContactCreate) => {
    createContact(newContact);
  };

  return (
    <div className='flex flex-col h-screen bg-background font-body'>
      <header className='flex items-center justify-between p-4 border-b bg-card shadow-xs sticky top-0 z-10'>
        <div className='flex items-center gap-4'>
          <Button variant='ghost' size='icon' asChild>
            <Link href='/'>
              <ArrowLeft className='w-5 h-5' />
              <span className='sr-only'>Back to Home</span>
            </Link>
          </Button>
          <h1 className='text-lg font-headline font-semibold'>
            {profile?.name || 'Teacher'}'s Parent Contacts
          </h1>
        </div>
        <Link href='/' className='hidden sm:block'>
          <Logo className='w-24 h-auto' />
        </Link>
      </header>
      <main className='flex-1 overflow-y-auto p-4 md:p-6'>
        <div className='max-w-4xl mx-auto'>
          <div className='flex justify-between items-center mb-8 gap-4'>
            <div className='relative flex-1'>
              <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground' />
              <Input
                type='text'
                placeholder="Search by parent's name..."
                className='pl-10 w-full'
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <AddContactForm role='parent' onAddContact={handleAddContact}>
              <Button>
                <PlusCircle className='w-5 h-5 mr-2' />
                Add Contact
              </Button>
            </AddContactForm>
          </div>
          <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6'>
            {filteredContacts.map((contact: any) => (
              <Link href={`/teacher/chat/${contact.id}`} key={contact.id}>
                <Card className='p-4 text-center hover:shadow-lg hover:border-primary transition-all duration-300 cursor-pointer flex flex-col items-center'>
                  <Avatar className='w-20 h-20 mb-4'>
                    <AvatarImage
                      src={'https://placehold.co/100x100.png'}
                      alt={contact.parent?.name ?? 'Parent'}
                      data-ai-hint='parent portrait'
                    />
                    <AvatarFallback>
                      {(contact.parent?.name ?? '?').charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <h3 className='font-headline font-semibold'>
                    {contact.parent?.name ?? 'Unknown'}
                  </h3>
                  <p className='text-sm text-muted-foreground'>
                    Parent of {contact.student_name}
                  </p>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
