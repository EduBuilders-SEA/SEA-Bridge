import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, BookOpen, Calendar, TrendingUp } from 'lucide-react';
import Link from 'next/link';

export interface ClassCardProps {
  id: string;
  name: string;
  subject: string;
  grade_level: string;
  academic_year: string;
  student_count: number;
  description?: string;
  created_at: string;
}

export function ClassCard({ 
  id, 
  name, 
  subject, 
  grade_level, 
  academic_year, 
  student_count, 
  description, 
  created_at 
}: ClassCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg font-semibold">{name}</CardTitle>
            <CardDescription className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              {subject} • Grade {grade_level}
            </CardDescription>
          </div>
          <Badge variant="outline">{academic_year}</Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {description}
          </p>
        )}
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            {student_count} students
          </div>
          <div className="text-sm text-muted-foreground">
            Created {new Date(created_at).toLocaleDateString()}
          </div>
        </div>
        
        <div className="flex gap-2 pt-2">
          <Button asChild variant="default" size="sm">
            <Link href={`/teacher/classes/${id}`}>
              View Class
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={`/teacher/chat?class=${id}`}>
              Messages
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
