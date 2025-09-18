import { Skeleton } from '../ui/skeleton';

export function ChatSkeleton() {
  return (
    <div className='flex flex-col h-screen bg-background font-body'>
      <header className='flex items-center justify-between p-4 border-b bg-card shadow-xs sticky top-0 z-10'>
        <Skeleton className='w-10 h-10 rounded-full' />
        <Skeleton className='w-24 h-6' />
      </header>
      <div className='flex-1 overflow-hidden'>
        <div className='h-full max-w-4xl mx-auto flex flex-col'>
          <div className='flex flex-col h-full'>
            <div className='flex justify-center p-2 border-b'>
              <div className='flex items-center space-x-2'>
                <Skeleton className='h-8 w-20' />
                <Skeleton className='h-8 w-20' />
              </div>
            </div>
            <div className='flex-1 space-y-4 overflow-y-auto p-4 md:p-6'>
              <div className='flex items-end gap-2 justify-start'>
                <Skeleton className='h-16 w-3/4 rounded-lg' />
              </div>
              <div className='flex items-end gap-2 justify-end'>
                <Skeleton className='h-12 w-1/2 rounded-lg' />
              </div>
              <div className='flex items-end gap-2 justify-start'>
                <Skeleton className='h-24 w-3/4 rounded-lg' />
              </div>
            </div>
            <div className='p-4 md:p-6 pt-2 border-t bg-background'>
              <Skeleton className='h-10 w-full' />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
