import express from 'express';
import { PlatformConfig } from '../models/PlatformConfig.js';
import { GeneratedContent } from '../models/Post.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get all platform configs for the authenticated user
router.get('/', async (req, res) => {
  try {
    const configs = await PlatformConfig.findByUserId(req.user.userId);
    res.json({ configs });
  } catch (error) {
    console.error('Get platform configs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update sort orders for profiles (must be before /:platform to avoid route conflict)
router.post('/reorder', async (req, res) => {
  try {
    const { orders } = req.body;
    
    if (!Array.isArray(orders)) {
      return res.status(400).json({ error: 'Orders must be an array' });
    }

    await PlatformConfig.updateSortOrders(orders);
    
    // Return updated configs
    const configs = await PlatformConfig.findByUserId(req.user.userId);
    res.json({ configs });
  } catch (error) {
    console.error('Reorder platform configs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a specific platform config
router.get('/:platform', async (req, res) => {
  try {
    const { platform } = req.params;
    
    // Validate platform name (alphanumeric, dashes, underscores, max 50 chars)
    if (!platform || !/^[a-zA-Z0-9_-]{1,50}$/.test(platform)) {
      return res.status(400).json({ error: 'Invalid platform name' });
    }

    const config = await PlatformConfig.findByUserAndPlatform(
      req.user.userId,
      platform
    );

    if (!config) {
      // Return default config if none exists
      return res.json({ config: getDefaultConfig(platform) });
    }

    res.json({ config });
  } catch (error) {
    console.error('Get platform config error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create or update platform config
router.post('/:platform', async (req, res) => {
  try {
    const { platform } = req.params;
    
    // Validate platform name (alphanumeric, dashes, underscores, max 50 chars)
    if (!platform || !/^[a-zA-Z0-9_-]{1,50}$/.test(platform)) {
      return res.status(400).json({ error: 'Invalid platform name' });
    }

    console.log('Received platform config update:', { platform, enabled: req.body.enabled, body_keys: Object.keys(req.body) });
    const config = await PlatformConfig.upsert(req.user.userId, platform, req.body);
    console.log('Saved config enabled value:', config.enabled);
    res.json({ config });
  } catch (error) {
    console.error('Update platform config error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete platform config and all associated generated content
router.delete('/:platform', async (req, res) => {
  try {
    const { platform } = req.params;
    
    // Validate platform name (alphanumeric, dashes, underscores, max 50 chars)
    if (!platform || !/^[a-zA-Z0-9_-]{1,50}$/.test(platform)) {
      return res.status(400).json({ error: 'Invalid platform name' });
    }

    // Delete all generated content for this platform first
    const deletedContentCount = await GeneratedContent.deleteByPlatform(platform);
    
    // Then delete the platform config
    await PlatformConfig.delete(req.user.userId, platform);
    
    res.json({ 
      message: 'Platform config deleted',
      deletedContentCount 
    });
  } catch (error) {
    console.error('Delete platform config error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper function to get default configs
function getDefaultConfig(platform) {
  // Return sensible defaults for any platform
  return {
    platform: platform,
    max_length: 5000,
    min_length: 50,
    include_hashtags: false,
    hashtag_count: 0,
    include_photos: false,
    hook_length: null,
    is_video_script: false,
    tone: 'conversational',
    style: 'engaging',
    custom_instructions: null,
  };
}

export default router;
