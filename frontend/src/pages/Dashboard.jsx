import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import BlogEditor from '../components/BlogEditor';
import GenerateButton from '../components/GenerateButton';
import PlatformCard from '../components/PlatformCard';
import HashtagsSection from '../components/HashtagsSection';
import PostImagesSection from '../components/PostImagesSection';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const [posts, setPosts] = useState([]);
  const [selectedPost, setSelectedPost] = useState(null);
  const [generatedContent, setGeneratedContent] = useState({});
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatingPlatform, setGeneratingPlatform] = useState(null); // Track which platform is generating
  const [generatingHashtags, setGeneratingHashtags] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState(null);
  const [configuredPlatforms, setConfiguredPlatforms] = useState([]);
  const [platformConfigs, setPlatformConfigs] = useState({}); // Store full configs for enabled status

  useEffect(() => {
    loadPosts();
    loadConfiguredPlatforms();
  }, []);

  useEffect(() => {
    if (selectedPost?.id) {
      loadGeneratedContent(selectedPost.id);
    }
  }, [selectedPost, configuredPlatforms]);

  const loadConfiguredPlatforms = async () => {
    try {
      const response = await api.get('/platform-config');
      const configs = response.data.configs || [];
      const platforms = configs.map(config => config.platform);
      setConfiguredPlatforms(platforms);
      // Store full configs keyed by platform name
      const configMap = {};
      configs.forEach(config => {
        configMap[config.platform] = config;
      });
      setPlatformConfigs(configMap);
    } catch (error) {
      console.error('Error loading configured platforms:', error);
    }
  };

  const loadPosts = async () => {
    setLoading(true);
    try {
      const response = await api.get('/posts');
      console.log('Posts response:', response.data);
      setPosts(response.data.posts || []);
    } catch (error) {
      console.error('Error loading posts:', error);
      console.error('Error response:', error.response?.data);
      showNotification(
        error.response?.data?.error || error.response?.data?.details || 'Error loading posts',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  const [trackingUrls, setTrackingUrls] = useState({});

  const loadGeneratedContent = async (postId) => {
    try {
      const response = await api.get(`/posts/${postId}/generate`);
      const contentMap = {};
      const urlMap = {};
      // Only include platforms that are currently configured
      (response.data.generatedContent || []).forEach((item) => {
        if (configuredPlatforms.includes(item.platform)) {
          contentMap[item.platform] = item.content;
          // Check both item.trackingUrl and response.data.trackingUrls
          if (item.trackingUrl) {
            urlMap[item.platform] = item.trackingUrl;
          } else if (response.data.trackingUrls && response.data.trackingUrls[item.platform]) {
            urlMap[item.platform] = response.data.trackingUrls[item.platform];
          }
        }
      });
      setGeneratedContent(contentMap);
      setTrackingUrls(urlMap);
    } catch (error) {
      console.error('Error loading generated content:', error);
    }
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleCreateNew = () => {
    setSelectedPost({ title: '', content: '' });
    setGeneratedContent({});
  };

  const handleSelectPost = async (postId) => {
    try {
      const response = await api.get(`/posts/${postId}`);
      setSelectedPost(response.data.post);
    } catch (error) {
      console.error('Error loading post:', error);
      showNotification('Error loading post', 'error');
    }
  };

  const handleSavePost = async ({ title, content, source_url, featured_image }) => {
    setSaving(true);
    try {
      // Use source_url from parameter or fallback to selectedPost's source_url
      const urlToSave = source_url !== undefined ? source_url : selectedPost?.source_url;
      const featuredImg = featured_image !== undefined ? featured_image : selectedPost?.featured_image;
      
      if (selectedPost?.id) {
        // Update existing post
        const response = await api.put(`/posts/${selectedPost.id}`, {
          title,
          content,
          source_url: urlToSave,
          featured_image: featuredImg,
        });
        setSelectedPost(response.data.post);
        showNotification('Post updated successfully');
        loadPosts();
      } else {
        // Create new post
        const response = await api.post('/posts', { title, content, source_url: urlToSave, featured_image: featuredImg });
        setSelectedPost(response.data.post);
        showNotification('Post created successfully');
        loadPosts();
      }
    } catch (error) {
      console.error('Error saving post:', error);
      showNotification(
        error.response?.data?.error || 'Error saving post',
        'error'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleGenerate = async () => {
    if (!selectedPost?.id) {
      showNotification('Please save your post first', 'error');
      return;
    }

    setGenerating(true);
    try {
      const response = await api.post(`/posts/${selectedPost.id}/generate`);
      const contentMap = {};
      Object.entries(response.data.generatedContent || {}).forEach(
        ([platform, data]) => {
          // Only include platforms that are currently configured
          if (configuredPlatforms.includes(platform) && data.content) {
            contentMap[platform] = data.content;
          }
        }
      );
      setGeneratedContent(contentMap);
      
      // Update hashtags if generated
      if (response.data.hashtags && Array.isArray(response.data.hashtags)) {
        setSelectedPost((prev) => ({ ...prev, hashtags: response.data.hashtags }));
      }
      
      // Update tracking URLs if provided
      if (response.data.trackingUrls) {
        setTrackingUrls((prev) => ({
          ...prev,
          ...response.data.trackingUrls,
        }));
      }
      
      // Also update tracking URLs from savedContent if available
      if (response.data.generatedContent) {
        const urlMap = {};
        Object.entries(response.data.generatedContent).forEach(([platform, data]) => {
          if (data.trackingUrl) {
            urlMap[platform] = data.trackingUrl;
          }
        });
        if (Object.keys(urlMap).length > 0) {
          setTrackingUrls((prev) => ({
            ...prev,
            ...urlMap,
          }));
        }
      }
      
      // Reload configured platforms in case they changed
      await loadConfiguredPlatforms();
      showNotification('Content generated successfully!');
    } catch (error) {
      console.error('Error generating content:', error);
      showNotification(
        error.response?.data?.details ||
          error.response?.data?.error ||
          'Error generating content. Make sure your LLM provider is enabled and accessible.',
        'error'
      );
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateSingle = async (platform) => {
    if (!selectedPost?.id) {
      showNotification('Please save your post first', 'error');
      return;
    }

    setGeneratingPlatform(platform);
    try {
      const response = await api.post(`/posts/${selectedPost.id}/generate/${platform}`);
      const savedContent = response.data.generatedContent;
      
      if (savedContent && savedContent.content) {
        setGeneratedContent((prev) => ({
          ...prev,
          [platform]: savedContent.content,
        }));
        
        // Update hashtags if generated
        if (response.data.hashtags && Array.isArray(response.data.hashtags)) {
          setSelectedPost((prev) => ({ ...prev, hashtags: response.data.hashtags }));
        }
        
        // Update tracking URL if provided
        if (response.data.trackingUrl) {
          setTrackingUrls((prev) => ({
            ...prev,
            [platform]: response.data.trackingUrl,
          }));
        }
        
        showNotification(`${platform} content generated successfully!`);
      }
    } catch (error) {
      console.error('Error generating content:', error);
      showNotification(
        error.response?.data?.details ||
          error.response?.data?.error ||
          `Error generating content for ${platform}. Make sure your LLM provider is enabled and accessible.`,
        'error'
      );
    } finally {
      setGeneratingPlatform(null);
    }
  };

  const handleUpdateHashtags = async (hashtags) => {
    if (!selectedPost?.id) return;
    
    try {
      const response = await api.put(`/posts/${selectedPost.id}/hashtags`, { hashtags });
      setSelectedPost((prev) => ({ ...prev, hashtags: response.data.post.hashtags || [] }));
      showNotification('Hashtags updated successfully');
    } catch (error) {
      console.error('Error updating hashtags:', error);
      showNotification('Error updating hashtags', 'error');
    }
  };

  const handleGenerateHashtags = async () => {
    if (!selectedPost?.id) {
      showNotification('Please save your post first', 'error');
      return;
    }

    setGeneratingHashtags(true);
    try {
      const response = await api.post(`/posts/${selectedPost.id}/generate-hashtags`, { count: 10 });
      setSelectedPost((prev) => ({ ...prev, hashtags: response.data.hashtags || [] }));
      showNotification('Hashtags generated successfully!');
    } catch (error) {
      console.error('Error generating hashtags:', error);
      showNotification(
        error.response?.data?.details ||
          error.response?.data?.error ||
          'Error generating hashtags. Make sure your LLM provider is enabled and accessible.',
        'error'
      );
    } finally {
      setGeneratingHashtags(false);
    }
  };

  const copyToClipboard = (text, successMessage) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => {
          showNotification(successMessage);
        })
        .catch((error) => {
          console.error('Failed to copy:', error);
          // Fallback
          const textArea = document.createElement('textarea');
          textArea.value = text;
          textArea.style.position = 'fixed';
          textArea.style.opacity = '0';
          document.body.appendChild(textArea);
          textArea.select();
          try {
            document.execCommand('copy');
            showNotification(successMessage);
          } catch (err) {
            console.error('Fallback copy failed:', err);
            showNotification('Failed to copy', 'error');
          }
          document.body.removeChild(textArea);
        });
    } else {
      // Fallback for browsers without clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        showNotification(successMessage);
      } catch (err) {
        console.error('Fallback copy failed:', err);
        showNotification('Failed to copy', 'error');
      }
      document.body.removeChild(textArea);
    }
  };

  const handleUpdateContent = async (platform, content) => {
    try {
      // Find the generated content ID
      const response = await api.get(`/posts/${selectedPost.id}/generate`);
      const item = response.data.generatedContent.find(
        (gc) => gc.platform === platform
      );

      if (item) {
        await api.put(`/posts/generate/content/${item.id}`, { content });
        setGeneratedContent((prev) => ({
          ...prev,
          [platform]: content,
        }));
        showNotification(`${platform} content updated`);
      }
    } catch (error) {
      console.error('Error updating content:', error);
      showNotification('Error updating content', 'error');
      throw error;
    }
  };

  const handleDeletePost = async (postId, e) => {
    e.stopPropagation(); // Prevent selecting the post when clicking delete
    
    if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      return;
    }

    try {
      await api.delete(`/posts/${postId}`);
      showNotification('Post deleted successfully');
      
      // If the deleted post was selected, clear selection
      if (selectedPost?.id === postId) {
        setSelectedPost(null);
        setGeneratedContent({});
      }
      
      // Reload posts list
      loadPosts();
    } catch (error) {
      console.error('Error deleting post:', error);
      showNotification(
        error.response?.data?.error || 'Error deleting post',
        'error'
      );
    }
  };

  const handleCopy = async (content) => {
    try {
      await navigator.clipboard.writeText(content);
      return true;
    } catch (error) {
      console.error('Failed to copy:', error);
      return false;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Postage Social AI</h1>
            <div className="flex items-center space-x-4">
              <a
                href="/admin"
                className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
              >
                Settings
              </a>
              {user?.role === 'admin' && (
                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                  Admin
                </span>
              )}
              <span className="text-sm text-gray-600">{user?.email}</span>
              <button
                onClick={logout}
                className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Notification */}
      {notification && (
        <div
          className={`fixed top-4 right-4 px-4 py-3 rounded shadow-lg z-50 ${
            notification.type === 'error'
              ? 'bg-red-100 text-red-800 border border-red-300'
              : 'bg-green-100 text-green-800 border border-green-300'
          }`}
        >
          {notification.message}
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Sidebar - Post List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Posts</h2>
                <button
                  onClick={handleCreateNew}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  New Post
                </button>
              </div>
              <div className="space-y-2">
                {posts.length === 0 ? (
                  <p className="text-sm text-gray-500">No posts yet</p>
                ) : (
                  posts.map((post) => (
                    <div
                      key={post.id}
                      className={`group relative w-full text-left px-3 py-2 rounded text-sm hover:bg-gray-100 ${
                        selectedPost?.id === post.id
                          ? 'bg-blue-50 border border-blue-200'
                          : ''
                      }`}
                    >
                      <button
                        onClick={() => handleSelectPost(post.id)}
                        className="w-full text-left"
                      >
                        <div className="font-medium truncate pr-8">{post.title}</div>
                        <div className="text-xs text-gray-500">
                          {new Date(post.created_at).toLocaleDateString()}
                        </div>
                      </button>
                      <button
                        onClick={(e) => handleDeletePost(post.id, e)}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-opacity"
                        title="Delete post"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Blog Editor */}
            <BlogEditor
              post={selectedPost}
              onSave={handleSavePost}
              onTitleChange={(title) =>
                setSelectedPost((prev) => ({ ...prev, title }))
              }
              onContentChange={(content) =>
                setSelectedPost((prev) => ({ ...prev, content }))
              }
              onSourceUrlChange={(source_url) =>
                setSelectedPost((prev) => ({ ...prev, source_url }))
              }
              onFeaturedImageChange={(featured_image) =>
                setSelectedPost((prev) => ({ ...prev, featured_image }))
              }
              onNotification={showNotification}
            />

            {/* Original Post Link */}
            {selectedPost?.id && selectedPost?.source_url && (
              <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500 mb-1">Original Post:</p>
                    <a
                      href={selectedPost.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-800 hover:underline break-all block"
                      title={selectedPost.source_url}
                    >
                      {selectedPost.source_url}
                    </a>
                  </div>
                  <button
                    onClick={() => {
                      const postUrl = selectedPost.source_url;
                      copyToClipboard(postUrl, 'Link copied to clipboard!');
                    }}
                    className="px-3 py-1 text-xs rounded whitespace-nowrap bg-gray-100 text-gray-700 hover:bg-gray-200 flex-shrink-0"
                    title="Copy post link"
                  >
                    Copy Link
                  </button>
                </div>
              </div>
            )}

            {/* Hashtags Section */}
            {selectedPost?.id && (
              <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
                <HashtagsSection
                  hashtags={selectedPost?.hashtags || []}
                  onUpdate={handleUpdateHashtags}
                  onGenerate={handleGenerateHashtags}
                  generating={generatingHashtags}
                  onCopyAll={() => {
                    const allHashtags = (selectedPost?.hashtags || []).map(tag => `#${tag}`).join(' ');
                    copyToClipboard(allHashtags, 'All hashtags copied!');
                  }}
                  onCopyTag={(tag) => {
                    copyToClipboard(`#${tag}`, `#${tag} copied!`);
                  }}
                />
              </div>
            )}

            {/* Post Images Section */}
            {selectedPost?.id && (selectedPost?.content || selectedPost?.featured_image) && (
              <PostImagesSection
                content={selectedPost.content}
                featuredImage={selectedPost?.featured_image}
                onCopyImageUrl={(message, type) => {
                  if (type === 'error') {
                    showNotification(message, 'error');
                  } else {
                    // Show success notification
                    showNotification(message);
                  }
                }}
              />
            )}

            {/* Generate Button */}
            {selectedPost?.id && (
              <div className="flex justify-center">
                <GenerateButton
                  onClick={handleGenerate}
                  loading={generating}
                  disabled={!selectedPost?.content?.trim()}
                />
              </div>
            )}

            {/* Generated Content */}
            {selectedPost?.id && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  Generated Content
                </h2>
                {configuredPlatforms.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    No platforms configured. Go to Settings to configure platforms.
                  </p>
                ) : (
                  /* Sort: enabled first, then disabled (only if has content) */
                  [...configuredPlatforms]
                    .filter(platform => {
                      const config = platformConfigs[platform];
                      const isEnabled = config?.enabled !== false;
                      const hasContent = generatedContent[platform]?.content || generatedContent[platform];
                      // Show enabled profiles always, disabled only if they have content
                      return isEnabled || hasContent;
                    })
                    .sort((a, b) => {
                      const aEnabled = platformConfigs[a]?.enabled !== false;
                      const bEnabled = platformConfigs[b]?.enabled !== false;
                      if (aEnabled === bEnabled) return 0;
                      return aEnabled ? -1 : 1;
                    })
                    .map((platform) => {
                      const config = platformConfigs[platform];
                      const isEnabled = config?.enabled !== false;
                      return (
                        <PlatformCard
                          key={platform}
                          platform={platform}
                          content={generatedContent[platform]?.content || generatedContent[platform]}
                          post={selectedPost}
                          trackingUrl={trackingUrls[platform]}
                          utmEnabled={config?.utm_enabled !== false}
                          onUpdate={(content) =>
                            handleUpdateContent(platform, content)
                          }
                          onCopy={handleCopy}
                          onGenerate={() => handleGenerateSingle(platform)}
                          generating={generatingPlatform === platform}
                          isDisabled={!isEnabled}
                          displayName={config?.display_name}
                        />
                      );
                    })
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
