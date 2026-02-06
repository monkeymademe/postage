/**
 * Ollama LLM Provider Implementation
 * 
 * This module implements the Ollama provider for content generation.
 */

import dotenv from 'dotenv';
import { SystemSettings } from '../../models/User.js';

dotenv.config();

// Cache for Ollama settings to avoid repeated database queries
let ollamaSettingsCache = {
  url: null,
  model: null,
  lastFetch: null,
};
const CACHE_TTL = 60000; // 1 minute cache

// Check if Ollama is enabled
async function isOllamaEnabled() {
  try {
    const enabledSetting = await SystemSettings.get('ollama_enabled');
    return enabledSetting?.value === 'true';
  } catch (error) {
    // Default to enabled if check fails
    return true;
  }
}

// Get Ollama settings from database, with fallback to env vars and caching
async function getOllamaSettings() {
  const now = Date.now();
  
  // Return cached values if still valid
  if (ollamaSettingsCache.url && ollamaSettingsCache.model && 
      ollamaSettingsCache.lastFetch && (now - ollamaSettingsCache.lastFetch) < CACHE_TTL) {
    return {
      url: ollamaSettingsCache.url,
      model: ollamaSettingsCache.model,
    };
  }

  try {
    // Check if Ollama is enabled first
    const enabled = await isOllamaEnabled();
    if (!enabled) {
      throw new Error('Ollama is disabled');
    }

    // Try to get from database first
    const urlSetting = await SystemSettings.get('ollama_url');
    const modelSetting = await SystemSettings.get('ollama_model');
    
    const url = urlSetting?.value || process.env.OLLAMA_URL || 'http://localhost:11434';
    const model = modelSetting?.value || process.env.OLLAMA_MODEL || 'llama2';
    
    // Update cache
    ollamaSettingsCache = {
      url,
      model,
      lastFetch: now,
    };
    
    return { url, model };
  } catch (error) {
    if (error.message === 'Ollama is disabled') {
      throw error;
    }
    console.warn('Error fetching Ollama settings from database, using env vars:', error.message);
    // Fallback to env vars if database query fails
    const url = process.env.OLLAMA_URL || 'http://localhost:11434';
    const model = process.env.OLLAMA_MODEL || 'llama2';
    
    ollamaSettingsCache = {
      url,
      model,
      lastFetch: now,
    };
    
    return { url, model };
  }
}

// Clear cache (useful when settings are updated)
export function clearOllamaSettingsCache() {
  ollamaSettingsCache = {
    url: null,
    model: null,
    lastFetch: null,
  };
}

