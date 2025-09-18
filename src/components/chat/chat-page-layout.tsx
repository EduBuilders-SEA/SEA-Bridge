import Logo from '@/components/logo';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TranslationJobsNotification } from './translation-jobs-notification';
import { ArrowLeft, Globe } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

type ChatPageLayoutProps = {
  title: string;
  user: { name: string; avatarUrl: string; role: string };
  children: ReactNode;
  userLanguage?: string;
};

export default function ChatPageLayout({
  title,
  user,
  children,
  userLanguage,
}: ChatPageLayoutProps) {
  const backLink =
    user.role.toLowerCase() === 'teacher' ? `/teacher` : `/parent`;
  return (
    <div className='flex flex-col h-screen bg-background font-body'>
      <header className='flex items-center justify-between p-4 border-b bg-card shadow-xs sticky top-0 z-10'>
        <div className='flex items-center gap-4'>
          <Button variant='ghost' size='icon' asChild>
            <Link href={backLink}>
              <ArrowLeft className='w-5 h-5' />
              <span className='sr-only'>Back to Contacts</span>
            </Link>
          </Button>
          <div className='flex items-center gap-3'>
            <Avatar>
              <AvatarImage
                src={user.avatarUrl}
                alt={user.name}
                data-ai-hint={
                  user.role === 'Teacher'
                    ? 'teacher portrait'
                    : 'parent portrait'
                }
              />
              <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <h1 className='text-lg font-headline font-semibold'>{title}</h1>
            </div>
          </div>
        </div>
        <div className='flex items-center gap-3'>
          <TranslationJobsNotification />
          {userLanguage && (
            <Badge
              variant='secondary'
              className='text-xs hidden sm:flex items-center gap-1'
            >
              <Globe className='w-3 h-3' />
              {userLanguage}
            </Badge>
          )}
          <Link href='/' className='hidden sm:block'>
            <Logo className='w-24 h-auto' />
          </Link>
        </div>
      </header>
      <div className='flex-1 overflow-hidden'>
        <div className='h-full max-w-4xl mx-auto flex flex-col'>{children}</div>
      </div>
    </div>
  );
}
