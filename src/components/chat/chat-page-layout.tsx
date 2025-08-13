import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Logo from '@/components/logo';

type ChatPageLayoutProps = {
  title: string;
  user: { name: string; avatarUrl: string; role: string; };
  children: ReactNode;
};

export default function ChatPageLayout({ title, user, children }: ChatPageLayoutProps) {
  const backLink = user.role.toLowerCase() === 'teacher' ? '/teacher' : '/parent';
  return (
    <div className="flex flex-col h-screen bg-background font-body">
      <header className="flex items-center justify-between p-4 border-b bg-card shadow-sm sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={backLink}>
              <ArrowLeft className="w-5 h-5" />
              <span className="sr-only">Back to Contacts</span>
            </Link>
          </Button>
          <div className="flex items-center gap-3">
             <Avatar>
                <AvatarImage src={user.avatarUrl} alt={user.name} data-ai-hint={user.role === 'Teacher' ? 'teacher portrait' : 'parent portrait'} />
                <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-lg font-headline font-semibold">{title}</h1>
              <p className="text-sm text-muted-foreground">{user.role}</p>
            </div>
          </div>
        </div>
        <Link href="/" className="hidden sm:block">
            <Logo className="w-24 h-auto" />
        </Link>
      </header>
      <div className="flex-1 overflow-hidden">
          <div className="h-full max-w-4xl mx-auto flex flex-col">
              {children}
          </div>
      </div>
    </div>
  );
}
