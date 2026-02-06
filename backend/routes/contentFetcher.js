import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { fetchContentFromUrl, fetchGhostPosts, fetchGhostPost } from '../services/contentFetcher.js';
import { GhostSite } from '../models/GhostSite.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Fetch content from a URL
router.post('/fetch-url', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Validate URL
    try {
      new URL(url);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    const result = await fetchContentFromUrl(url);
    res.json(result);
  } catch (error) {
    console.error('Fetch URL error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch content from URL' });
  }
});

// Fetch posts from Ghost CMS
router.post('/ghost/posts', async (req, res) => {
  try {
    const { ghostUrl, apiKey, limit } = req.body;

    if (!ghostUrl || !apiKey) {
      return res.status(400).json({ error: 'Ghost URL and API key are required' });
    }

    const posts = await fetchGhostPosts(ghostUrl, apiKey, limit || 10);
    res.json({ posts });
  } catch (error) {
    console.error('Fetch Ghost posts error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch Ghost posts' });
  }
});

// Fetch a single post from Ghost CMS
router.post('/ghost/post', async (req, res) => {
  try {
    const { ghostUrl, apiKey, postId } = req.body;

    if (!ghostUrl || !apiKey || !postId) {
      return res.status(400).json({ error: 'Ghost URL, API key, and post ID are required' });
    }

    const post = await fetchGhostPost(ghostUrl, apiKey, postId);
    res.json({ post });
  } catch (error) {
    console.error('Fetch Ghost post error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch Ghost post' });
  }
});

// Fetch posts using saved Ghost site
router.post('/ghost/posts-by-site', async (req, res) => {
  try {
    const { siteId, limit } = req.body;

    if (!siteId) {
      return res.status(400).json({ error: 'Site ID is required' });
    }

    const site = await GhostSite.getWithApiKey(siteId, req.user.userId);
    if (!site) {
      return res.status(404).json({ error: 'Ghost site not found' });
    }

    const posts = await fetchGhostPosts(site.url, site.api_key, limit || 10);
    res.json({ posts });
  } catch (error) {
    console.error('Fetch Ghost posts by site error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch Ghost posts' });
  }
});

// Fetch a single post using saved Ghost site
router.post('/ghost/post-by-site', async (req, res) => {
  try {
    const { siteId, postId } = req.body;

    if (!siteId || !postId) {
      return res.status(400).json({ error: 'Site ID and post ID are required' });
    }

    const site = await GhostSite.getWithApiKey(siteId, req.user.userId);
    if (!site) {
      return res.status(404).json({ error: 'Ghost site not found' });
    }

    const post = await fetchGhostPost(site.url, site.api_key, postId);
    res.json({ post });
  } catch (error) {
    console.error('Fetch Ghost post by site error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch Ghost post' });
  }
});

export default router;
