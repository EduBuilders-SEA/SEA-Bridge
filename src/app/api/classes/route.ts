import { NextResponse } from 'next/server';
import { ClassService } from '@/lib/database/services/classService';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // In a real app, you'd get teacher_id from a teachers table linked to user.id
    // For now, we'll use the user.id as teacher_id
    const teacherId = user.id;
    
    const classes = await ClassService.getClassesByTeacher(teacherId);
    return NextResponse.json(classes);
  } catch (error) {
    console.error('Error fetching classes:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const teacherId = user.id;
    
    const newClass = await ClassService.createClass({
      ...body,
      teacher_id: teacherId
    });
    
    return NextResponse.json(newClass, { status: 201 });
  } catch (error) {
    console.error('Error creating class:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
