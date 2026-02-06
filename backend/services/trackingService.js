import { PlatformConfig } from '../models/PlatformConfig.js';

/**
 * Generate a UTM-tagged URL for tracking
 * @param {string} sourceUrl - The original blog post URL
 * @param {string} platform - The platform name (bluesky, twitter, linkedin, etc.)
 * @param {string} utmSource - Optional custom UTM source name (defaults to platform name)
 * @param {boolean} utmEnabled - Whether UTM tracking is enabled (defaults to true)
 * @returns {string} - URL with utm_source parameter appended, or original URL if UTM disabled
 */
export function generateUtmUrl(sourceUrl, platform, utmSource = null, utmEnabled = true) {
  if (!sourceUrl || !platform) {
    return sourceUrl;
  }

  // If UTM is disabled, return the original URL
  if (utmEnabled === false) {
    return sourceUrl;
  }

  // Use custom utm_source if provided, otherwise use platform name
  const source = utmSource || platform.toLowerCase();

  try {
    const url = new URL(sourceUrl);
    
    // Add only utm_source parameter
    url.searchParams.set('utm_source', source);
    
    return url.toString();
  } catch (error) {
    console.error('Error generating UTM URL:', error);
    // If URL parsing fails, append parameter manually
    const separator = sourceUrl.includes('?') ? '&' : '?';
    return `${sourceUrl}${separator}utm_source=${encodeURIComponent(source)}`;
  }
}

/**
 * Inject UTM-tagged URL into generated content
 * Replaces the original source_url with a UTM-tagged version
 */
export function injectTrackingUrl(content, postId, platform, sourceUrl, utmSource = null, utmEnabled = true) {
  if (!sourceUrl || !platform) {
    return content; // Return content unchanged if no source URL
  }

  try {
    const utmUrl = generateUtmUrl(sourceUrl, platform, utmSource, utmEnabled);
    
    // Replace any existing source_url references in the content with UTM URL
    if (content.includes(sourceUrl)) {
      // Direct replacement of the URL
      content = content.replace(new RegExp(sourceUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), utmUrl);
    }
    
    // Also look for common call-to-action patterns and add UTM URL if not present
    const ctaPatterns = [
      /(read\s+(?:my\s+)?(?:full\s+)?(?:blog\s+)?post|check\s+out\s+(?:my\s+)?(?:blog\s+)?post|read\s+more|full\s+article|complete\s+article)/gi
    ];
    
    // If content has CTAs but no link, append UTM URL
    let hasLink = content.includes('http') || content.includes('href=');
    let hasCTA = ctaPatterns.some(pattern => pattern.test(content));
    
    if (hasCTA && !hasLink) {
      // Append UTM URL at the end
      content += ` <a href="${utmUrl}" target="_blank" rel="noopener noreferrer">Read the full post</a>`;
    }
    
    return content;
  } catch (error) {
    console.error('Error injecting UTM URL:', error);
    return content; // Return original content on error
  }
}

/**
 * Generate UTM URLs for all configured platforms
 * Called when a post is saved or content is generated
 */
export async function createTrackingUrlsForPost(postId, sourceUrl, userId) {
  if (!sourceUrl || !postId) {
    return {}; // No tracking URLs if no source URL
  }

  try {
    // Get all configured platforms
    const configs = await PlatformConfig.findByUserId(userId);
    
    if (configs.length === 0) {
      return {}; // No platforms configured
    }

    const trackingUrls = {};
    
    // Generate UTM URL for each configured platform
    for (const config of configs) {
      const platform = config.platform;
      const utmSource = config.utm_source || platform; // Use custom utm_source or default to platform name
      const utmEnabled = config.utm_enabled !== false; // Default to true
      trackingUrls[platform] = generateUtmUrl(sourceUrl, platform, utmSource, utmEnabled);
    }

    return trackingUrls;
  } catch (error) {
    console.error('Error creating UTM URLs for post:', error);
    return {};
  }
}

/**
 * Get UTM URLs for a post (all platforms)
 * Simply generates UTM URLs on the fly - no database lookup needed
 */
export async function getTrackingUrlsForPost(postId, sourceUrl, userId) {
  return createTrackingUrlsForPost(postId, sourceUrl, userId);
}

// Keep this export for backward compatibility (settings route imports it)
// but it's no longer needed with UTM approach
export function clearTrackingBaseUrlCache() {
  // No-op - UTM URLs don't need caching
}
