import DatabaseManager from '../connection';
import { StudentFile, FileCategory, CreateStudentFileDto, UpdateStudentFileDto } from '../types';

export class FileService {
  // Get all file categories
  static async getFileCategories(): Promise<FileCategory[]> {
    const query = 'SELECT * FROM file_categories ORDER BY name';
    const result = await DatabaseManager.query(query);
    return result.rows;
  }

  // Get files for a student
  static async getStudentFiles(studentId: string, categoryId?: string): Promise<StudentFile[]> {
    let query = `
      SELECT 
        sf.*,
        fc.name as category_name,
        fc.icon as category_icon,
        s.name as student_name
      FROM student_files sf
      LEFT JOIN file_categories fc ON sf.category_id = fc.id
      LEFT JOIN students s ON sf.student_id = s.id
      WHERE sf.student_id = $1
    `;
    
    const params: any[] = [studentId];
    
    if (categoryId) {
      query += ' AND sf.category_id = $2';
      params.push(categoryId);
    }
    
    query += ' ORDER BY sf.created_at DESC';
    
    const result = await DatabaseManager.query(query, params);
    return result.rows.map((row: any) => ({
      id: row.id,
      student_id: row.student_id,
      teacher_id: row.teacher_id,
      category_id: row.category_id,
      filename: row.filename,
      original_name: row.original_name,
      file_path: row.file_path,
      file_size: row.file_size,
      mime_type: row.mime_type,
      description: row.description,
      academic_year: row.academic_year,
      semester: row.semester,
      is_public: row.is_public,
      tags: row.tags || [],
      created_at: row.created_at,
      updated_at: row.updated_at,
      category: row.category_id ? {
        id: row.category_id,
        name: row.category_name,
        description: '',
        icon: row.category_icon,
        created_at: new Date()
      } : undefined,
      student: {
        id: row.student_id,
        name: row.student_name,
        student_id: '',
        created_at: new Date(),
        updated_at: new Date()
      }
    }));
  }

