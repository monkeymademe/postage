import { useState, useEffect } from 'react';
import RichTextEditor from './RichTextEditor';
import api from '../utils/api';

const BlogEditor = ({ post, onSave, onTitleChange, onContentChange, onNotification, onSourceUrlChange, onFeaturedImageChange }) => {
  const [title, setTitle] = useState(post?.title || '');
  const [content, setContent] = useState(post?.content || '');
  const [sourceUrl, setSourceUrl] = useState(post?.source_url || '');
  const [featuredImage, setFeaturedImage] = useState(post?.featured_image || '');
  const [fetchUrl, setFetchUrl] = useState('');
  const [fetching, setFetching] = useState(false);
  const [showGhostConnect, setShowGhostConnect] = useState(false);
  const [ghostSites, setGhostSites] = useState([]);
  const [selectedGhostSite, setSelectedGhostSite] = useState(null);
  const [ghostPosts, setGhostPosts] = useState([]);
  const [loadingGhostPosts, setLoadingGhostPosts] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const showNotification = (message, type = 'success') => {
    if (onNotification) {
      onNotification(message, type);
    } else {
      // Fallback to alert if no notification handler provided
      alert(message);
    }
  };

  useEffect(() => {
    if (post) {
      setTitle(post.title || '');
      setContent(post.content || '');
      setSourceUrl(post.source_url || '');
      setFeaturedImage(post.featured_image || '');
      // Auto-collapse when a post is saved (has an id)
      if (post.id) {
        setIsCollapsed(true);
      } else {
        setIsCollapsed(false);
      }
    } else {
      setIsCollapsed(false);
    }
  }, [post]);

  useEffect(() => {
    // Load Ghost sites when component mounts
    loadGhostSites();
  }, []);

  const loadGhostSites = async () => {
    try {
      const response = await api.get('/ghost-sites');
      setGhostSites(response.data.sites || []);
    } catch (error) {
      console.error('Error loading Ghost sites:', error);
    }
  };

  const handleTitleChange = (e) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    if (onTitleChange) onTitleChange(newTitle);
  };

  const handleContentChange = (htmlContent) => {
    setContent(htmlContent);
    if (onContentChange) onContentChange(htmlContent);
  };

  const handleSave = () => {
    if (onSave) {
      onSave({ title, content, source_url: sourceUrl, featured_image: featuredImage });
    }
  };

  const handleFetchUrl = async () => {
    if (!fetchUrl.trim()) return;

    setFetching(true);
    try {
      const response = await api.post('/content/fetch-url', { url: fetchUrl });
      setTitle(response.data.title);
      setContent(response.data.content);
      const urlToSave = fetchUrl.trim();
      setSourceUrl(urlToSave);
      const featuredImg = response.data.featuredImage || '';
      setFeaturedImage(featuredImg);
      if (onTitleChange) onTitleChange(response.data.title);
      if (onContentChange) onContentChange(response.data.content);
      if (onSourceUrlChange) onSourceUrlChange(urlToSave);
      if (onFeaturedImageChange) onFeaturedImageChange(featuredImg);
      setFetchUrl('');
      showNotification('Content imported successfully');
    } catch (error) {
      showNotification(
        error.response?.data?.error || 'Failed to fetch content from URL',
        'error'
      );
    } finally {
      setFetching(false);
    }
  };

  const handleSelectGhostSite = async (siteId) => {
    if (!siteId) {
      setSelectedGhostSite(null);
      setGhostPosts([]);
      return;
    }

    const site = ghostSites.find(s => s.id === siteId);
    if (!site) {
      showNotification('Ghost site not found', 'error');
      return;
    }

    setSelectedGhostSite(site);
    setLoadingGhostPosts(true);
    try {
      const response = await api.post('/content/ghost/posts-by-site', {
        siteId: siteId,
        limit: 20,
      });
      setGhostPosts(response.data.posts || []);
      if (response.data.posts.length === 0) {
        showNotification('No posts found in this Ghost site', 'error');
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
      showNotification(
        error.response?.data?.error || 'Failed to fetch Ghost posts. Please check your Ghost site configuration in Settings.',
        'error'
      );
      setSelectedGhostSite(null);
      setGhostPosts([]);
    } finally {
      setLoadingGhostPosts(false);
    }
  };

  const handleSelectGhostPost = async (postId) => {
    if (!selectedGhostSite) {
      showNotification('Please select a Ghost site first', 'error');
      return;
    }

    if (!postId) {
      showNotification('Post ID is required', 'error');
      return;
    }

    try {
      const response = await api.post('/content/ghost/post-by-site', {
        siteId: selectedGhostSite.id,
        postId: postId,
      });
      
      if (!response.data.post) {
        showNotification('Post not found', 'error');
        return;
      }

      setTitle(response.data.post.title);
      setContent(response.data.post.content);
      setSourceUrl(response.data.post.url || '');
      const featuredImg = response.data.post.featuredImage || '';
      setFeaturedImage(featuredImg);
      if (onTitleChange) onTitleChange(response.data.post.title);
      if (onContentChange) onContentChange(response.data.post.content);
      if (onSourceUrlChange) onSourceUrlChange(response.data.post.url || '');
      if (onFeaturedImageChange) onFeaturedImageChange(featuredImg);
      setShowGhostConnect(false);
      setGhostPosts([]);
      setSelectedGhostSite(null);
      showNotification('Ghost post imported successfully');
    } catch (error) {
      console.error('Error fetching Ghost post:', error);
      showNotification(
        error.response?.data?.error || 'Failed to fetch Ghost post',
        'error'
      );
    }
  };

  // If collapsed and post exists, show collapsed view
  if (isCollapsed && post?.id) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{post.title || 'Untitled Post'}</h2>
            <p className="text-sm text-gray-500 mt-1">
              Post saved • {content.replace(/<[^>]*>/g, '').length} characters
            </p>
          </div>
          <button
            onClick={() => setIsCollapsed(false)}
            className="px-4 py-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Edit Post
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {/* Import Options */}
      <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700">Import Content</h3>
          <div className="flex items-center space-x-4">
            {post?.id && (
              <button
                onClick={() => setIsCollapsed(true)}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                Collapse
              </button>
            )}
            <button
              onClick={() => setShowGhostConnect(!showGhostConnect)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              {showGhostConnect ? 'Hide' : 'Use Ghost CMS Post'}
            </button>
          </div>
        </div>

        {/* URL Fetch */}
        <div className="flex gap-2 mb-3">
          <input
            type="url"
            value={fetchUrl}
            onChange={(e) => setFetchUrl(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleFetchUrl()}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Paste blog post URL to import..."
          />
          <button
            onClick={handleFetchUrl}
            disabled={fetching || !fetchUrl.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {fetching ? 'Fetching...' : 'Fetch'}
          </button>
        </div>

        {/* Ghost CMS Connection */}
        {showGhostConnect && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            {ghostSites.length === 0 ? (
              <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-xs text-yellow-800 mb-2">
                  No Ghost sites configured. Add one in <a href="/admin" className="underline font-medium">Settings → Ghost Sites</a>.
                </p>
              </div>
            ) : (
              <>
                <div className="mb-3">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Select Ghost Site
                  </label>
                  <select
                    value={selectedGhostSite?.id || ''}
                    onChange={(e) => handleSelectGhostSite(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Choose a Ghost site...</option>
                    {ghostSites.map(site => (
                      <option key={site.id} value={site.id}>{site.name}</option>
                    ))}
                  </select>
                </div>
                {selectedGhostSite && (
                  <div className="mb-3">
                    <p className="text-xs text-gray-500 mb-2">
                      Selected: <strong>{selectedGhostSite.name}</strong> ({selectedGhostSite.url})
                    </p>
                    {loadingGhostPosts && (
                      <p className="text-xs text-blue-600">Loading posts...</p>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Ghost Posts List */}
            {ghostPosts.length > 0 && (
              <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-md">
                {ghostPosts.map((ghostPost) => (
                  <button
                    key={ghostPost.id}
                    onClick={() => handleSelectGhostPost(ghostPost.id)}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
                  >
                    <div className="font-medium text-sm text-gray-900">{ghostPost.title}</div>
                    {ghostPost.excerpt && (
                      <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                        {ghostPost.excerpt.replace(/<[^>]*>/g, '')}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mb-4">
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
          Title
        </label>
        <input
          type="text"
          id="title"
          value={title}
          onChange={handleTitleChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          placeholder="Enter blog post title..."
        />
      </div>
      <div className="mb-4">
        <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
          Content
        </label>
        <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-md">
          <RichTextEditor
            content={content}
            onChange={handleContentChange}
            placeholder="Write your blog post here..."
          />
        </div>
      </div>
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={!title.trim() || !content.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {post?.id ? 'Update Post' : 'Save Post'}
        </button>
      </div>
    </div>
  );
};

export default BlogEditor;
