export interface Teacher {
  id: string;
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  school?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Class {
  id: string;
  teacher_id: string;
  name: string;
  subject: string;
  grade_level?: string;
  academic_year: string;
  description?: string;
  created_at: Date;
  updated_at: Date;
  student_count?: number; // Added when joining with enrollments
}

export interface Parent {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Student {
  id: string;
  name: string;
  student_id: string;
  date_of_birth?: Date;
  grade?: string;
  gender?: string;
  address?: string;
  parent_id?: string;
  created_at: Date;
  updated_at: Date;
  parent?: Parent; // Added when joining with parent
}

export interface ClassEnrollment {
  id: string;
  class_id: string;
  student_id: string;
  enrollment_date: Date;
  status: 'active' | 'inactive' | 'transferred';
  created_at: Date;
}

export interface FileCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  created_at: Date;
}

export interface StudentFile {
  id: string;
  student_id: string;
  teacher_id: string;
  category_id?: string;
  filename: string;
  original_name: string;
  file_path: string;
  file_size?: number;
  mime_type?: string;
  description?: string;
  academic_year?: string;
  semester?: string;
  is_public: boolean;
  tags: string[];
  created_at: Date;
  updated_at: Date;
  category?: FileCategory; // Added when joining
  student?: Student; // Added when joining
}

export interface Conversation {
  id: string;
  teacher_id: string;
  parent_id: string;
  student_id: string;
  subject?: string;
  last_message_at: Date;
  created_at: Date;
  teacher?: Teacher;
  parent?: Parent;
  student?: Student;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_type: 'teacher' | 'parent';
  sender_id: string;
  content: string;
  message_type: 'text' | 'voice' | 'image' | 'document';
  file_url?: string;
  translated_content?: Record<string, string>;
  read_at?: Date;
  created_at: Date;
}

export interface AttendanceRecord {
  id: string;
  class_id: string;
  student_id: string;
  date: Date;
  status: 'present' | 'absent' | 'late' | 'excused';
  notes?: string;
  recorded_by: string;
  created_at: Date;
  student?: Student; // Added when joining
}

// DTOs for creating/updating records
export interface CreateTeacherDto {
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  school?: string;
}

export interface CreateClassDto {
  teacher_id: string;
  name: string;
  subject: string;
  grade_level?: string;
  academic_year: string;
  description?: string;
}

export interface CreateStudentDto {
  name: string;
  student_id: string;
  date_of_birth?: Date;
  grade?: string;
  gender?: string;
  address?: string;
  parent_id?: string;
}

export interface CreateParentDto {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
}

export interface CreateStudentFileDto {
  student_id: string;
  teacher_id: string;
  category_id?: string;
  filename: string;
  original_name: string;
  file_path: string;
  file_size?: number;
  mime_type?: string;
  description?: string;
  academic_year?: string;
  semester?: string;
  is_public?: boolean;
  tags?: string[];
}

export interface UpdateStudentFileDto {
  description?: string;
  category_id?: string;
  is_public?: boolean;
  tags?: string[];
  academic_year?: string;
  semester?: string;
}
