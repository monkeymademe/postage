import express from 'express';
import { Post } from '../models/Post.js';
import { authenticateToken } from '../middleware/auth.js';
import { generateHashtags } from '../services/llmProvider.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get all posts for the authenticated user
router.get('/', async (req, res) => {
  try {
    console.log('Fetching posts for user:', req.user.userId);
    const posts = await Post.findByUserId(req.user.userId);
    console.log(`Found ${posts.length} posts`);
    res.json({ posts });
  } catch (error) {
    console.error('Get posts error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Get a single post
router.get('/:id', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id, req.user.userId);
    
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    res.json({ post });
  } catch (error) {
    console.error('Get post error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new post
router.post('/', async (req, res) => {
  try {
    const { title, content, source_url, hashtags, featured_image } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    const post = await Post.create(req.user.userId, title, content, source_url, hashtags, featured_image);
    
    res.status(201).json({ post });
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a post
router.put('/:id', async (req, res) => {
  try {
    const { title, content, source_url, hashtags, featured_image } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    const post = await Post.update(req.params.id, req.user.userId, title, content, source_url, hashtags, featured_image);

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    res.json({ post });
  } catch (error) {
    console.error('Update post error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Generate hashtags for a post
router.post('/:id/generate-hashtags', async (req, res) => {
  try {
    const { count = 10 } = req.body;
    const post = await Post.findById(req.params.id, req.user.userId);

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (!post.content) {
      return res.status(400).json({ error: 'Post has no content to generate hashtags from' });
    }

    const hashtags = await generateHashtags(post.content, count);
    const updatedPost = await Post.updateHashtags(req.params.id, req.user.userId, hashtags);

    res.json({ 
      post: updatedPost,
      hashtags: updatedPost.hashtags || []
    });
  } catch (error) {
    console.error('Generate hashtags error:', error);
    res.status(500).json({ 
      error: 'Failed to generate hashtags',
      details: error.message 
    });
  }
});

// Update hashtags for a post
router.put('/:id/hashtags', async (req, res) => {
  try {
    const { hashtags } = req.body;

    if (!Array.isArray(hashtags)) {
      return res.status(400).json({ error: 'Hashtags must be an array' });
    }

    const post = await Post.updateHashtags(req.params.id, req.user.userId, hashtags);

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    res.json({ post });
  } catch (error) {
    console.error('Update hashtags error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a post
router.delete('/:id', async (req, res) => {
  try {
    const post = await Post.delete(req.params.id, req.user.userId);

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
