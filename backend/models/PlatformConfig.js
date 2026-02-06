import pool from '../config/database.js';

export const PlatformConfig = {
  // Get all platform configs (shared across all users)
  async findByUserId(userId) {
    // Note: userId parameter kept for backward compatibility but ignored - all configs are shared
    // Return the most recent config for each platform, ordered by sort_order
    const result = await pool.query(
      `SELECT DISTINCT ON (platform) * FROM platform_config 
       ORDER BY platform, created_at DESC`,
      []
    );
    // Sort by: enabled first (sort_order ascending), then disabled (sort_order ascending)
    return result.rows.sort((a, b) => {
      const aEnabled = a.enabled !== false;
      const bEnabled = b.enabled !== false;
      // Disabled profiles always go to the bottom
      if (aEnabled !== bEnabled) {
        return aEnabled ? -1 : 1;
      }
      // Within same enabled state, sort by sort_order
      return (a.sort_order || 0) - (b.sort_order || 0);
    });
  },

  // Get a specific platform config (shared across all users)
  async findByUserAndPlatform(userId, platform) {
    // Note: userId parameter kept for backward compatibility but ignored - all configs are shared
    // Return the most recent config for this platform
    const result = await pool.query(
      'SELECT * FROM platform_config WHERE platform = $1 ORDER BY created_at DESC LIMIT 1',
      [platform]
    );
    return result.rows[0];
  },

  // Create or update platform config (shared across all users)
  // Since configs are shared, we'll delete old configs for this platform and create a new one
  async upsert(userId, platform, config) {
    const {
      max_length,
      min_length,
      include_hashtags,
      hashtag_count,
      include_photos,
      hook_length,
      is_video_script,
      tone,
      style,
      custom_instructions,
      avoid_header_generation,
      single_line_content,
      utm_source,
      utm_enabled,
      display_name,
      // New profile type fields
      profile_type,
      min_duration_seconds,
      max_duration_seconds,
      min_scenes,
      max_scenes,
      narrator_on_camera,
      enabled,
      sort_order,
    } = config;

    // Delete all existing configs for this platform (since they're shared)
    await pool.query(
      'DELETE FROM platform_config WHERE platform = $1',
      [platform]
    );

    // Create new config with the requesting user's ID (for tracking)
    const result = await pool.query(
      `INSERT INTO platform_config (
        user_id, platform, max_length, min_length, include_hashtags,
        hashtag_count, include_photos, hook_length, is_video_script, tone, style, 
        custom_instructions, avoid_header_generation, single_line_content, utm_source, utm_enabled, display_name,
        profile_type, min_duration_seconds, max_duration_seconds, min_scenes, max_scenes, narrator_on_camera, enabled, sort_order
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
      RETURNING *`,
      [
        userId,
        platform,
        max_length || null,
        min_length || null,
        include_hashtags || false,
        hashtag_count || 0,
        include_photos || false,
        hook_length || null,
        is_video_script || false,
        tone || null,
        style || null,
        custom_instructions || null,
        avoid_header_generation || false,
        single_line_content || false,
        utm_source || null,
        utm_enabled !== false, // Default to true if not explicitly set to false
        display_name || null,
        profile_type || 'social',
        min_duration_seconds || null,
        max_duration_seconds || null,
        min_scenes || null,
        max_scenes || null,
        narrator_on_camera || false,
        enabled !== false, // Default to true if not explicitly set to false
        sort_order || 0,
      ]
    );
    return result.rows[0];
  },

  // Delete platform config (shared across all users)
  async delete(userId, platform) {
    // Note: userId parameter kept for backward compatibility but ignored - all configs are shared
    const result = await pool.query(
      'DELETE FROM platform_config WHERE platform = $1 RETURNING id',
      [platform]
    );
    return result.rows[0];
  },

  // Update sort orders for multiple platforms
  async updateSortOrders(orders) {
    // orders is an array of { platform, sort_order }
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const { platform, sort_order } of orders) {
        await client.query(
          'UPDATE platform_config SET sort_order = $1 WHERE platform = $2',
          [sort_order, platform]
        );
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },
};
