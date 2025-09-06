import { Pool, PoolClient } from 'pg';

// Create a connection pool
const pool = new Pool({
  connectionString: process.env.POSTGRES_CONNECTION_STRING,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // How long a client is allowed to remain idle
  connectionTimeoutMillis: 2000, // How long to wait for a connection
});

// Database utility functions
export class DatabaseManager {
  // Execute a query with parameters
  static async query(text: string, params?: any[]): Promise<any> {
    const start = Date.now();
    try {
      const res = await pool.query(text, params);
      const duration = Date.now() - start;
      console.log('Query executed:', { text, duration, rows: res.rowCount });
      return res;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }

  // Get a client from the pool for transactions
  static async getClient(): Promise<PoolClient> {
    return await pool.connect();
  }

  // Execute multiple queries in a transaction
  static async transaction(callback: (client: PoolClient) => Promise<any>): Promise<any> {
    const client = await this.getClient();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Initialize database with schema
  static async initializeDatabase(): Promise<void> {
    try {
      // Check if tables exist
      const result = await this.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'teachers'
      `);

      if (result.rows.length === 0) {
        console.log('Database not initialized. Please run the schema.sql file first.');
        console.log('You can find it at: src/lib/database/schema.sql');
      }
    } catch (error) {
      console.error('Database initialization check failed:', error);
    }
  }

  // Close all connections (useful for cleanup)
  static async closeAllConnections(): Promise<void> {
    await pool.end();
  }
}

// Initialize on import
DatabaseManager.initializeDatabase();

export default DatabaseManager;
