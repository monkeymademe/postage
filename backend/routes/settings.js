import express from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { SystemSettings } from '../models/User.js';
import { clearOllamaSettingsCache } from '../services/providers/ollamaProvider.js';

const router = express.Router();

// Get registration enabled status (public - must be before auth middleware)
router.get('/registration-enabled', async (req, res) => {
  try {
    const setting = await SystemSettings.get('registration_enabled');
    res.json({ enabled: setting?.value === 'true' });
  } catch (error) {
    console.error('Get registration status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// All other routes require authentication
router.use(authenticateToken);

// Get all settings (all authenticated users can view)
router.get('/', async (req, res) => {
  try {
    const settings = await SystemSettings.getAll();
    const settingsMap = {};
    settings.forEach(setting => {
      settingsMap[setting.key] = setting.value;
    });
    res.json({ settings: settingsMap });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get LLM settings (admin only) - returns all LLM provider settings
router.get('/llm', requireAdmin, async (req, res) => {
  try {
    const ollamaEnabledSetting = await SystemSettings.get('ollama_enabled');
    const urlSetting = await SystemSettings.get('ollama_url');
    const modelSetting = await SystemSettings.get('ollama_model');
    
    res.json({
      ollama: {
        enabled: ollamaEnabledSetting?.value === 'true',
        url: urlSetting?.value || process.env.OLLAMA_URL || 'http://localhost:11434',
        model: modelSetting?.value || process.env.OLLAMA_MODEL || 'llama2',
      },
    });
  } catch (error) {
    console.error('Get LLM settings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get Ollama settings (admin only) - kept for backward compatibility
router.get('/ollama', requireAdmin, async (req, res) => {
  try {
    const urlSetting = await SystemSettings.get('ollama_url');
    const modelSetting = await SystemSettings.get('ollama_model');
    
    res.json({
      url: urlSetting?.value || process.env.OLLAMA_URL || 'http://localhost:11434',
      model: modelSetting?.value || process.env.OLLAMA_MODEL || 'llama2',
    });
  } catch (error) {
    console.error('Get Ollama settings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Test Ollama connection (admin only)
router.post('/ollama/test', requireAdmin, async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    // Test connection by fetching available models
    const testUrl = `${url}/api/tags`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    try {
      const response = await fetch(testUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return res.status(response.status).json({
          success: false,
          error: `Connection failed: ${response.status} ${response.statusText}`,
        });
      }

      const data = await response.json();
      const availableModels = data.models?.map((m) => m.name) || [];

      if (availableModels.length === 0) {
        return res.json({
          success: true,
          message: 'Connected successfully, but no models found',
          models: [],
        });
      }

      return res.json({
        success: true,
        message: `Connection successful! Found ${availableModels.length} model(s)`,
        models: availableModels,
      });
    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      if (fetchError.name === 'AbortError') {
        return res.status(408).json({
          success: false,
          error: 'Connection timeout - Ollama did not respond within 10 seconds',
        });
      }

      if (fetchError.message.includes('ECONNREFUSED') || fetchError.message.includes('ENOTFOUND')) {
        return res.status(503).json({
          success: false,
          error: `Cannot connect to Ollama at ${url}. Make sure Ollama is running and accessible from the server.`,
        });
      }

      throw fetchError;
    }
  } catch (error) {
    console.error('Test Ollama connection error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
});

// Update setting (admin only for registration_enabled and LLM settings, all users for others)
router.put('/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const { value, description } = req.body;

    if (value === undefined) {
      return res.status(400).json({ error: 'Value is required' });
    }

    // Check if user is admin for restricted settings
    const { User } = await import('../models/User.js');
    const isAdmin = await User.isAdmin(req.user.userId);

    // Registration and LLM settings require admin
    const adminOnlyKeys = ['registration_enabled', 'ollama_enabled', 'ollama_url', 'ollama_model'];
    if (adminOnlyKeys.includes(key) && !isAdmin) {
      return res.status(403).json({ error: 'Admin access required for this setting' });
    }

    // Validate registration_enabled value
    if (key === 'registration_enabled' && value !== 'true' && value !== 'false') {
      return res.status(400).json({ error: 'Value must be "true" or "false"' });
    }

    // Validate ollama_url format
    if (key === 'ollama_url') {
      try {
        const url = new URL(value);
        if (!['http:', 'https:'].includes(url.protocol)) {
          return res.status(400).json({ error: 'Ollama URL must use http:// or https://' });
        }
      } catch (e) {
        return res.status(400).json({ error: 'Invalid URL format for Ollama URL' });
      }
    }

    // Validate ollama_model (should not be empty)
    if (key === 'ollama_model' && (!value || value.trim() === '')) {
      return res.status(400).json({ error: 'Ollama model name cannot be empty' });
    }

    // Validate ollama_enabled value
    if (key === 'ollama_enabled' && value !== 'true' && value !== 'false') {
      return res.status(400).json({ error: 'Value must be "true" or "false"' });
    }

    const setting = await SystemSettings.set(key, value, description);
    
    // Clear Ollama settings cache if Ollama settings were updated
    if (key === 'ollama_url' || key === 'ollama_model' || key === 'ollama_enabled') {
      clearOllamaSettingsCache();
    }
    
    res.json({ setting });
  } catch (error) {
    console.error('Update setting error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
