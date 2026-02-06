import pool from '../config/database.js';
import { randomBytes } from 'crypto';

/**
 * Generate a short code for tracking URLs
 */
function generateShortCode() {
  // Generate a 8-character random string (base62: 0-9, a-z, A-Z)
  const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export const TrackingUrl = {
  /**
   * Get or create a tracking URL for a post and platform
   */
  async getOrCreate(postId, platform, originalUrl) {
    // Check if tracking URL already exists
    const existing = await pool.query(
      'SELECT * FROM tracking_urls WHERE post_id = $1 AND platform = $2',
      [postId, platform]
    );

    if (existing.rows.length > 0) {
      return existing.rows[0];
    }

    // Generate unique short code
    let shortCode;
    let attempts = 0;
    do {
      shortCode = generateShortCode();
      const check = await pool.query(
        'SELECT id FROM tracking_urls WHERE short_code = $1',
        [shortCode]
      );
      if (check.rows.length === 0) {
        break; // Code is unique
      }
      attempts++;
      if (attempts > 10) {
        throw new Error('Failed to generate unique short code');
      }
    } while (true);

    // Create new tracking URL
    const result = await pool.query(
      `INSERT INTO tracking_urls (post_id, platform, short_code, original_url)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [postId, platform, shortCode, originalUrl]
    );

    return result.rows[0];
  },

  /**
   * Get tracking URL by short code
   */
  async findByShortCode(shortCode) {
    const result = await pool.query(
      'SELECT * FROM tracking_urls WHERE short_code = $1',
      [shortCode]
    );
    return result.rows[0];
  },

  /**
   * Record a click event
   */
  async recordClick(trackingUrlId, ipAddress, userAgent, referer) {
    // Update click count
    await pool.query(
      'UPDATE tracking_urls SET click_count = click_count + 1, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [trackingUrlId]
    );

    // Record detailed click event
    await pool.query(
      `INSERT INTO click_events (tracking_url_id, ip_address, user_agent, referer)
       VALUES ($1, $2, $3, $4)`,
      [trackingUrlId, ipAddress, userAgent, referer]
    );
  },

  /**
   * Get analytics for a post
   */
  async getPostAnalytics(postId) {
    const result = await pool.query(
      `SELECT 
        platform,
        click_count,
        short_code,
        created_at,
        updated_at
       FROM tracking_urls
       WHERE post_id = $1
       ORDER BY click_count DESC`,
      [postId]
    );
    return result.rows;
  },

  /**
   * Get analytics for all posts (summary)
   */
  async getAllAnalytics() {
    const result = await pool.query(
      `SELECT 
        t.platform,
        COUNT(DISTINCT t.post_id) as post_count,
        SUM(t.click_count) as total_clicks,
        AVG(t.click_count) as avg_clicks_per_post
       FROM tracking_urls t
       GROUP BY t.platform
       ORDER BY total_clicks DESC`
    );
    return result.rows;
  },

  /**
   * Get detailed analytics for a specific tracking URL
   */
  async getDetailedAnalytics(trackingUrlId, limit = 100) {
    const result = await pool.query(
      `SELECT 
        ce.clicked_at,
        ce.ip_address,
        ce.user_agent,
        ce.referer
       FROM click_events ce
       WHERE ce.tracking_url_id = $1
       ORDER BY ce.clicked_at DESC
       LIMIT $2`,
      [trackingUrlId, limit]
    );
    return result.rows;
  },
};
