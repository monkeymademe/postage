import express from 'express';
import { Post, GeneratedContent } from '../models/Post.js';
import { PlatformConfig } from '../models/PlatformConfig.js';
import { authenticateToken } from '../middleware/auth.js';
import { generateAllPlatforms, generateContent, generateHashtags } from '../services/llmProvider.js';
import { injectTrackingUrl, generateUtmUrl, getTrackingUrlsForPost } from '../services/trackingService.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Generate content for a single platform
router.post('/:id/generate/:platform', async (req, res) => {
  try {
    const postId = req.params.id;
    const platform = req.params.platform;

    // Verify post exists and belongs to user
    const post = await Post.findById(postId, req.user.userId);

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Validate platform name format
    if (!platform || !/^[a-zA-Z0-9_-]{1,50}$/.test(platform)) {
      return res.status(400).json({ error: 'Invalid platform name' });
    }

    // Generate hashtags if not already present
    let hashtags = post.hashtags || [];
    if (!hashtags || hashtags.length === 0) {
      try {
        hashtags = await generateHashtags(post.content, 10);
        if (hashtags && hashtags.length > 0) {
          await Post.updateHashtags(postId, req.user.userId, hashtags);
        }
      } catch (error) {
        console.error('Error generating hashtags:', error);
        // Continue without hashtags if generation fails
      }
    }

    // Get platform configuration for this user and platform
    const configs = await PlatformConfig.findByUserId(req.user.userId);
    const platformConfig = configs.find(config => config.platform === platform) || {};

    // Generate content for the single platform
    let generatedContent = await generateContent(post.content, platform, platformConfig);

    // Inject UTM-tagged URL if source_url exists and UTM is enabled
    let trackingUrl = null;
    if (post.source_url) {
      const utmSource = platformConfig.utm_source || platform;
      const utmEnabled = platformConfig.utm_enabled !== false;
      trackingUrl = generateUtmUrl(post.source_url, platform, utmSource, utmEnabled);
      generatedContent = injectTrackingUrl(generatedContent, postId, platform, post.source_url, utmSource, utmEnabled);
    }

    // Save generated content to database
    const saved = await GeneratedContent.upsert(postId, platform, generatedContent);

    // Reload post to get updated hashtags
    const updatedPost = await Post.findById(postId, req.user.userId);

    res.json({
      message: `Content generated successfully for ${platform}`,
      generatedContent: saved,
      hashtags: updatedPost.hashtags || [],
      trackingUrl,
    });
  } catch (error) {
    console.error('Generate content error (single platform):', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to generate content',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Generate content for all platforms
router.post('/:id/generate', async (req, res) => {
  try {
    const postId = req.params.id;

    // Verify post exists and belongs to user
    const post = await Post.findById(postId, req.user.userId);

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Generate hashtags if not already present
    let hashtags = post.hashtags || [];
    if (!hashtags || hashtags.length === 0) {
      try {
        hashtags = await generateHashtags(post.content, 10);
        if (hashtags && hashtags.length > 0) {
          await Post.updateHashtags(postId, req.user.userId, hashtags);
        }
      } catch (error) {
        console.error('Error generating hashtags:', error);
        // Continue without hashtags if generation fails
      }
    }

    // Get platform configurations for this user (only enabled profiles)
    const configs = await PlatformConfig.findByUserId(req.user.userId);
    const platformConfigs = {};
    configs.forEach(config => {
      // Only include enabled profiles for generation
      if (config.enabled !== false) {
        platformConfigs[config.platform] = config;
      }
    });

    // Generate content for all enabled platforms with user's custom configs
    let generatedContent = await generateAllPlatforms(post.content, platformConfigs);

    // Generate UTM URLs and inject them for each platform if source_url exists and UTM is enabled
    const trackingUrls = {};
    if (post.source_url) {
      for (const [platform, content] of Object.entries(generatedContent)) {
        if (!content.startsWith('Error:')) {
          const platformConfig = platformConfigs[platform] || {};
          const utmSource = platformConfig.utm_source || platform;
          const utmEnabled = platformConfig.utm_enabled !== false;
          trackingUrls[platform] = generateUtmUrl(post.source_url, platform, utmSource, utmEnabled);
          generatedContent[platform] = injectTrackingUrl(content, postId, platform, post.source_url, utmSource, utmEnabled);
        }
      }
    }

    // Save generated content to database
    const savedContent = {};
    for (const [platform, content] of Object.entries(generatedContent)) {
      if (!content.startsWith('Error:')) {
        const saved = await GeneratedContent.upsert(postId, platform, content);
        savedContent[platform] = { ...saved, trackingUrl: trackingUrls[platform] || null };
      } else {
        // Still save error messages so user knows what failed
        savedContent[platform] = { platform, content, error: true };
      }
    }

    // Reload post to get updated hashtags
    const updatedPost = await Post.findById(postId, req.user.userId);

    res.json({
      message: 'Content generated successfully',
      generatedContent: savedContent,
      hashtags: updatedPost.hashtags || [],
      trackingUrls,
    });
  } catch (error) {
    console.error('Generate content error (all platforms):', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to generate content',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Get generated content for a post
router.get('/:id/generate', async (req, res) => {
  try {
    const postId = req.params.id;

    // Verify post exists and belongs to user
    const post = await Post.findById(postId, req.user.userId);

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const generatedContent = await GeneratedContent.findByPostId(postId);

    // Generate UTM URLs for all configured platforms (on the fly)
    let trackingUrls = {};
    if (post.source_url) {
      trackingUrls = await getTrackingUrlsForPost(postId, post.source_url, req.user.userId);
      
      // Add trackingUrl to each generated content item
      generatedContent.forEach(item => {
        if (trackingUrls[item.platform]) {
          item.trackingUrl = trackingUrls[item.platform];
        }
      });
    }

    res.json({ generatedContent, trackingUrls });
  } catch (error) {
    console.error('Get generated content error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update generated content
router.put('/generate/content/:id', async (req, res) => {
  try {
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const updated = await GeneratedContent.update(req.params.id, content);

    if (!updated) {
      return res.status(404).json({ error: 'Generated content not found' });
    }

    res.json({ generatedContent: updated });
  } catch (error) {
    console.error('Update generated content error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