  // Upload a file for a student
  static async uploadStudentFile(data: CreateStudentFileDto): Promise<StudentFile> {
    const query = `
      INSERT INTO student_files (
        student_id, teacher_id, category_id, filename, original_name, 
        file_path, file_size, mime_type, description, academic_year, 
        semester, is_public, tags
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;
    
    const values = [
      data.student_id,
      data.teacher_id,
      data.category_id,
      data.filename,
      data.original_name,
      data.file_path,
      data.file_size,
      data.mime_type,
      data.description,
      data.academic_year,
      data.semester,
      data.is_public || false,
      data.tags || []
    ];
    
    const result = await DatabaseManager.query(query, values);
    return result.rows[0];
  }

  // Update file metadata
  static async updateStudentFile(fileId: string, data: UpdateStudentFileDto): Promise<StudentFile | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(data.description);
    }
    if (data.category_id !== undefined) {
      updates.push(`category_id = $${paramCount++}`);
      values.push(data.category_id);
    }
    if (data.is_public !== undefined) {
      updates.push(`is_public = $${paramCount++}`);
      values.push(data.is_public);
    }
    if (data.tags !== undefined) {
      updates.push(`tags = $${paramCount++}`);
      values.push(data.tags);
    }
    if (data.academic_year !== undefined) {
      updates.push(`academic_year = $${paramCount++}`);
      values.push(data.academic_year);
    }
    if (data.semester !== undefined) {
      updates.push(`semester = $${paramCount++}`);
      values.push(data.semester);
    }

    if (updates.length === 0) return null;

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(fileId);

    const query = `
      UPDATE student_files 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await DatabaseManager.query(query, values);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  // Delete a file
  static async deleteStudentFile(fileId: string): Promise<boolean> {
    const query = 'DELETE FROM student_files WHERE id = $1';
    const result = await DatabaseManager.query(query, [fileId]);
    return result.rowCount > 0;
  }

  // Get file by ID
  static async getFileById(fileId: string): Promise<StudentFile | null> {
    const query = `
      SELECT 
        sf.*,
        fc.name as category_name,
        fc.icon as category_icon,
        s.name as student_name
      FROM student_files sf
      LEFT JOIN file_categories fc ON sf.category_id = fc.id
      LEFT JOIN students s ON sf.student_id = s.id
      WHERE sf.id = $1
    `;
    
    const result = await DatabaseManager.query(query, [fileId]);
    if (result.rows.length === 0) return null;
    
    const row = result.rows[0];
    return {
      id: row.id,
      student_id: row.student_id,
      teacher_id: row.teacher_id,
      category_id: row.category_id,
      filename: row.filename,
      original_name: row.original_name,
      file_path: row.file_path,
      file_size: row.file_size,
      mime_type: row.mime_type,
      description: row.description,
      academic_year: row.academic_year,
      semester: row.semester,
      is_public: row.is_public,
      tags: row.tags || [],
      created_at: row.created_at,
      updated_at: row.updated_at,
      category: row.category_id ? {
        id: row.category_id,
        name: row.category_name,
        description: '',
        icon: row.category_icon,
        created_at: new Date()
      } : undefined,
      student: {
        id: row.student_id,
        name: row.student_name,
        student_id: '',
        created_at: new Date(),
        updated_at: new Date()
      }
    };
  }

  // Search files
  static async searchFiles(teacherId: string, searchTerm: string, categoryId?: string): Promise<StudentFile[]> {
    let query = `
      SELECT 
        sf.*,
        fc.name as category_name,
        fc.icon as category_icon,
        s.name as student_name
      FROM student_files sf
      LEFT JOIN file_categories fc ON sf.category_id = fc.id
      LEFT JOIN students s ON sf.student_id = s.id
      WHERE sf.teacher_id = $1 AND (
        sf.original_name ILIKE $2 OR 
        sf.description ILIKE $2 OR
        s.name ILIKE $2 OR
        $2 = ANY(sf.tags)
      )
    `;
    
    const params: any[] = [teacherId, `%${searchTerm}%`];
    
    if (categoryId) {
      query += ' AND sf.category_id = $3';
      params.push(categoryId);
    }
    
    query += ' ORDER BY sf.created_at DESC';
    
    const result = await DatabaseManager.query(query, params);
    return result.rows.map((row: any) => ({
      id: row.id,
      student_id: row.student_id,
      teacher_id: row.teacher_id,
      category_id: row.category_id,
      filename: row.filename,
      original_name: row.original_name,
      file_path: row.file_path,
      file_size: row.file_size,
      mime_type: row.mime_type,
      description: row.description,
      academic_year: row.academic_year,
      semester: row.semester,
      is_public: row.is_public,
      tags: row.tags || [],
      created_at: row.created_at,
      updated_at: row.updated_at,
      category: row.category_id ? {
        id: row.category_id,
        name: row.category_name,
        description: '',
        icon: row.category_icon,
        created_at: new Date()
      } : undefined,
      student: {
        id: row.student_id,
        name: row.student_name,
        student_id: '',
        created_at: new Date(),
        updated_at: new Date()
      }
    }));
  }

  // Get files by teacher (all files uploaded by a teacher)
  static async getFilesByTeacher(teacherId: string): Promise<StudentFile[]> {
    const query = `
      SELECT 
        sf.*,
        fc.name as category_name,
        fc.icon as category_icon,
        s.name as student_name
      FROM student_files sf
      LEFT JOIN file_categories fc ON sf.category_id = fc.id
      LEFT JOIN students s ON sf.student_id = s.id
      WHERE sf.teacher_id = $1
      ORDER BY sf.created_at DESC
    `;
    
    const result = await DatabaseManager.query(query, [teacherId]);
    return result.rows.map((row: any) => ({
      id: row.id,
      student_id: row.student_id,
      teacher_id: row.teacher_id,
      category_id: row.category_id,
      filename: row.filename,
      original_name: row.original_name,
      file_path: row.file_path,
      file_size: row.file_size,
      mime_type: row.mime_type,
      description: row.description,
      academic_year: row.academic_year,
      semester: row.semester,
      is_public: row.is_public,
      tags: row.tags || [],
      created_at: row.created_at,
      updated_at: row.updated_at,
      category: row.category_id ? {
        id: row.category_id,
        name: row.category_name,
        description: '',
        icon: row.category_icon,
        created_at: new Date()
      } : undefined,
      student: {
        id: row.student_id,
        name: row.student_name,
        student_id: '',
        created_at: new Date(),
        updated_at: new Date()
      }
    }));
  }
}