// Build prompt based on platform config
function buildPrompt(blogContent, platform, config = {}) {
  const {
    max_length,
    min_length,
    include_hashtags,
    hashtag_count,
    hook_length,
    is_video_script,
    tone,
    style,
    custom_instructions,
    avoid_header_generation,
    // New profile type fields
    profile_type,
    min_duration_seconds,
    max_duration_seconds,
    min_scenes,
    max_scenes,
    narrator_on_camera,
  } = config;
  
  // Check if this is a video script profile (either old is_video_script or new profile_type)
  const isScriptProfile = profile_type === 'script' || is_video_script;

  let prompt = `You are the AUTHOR of this blog post. Write a ${platform} post PROMOTING your own blog post as if you wrote it yourself. `;
  prompt += `CRITICAL INSTRUCTIONS - THIS IS A PROMOTION, NOT A COPY: `;
  prompt += `1. Write AS THE AUTHOR - use first person ("I", "my", "me"). Write as if YOU wrote the blog post and are now promoting it. This is YOUR content, YOUR experience, YOUR insights. `;
  prompt += `2. DO NOT COPY THE FULL CONTENT. DO NOT REPRODUCE THE ENTIRE BLOG POST. This is a PROMOTIONAL TEASER that makes people want to read the full post. You are SELLING the blog post, not giving it away for free. `;
  prompt += `3. DO NOT describe or summarize the post from an outside perspective. DO NOT use phrases like "It looks like", "It seems like", "You've provided", "The post is about", "If I understand correctly", "The author appears", "Here are some ways", or any third-person language. `;
  prompt += `4. Create a PROMOTIONAL HOOK - start with the most compelling, interesting, or valuable insight from YOUR blog post. Use actual content/examples from the post, but DON'T give away everything. Create curiosity. Make it sound like YOU are excited to share YOUR knowledge. `;
  prompt += `5. Use SPECIFIC details from the blog post - mention specific topics, tools, resources, or insights that are in the full post, but DON'T explain them fully. Tease the value. Don't be vague, but also don't give away the complete answer. `;
  prompt += `6. Write with ENTHUSIASM - sound excited about sharing YOUR content. Use engaging, personal language. `;
  prompt += `7. CREATE CURIOSITY GAPS - mention interesting points from the blog but leave readers wanting more. Say things like "I discovered X, Y, and Z" but don't fully explain them. Hint at valuable insights without revealing everything. `;
  prompt += `8. Include MULTIPLE call-to-actions encouraging readers to read YOUR full post. For longer posts, include CTAs both in the middle and at the end (e.g., "Read my full post to learn more about...", "Check out the complete article on my blog to discover...", "Want to know how I did it? Read the full post..."). `;
  prompt += `9. Output ONLY the promotional post content - start immediately with the hook. NO introductory phrases, NO "Here is", NO "I'll summarize", NO descriptions of what the post contains. Just write the promotional post itself. `;
  prompt += `10. Format with HTML ONLY: use <strong>text</strong> for bold, <em>text</em> for italic, <h3>text</h3> for important subheadings, <ul><li>item</li></ul> for bullet lists, <p>text</p> for paragraphs, and <br> for line breaks. DO NOT use markdown syntax like **bold** or *italic* - use HTML tags only. `;
  prompt += `11. Make it visually engaging with strategic use of bold text for key points and subheadings for structure. Always use <strong> tags for bold, never ** markdown syntax. `;
  
  // Add instruction to avoid header generation if enabled
  if (avoid_header_generation) {
    prompt += `12. CRITICAL: DO NOT create a header or title at the start that repeats information. DO NOT start with a bold header like "**EXCLUSIVE LOOK:**" or "**BREAKING:**" followed by the same information in the paragraph. Start directly with the content itself - jump straight into the hook without a separate header line. If you need emphasis, use bold within the paragraph text, not as a separate header above it. `;
  }
  
  // Add specific instructions for longer platforms
  if (max_length && max_length > 1000) {
    prompt += `IMPORTANT FOR LONGER POSTS: Even though you have ${max_length} characters available, this is STILL a PROMOTION, not a copy. Use the extra space to: `;
    prompt += `- Build more curiosity with multiple interesting points from the blog `;
    prompt += `- Include multiple call-to-actions throughout the post `;
    prompt += `- Share specific examples or insights that make people want to read more `;
    prompt += `- Create anticipation for what's in the full post `;
    prompt += `- DO NOT copy large sections of the original blog post. This is a TEASER that SELLS the full post. `;
  }

  // Add length constraints - make them very explicit
  if (max_length) {
    prompt += `CRITICAL: The post MUST be exactly ${max_length} characters or less (count only the visible text, not HTML tags). Do NOT exceed ${max_length} characters under any circumstances. `;
  }
  if (min_length) {
    prompt += `The post should be at least ${min_length} characters (count only visible text). `;
  }
  
  // Add hook length instruction - critical for engagement
  if (hook_length) {
    prompt += `CRITICAL FOR ENGAGEMENT: Only the first ${hook_length} characters are visible before users must click "more" to see the rest. The first ${hook_length} characters MUST be extremely compelling, attention-grabbing, and make users want to read more. Start with your strongest hook, most interesting insight, or most valuable tip. Make those first ${hook_length} characters count! `;
  }

  // Add tone and style
  if (tone) {
    prompt += `Tone: ${tone}. `;
  }
  if (style) {
    prompt += `Style: ${style}. `;
  }

  // Video script format - special handling
  if (isScriptProfile) {
    const minDuration = min_duration_seconds || 30;
    const maxDuration = max_duration_seconds || 60;
    const minSceneCount = min_scenes || 2;
    const maxSceneCount = max_scenes || 5;
    const onCamera = narrator_on_camera;
    
    prompt += `FORMAT AS A VIDEO SCRIPT: `;
    prompt += `Create a video script that promotes YOUR blog post. `;
    prompt += `\n\nSCRIPT REQUIREMENTS: `;
    prompt += `\n- Total duration: ${minDuration} to ${maxDuration} seconds `;
    prompt += `\n- Number of scenes: ${minSceneCount} to ${maxSceneCount} scenes `;
    if (onCamera) {
      prompt += `\n- The narrator WILL BE ON CAMERA - write for a talking-head style with the presenter visible `;
    } else {
      prompt += `\n- The narrator will be OFF CAMERA (voiceover) - write for b-roll/graphics with voiceover `;
    }
    prompt += `\n\nFORMATTING RULES - FOLLOW EXACTLY: `;
    prompt += `\n- Start each scene with [SCENE X: description] where X is the scene number `;
    prompt += `\n- Include timing for each scene like [0:00-0:05] `;
    prompt += `\n- Use [VISUAL: description] to describe what's shown on screen `;
    prompt += `\n- Use [NARRATION: "text"] for what the narrator says (include the quotes) `;
    prompt += `\n- The first scene (0-3 seconds) MUST have a hook that grabs attention immediately `;
    prompt += `\n- End with a clear call-to-action scene to read the full blog post `;
    prompt += `\n- Write narration in first person as the author promoting YOUR content `;
    prompt += `\n\nEXAMPLE FORMAT: `;
    prompt += `\n\n[SCENE 1: Hook] `;
    prompt += `\n[0:00-0:03] `;
    prompt += `\n[VISUAL: ${onCamera ? 'Presenter looking excited at camera' : 'Eye-catching title card or thumbnail'}] `;
    prompt += `\n[NARRATION: "I just discovered something that changed everything..."] `;
    prompt += `\n\n[SCENE 2: Main Content] `;
    prompt += `\n[0:03-0:20] `;
    prompt += `\n[VISUAL: ${onCamera ? 'Presenter explaining with hand gestures' : 'B-roll footage or graphics showing key points'}] `;
    prompt += `\n[NARRATION: "Here's what I learned..."] `;
    prompt += `\n\n[SCENE 3: Call to Action] `;
    prompt += `\n[0:20-0:30] `;
    prompt += `\n[VISUAL: ${onCamera ? 'Presenter pointing to link/bio area' : 'Blog post title with link overlay'}] `;
    prompt += `\n[NARRATION: "Read my full post to learn more - link in bio!"] `;
    prompt += `\n\nNow create your script following this exact format: `;
  } else {
    // Platform-specific instructions for non-video formats
    if (platform === 'facebook') {
      prompt += `Write as the author promoting YOUR OWN post. Use first person ("I", "my"). Start with YOUR most interesting insight or experience from the post. Be enthusiastic and personal. Mention specific details from YOUR post. Then encourage readers to read YOUR full post. `;
    } else if (platform === 'linkedin') {
      prompt += `Write as the author promoting YOUR OWN post. Use first person ("I", "my"). Start with YOUR key professional insight or learning from the post. Sound like YOU are sharing YOUR expertise. Mention specific takeaways from YOUR post. Focus on the value readers will get from reading YOUR full post. `;
    } else if (platform === 'instagram') {
      prompt += `Write as the author promoting YOUR OWN post. Use first person ("I", "my"). Start with YOUR most attention-grabbing insight or tip from the post. Be engaging and enthusiastic about YOUR content. Mention specific details. Then encourage followers to read YOUR full post. `;
    } else if (platform === 'email') {
      prompt += `Create an email newsletter preview as the author. Include a compelling subject line (on the first line, prefixed with "Subject: ") and a preview text (on the second line, prefixed with "Preview: "), followed by the email body written in first person promoting YOUR post with specific insights and encouraging clicking through to read YOUR full post. `;
    }
  }
  
  // Note: Hashtags will be added programmatically after generation, not in the prompt

  // Add custom instructions if provided
  if (custom_instructions) {
    prompt += `\nAdditional instructions: ${custom_instructions}\n`;
  }

  prompt += `\nHere's the blog post:\n\n${blogContent}`;

  return prompt;
}

