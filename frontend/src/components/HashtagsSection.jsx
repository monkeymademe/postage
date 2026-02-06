import { useState, useEffect } from 'react';

const HashtagsSection = ({ hashtags = [], onUpdate, onCopyAll, onCopyTag, onGenerate, generating = false }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedHashtags, setEditedHashtags] = useState(hashtags);
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    if (!isEditing) {
      setEditedHashtags(hashtags);
    }
  }, [hashtags, isEditing]);

  const handleSave = () => {
    if (onUpdate) {
      onUpdate(editedHashtags.filter(tag => tag.trim().length > 0));
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedHashtags(hashtags);
    setNewTag('');
    setIsEditing(false);
  };

  const handleRemoveTag = (index) => {
    setEditedHashtags(editedHashtags.filter((_, i) => i !== index));
  };

  const handleAddTag = () => {
    const tag = newTag.trim().toLowerCase().replace(/^#+/, '').replace(/\s+/g, '');
    if (tag && !editedHashtags.includes(tag)) {
      setEditedHashtags([...editedHashtags, tag]);
      setNewTag('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  return (
    <div className="mt-4 pt-4 border-t border-gray-200">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-gray-500">Hashtags / Keywords:</p>
        {!isEditing && (
          <div className="flex items-center gap-2">
            {onGenerate && (
              <button
                onClick={onGenerate}
                disabled={generating}
                className="px-2 py-1 text-xs rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Generate hashtags"
              >
                {generating ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-1 h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating...
                  </span>
                ) : (
                  'Generate'
                )}
              </button>
            )}
            {hashtags.length > 0 && (
              <button
                onClick={onCopyAll}
                className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-700 hover:bg-gray-200"
                title="Copy all hashtags"
              >
                Copy All
              </button>
            )}
            <button
              onClick={() => setIsEditing(true)}
              className="px-2 py-1 text-xs rounded text-blue-600 hover:text-blue-800"
            >
              Edit
            </button>
          </div>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2 min-h-[2rem]">
            {editedHashtags.length > 0 ? (
              editedHashtags.map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs"
                >
                  #{tag}
                  <button
                    onClick={() => handleRemoveTag(index)}
                    className="text-blue-600 hover:text-blue-900 font-bold"
                    title="Remove tag"
                  >
                    ×
                  </button>
                </span>
              ))
            ) : (
              <p className="text-xs text-gray-400 italic">No hashtags. Add some below.</p>
            )}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Add hashtag..."
              className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              onClick={handleAddTag}
              disabled={!newTag.trim()}
              className="px-3 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="px-3 py-1 text-xs rounded bg-green-600 text-white hover:bg-green-700"
            >
              Save
            </button>
            <button
              onClick={handleCancel}
              className="px-3 py-1 text-xs rounded bg-gray-100 text-gray-700 hover:bg-gray-200"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2 min-h-[1.5rem]">
          {hashtags.length > 0 ? (
            hashtags.map((tag, index) => (
              <button
                key={index}
                onClick={() => onCopyTag(tag)}
                className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs hover:bg-blue-200 cursor-pointer transition-colors"
                title={`Click to copy #${tag}`}
              >
                #{tag}
              </button>
            ))
          ) : (
            <p className="text-xs text-gray-400 italic">No hashtags yet. Generate content to create hashtags.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default HashtagsSection;
