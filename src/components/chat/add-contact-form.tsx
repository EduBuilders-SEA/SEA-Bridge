'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { ContactCreateSchema, type ContactCreate } from '@/lib/schemas';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';

type AddContactFormProps = {
  // eslint-disable-next-line no-undef
  children: React.ReactNode;
  role: 'teacher' | 'parent';
  onAddContact: (contact: ContactCreate) => void;
};

export function AddContactForm({
  children,
  role,
  onAddContact,
}: AddContactFormProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<ContactCreate>({
    resolver: zodResolver(ContactCreateSchema),
    defaultValues: {
      name: '',
      phoneNumber: '',
      childName: '',
      subject: '',
    },
  });

  function onSubmit(values: ContactCreate) {
    onAddContact(values);
    toast({
      title: 'Contact Added',
      description: `${values.name} has been added to your contacts.`,
    });
    setOpen(false);
    form.reset();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className='sm:max-w-[425px]'>
        <DialogHeader>
          <DialogTitle>
            Add New {role === 'teacher' ? 'Teacher' : 'Parent'} Contact
          </DialogTitle>
          <DialogDescription>
            Enter the details of the new contact below.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className='space-y-4 py-4'
          >
            <FormField
              control={form.control}
              name='name'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder='e.g. Jane Doe' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='phoneNumber'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <PhoneInput
                      international
                      defaultCountry='US'
                      limitMaxLength
                      placeholder='e.g. +15555555555'
                      className='flex h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-base placeholder:text-muted-foreground focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 disabled:opacity-50 md:text-sm'
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      name={field.name}
                      id='phoneNumber'
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {role === 'parent' && (
              <FormField
                control={form.control}
                name='childName'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Child's Name</FormLabel>
                    <FormControl>
                      <Input placeholder='e.g. John Doe' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            {role === 'teacher' && (
              <FormField
                control={form.control}
                name='subject'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject</FormLabel>
                    <FormControl>
                      <Input placeholder='e.g. Mathematics' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <DialogFooter>
              <Button type='submit'>Save Contact</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
