import { parse } from 'node-html-parser';

/**
 * Fetch content from a URL and extract the main article content
 */
export async function fetchContentFromUrl(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();
    const root = parse(html);

    // Try to find the main article content
    let content = '';

    // Ghost CMS specific selectors
    const ghostSelectors = [
      'article.gh-article',
      'article.post-content',
      '.post-content',
      '.gh-content',
      '[data-ghost-content]',
    ];

    // Generic blog post selectors
    const genericSelectors = [
      'article',
      '.post-content',
      '.entry-content',
      '.article-content',
      '.content',
    ];

    // Try Ghost selectors first
    for (const selector of ghostSelectors) {
      const element = root.querySelector(selector);
      if (element) {
        content = element.innerHTML;
        break;
      }
    }

    // Fall back to generic selectors
    if (!content) {
      for (const selector of genericSelectors) {
        const element = root.querySelector(selector);
        if (element) {
          content = element.innerHTML;
          break;
        }
      }
    }

    // If still no content, try to get body
    if (!content) {
      const body = root.querySelector('body');
      if (body) {
        content = body.innerHTML;
      }
    }

    // Clean up the content - preserve Ghost formatting
    if (content) {
      const contentRoot = parse(content);
      // Remove unwanted elements but preserve formatting
      contentRoot.querySelectorAll('script, style, nav, header, footer, aside, .sidebar, .comments, .gh-comments').forEach(el => el.remove());
      
      // Preserve Ghost-specific classes that are useful (like image classes)
      // Remove only navigation and UI elements
      contentRoot.querySelectorAll('.gh-navigation, .gh-header, .gh-footer, .gh-sidebar').forEach(el => el.remove());
      
      content = contentRoot.innerHTML;
    }

    // Extract title
    const ogTitle = root.querySelector('meta[property="og:title"]');
    const titleTag = root.querySelector('title');
    const h1Tag = root.querySelector('h1');
    
    let title = ogTitle?.getAttribute('content') ||
                 titleTag?.text ||
                 h1Tag?.text ||
                 'Untitled Post';

    // Clean title
    title = title.trim().replace(/\s+/g, ' ');

    // Extract featured image
    const ogImage = root.querySelector('meta[property="og:image"]');
    const twitterImage = root.querySelector('meta[name="twitter:image"]');
    const linkImage = root.querySelector('link[rel="image_src"]');
    
    let featuredImage = ogImage?.getAttribute('content') ||
                        twitterImage?.getAttribute('content') ||
                        linkImage?.getAttribute('href') ||
                        null;

    // Convert relative URLs to absolute
    if (featuredImage) {
      try {
        // If it's already absolute, URL constructor will handle it
        // If it's relative, we need the base URL
        if (featuredImage.startsWith('//')) {
          featuredImage = `https:${featuredImage}`;
        } else if (featuredImage.startsWith('/')) {
          const baseUrl = new URL(url);
          featuredImage = `${baseUrl.protocol}//${baseUrl.host}${featuredImage}`;
        } else if (!featuredImage.startsWith('http://') && !featuredImage.startsWith('https://')) {
          // Relative URL without leading slash
          const baseUrl = new URL(url);
          featuredImage = `${baseUrl.protocol}//${baseUrl.host}${baseUrl.pathname.replace(/\/[^/]*$/, '/')}${featuredImage}`;
        }
      } catch (e) {
        // If URL parsing fails, keep the original value
        console.warn('Failed to resolve featured image URL:', e);
      }
    }

    return {
      title,
      content: content || '',
      url,
      featuredImage,
    };
  } catch (error) {
    throw new Error(`Error fetching content: ${error.message}`);
  }
}

/**
 * Fetch posts from Ghost CMS API
 */
export async function fetchGhostPosts(ghostUrl, apiKey, limit = 10) {
  try {
    // Ghost API endpoint
    const apiUrl = `${ghostUrl}/ghost/api/content/posts/?key=${apiKey}&limit=${limit}&fields=id,title,html,url,excerpt,feature_image`;
    
    const response = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Ghost API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.posts || !Array.isArray(data.posts)) {
      throw new Error('Invalid Ghost API response');
    }

    return data.posts.map(post => ({
      id: post.id,
      title: post.title,
      // Preserve Ghost HTML exactly as-is - don't modify it
      content: post.html || '',
      url: post.url,
      excerpt: post.excerpt,
      featuredImage: post.feature_image,
    }));
  } catch (error) {
    throw new Error(`Error fetching Ghost posts: ${error.message}`);
  }
}

/**
 * Fetch a single post from Ghost CMS API
 */
export async function fetchGhostPost(ghostUrl, apiKey, postId) {
  try {
    const apiUrl = `${ghostUrl}/ghost/api/content/posts/${postId}/?key=${apiKey}`;
    
    const response = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Ghost API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.posts || data.posts.length === 0) {
      throw new Error('Post not found');
    }

    const post = data.posts[0];

    return {
      id: post.id,
      title: post.title,
      content: post.html || '',
      url: post.url,
      excerpt: post.excerpt,
      featuredImage: post.feature_image,
    };
  } catch (error) {
    throw new Error(`Error fetching Ghost post: ${error.message}`);
  }
}
