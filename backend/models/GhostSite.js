import pool from '../config/database.js';

export const GhostSite = {
  // Get all Ghost sites (shared across all users)
  async findByUserId(userId) {
    // Note: userId parameter kept for backward compatibility but ignored - all sites are shared
    const result = await pool.query(
      'SELECT id, name, url, created_at, updated_at FROM ghost_sites ORDER BY created_at DESC',
      []
    );
    return result.rows;
  },

  // Get a single Ghost site by ID (shared across all users)
  async findById(id, userId) {
    // Note: userId parameter kept for backward compatibility but ignored - all sites are shared
    const result = await pool.query(
      'SELECT * FROM ghost_sites WHERE id = $1',
      [id]
    );
    return result.rows[0];
  },

  // Create a new Ghost site
  async create(userId, name, url, apiKey) {
    const result = await pool.query(
      'INSERT INTO ghost_sites (user_id, name, url, api_key) VALUES ($1, $2, $3, $4) RETURNING id, name, url, created_at, updated_at',
      [userId, name, url, apiKey]
    );
    return result.rows[0];
  },

  // Update a Ghost site (any authenticated user can update any site)
  async update(id, userId, name, url, apiKey) {
    // Note: userId parameter kept for backward compatibility but not used in WHERE clause - all sites are shared
    const result = await pool.query(
      'UPDATE ghost_sites SET name = $1, url = $2, api_key = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING id, name, url, created_at, updated_at',
      [name, url, apiKey, id]
    );
    return result.rows[0];
  },

  // Delete a Ghost site (any authenticated user can delete any site)
  async delete(id, userId) {
    // Note: userId parameter kept for backward compatibility but not used in WHERE clause - all sites are shared
    const result = await pool.query(
      'DELETE FROM ghost_sites WHERE id = $1 RETURNING id',
      [id]
    );
    return result.rows[0];
  },

  // Get full details including API key (for use in API calls) - shared across all users
  async getWithApiKey(id, userId) {
    // Note: userId parameter kept for backward compatibility but ignored - all sites are shared
    const result = await pool.query(
      'SELECT * FROM ghost_sites WHERE id = $1',
      [id]
    );
    return result.rows[0];
  },
};
