/**
 * LLM Provider Abstraction Layer
 * 
 * This module provides a unified interface for different LLM providers.
 * Each provider (Ollama, OpenAI, etc.) implements the same interface.
 */

import { SystemSettings } from '../models/User.js';
import * as ollamaProvider from './providers/ollamaProvider.js';

// Provider registry - dynamically import providers
const providers = {
  ollama: ollamaProvider,
  // Future providers can be added here:
  // openai: openaiProvider,
  // anthropic: anthropicProvider,
};

/**
 * Get the active LLM provider based on settings
 * Returns the first enabled provider, or throws an error if none are enabled
 */
export async function getActiveProvider() {
  // Check Ollama first (current default)
  const ollamaEnabled = await SystemSettings.get('ollama_enabled');
  if (ollamaEnabled?.value === 'true') {
    return 'ollama';
  }

  // Future: Check other providers
  // const openaiEnabled = await SystemSettings.get('openai_enabled');
  // if (openaiEnabled?.value === 'true') {
  //   return 'openai';
  // }

  throw new Error('No LLM provider is enabled. Please enable at least one provider in LLM Settings.');
}

/**
 * Generate content using the active LLM provider
 */
export async function generateContent(blogContent, platform, config = {}) {
  const providerName = await getActiveProvider();
  const provider = providers[providerName];

  if (!provider) {
    throw new Error(`LLM provider "${providerName}" is not available`);
  }

  if (!provider.generateContent) {
    throw new Error(`LLM provider "${providerName}" does not support content generation`);
  }

  return await provider.generateContent(blogContent, platform, config);
}

/**
 * Generate hashtags using the active LLM provider
 */
export async function generateHashtags(blogContent, count = 10) {
  const providerName = await getActiveProvider();
  const provider = providers[providerName];

  if (!provider) {
    throw new Error(`LLM provider "${providerName}" is not available`);
  }

  if (!provider.generateHashtags) {
    throw new Error(`LLM provider "${providerName}" does not support hashtag generation`);
  }

  return await provider.generateHashtags(blogContent, count);
}

/**
 * Generate content for all platforms using the active LLM provider
 */
export async function generateAllPlatforms(blogContent, platformConfigs = {}) {
  const platforms = Object.keys(platformConfigs);
  const results = {};

  // Generate content for each platform sequentially
  for (const platform of platforms) {
    try {
      const config = platformConfigs[platform] || {};
      results[platform] = await generateContent(blogContent, platform, config);
    } catch (error) {
      console.error(`Error generating content for ${platform}:`, error);
      results[platform] = `Error: ${error.message}`;
    }
  }

  return results;
}

/**
 * Get available providers
 */
export function getAvailableProviders() {
  return Object.keys(providers);
}

/**
 * Check if a provider is available
 */
export function isProviderAvailable(providerName) {
  return providers.hasOwnProperty(providerName);
}
