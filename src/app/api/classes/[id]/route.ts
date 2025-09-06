import { NextResponse } from 'next/server';
import { ClassService } from '@/lib/database/services/classService';
import { StudentService } from '@/lib/database/services/studentService';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const classId = params.id;
    
    // Get class details and statistics in parallel
    const [classData, students, statistics] = await Promise.all([
      ClassService.getClassById(classId),
      ClassService.getClassStudents(classId),
      ClassService.getClassStatistics(classId)
    ]);

    if (!classData) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    return NextResponse.json({
      class: classData,
      students,
      statistics
    });
  } catch (error) {
    console.error('Error fetching class details:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const classId = params.id;
    
    const updatedClass = await ClassService.updateClass(classId, body);
    
    if (!updatedClass) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }
    
    return NextResponse.json(updatedClass);
  } catch (error) {
    console.error('Error updating class:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const classId = params.id;
    const deleted = await ClassService.deleteClass(classId);
    
    if (!deleted) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }
    
    return NextResponse.json({ message: 'Class deleted successfully' });
  } catch (error) {
    console.error('Error deleting class:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
