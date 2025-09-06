import DatabaseManager from '../connection';
import { Class, CreateClassDto, Student, ClassEnrollment } from '../types';

export class ClassService {
  // Get all classes for a teacher
  static async getClassesByTeacher(teacherId: string): Promise<Class[]> {
    const query = `
      SELECT 
        c.*,
        COUNT(ce.student_id) as student_count
      FROM classes c
      LEFT JOIN class_enrollments ce ON c.id = ce.class_id AND ce.status = 'active'
      WHERE c.teacher_id = $1
      GROUP BY c.id, c.name, c.subject, c.grade_level, c.academic_year, c.description, c.created_at, c.updated_at, c.teacher_id
      ORDER BY c.created_at DESC
    `;
    
    const result = await DatabaseManager.query(query, [teacherId]);
    return result.rows.map(row => ({
      ...row,
      student_count: parseInt(row.student_count) || 0
    }));
  }

  // Get a single class with details
  static async getClassById(classId: string): Promise<Class | null> {
    const query = `
      SELECT 
        c.*,
        COUNT(ce.student_id) as student_count
      FROM classes c
      LEFT JOIN class_enrollments ce ON c.id = ce.class_id AND ce.status = 'active'
      WHERE c.id = $1
      GROUP BY c.id, c.name, c.subject, c.grade_level, c.academic_year, c.description, c.created_at, c.updated_at, c.teacher_id
    `;
    
    const result = await DatabaseManager.query(query, [classId]);
    if (result.rows.length === 0) return null;
    
    return {
      ...result.rows[0],
      student_count: parseInt(result.rows[0].student_count) || 0
    };
  }

  // Create a new class
  static async createClass(data: CreateClassDto): Promise<Class> {
    const query = `
      INSERT INTO classes (teacher_id, name, subject, grade_level, academic_year, description)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    
    const values = [
      data.teacher_id,
      data.name,
      data.subject,
      data.grade_level,
      data.academic_year,
      data.description
    ];
    
    const result = await DatabaseManager.query(query, values);
    return result.rows[0];
  }

  // Update a class
  static async updateClass(classId: string, data: Partial<CreateClassDto>): Promise<Class | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(data.name);
    }
    if (data.subject !== undefined) {
      updates.push(`subject = $${paramCount++}`);
      values.push(data.subject);
    }
    if (data.grade_level !== undefined) {
      updates.push(`grade_level = $${paramCount++}`);
      values.push(data.grade_level);
    }
    if (data.academic_year !== undefined) {
      updates.push(`academic_year = $${paramCount++}`);
      values.push(data.academic_year);
    }
    if (data.description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(data.description);
    }

    if (updates.length === 0) return null;

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(classId);

    const query = `
      UPDATE classes 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await DatabaseManager.query(query, values);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  // Delete a class
  static async deleteClass(classId: string): Promise<boolean> {
    const query = 'DELETE FROM classes WHERE id = $1';
    const result = await DatabaseManager.query(query, [classId]);
    return result.rowCount > 0;
  }

  // Get students in a class
  static async getClassStudents(classId: string): Promise<Student[]> {
    const query = `
      SELECT 
        s.*,
        p.name as parent_name,
        p.phone as parent_phone,
        p.email as parent_email,
        ce.enrollment_date,
        ce.status as enrollment_status
      FROM students s
      INNER JOIN class_enrollments ce ON s.id = ce.student_id
      LEFT JOIN parents p ON s.parent_id = p.id
      WHERE ce.class_id = $1 AND ce.status = 'active'
      ORDER BY s.name
    `;
    
    const result = await DatabaseManager.query(query, [classId]);
    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      student_id: row.student_id,
      date_of_birth: row.date_of_birth,
      grade: row.grade,
      gender: row.gender,
      address: row.address,
      parent_id: row.parent_id,
      created_at: row.created_at,
      updated_at: row.updated_at,
      parent: row.parent_id ? {
        id: row.parent_id,
        name: row.parent_name,
        email: row.parent_email,
        phone: row.parent_phone,
        address: null,
        created_at: new Date(),
        updated_at: new Date()
      } : undefined
    }));
  }

  // Enroll a student in a class
  static async enrollStudent(classId: string, studentId: string): Promise<ClassEnrollment> {
    const query = `
      INSERT INTO class_enrollments (class_id, student_id)
      VALUES ($1, $2)
      ON CONFLICT (class_id, student_id) 
      DO UPDATE SET status = 'active', enrollment_date = CURRENT_DATE
      RETURNING *
    `;
    
    const result = await DatabaseManager.query(query, [classId, studentId]);
    return result.rows[0];
  }

  // Remove a student from a class
  static async unenrollStudent(classId: string, studentId: string): Promise<boolean> {
    const query = `
      UPDATE class_enrollments 
      SET status = 'inactive' 
      WHERE class_id = $1 AND student_id = $2
    `;
    
    const result = await DatabaseManager.query(query, [classId, studentId]);
    return result.rowCount > 0;
  }

  // Get class statistics
  static async getClassStatistics(classId: string): Promise<{
    total_students: number;
    active_students: number;
    attendance_rate?: number;
  }> {
    const query = `
      SELECT 
        COUNT(CASE WHEN ce.status = 'active' THEN 1 END) as active_students,
        COUNT(*) as total_students
      FROM class_enrollments ce
      WHERE ce.class_id = $1
    `;
    
    const result = await DatabaseManager.query(query, [classId]);
    const stats = result.rows[0];
    
    // Calculate attendance rate for the last 30 days
    const attendanceQuery = `
      SELECT 
        COUNT(CASE WHEN a.status = 'present' THEN 1 END)::float / COUNT(*)::float * 100 as attendance_rate
      FROM attendance a
      WHERE a.class_id = $1 
        AND a.date >= CURRENT_DATE - INTERVAL '30 days'
    `;
    
    const attendanceResult = await DatabaseManager.query(attendanceQuery, [classId]);
    const attendanceRate = attendanceResult.rows[0]?.attendance_rate;
    
    return {
      total_students: parseInt(stats.total_students) || 0,
      active_students: parseInt(stats.active_students) || 0,
      attendance_rate: attendanceRate ? parseFloat(attendanceRate) : undefined
    };
  }
}
