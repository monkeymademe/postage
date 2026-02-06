import express from 'express';
import { GhostSite } from '../models/GhostSite.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get all Ghost sites for the authenticated user (all users can view)
router.get('/', async (req, res) => {
  try {
    const sites = await GhostSite.findByUserId(req.user.userId);
    res.json({ sites });
  } catch (error) {
    console.error('Get Ghost sites error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a single Ghost site (all users can view)
router.get('/:id', async (req, res) => {
  try {
    const site = await GhostSite.findById(req.params.id, req.user.userId);
    
    if (!site) {
      return res.status(404).json({ error: 'Ghost site not found' });
    }

    // Don't return API key in response
    const { api_key, ...siteWithoutKey } = site;
    res.json({ site: siteWithoutKey });
  } catch (error) {
    console.error('Get Ghost site error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new Ghost site (admin only)
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { name, url, apiKey } = req.body;

    if (!name || !url || !apiKey) {
      return res.status(400).json({ error: 'Name, URL, and API key are required' });
    }

    // Validate URL
    try {
      new URL(url);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    const site = await GhostSite.create(req.user.userId, name, url, apiKey);
    res.status(201).json({ site });
  } catch (error) {
    console.error('Create Ghost site error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a Ghost site (admin only)
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { name, url, apiKey } = req.body;

    if (!name || !url || !apiKey) {
      return res.status(400).json({ error: 'Name, URL, and API key are required' });
    }

    // Validate URL
    try {
      new URL(url);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    const site = await GhostSite.update(req.params.id, req.user.userId, name, url, apiKey);

    if (!site) {
      return res.status(404).json({ error: 'Ghost site not found' });
    }

    res.json({ site });
  } catch (error) {
    console.error('Update Ghost site error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a Ghost site (admin only)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const site = await GhostSite.delete(req.params.id, req.user.userId);

    if (!site) {
      return res.status(404).json({ error: 'Ghost site not found' });
    }

    res.json({ message: 'Ghost site deleted successfully' });
  } catch (error) {
    console.error('Delete Ghost site error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Test Ghost site connection
router.post('/:id/test', async (req, res) => {
  try {
    const site = await GhostSite.getWithApiKey(req.params.id, req.user.userId);

    if (!site) {
      return res.status(404).json({ error: 'Ghost site not found' });
    }

    // Test the connection by fetching posts
    const { fetchGhostPosts } = await import('../services/contentFetcher.js');
    const posts = await fetchGhostPosts(site.url, site.api_key, 1);

    res.json({ 
      success: true, 
      message: `Successfully connected! Found ${posts.length} post(s).` 
    });
  } catch (error) {
    console.error('Test Ghost site error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Failed to connect to Ghost site' 
    });
  }
});

export default router;
