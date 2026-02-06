import { useState, useEffect } from 'react';
import RichTextEditor from './RichTextEditor';

// Helper functions for platform info
const getPlatformInfo = (platform) => {
  const platformLower = platform.toLowerCase();
  const platformMap = {
    facebook: {
      name: 'Facebook',
      borderColor: 'border-blue-500',
      buttonColor: 'bg-blue-600 hover:bg-blue-700',
      focusRing: 'focus:ring-blue-500',
      maxChars: 5000,
      icon: '📘',
    },
    linkedin: {
      name: 'LinkedIn',
      borderColor: 'border-blue-500',
      buttonColor: 'bg-blue-600 hover:bg-blue-700',
      focusRing: 'focus:ring-blue-500',
      maxChars: 3000,
      icon: '💼',
    },
    instagram: {
      name: 'Instagram',
      borderColor: 'border-pink-500',
      buttonColor: 'bg-pink-600 hover:bg-pink-700',
      focusRing: 'focus:ring-pink-500',
      maxChars: 2200,
      icon: '📷',
    },
    email: {
      name: 'Email',
      borderColor: 'border-gray-500',
      buttonColor: 'bg-gray-600 hover:bg-gray-700',
      focusRing: 'focus:ring-gray-500',
      maxChars: 5000,
      icon: '📧',
    },
    twitter: {
      name: 'Twitter',
      borderColor: 'border-blue-500',
      buttonColor: 'bg-blue-600 hover:bg-blue-700',
      focusRing: 'focus:ring-blue-500',
      maxChars: 280,
      icon: '🐦',
    },
    mastodon: {
      name: 'Mastodon',
      borderColor: 'border-purple-500',
      buttonColor: 'bg-purple-600 hover:bg-purple-700',
      focusRing: 'focus:ring-purple-500',
      maxChars: 500,
      icon: '🐘',
    },
    reddit: {
      name: 'Reddit',
      borderColor: 'border-orange-500',
      buttonColor: 'bg-orange-600 hover:bg-orange-700',
      focusRing: 'focus:ring-orange-500',
      maxChars: 10000,
      icon: '🔴',
    },
  };

  // Return mapped platform or create default
  return platformMap[platformLower] || {
    name: platform.charAt(0).toUpperCase() + platform.slice(1),
    borderColor: 'border-gray-500',
    buttonColor: 'bg-gray-600 hover:bg-gray-700',
    focusRing: 'focus:ring-gray-500',
    maxChars: 5000,
    icon: '📱',
  };
};