// Post-process content to clean up common LLM artifacts
function postProcessContent(content, config = {}) {
  const { is_video_script, profile_type, max_length, include_hashtags, hashtag_count, avoid_header_generation, single_line_content } = config;
  const isScriptProfile = profile_type === 'script' || is_video_script;
  
  // Remove common introductory phrases and conversational intros
  const introPhrases = [
    /^here is your .*? post:?\s*/i,
    /^here's your .*? post:?\s*/i,
    /^here is the .*? post:?\s*/i,
    /^here's the .*? post:?\s*/i,
    /^your .*? post:?\s*/i,
    /^the .*? post:?\s*/i,
    /^.*? post:\s*/i,
    /^here it is:?\s*/i,
    /^here you go:?\s*/i,
    /^it looks like you've (shared|provided|written|posted) .*?:?\s*/i,
    /^it looks like you've .*?:?\s*/i,
    /^it seems like you've (shared|provided|written|posted) .*?:?\s*/i,
    /^it seems like you've .*?:?\s*/i,
    /^it seems you've (shared|provided|written|posted) .*?:?\s*/i,
    /^it seems you've .*?:?\s*/i,
    /^it appears you've (shared|provided|written|posted) .*?:?\s*/i,
    /^it appears you've .*?:?\s*/i,
    /^you've (shared|provided|written|posted) .*?:?\s*/i,
    /^you describe .*?:?\s*/i,
    /^you've described .*?:?\s*/i,
    /^i'll summarize .*?:?\s*/i,
    /^i'll create .*?:?\s*/i,
    /^here's a .*?:?\s*/i,
    /^here is a .*?:?\s*/i,
    /^based on .*?, i'll .*?:?\s*/i,
    /^i'll help you .*?:?\s*/i,
    /^let me .*?:?\s*/i,
    /^i'll .*?:?\s*/i,
    /^your blog post .*?:?\s*/i,
    /^the blog post .*?:?\s*/i,
    /^this blog post .*?:?\s*/i,
    /^the article .*?:?\s*/i,
    /^your article .*?:?\s*/i,
    /^this article .*?:?\s*/i,
    /^you've written .*?:?\s*/i,
    /^you've posted .*?:?\s*/i,
    /^you've created .*?:?\s*/i,
    /^you're sharing .*?:?\s*/i,
    /^you're describing .*?:?\s*/i,
    /^if i understand correctly.*?:?\s*/i,
    /^if i understand.*?:?\s*/i,
    /^the author appears.*?:?\s*/i,
    /^here are some (possible|ways|options).*?:?\s*/i,
  ];
  
  for (const phrase of introPhrases) {
    content = content.replace(phrase, '');
  }
  
  // Remove patterns like "You describe your home lab setup" or "It seems like you've shared a lengthy article" at the start
  content = content.replace(/^you (describe|share|mention|discuss|talk about|wrote|written|posted|created|provided) .*?\.\s*/i, '');
  content = content.replace(/^your (blog post|article|post) (is|describes|shares|mentions|discusses|talks about) .*?\.\s*/i, '');
  content = content.replace(/^the (blog post|article|post) (is|describes|shares|mentions|discusses|talks about) .*?\.\s*/i, '');
  content = content.replace(/^it (seems|looks|appears) (like|that) (you've|you have) (shared|written|posted|created|described|provided) .*?\.\s*/i, '');
  content = content.replace(/^it (seems|looks|appears) (like|that) .*? (article|post|blog) .*?\.\s*/i, '');
  
  // Remove sentences that start with "It seems/looks/appears" followed by description
  content = content.replace(/^it (seems|looks|appears) .*? (about|regarding|concerning) .*?\.\s*/i, '');
  
  // Remove "If I understand correctly" and similar phrases
  content = content.replace(/^if (i|you) (understand|see) (correctly|right).*?\.\s*/i, '');
  content = content.replace(/^the (author|post|article) (appears|seems|looks) (to be|is).*?\.\s*/i, '');
  content = content.replace(/^here are (some|a few) (possible|ways|options|ideas).*?\.\s*/i, '');
  
  // Remove entire paragraphs that are clearly meta-commentary about the post
  // Skip this filtering for video scripts - they have a different format
  if (!isScriptProfile) {
    // Split by double newlines, filter out paragraphs that are descriptions
    const paragraphs = content.split(/\n\n+/);
    const filteredParagraphs = paragraphs.filter(para => {
      const trimmed = para.trim();
      // Skip paragraphs that are clearly describing the post rather than promoting it
      if (/^(it|if|the|here|you|your|this|that) (looks|seems|appears|is|are|was|were|has|have|contains|mentions|describes|talks about|discusses)/i.test(trimmed)) {
        // But keep if it's clearly first-person promotional content
        if (/^(i|my|me|we|our)/i.test(trimmed)) {
          return true; // Keep first-person content
        }
        return false; // Remove third-person descriptions
      }
      return true; // Keep everything else
    });
    content = filteredParagraphs.join('\n\n');
  }
  
  content = content.trim();
  
  // Convert markdown bold (**text**) to HTML <strong> tags
  // Handle both **text** and **text** patterns
  content = content.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  // Also handle single * for emphasis (convert to <em>)
  content = content.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');
  
  // Remove headers that repeat information if avoid_header_generation is enabled
  if (avoid_header_generation && !isScriptProfile) {
    // More aggressive header removal - remove any standalone bold text at the start
    // First, normalize the content to work with both HTML and plain text
    const originalContent = content;
    
    // Remove any <strong> tags that are on their own line at the start
    content = content.replace(/^(<strong>[^<]+<\/strong>)\s*\n+/gm, '');
    
    // Remove h3 headers at the start
    content = content.replace(/^<h3>.*?<\/h3>\s*/gim, '');
    
    // Remove any bold text patterns that look like headers (all caps, short, followed by paragraph)
    const lines = content.split(/\n+/);
    const filteredLines = [];
    let removedFirstBold = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Check if this is a bold header line
      const boldMatch = line.match(/^<strong>([^<]+)<\/strong>$/i);
      if (boldMatch) {
        const headerText = boldMatch[1].trim();
        // If it's at the start and looks like a header (short, all caps, or has words like "LOOK", "BREAKING", etc.)
        if (i === 0 || (i === 1 && lines[0].trim() === '')) {
          // Check if it looks like a header (all caps, short, or contains header-like words)
          const isHeaderLike = headerText.length < 80 && (
            headerText === headerText.toUpperCase() ||
            /^(EXCLUSIVE|BREAKING|NEW|UPDATE|ALERT|LOOK|CHECK|SEE|READ|WATCH|LISTEN)/i.test(headerText) ||
            headerText.endsWith(':') ||
            headerText.endsWith('!')
          );
          
          if (isHeaderLike) {
            removedFirstBold = true;
            continue; // Skip this header line
          }
        }
        
        // Also check if next line repeats the header content
        if (i < lines.length - 1) {
          const nextLine = lines[i + 1].trim().replace(/<[^>]*>/g, '').toLowerCase();
          const headerLower = headerText.toLowerCase();
          
          // If next line contains significant portion of header text, it's likely repetition
          if (headerLower.length > 10 && nextLine.includes(headerLower.substring(0, Math.min(40, headerLower.length)))) {
            continue; // Skip the header line
          }
        }
      }
      
      // If we removed the first bold header, also skip empty lines after it
      if (removedFirstBold && i === filteredLines.length && line === '') {
        continue;
      }
      
      filteredLines.push(lines[i]);
    }
    
    content = filteredLines.join('\n').trim();
    
    // If we removed headers but content is now empty or too short, restore original
    if (content.length < 50 && originalContent.length > 100) {
      // Fallback: just remove the first line if it's bold
      content = originalContent.replace(/^<strong>[^<]+<\/strong>\s*\n+/i, '');
    }
  }
  
  // If video script format, preserve the script structure
  if (isScriptProfile) {
    // Ensure script tags are preserved and formatted correctly
    content = content.replace(/\[SCENE\s*:/gi, '[SCENE:');
    content = content.replace(/\[NARRATION\s*:/gi, '[NARRATION:');
    content = content.replace(/\[SPEAK\s*:/gi, '[SPEAK:');
    content = content.replace(/\[SPEAKING\s*:/gi, '[SPEAK:');
    content = content.replace(/\[VOICE\s*:/gi, '[SPEAK:');
    
    // Ensure timing cues are preserved
    content = content.replace(/\[(\d+)-(\d+)s\]/gi, '[$1-$2s]');
    
    // Don't wrap script content in HTML paragraphs - keep it as plain text with line breaks
    if (!content.includes('[SCENE') && !content.includes('[SPEAK') && !content.includes('[NARRATION')) {
      content = `[VIDEO SCRIPT FORMAT]\n\n${content}\n\n[Note: Format as script with [SCENE:] and [SPEAK:] tags]`;
    }
  }
  
  // Check if content seems too similar to original (likely copied)
  // This is a simple heuristic - if more than 70% of words match, it's probably too similar
  // Note: This requires the original blogContent, so we'll handle it in generateContent
  
  // If single_line_content is enabled, remove all newlines and convert to single line
  if (single_line_content && !isScriptProfile) {
    // Remove all newlines and extra whitespace, convert to single line
    content = content.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
    // Remove any <br> tags as well
    content = content.replace(/<br\s*\/?>/gi, ' ');
    // Clean up any double spaces
    content = content.replace(/\s+/g, ' ').trim();
  }
  
  // If content doesn't start with HTML tag, wrap in paragraph
  // BUT skip HTML wrapping for video scripts - they should remain as plain text
  if (content && !content.match(/^<[a-z]/i) && !isScriptProfile) {
    // Convert line breaks to <br> or wrap in <p> tags
    content = content.split('\n\n').map(para => {
      para = para.trim();
      if (!para) return '';
      // If it looks like a heading (short, no punctuation)
      if (para.length < 100 && !para.match(/[.!?]$/)) {
        return `<h3>${para.replace(/\n/g, '<br>')}</h3>`;
      }
      return `<p>${para.replace(/\n/g, '<br>')}</p>`;
    }).filter(p => p).join('');
  } else if (isScriptProfile) {
    // For video scripts, convert line breaks to <br> but keep structure
    content = content.replace(/\n/g, '<br>');
  }
  
  return content;
}

// Truncate content to fit max_length while preserving HTML structure
function truncateContent(content, maxLength) {
  const textOnly = content.replace(/<[^>]*>/g, '');
  if (textOnly.length <= maxLength) {
    return content;
  }

  // Truncate intelligently while preserving HTML structure
  let truncated = '';
  let textCount = 0;
  let inTag = false;
  let tagBuffer = '';
  
  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    
    if (char === '<') {
      inTag = true;
      tagBuffer = char;
    } else if (char === '>') {
      inTag = false;
      tagBuffer += char;
      truncated += tagBuffer;
      tagBuffer = '';
    } else if (inTag) {
      tagBuffer += char;
    } else {
      if (textCount < maxLength) {
        truncated += char;
        textCount++;
      } else {
        break;
      }
    }
  }
  
  // Try to close at a word boundary
  const lastSpace = truncated.lastIndexOf(' ');
  const lastTag = truncated.lastIndexOf('>');
  if (lastSpace > lastTag && lastSpace > truncated.length * 0.8) {
    truncated = truncated.substring(0, lastSpace) + '...';
  } else {
    truncated += '...';
  }
  
  return truncated;
}

// Add hashtags to content if enabled
async function addHashtags(content, blogContent, config) {
  const { include_hashtags, hashtag_count, max_length } = config;
  
  if (!include_hashtags || !hashtag_count || hashtag_count <= 0) {
    return content;
  }

  try {
    const hashtags = await generateHashtags(blogContent, hashtag_count);
    if (!hashtags || hashtags.length === 0) {
      return content;
    }

    // Format hashtags: #tag1 #tag2 #tag3
    const hashtagString = hashtags.map(tag => `#${tag}`).join(' ');
    
    // Check if adding hashtags would exceed max_length
    const currentTextLength = content.replace(/<[^>]*>/g, '').length;
    const hashtagLength = hashtagString.length + 1; // +1 for space before hashtags
    
    if (max_length && (currentTextLength + hashtagLength) > max_length) {
      // Need to truncate content further to fit hashtags
      const availableSpace = max_length - hashtagLength;
      if (availableSpace > 0) {
        content = truncateContent(content, availableSpace);
      } else {
        // Not enough space for hashtags
        return content;
      }
    }
    
    // Append hashtags to content
    if (!content.endsWith('<br>') && !content.endsWith('</p>') && !content.endsWith('</h3>')) {
      content += '<br>';
    }
    content += `<br>${hashtagString}`;
  } catch (error) {
    console.error('Error generating hashtags for platform content:', error);
    // Continue without hashtags if generation fails
  }

  return content;
}

/**
 * Generate content for a platform
 */
export async function generateContent(blogContent, platform, config = {}) {
  if (!blogContent || !blogContent.trim()) {
    throw new Error('Blog content is required');
  }

  // Check if Ollama is enabled
  const enabled = await isOllamaEnabled();
  if (!enabled) {
    throw new Error('Ollama is currently disabled. Please enable it in LLM Settings.');
  }

  // Validate platform name format
  if (!platform || !/^[a-zA-Z0-9_-]{1,50}$/.test(platform)) {
    throw new Error(`Invalid platform name: ${platform}`);
  }

  // Calculate space needed for hashtags if they will be included
  const { include_hashtags, hashtag_count, is_video_script, profile_type, max_length } = config;
  const isScriptProfile = profile_type === 'script' || is_video_script;
  let hashtagReserve = 0;
  if (include_hashtags && hashtag_count > 0) {
    // Estimate: each hashtag is ~15-20 chars on average (including space and #)
    hashtagReserve = hashtag_count * 20;
  }

  const prompt = buildPrompt(blogContent, platform, config);

  try {
    const { url: ollamaUrl, model: ollamaModel } = await getOllamaSettings();
    
    const response = await fetch(`${ollamaUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: ollamaModel,
        prompt: prompt,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.response) {
      throw new Error('No response from Ollama');
    }

    let content = data.response.trim();
    
    // Post-process content
    content = postProcessContent(content, config);
    
    // Check similarity to original (for longer posts)
    const originalWords = blogContent.replace(/<[^>]*>/g, ' ').toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const generatedWords = content.replace(/<[^>]*>/g, ' ').toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const originalWordSet = new Set(originalWords);
    const matchingWords = generatedWords.filter(w => originalWordSet.has(w));
    const similarityRatio = generatedWords.length > 0 ? matchingWords.length / generatedWords.length : 0;
    
    if (similarityRatio > 0.7 && max_length && max_length > 500) {
      console.warn(`Content for ${platform} may be too similar to original (${Math.round(similarityRatio * 100)}% word overlap). Consider regenerating.`);
      const textOnly = content.replace(/<[^>]*>/g, '');
      if (!textOnly.toLowerCase().includes('read') && !textOnly.toLowerCase().includes('check out') && !textOnly.toLowerCase().includes('full post')) {
        content += '<br><br><strong>Want to read the complete article? Check out my full blog post for all the details!</strong>';
      }
    }
    
    // Ensure call-to-action is present, especially for longer content
    if (max_length && max_length > 1000) {
      const textOnly = content.replace(/<[^>]*>/g, '').toLowerCase();
      const hasCTA = textOnly.includes('read') || textOnly.includes('check out') || textOnly.includes('full post') || 
                     textOnly.includes('blog post') || textOnly.includes('article') || textOnly.includes('learn more');
      if (!hasCTA) {
        content += '<br><br><p><strong>Read my full blog post to discover more insights and complete details!</strong></p>';
      }
    }
    
    // Enforce max_length if specified (count only text, not HTML)
    const effectiveMaxLength = max_length ? (max_length - hashtagReserve) : null;
    
    if (effectiveMaxLength && effectiveMaxLength > 0) {
      const textOnly = content.replace(/<[^>]*>/g, '');
      if (textOnly.length > effectiveMaxLength) {
        content = truncateContent(content, effectiveMaxLength);
        console.warn(`Content for ${platform} exceeded max_length (${textOnly.length} > ${effectiveMaxLength}), truncated`);
      }
    }

    // Add hashtags if enabled
    content = await addHashtags(content, blogContent, config);

    return content;
  } catch (error) {
    if (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED')) {
      const { url: ollamaUrl } = await getOllamaSettings();
      throw new Error(`Cannot connect to Ollama at ${ollamaUrl}. Make sure Ollama is running and accessible.`);
    }
    throw error;
  }
}

/**
 * Generate hashtags from blog content
 */
export async function generateHashtags(blogContent, count = 10) {
  if (!blogContent || !blogContent.trim()) {
    return [];
  }

  // Check if Ollama is enabled
  const enabled = await isOllamaEnabled();
  if (!enabled) {
    throw new Error('Ollama is currently disabled. Please enable it in LLM Settings.');
  }

  // Strip HTML tags for cleaner analysis
  const textContent = blogContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  
  if (!textContent) {
    return [];
  }

  const prompt = `Based on the following blog post content, generate ${count} relevant hashtags/keywords that would be useful for social media promotion. 

Requirements:
- Return ONLY a comma-separated list of hashtags/keywords
- No explanations, no prefixes, just the tags separated by commas
- Each tag should be 1-3 words, lowercase, no spaces (use camelCase or remove spaces)
- Focus on main topics, technologies, tools, concepts mentioned
- Make them specific and relevant to the content

Blog post content:
${textContent.substring(0, 2000)}${textContent.length > 2000 ? '...' : ''}

Hashtags:`;

  try {
    const { url: ollamaUrl, model: ollamaModel } = await getOllamaSettings();
    
    const response = await fetch(`${ollamaUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: ollamaModel,
        prompt: prompt,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.response) {
      return [];
    }

    // Parse the response - extract hashtags
    let hashtags = data.response
      .trim()
      .split(',')
      .map(tag => tag.trim().replace(/^#+/, '').replace(/\s+/g, '').toLowerCase())
      .filter(tag => tag.length > 0 && tag.length < 50)
      .slice(0, count);

    return hashtags;
  } catch (error) {
    console.error('Error generating hashtags:', error);
    // Fallback: extract keywords from content
    return extractKeywordsFallback(textContent, count);
  }
}

function extractKeywordsFallback(text, count = 10) {
  // Simple keyword extraction as fallback
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3);
  
  const wordFreq = {};
  words.forEach(word => {
    wordFreq[word] = (wordFreq[word] || 0) + 1;
  });
  
  return Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([word]) => word);
}
