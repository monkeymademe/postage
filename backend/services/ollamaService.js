/**
 * Backward Compatibility Wrapper for Ollama Service
 * 
 * This file maintains backward compatibility by re-exporting from the new provider system.
 * New code should import from llmProvider.js instead.
 * 
 * @deprecated Use llmProvider.js instead
 */

// Re-export from the new provider system
export { generateContent, generateHashtags, generateAllPlatforms } from './llmProvider.js';
export { clearOllamaSettingsCache } from './providers/ollamaProvider.js';
