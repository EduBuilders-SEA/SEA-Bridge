"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PlusCircle, Search, Languages } from 'lucide-react';
import { contacts, type Contact } from '@/lib/contacts';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Logo from '@/components/logo';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { AddContactForm } from '@/components/chat/add-contact-form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from '@/components/ui/label';
import { languages } from '@/lib/languages';
import { useRouter } from 'next/navigation';

export default function ParentContactsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [allContacts, setAllContacts] = useState(contacts);
  const [language, setLanguage] = useState('English');
  const [userName, setUserName] = useState('Parent');
  const router = useRouter();

  useEffect(() => {
    const storedUser = localStorage.getItem('sea-bridge-user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      if (user.role !== 'parent') {
        router.push('/onboarding?role=parent');
      } else {
        setUserName(user.name);
      }
    } else {
      router.push('/onboarding?role=parent');
    }
  }, [router]);

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
          <h1 className="text-lg font-headline font-semibold">{userName}'s Teacher Contacts</h1>
        </div>
        <Link href="/" className="hidden sm:block">
            <Logo className="w-24 h-auto" />
        </Link>
      </header>
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-3 gap-4 mb-8">
            <div className="relative md:col-span-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                type="text"
                placeholder="Search by teacher's name..."
                className="pl-10 w-full h-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
             <div className="grid gap-1.5">
                <Label htmlFor="language-select" className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Languages className="w-4 h-4" />
                    My Language
                </Label>
                <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger id="language-select" className="w-full">
                        <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                        {languages.map(lang => (
                            <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
          </div>
          <div className="flex justify-end items-center mb-8">
            <AddContactForm role="teacher" onAddContact={handleAddContact}>
                <Button>
                    <PlusCircle className="w-5 h-5 mr-2" />
                    Add Teacher Contact
                </Button>
            </AddContactForm>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredContacts.map(contact => (
              <Link href={`/parent/chat/${contact.id}?lang=${encodeURIComponent(language)}`} key={contact.id}>
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
