"use client";

import { useState } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { contacts, Contact } from '@/lib/contacts';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Logo from '@/components/logo';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function TeacherContactsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const parentContacts = contacts.filter(c => c.role === 'parent');

  const filteredContacts = parentContacts.filter(contact =>
    contact.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <h1 className="text-lg font-headline font-semibold">Your Parent Contacts</h1>
        </div>
        <Link href="/" className="hidden sm:block">
            <Logo className="w-24 h-auto" />
        </Link>
      </header>
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-4xl mx-auto">
          <div className="relative mb-8">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by parent's name..."
              className="pl-10 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredContacts.map(contact => (
              <Link href={`/teacher/chat/${contact.id}`} key={contact.id}>
                <Card className="p-4 text-center hover:shadow-lg hover:border-primary transition-all duration-300 cursor-pointer flex flex-col items-center">
                  <Avatar className="w-20 h-20 mb-4">
                    <AvatarImage src={contact.avatarUrl} alt={contact.name} data-ai-hint="parent portrait" />
                    <AvatarFallback>{contact.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <h3 className="font-headline font-semibold">{contact.name}</h3>
                  <p className="text-sm text-muted-foreground">Parent of {contact.childName}</p>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
