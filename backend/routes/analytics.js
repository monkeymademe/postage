import express from 'express';
import { TrackingUrl } from '../models/TrackingUrl.js';
import { authenticateToken } from '../middleware/auth.js';
import { Post } from '../models/Post.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get analytics for a specific post
router.get('/post/:postId', async (req, res) => {
  try {
    const { postId } = req.params;

    // Verify post exists
    const post = await Post.findById(postId, req.user.userId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const analytics = await TrackingUrl.getPostAnalytics(postId);
    res.json({ analytics });
  } catch (error) {
    console.error('Get post analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get overall analytics (all platforms summary)
router.get('/summary', async (req, res) => {
  try {
    const summary = await TrackingUrl.getAllAnalytics();
    res.json({ summary });
  } catch (error) {
    console.error('Get analytics summary error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get detailed analytics for a specific tracking URL
router.get('/tracking/:trackingUrlId', async (req, res) => {
  try {
    const { trackingUrlId } = req.params;
    const limit = parseInt(req.query.limit) || 100;

    const details = await TrackingUrl.getDetailedAnalytics(trackingUrlId, limit);
    res.json({ details });
  } catch (error) {
    console.error('Get detailed analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
