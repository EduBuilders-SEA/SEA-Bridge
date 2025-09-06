import DatabaseManager from '../connection';
import { Student, CreateStudentDto, Parent, CreateParentDto } from '../types';

export class StudentService {
  // Get all students
  static async getAllStudents(): Promise<Student[]> {
    const query = `
      SELECT 
        s.*,
        p.name as parent_name,
        p.email as parent_email,
        p.phone as parent_phone,
        p.address as parent_address
      FROM students s
      LEFT JOIN parents p ON s.parent_id = p.id
      ORDER BY s.name
    `;
    
    const result = await DatabaseManager.query(query);
    return result.rows.map((row: any) => ({
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
        address: row.parent_address,
        created_at: new Date(),
        updated_at: new Date()
      } : undefined
    }));
  }

  // Get student by ID
  static async getStudentById(studentId: string): Promise<Student | null> {
    const query = `
      SELECT 
        s.*,
        p.name as parent_name,
        p.email as parent_email,
        p.phone as parent_phone,
        p.address as parent_address
      FROM students s
      LEFT JOIN parents p ON s.parent_id = p.id
      WHERE s.id = $1
    `;
    
    const result = await DatabaseManager.query(query, [studentId]);
    if (result.rows.length === 0) return null;
    
    const row = result.rows[0];
    return {
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
        address: row.parent_address,
        created_at: new Date(),
        updated_at: new Date()
      } : undefined
    };
  }

  // Create a new student
  static async createStudent(data: CreateStudentDto): Promise<Student> {
    const query = `
      INSERT INTO students (name, student_id, date_of_birth, grade, gender, address, parent_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    const values = [
      data.name,
      data.student_id,
      data.date_of_birth,
      data.grade,
      data.gender,
      data.address,
      data.parent_id
    ];
    
    const result = await DatabaseManager.query(query, values);
    return result.rows[0];
  }

  // Update student
  static async updateStudent(studentId: string, data: Partial<CreateStudentDto>): Promise<Student | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(data.name);
    }
    if (data.student_id !== undefined) {
      updates.push(`student_id = $${paramCount++}`);
      values.push(data.student_id);
    }
    if (data.date_of_birth !== undefined) {
      updates.push(`date_of_birth = $${paramCount++}`);
      values.push(data.date_of_birth);
    }
    if (data.grade !== undefined) {
      updates.push(`grade = $${paramCount++}`);
      values.push(data.grade);
    }
    if (data.gender !== undefined) {
      updates.push(`gender = $${paramCount++}`);
      values.push(data.gender);
    }
    if (data.address !== undefined) {
      updates.push(`address = $${paramCount++}`);
      values.push(data.address);
    }
    if (data.parent_id !== undefined) {
      updates.push(`parent_id = $${paramCount++}`);
      values.push(data.parent_id);
    }

    if (updates.length === 0) return null;

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(studentId);

    const query = `
      UPDATE students 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await DatabaseManager.query(query, values);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  // Delete student
  static async deleteStudent(studentId: string): Promise<boolean> {
    const query = 'DELETE FROM students WHERE id = $1';
    const result = await DatabaseManager.query(query, [studentId]);
    return result.rowCount > 0;
  }

  // Search students
  static async searchStudents(searchTerm: string): Promise<Student[]> {
    const query = `
      SELECT 
        s.*,
        p.name as parent_name,
        p.email as parent_email,
        p.phone as parent_phone,
        p.address as parent_address
      FROM students s
      LEFT JOIN parents p ON s.parent_id = p.id
      WHERE 
        s.name ILIKE $1 OR 
        s.student_id ILIKE $1 OR
        p.name ILIKE $1
      ORDER BY s.name
    `;
    
    const result = await DatabaseManager.query(query, [`%${searchTerm}%`]);
    return result.rows.map((row: any) => ({
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
        address: row.parent_address,
        created_at: new Date(),
        updated_at: new Date()
      } : undefined
    }));
  }
}

export class ParentService {
  // Get all parents
  static async getAllParents(): Promise<Parent[]> {
    const query = 'SELECT * FROM parents ORDER BY name';
    const result = await DatabaseManager.query(query);
    return result.rows;
  }

  // Get parent by ID
  static async getParentById(parentId: string): Promise<Parent | null> {
    const query = 'SELECT * FROM parents WHERE id = $1';
    const result = await DatabaseManager.query(query, [parentId]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  // Create parent
  static async createParent(data: CreateParentDto): Promise<Parent> {
    const query = `
      INSERT INTO parents (name, email, phone, address)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    
    const values = [data.name, data.email, data.phone, data.address];
    const result = await DatabaseManager.query(query, values);
    return result.rows[0];
  }

  // Update parent
  static async updateParent(parentId: string, data: Partial<CreateParentDto>): Promise<Parent | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(data.name);
    }
    if (data.email !== undefined) {
      updates.push(`email = $${paramCount++}`);
      values.push(data.email);
    }
    if (data.phone !== undefined) {
      updates.push(`phone = $${paramCount++}`);
      values.push(data.phone);
    }
    if (data.address !== undefined) {
      updates.push(`address = $${paramCount++}`);
      values.push(data.address);
    }

    if (updates.length === 0) return null;

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(parentId);

    const query = `
      UPDATE parents 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await DatabaseManager.query(query, values);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  // Delete parent
  static async deleteParent(parentId: string): Promise<boolean> {
    const query = 'DELETE FROM parents WHERE id = $1';
    const result = await DatabaseManager.query(query, [parentId]);
    return result.rowCount > 0;
  }

  // Get parent's children
  static async getParentChildren(parentId: string): Promise<Student[]> {
    const query = `
      SELECT * FROM students 
      WHERE parent_id = $1 
      ORDER BY name
    `;
    
    const result = await DatabaseManager.query(query, [parentId]);
    return result.rows;
  }
}
