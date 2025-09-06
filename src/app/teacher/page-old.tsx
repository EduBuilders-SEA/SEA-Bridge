
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Plus, Calendar, Users, BookOpen, MessageSquare } from 'lucide-react';
import Logo from '@/components/logo';
import { ClassCard, ClassCardProps } from '@/components/dashboard/class-card';
import { StatsOverview } from '@/components/dashboard/stats-overview';
import { CreateClassDialog } from '@/components/dashboard/create-class-dialog';
import { useToast } from '@/hooks/use-toast';

interface DashboardData {
  classes: ClassCardProps[];
  stats: {
    totalClasses: number;
    totalStudents: number;
    averageAttendance: number;
    activeConversations: number;
  };
}

export default function TeacherDashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    classes: [],
    stats: {
      totalClasses: 0,
      totalStudents: 0,
      averageAttendance: 0,
      activeConversations: 0
    }
  });
  const [userName, setUserName] = useState('Teacher');
  const router = useRouter();
  const supabase = createClient();
  const { toast } = useToast();

  useEffect(() => {
    checkUser();
    loadDashboardData();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      // Check for dev session
      const devSession = localStorage.getItem('dev-session');
      if (!devSession) {
        router.push('/onboarding?role=teacher');
        return;
      }
      const session = JSON.parse(devSession);
      setUserName(session.name || 'Teacher');
    } else {
      setUserName(user.user_metadata?.name || 'Teacher');
    }
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/classes');
      
      if (!response.ok) {
        throw new Error('Failed to load dashboard data');
      }
      
      const classes = await response.json();
      
      // Calculate stats from classes data
      const totalClasses = classes.length;
      const totalStudents = classes.reduce((sum: number, cls: any) => sum + (cls.student_count || 0), 0);
      
      // For now, we'll use mock data for attendance and conversations
      // In a real app, you'd fetch this from additional API endpoints
      const averageAttendance = 85.5; // This would come from attendance records
      const activeConversations = 12; // This would come from conversations API
      
      setDashboardData({
        classes,
        stats: {
          totalClasses,
          totalStudents,
          averageAttendance,
          activeConversations
        }
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load dashboard data. Please refresh the page.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredClasses = dashboardData.classes.filter(cls =>
    cls.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cls.subject.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Logo />
              <div>
                <h1 className="text-2xl font-bold">Teacher Dashboard</h1>
                <p className="text-muted-foreground">Welcome back, {userName}!</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => router.push('/teacher/chat')}>
                <MessageSquare className="mr-2 h-4 w-4" />
                Messages
              </Button>
              <CreateClassDialog onClassCreated={loadDashboardData} />
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats Overview */}
        <section className="mb-8">
          <StatsOverview {...dashboardData.stats} />
        </section>

        {/* Classes Section */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold">My Classes</h2>
              <p className="text-muted-foreground">
                Manage your classes and view student progress
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search classes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
            </div>
          </div>

          {filteredClasses.length === 0 ? (
            <Card className="p-8 text-center">
              <div className="space-y-4">
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto" />
                <div>
                  <h3 className="text-lg font-medium">
                    {searchTerm ? 'No classes found' : 'No classes yet'}
                  </h3>
                  <p className="text-muted-foreground">
                    {searchTerm 
                      ? 'Try adjusting your search criteria.' 
                      : 'Create your first class to get started with managing students.'
                    }
                  </p>
                </div>
                {!searchTerm && (
                  <CreateClassDialog onClassCreated={loadDashboardData} />
                )}
              </div>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredClasses.map((cls) => (
                <ClassCard key={cls.id} {...cls} />
              ))}
            </div>
          )}
        </section>

        {/* Quick Actions */}
        <section className="mt-12">
          <h2 className="text-xl font-semibold mb-6">Quick Actions</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => router.push('/teacher/attendance')}>
              <div className="flex items-center gap-4">
                <Calendar className="h-8 w-8 text-blue-600" />
                <div>
                  <h3 className="font-medium">Take Attendance</h3>
                  <p className="text-sm text-muted-foreground">
                    Mark student attendance for today
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => router.push('/teacher/students')}>
              <div className="flex items-center gap-4">
                <Users className="h-8 w-8 text-green-600" />
                <div>
                  <h3 className="font-medium">Manage Students</h3>
                  <p className="text-sm text-muted-foreground">
                    View and manage student profiles
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => router.push('/teacher/chat')}>
              <div className="flex items-center gap-4">
                <MessageSquare className="h-8 w-8 text-purple-600" />
                <div>
                  <h3 className="font-medium">Parent Messages</h3>
                  <p className="text-sm text-muted-foreground">
                    Communicate with parents
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </section>
      </main>
    </div>
  );
}
  }

  return (
    <div className="flex flex-col h-screen bg-background font-body">
       <header className="flex items-center justify-between p-4 border-b bg-card shadow-xs sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/">
              <ArrowLeft className="w-5 h-5" />
              <span className="sr-only">Back to Home</span>
            </Link>
          </Button>
          <h1 className="text-lg font-headline font-semibold">{userName}'s Parent Contacts</h1>
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
                    placeholder="Search by parent's name..."
                    className="pl-10 w-full"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <AddContactForm role="parent" onAddContact={handleAddContact}>
                    <Button>
                        <PlusCircle className="w-5 h-5 mr-2" />
                        Add Contact
                    </Button>
                </AddContactForm>
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
