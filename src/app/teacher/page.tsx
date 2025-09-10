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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAuth } from '@/hooks/use-auth';
import { type ContactWithJoins, useContacts } from '@/hooks/use-contacts';
import { useCurrentProfile } from '@/hooks/use-profile';
import { type ContactCreate } from '@/lib/schemas/contact';
import {
  ArrowLeft,
  PencilLine,
  PlusCircle,
  Search,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function TeacherContactsPage() {
  const {
    contacts,
    createContactAsync,
    updateContactAsync,
    deleteContactAsync,
  } = useContacts();
  const [searchTerm, setSearchTerm] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const { user, loading: authLoading } = useAuth();
  const { data: profile, isLoading: profileLoading } = useCurrentProfile();
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

  const filteredContacts = (contacts ?? []).filter(
    (contact: ContactWithJoins) =>
      (contact.parent?.name ?? '')
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
  );

  const handleAddContact = (newContact: ContactCreate) => {
    return createContactAsync(newContact);
  };

  const openEdit = (contact: ContactWithJoins) => {
    setEditingId(contact.id);
    setEditingName(contact.student_name ?? '');
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    await updateContactAsync({ id: editingId, student_name: editingName });
    setEditOpen(false);
    setEditingId(null);
    setEditingName('');
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
            {filteredContacts.map((contact: ContactWithJoins) => (
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
                    {contact.parent?.name ?? 'Pending'}
                  </h3>
                  <p className='text-sm text-muted-foreground'>
                    Parent of {contact.student_name}
                  </p>
                  {contact.parent?.phone && (
                    <p className='text-xs text-muted-foreground mt-1'>
                      {contact.parent.phone}
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
      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Edit Student Name</DialogTitle>
            <DialogDescription>
              Update the child's name for this contact.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={editingName}
            onChange={(e) => setEditingName(e.target.value)}
            placeholder='e.g. John Doe'
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
