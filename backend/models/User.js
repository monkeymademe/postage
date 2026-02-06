import pool from '../config/database.js';
import bcrypt from 'bcrypt';

export const User = {
  // Get all users (admin only)
  async findAll() {
    const result = await pool.query(
      'SELECT id, email, role, created_at, updated_at FROM users ORDER BY created_at DESC'
    );
    return result.rows;
  },

  // Get user by ID
  async findById(id) {
    const result = await pool.query(
      'SELECT id, email, role, created_at, updated_at FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0];
  },

  // Get user by email
  async findByEmail(email) {
    const result = await pool.query(
      'SELECT id, email, password_hash, role, created_at, updated_at FROM users WHERE email = $1',
      [email]
    );
    return result.rows[0];
  },

  // Create user
  async create(email, password, role = 'user') {
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const result = await pool.query(
      'INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id, email, role, created_at',
      [email, passwordHash, role]
    );
    return result.rows[0];
  },

  // Update user
  async update(id, updates) {
    const { email, role } = updates;
    const fields = [];
    const values = [];
    let paramCount = 1;

    if (email !== undefined) {
      fields.push(`email = $${paramCount++}`);
      values.push(email);
    }
    if (role !== undefined) {
      fields.push(`role = $${paramCount++}`);
      values.push(role);
    }

    if (fields.length === 0) {
      return await this.findById(id);
    }

    values.push(id);
    const result = await pool.query(
      `UPDATE users SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramCount} RETURNING id, email, role, created_at, updated_at`,
      values
    );
    return result.rows[0];
  },

  // Update password
  async updatePassword(id, newPassword) {
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    const result = await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, email',
      [passwordHash, id]
    );
    return result.rows[0];
  },

  // Delete user
  async delete(id) {
    const result = await pool.query(
      'DELETE FROM users WHERE id = $1 RETURNING id, email',
      [id]
    );
    return result.rows[0];
  },

  // Check if user is admin
  async isAdmin(userId) {
    const user = await this.findById(userId);
    return user && user.role === 'admin';
  },

  // Count total users
  async count() {
    const result = await pool.query('SELECT COUNT(*) as count FROM users');
    return parseInt(result.rows[0].count, 10);
  },
};

export const SystemSettings = {
  // Get setting by key
  async get(key) {
    const result = await pool.query(
      'SELECT key, value, description FROM system_settings WHERE key = $1',
      [key]
    );
    return result.rows[0];
  },

  // Get all settings
  async getAll() {
    const result = await pool.query(
      'SELECT key, value, description FROM system_settings ORDER BY key'
    );
    return result.rows;
  },

  // Set setting
  async set(key, value, description = null) {
    const result = await pool.query(
      `INSERT INTO system_settings (key, value, description)
       VALUES ($1, $2, $3)
       ON CONFLICT (key) 
       DO UPDATE SET value = EXCLUDED.value, description = COALESCE(EXCLUDED.description, system_settings.description), updated_at = CURRENT_TIMESTAMP
       RETURNING key, value, description`,
      [key, value, description]
    );
    return result.rows[0];
  },
};
