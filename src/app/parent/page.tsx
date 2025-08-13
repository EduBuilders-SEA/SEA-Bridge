"use client";

import { useState } from 'react';
import Link from 'next/link';
import { PlusCircle, Search } from 'lucide-react';
import { contacts, type Contact } from '@/lib/contacts';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Logo from '@/components/logo';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { AddContactForm } from '@/components/chat/add-contact-form';

export default function ParentContactsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [allContacts, setAllContacts] = useState(contacts);

  const teacherContacts = allContacts.filter(c => c.role === 'teacher');

  const filteredContacts = teacherContacts.filter(contact =>
    contact.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddContact = (newContact: Omit<Contact, 'id' | 'avatarUrl'>) => {
    const newContactWithId: Contact = {
        ...newContact,
        id: String(allContacts.length + 1),
        avatarUrl: `https://placehold.co/100x100.png`,
    };
    setAllContacts(prev => [...prev, newContactWithId]);
  }

  return (
    <div className="flex flex-col h-screen bg-background font-body">
       <header className="flex items-center justify-between p-4 border-b bg-card shadow-sm sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/">
              <ArrowLeft className="w-5 h-5" />
              <span className="sr-only">Back to Home</span>
            </Link>
          </Button>
          <h1 className="text-lg font-headline font-semibold">Your Teacher Contacts</h1>
        </div>
        <Link href="/" className="hidden sm:block">
            <Logo className="w-24 h-auto" />
        </Link>
      </header>
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-8 gap-4">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                type="text"
                placeholder="Search by teacher's name..."
                className="pl-10 w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <AddContactForm role="teacher" onAddContact={handleAddContact}>
                <Button>
                    <PlusCircle className="w-5 h-5 mr-2" />
                    Add Contact
                </Button>
            </AddContactForm>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredContacts.map(contact => (
              <Link href={`/parent/chat/${contact.id}`} key={contact.id}>
                <Card className="p-4 text-center hover:shadow-lg hover:border-primary transition-all duration-300 cursor-pointer flex flex-col items-center">
                  <Avatar className="w-20 h-20 mb-4">
                    <AvatarImage src={contact.avatarUrl} alt={contact.name} data-ai-hint="teacher portrait" />
                    <AvatarFallback>{contact.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <h3 className="font-headline font-semibold">{contact.name}</h3>
                  <p className="text-sm text-muted-foreground">{contact.subject}</p>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
