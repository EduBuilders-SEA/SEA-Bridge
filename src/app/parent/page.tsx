'use client';

import { AddContactForm } from '@/components/chat/add-contact-form';
import Logo from '@/components/logo';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAuth } from '@/hooks/use-auth';
import { type ContactWithJoins, useContacts } from '@/hooks/use-contacts';
import { useCurrentProfile } from '@/hooks/use-profile';
import { languages } from '@/lib/languages';
import { type ContactCreate } from '@/lib/schemas/contact';
import {
  ArrowLeft,
  Languages,
  PencilLine,
  PlusCircle,
  Search,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function ParentContactsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [language, setLanguage] = useState('English');

  const { user, loading: authLoading } = useAuth();
  const { data: profile, isLoading: profileLoading } = useCurrentProfile();
  const router = useRouter();
  const {
    contacts,
    createContactAsync,
    updateContactAsync,
    deleteContactAsync,
  } = useContacts();
  const [editOpen, setEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [label, setLabel] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Handle auth redirects on client side
  useEffect(() => {
    if (!authLoading && !profileLoading) {
      if (!user) {
        router.push('/onboarding?role=parent');
      } else if (profile && profile.role !== 'parent') {
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

  const filteredContacts = (contacts ?? []).filter(
    (contact: ContactWithJoins) =>
      (contact.teacher?.name ?? '')
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
  );

  const handleAddContact = (newContact: ContactCreate) => {
    return createContactAsync(newContact);
  };

  const openEdit = (contact: ContactWithJoins) => {
    setEditingId(contact.id);
    setLabel('');
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    await updateContactAsync({ id: editingId, label });
    setEditOpen(false);
    setEditingId(null);
    setLabel('');
  };

  const confirmDelete = async () => {
    if (!confirmDeleteId) return;
    await deleteContactAsync(confirmDeleteId);
    setConfirmDeleteId(null);
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
            {profile?.name || 'Parent'}'s Teacher Contacts
          </h1>
        </div>
        <Link href='/' className='hidden sm:block'>
          <Logo className='w-24 h-auto' />
        </Link>
      </header>
      <main className='flex-1 overflow-y-auto p-4 md:p-6'>
        <div className='max-w-4xl mx-auto'>
          <div className='grid md:grid-cols-3 gap-4 mb-8'>
            <div className='relative md:col-span-2'>
              <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground' />
              <Input
                type='text'
                placeholder="Search by teacher's name..."
                className='pl-10 w-full h-full'
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className='grid gap-1.5'>
              <Label
                htmlFor='language-select'
                className='flex items-center gap-2 text-sm text-muted-foreground'
              >
                <Languages className='w-4 h-4' />
                My Language
              </Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger id='language-select' className='w-full'>
                  <SelectValue placeholder='Select language' />
                </SelectTrigger>
                <SelectContent>
                  {languages.map((lang) => (
                    <SelectItem key={lang.value} value={lang.value}>
                      {lang.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className='flex justify-end items-center mb-8'>
            <AddContactForm role='teacher' onAddContact={handleAddContact}>
              <Button>
                <PlusCircle className='w-5 h-5 mr-2' />
                Add Teacher Contact
              </Button>
            </AddContactForm>
          </div>
          <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6'>
            {filteredContacts.map((contact: ContactWithJoins) => (
              <Link
                href={`/parent/chat/${contact.id}?lang=${encodeURIComponent(
                  language
                )}`}
                key={contact.id}
              >
                <Card className='p-4 text-center hover:shadow-lg hover:border-primary transition-all duration-300 cursor-pointer flex flex-col items-center'>
                  <Avatar className='w-20 h-20 mb-4'>
                    <AvatarImage
                      src={'https://placehold.co/100x100.png'}
                      alt={contact.teacher?.name ?? 'Teacher'}
                      data-ai-hint='teacher portrait'
                    />
                    <AvatarFallback>
                      {(
                        (contact as any).label ??
                        contact.teacher?.name ??
                        '?'
                      ).charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <h3 className='font-headline font-semibold'>
                    {(contact as any).label ??
                      contact.teacher?.name ??
                      'Pending'}
                  </h3>
                  <p className='text-sm text-muted-foreground'>
                    {(contact as any).label
                      ? contact.teacher?.name ?? ''
                      : 'Teacher'}
                  </p>
                  {contact.teacher?.phone && (
                    <p className='text-xs text-muted-foreground mt-1'>
                      {contact.teacher.phone}
                    </p>
                  )}
                  <div className='mt-4 flex gap-2'>
                    <TooltipProvider delayDuration={0}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant='outline'
                            size='icon'
                            aria-label='Edit contact'
                            onClick={(e) => {
                              e.preventDefault();
                              openEdit(contact);
                            }}
                          >
                            <PencilLine className='w-4 h-4' />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Edit</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant='destructive'
                            size='icon'
                            aria-label='Remove contact'
                            onClick={(e) => {
                              e.preventDefault();
                              setConfirmDeleteId(contact.id);
                            }}
                          >
                            <Trash2 className='w-4 h-4' />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Remove</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </main>
      {/* Edit dialog (optional label for teacher) */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Edit contact label</DialogTitle>
            <DialogDescription>
              Set a nickname for this teacher (optional).
            </DialogDescription>
          </DialogHeader>
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder='e.g. Math Teacher'
          />
          <DialogFooter>
            <Button variant='ghost' onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveEdit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog
        open={!!confirmDeleteId}
        onOpenChange={(open) => {
          if (!open) setConfirmDeleteId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove contact?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the parent-teacher link. Messages are not
              deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
