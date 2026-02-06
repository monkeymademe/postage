import { useState } from 'react';

const PostImagesSection = ({ content, featuredImage, onCopyImageUrl }) => {
  const [copyingImage, setCopyingImage] = useState(null);

  // Extract image URLs from HTML content
  const extractImages = (htmlContent) => {
    if (!htmlContent) return [];
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    const images = doc.querySelectorAll('img');
    
    const imageUrls = [];
    images.forEach((img) => {
      // Try multiple attributes for image sources
      const src = img.src || 
                  img.getAttribute('src') || 
                  img.getAttribute('data-src') || 
                  img.getAttribute('data-lazy-src') ||
                  img.getAttribute('data-original');
      
      if (src && src.trim()) {
        let absoluteUrl = src.trim();
        
        // Skip data URIs and very small images (likely icons/sprites)
        if (absoluteUrl.startsWith('data:')) {
          return;
        }
        
        // Convert protocol-relative URLs (//example.com/image.jpg)
        if (absoluteUrl.startsWith('//')) {
          absoluteUrl = `https:${absoluteUrl}`;
        }
        
        // Skip if already in the list
        if (!imageUrls.includes(absoluteUrl)) {
          imageUrls.push(absoluteUrl);
        }
      }
    });
    
    return imageUrls;
  };

  const contentImages = extractImages(content);
  
  // Add featured image to the beginning if it exists and isn't already in the list
  const images = [];
  if (featuredImage && featuredImage.trim() && !contentImages.includes(featuredImage.trim())) {
    images.push(featuredImage.trim());
  }
  images.push(...contentImages);

  // Copy image to clipboard
  const handleCopyImage = async (imageUrl) => {
    setCopyingImage(imageUrl);
    try {
      // Check if ClipboardItem is available (required for image copying)
      // If not available, fall back to copying URL
      if (!window.ClipboardItem) {
        // Browser doesn't support image copying, copy URL instead
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(imageUrl);
          if (onCopyImageUrl) {
            onCopyImageUrl('Image URL copied to clipboard! (Image copying not supported in this browser)');
          }
          setCopyingImage(null);
          return;
        } else {
          // Fallback for older browsers
          const textArea = document.createElement('textarea');
          textArea.value = imageUrl;
          textArea.style.position = 'fixed';
          textArea.style.opacity = '0';
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
          if (onCopyImageUrl) {
            onCopyImageUrl('Image URL copied to clipboard! (Image copying not supported in this browser)');
          }
          setCopyingImage(null);
          return;
        }
      }

      // Fetch the image with CORS handling
      const response = await fetch(imageUrl, {
        mode: 'cors',
        credentials: 'omit',
        headers: {
          'Accept': 'image/*',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`);
      }
      
      const blob = await response.blob();
      
      // Ensure we have a valid image blob
      if (!blob.type.startsWith('image/')) {
        throw new Error('Not a valid image file');
      }
      
      // Copy to clipboard using Clipboard API
      if (navigator.clipboard && navigator.clipboard.write) {
        const item = new ClipboardItem({ [blob.type]: blob });
        await navigator.clipboard.write([item]);
        if (onCopyImageUrl) {
          onCopyImageUrl('Image copied to clipboard!');
        }
      } else {
        throw new Error('Clipboard API not available');
      }
    } catch (error) {
      console.error('Error copying image:', error);
      // If image copying fails, fall back to copying the URL
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(imageUrl);
          if (onCopyImageUrl) {
            if (error.message.includes('CORS') || error.message.includes('Failed to fetch')) {
              onCopyImageUrl('Cannot copy image due to CORS restrictions. Image URL copied instead.');
            } else {
              onCopyImageUrl('Image URL copied to clipboard! (Image copying failed)');
            }
          }
        } else {
          // Fallback for older browsers
          const textArea = document.createElement('textarea');
          textArea.value = imageUrl;
          textArea.style.position = 'fixed';
          textArea.style.opacity = '0';
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
          if (onCopyImageUrl) {
            onCopyImageUrl('Image URL copied to clipboard! (Image copying failed)');
          }
        }
      } catch (urlError) {
        console.error('Error copying URL:', urlError);
        if (onCopyImageUrl) {
          onCopyImageUrl('Failed to copy image or URL. Please use the "Copy URL" button.', 'error');
        }
      }
    } finally {
      setCopyingImage(null);
    }
  };

  if (images.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">Post Images</h3>
        <span className="text-xs text-gray-500">{images.length} image{images.length !== 1 ? 's' : ''}</span>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {images.map((imageUrl, index) => (
          <div
            key={index}
            className="relative group border border-gray-200 rounded-lg overflow-hidden bg-gray-50 hover:border-blue-400 transition-colors"
          >
            {/* Thumbnail */}
            <div
              className="aspect-square cursor-pointer"
              onClick={() => handleCopyImage(imageUrl)}
              title="Click to copy image to clipboard"
            >
              <img
                src={imageUrl}
                alt={`Post image ${index + 1}`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Fallback if image fails to load
                  e.target.style.display = 'none';
                  e.target.parentElement.innerHTML = '<div class="w-full h-full flex items-center justify-center text-xs text-gray-400">Image unavailable</div>';
                }}
              />
              {copyingImage === imageUrl && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                  <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
              )}
            </div>
            
            {/* Copy URL Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                // Copy URL to clipboard
                if (navigator.clipboard && navigator.clipboard.writeText) {
                  navigator.clipboard.writeText(imageUrl).then(() => {
                    if (onCopyImageUrl) {
                      onCopyImageUrl('Image URL copied to clipboard!');
                    }
                  }).catch(() => {
                    // Fallback for older browsers
                    const textArea = document.createElement('textarea');
                    textArea.value = imageUrl;
                    textArea.style.position = 'fixed';
                    textArea.style.opacity = '0';
                    document.body.appendChild(textArea);
                    textArea.select();
                    try {
                      document.execCommand('copy');
                      if (onCopyImageUrl) {
                        onCopyImageUrl('Image URL copied to clipboard!');
                      }
                    } catch (err) {
                      if (onCopyImageUrl) {
                        onCopyImageUrl('Failed to copy URL', 'error');
                      }
                    }
                    document.body.removeChild(textArea);
                  });
                } else {
                  // Fallback for older browsers
                  const textArea = document.createElement('textarea');
                  textArea.value = imageUrl;
                  textArea.style.position = 'fixed';
                  textArea.style.opacity = '0';
                  document.body.appendChild(textArea);
                  textArea.select();
                  try {
                    document.execCommand('copy');
                    if (onCopyImageUrl) {
                      onCopyImageUrl('Image URL copied to clipboard!');
                    }
                  } catch (err) {
                    if (onCopyImageUrl) {
                      onCopyImageUrl('Failed to copy URL', 'error');
                    }
                  }
                  document.body.removeChild(textArea);
                }
              }}
              className="absolute bottom-0 left-0 right-0 bg-gray-900 bg-opacity-75 text-white text-xs py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 hover:bg-opacity-90"
              title="Copy image URL"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy URL
            </button>
          </div>
        ))}
      </div>
      
      <p className="text-xs text-gray-400 mt-3 italic">
        Click on an image to copy it to clipboard, or use the "Copy URL" button to copy the image URL.
      </p>
    </div>
  );
};

export default PostImagesSection;
