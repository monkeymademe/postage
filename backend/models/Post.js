import pool from '../config/database.js';

export const Post = {
  // Get all posts (shared across all users)
  async findByUserId(userId) {
    // Note: userId parameter kept for backward compatibility but ignored - all posts are shared
    const result = await pool.query(
      'SELECT * FROM posts ORDER BY created_at DESC',
      []
    );
    return result.rows;
  },

  // Get a single post by ID (shared across all users)
  async findById(id, userId) {
    // Note: userId parameter kept for backward compatibility but ignored - all posts are shared
    const result = await pool.query(
      'SELECT * FROM posts WHERE id = $1',
      [id]
    );
    return result.rows[0];
  },

  // Create a new post
  async create(userId, title, content, sourceUrl = null, hashtags = null, featuredImage = null) {
    const result = await pool.query(
      'INSERT INTO posts (user_id, title, content, source_url, hashtags, featured_image) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [userId, title, content, sourceUrl, hashtags, featuredImage]
    );
    return result.rows[0];
  },

  // Update a post (any authenticated user can update any post)
  async update(id, userId, title, content, sourceUrl = null, hashtags = null, featuredImage = null) {
    // Note: userId parameter kept for backward compatibility but not used in WHERE clause - all posts are shared
    const result = await pool.query(
      'UPDATE posts SET title = $1, content = $2, source_url = COALESCE($4, source_url), hashtags = COALESCE($5, hashtags), featured_image = COALESCE($6, featured_image), updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
      [title, content, id, sourceUrl, hashtags, featuredImage]
    );
    return result.rows[0];
  },

  // Update hashtags for a post (any authenticated user can update any post)
  async updateHashtags(id, userId, hashtags) {
    // Note: userId parameter kept for backward compatibility but not used in WHERE clause - all posts are shared
    const result = await pool.query(
      'UPDATE posts SET hashtags = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [hashtags, id]
    );
    return result.rows[0];
  },

  // Delete a post (any authenticated user can delete any post)
  // Also deletes all associated generated_content records
  async delete(id, userId) {
    // Note: userId parameter kept for backward compatibility but not used in WHERE clause - all posts are shared
    
    // First, explicitly delete all generated content for this post
    // (Even though CASCADE should handle this, being explicit ensures cleanup)
    await pool.query(
      'DELETE FROM generated_content WHERE post_id = $1',
      [id]
    );
    
    // Then delete the post itself
    const result = await pool.query(
      'DELETE FROM posts WHERE id = $1 RETURNING id',
      [id]
    );
    return result.rows[0];
  },
};

export const GeneratedContent = {
  // Get all generated content for a post
  async findByPostId(postId) {
    const result = await pool.query(
      'SELECT * FROM generated_content WHERE post_id = $1 ORDER BY platform',
      [postId]
    );
    return result.rows;
  },

  // Create or update generated content
  async upsert(postId, platform, content) {
    const result = await pool.query(
      `INSERT INTO generated_content (post_id, platform, content)
       VALUES ($1, $2, $3)
       ON CONFLICT (post_id, platform)
       DO UPDATE SET content = $3, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [postId, platform, content]
    );
    return result.rows[0];
  },

  // Update generated content
  async update(id, content) {
    const result = await pool.query(
      'UPDATE generated_content SET content = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [content, id]
    );
    return result.rows[0];
  },

  // Delete all generated content for a specific platform
  async deleteByPlatform(platform) {
    const result = await pool.query(
      'DELETE FROM generated_content WHERE platform = $1 RETURNING id',
      [platform]
    );
    return result.rowCount;
  },
};