const PlatformCard = ({ platform, content: initialContent, post, trackingUrl, utmEnabled = true, onUpdate, onCopy, onGenerate, generating = false, isDisabled = false, displayName }) => {
  const [content, setContent] = useState(initialContent || '');
  const [isEditing, setIsEditing] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(isDisabled && !!initialContent); // Start collapsed if disabled with content
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [trackingUrlCopied, setTrackingUrlCopied] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setContent(initialContent || '');
  }, [initialContent]);

  // Update collapsed state if disabled status changes
  useEffect(() => {
    if (isDisabled && initialContent) {
      setIsCollapsed(true);
    }
  }, [isDisabled, initialContent]);

  const info = getPlatformInfo(platform);
  // Use displayName if provided, otherwise use info.name
  const cardName = displayName || info.name;

  const handleSave = async () => {
    if (onUpdate) {
      setSaving(true);
      try {
        await onUpdate(content);
        setIsEditing(false);
      } catch (error) {
        console.error('Error updating content:', error);
      } finally {
        setSaving(false);
      }
    } else {
      setIsEditing(false);
    }
  };

  const handleCopy = async () => {
    if (onCopy) {
      await onCopy(content);
    } else {
      try {
        await navigator.clipboard.writeText(content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        console.error('Failed to copy:', error);
      }
    }
  };

  const handleCopyTrackingUrl = async () => {
    if (!trackingUrl) return;

    try {
      await navigator.clipboard.writeText(trackingUrl);
      setTrackingUrlCopied(true);
      setTimeout(() => setTrackingUrlCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy tracking URL:', error);
    }
  };

  // Calculate character count (strip HTML tags for accurate count)
  const getTextLength = (html) => {
    if (!html) return 0;
    // Strip HTML tags and decode HTML entities
    const text = html
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
      .replace(/&[a-z]+;/gi, '') // Remove other HTML entities
      .trim();
    return text;
  };
  
  const charCount = getTextLength(content).length;
  const isOverLimit = charCount > info.maxChars;

  return (
    <div className={`bg-white rounded-lg shadow p-6 border-l-4 ${isDisabled ? 'border-gray-300 opacity-70' : info.borderColor}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <span className="text-2xl">{info.icon}</span>
          <h3 className={`text-lg font-semibold ${isDisabled ? 'text-gray-500' : 'text-gray-900'}`}>{cardName}</h3>
          {isDisabled && (
            <span className="px-2 py-0.5 text-xs rounded-full bg-gray-200 text-gray-600">
              Disabled
            </span>
          )}
          {isDisabled && content && (
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="px-2 py-0.5 text-xs text-gray-500 hover:text-gray-700"
            >
              {isCollapsed ? '▶ Show' : '▼ Hide'}
            </button>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {!isCollapsed && !isEditing && content && (
            <button
              onClick={() => setIsEditing(true)}
              className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800"
            >
              Edit
            </button>
          )}
          {!isCollapsed && content && (
            <button
              onClick={handleCopy}
              className={`px-3 py-1 text-sm rounded ${
                copied
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {copied ? '✓ Copied!' : 'Copy'}
            </button>
          )}
          {/* Only show Generate button for enabled profiles */}
          {onGenerate && !isDisabled && (
            <button
              onClick={onGenerate}
              disabled={generating}
              className={`px-3 py-1 text-sm text-white rounded disabled:opacity-50 disabled:cursor-not-allowed ${info.buttonColor}`}
            >
              {generating ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating...
                </span>
              ) : (
                content ? 'Regenerate' : 'Generate'
              )}
            </button>
          )}
        </div>
      </div>

      {/* Collapsible content section for disabled profiles */}
      {!isCollapsed && (
        <>
          {isEditing ? (
            <div>
              <div className={`border rounded-md shadow-sm overflow-hidden ${
                isOverLimit ? 'border-red-300' : 'border-gray-300'
              }`}>
                <RichTextEditor
                  content={content}
                  onChange={(htmlContent) => setContent(htmlContent)}
                  placeholder={`Enter ${cardName} content...`}
                />
              </div>
              <div className="flex items-center justify-between mt-2">
                <span
                  className={`text-sm ${
                    isOverLimit ? 'text-red-600' : 'text-gray-500'
                  }`}
                >
                  {charCount} / {info.maxChars} characters
                  {isOverLimit && ' (over limit)'}
                </span>
                <div className="space-x-2">
                  <button
                    onClick={() => {
                      setContent(initialContent || '');
                      setIsEditing(false);
                    }}
                    className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className={`px-3 py-1 text-sm text-white rounded disabled:opacity-50 ${info.buttonColor}`}
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div>
              {content ? (
                <div className="bg-gray-50 rounded p-4 text-sm text-gray-700 prose prose-sm max-w-none">
                  <div 
                    dangerouslySetInnerHTML={{ __html: content }}
                    className="prose-img:max-w-full prose-img:rounded prose-a:text-blue-600 prose-a:underline"
                  />
                </div>
              ) : (
                <div className="bg-gray-50 rounded p-4 text-sm text-gray-400 italic text-center">
                  {isDisabled 
                    ? 'This profile is disabled. Enable it in Settings to generate content.'
                    : 'No content generated yet. Click "Generate" above to create content for this platform.'
                  }
                </div>
              )}
              {content && (
                <div className="mt-2 text-xs text-gray-500">
                  {charCount} characters
                </div>
              )}
              
              {/* URL Section - Show tracking URL with UTM or original post URL */}
              {content && trackingUrl && (
                <div className={`mt-4 p-3 rounded-md ${utmEnabled ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50 border border-gray-200'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-medium mb-1 ${utmEnabled ? 'text-blue-900' : 'text-gray-700'}`}>
                        {utmEnabled ? 'Analytics URL (UTM tagged):' : 'Original Post URL:'}
                      </p>
                      <a
                        href={trackingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`text-sm hover:underline break-all block font-mono ${utmEnabled ? 'text-blue-600 hover:text-blue-800' : 'text-gray-600 hover:text-gray-800'}`}
                        title={trackingUrl}
                      >
                        {trackingUrl}
                      </a>
                      {utmEnabled && (
                        <p className="text-xs text-blue-700 mt-1">
                          This URL has UTM parameters for tracking in Google Analytics, Ghostboard, etc.
                        </p>
                      )}
                    </div>
                    <button
                      onClick={handleCopyTrackingUrl}
                      className={`px-3 py-1 text-xs rounded whitespace-nowrap flex-shrink-0 ${
                        trackingUrlCopied
                          ? 'bg-green-100 text-green-800'
                          : utmEnabled 
                            ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                      title={utmEnabled ? 'Copy analytics URL' : 'Copy URL'}
                    >
                      {trackingUrlCopied ? '✓ Copied!' : 'Copy URL'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PlatformCard;
