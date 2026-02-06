import { useState, useEffect } from 'react';
import api from '../utils/api';

// Default profile colors
const getProfileColor = (profile) => {
  const colors = {
    facebook: 'blue',
    linkedin: 'blue',
    instagram: 'pink',
    email: 'gray',
    twitter: 'blue',
    mastodon: 'purple',
    reddit: 'orange',
    micro: 'blue',
    short: 'green',
    long: 'indigo',
    thread: 'purple',
  };
  return colors[profile.toLowerCase()] || 'gray';
};

const TONE_OPTIONS = [
  'conversational',
  'professional',
  'casual',
  'formal',
  'friendly',
  'authoritative',
  'visual',
];

const STYLE_OPTIONS = [
  'engaging',
  'thought-leadership',
  'newsletter',
  'informative',
  'promotional',
  'educational',
];

const PROFILE_TYPES = {
  social: { label: 'Social/Text', description: 'Character-based content for social media, blogs, newsletters' },
  script: { label: 'Video Script', description: 'Time-based scripts with scenes for video content' },
};

const ContentProfiles = () => {
  const [configs, setConfigs] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const [editing, setEditing] = useState({}); // Track which profiles are being edited
  const [editedConfigs, setEditedConfigs] = useState({}); // Store edited values
  const [notification, setNotification] = useState(null);
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfileType, setNewProfileType] = useState('social');
  const [showAddForm, setShowAddForm] = useState(false);
  const [draggedProfile, setDraggedProfile] = useState(null);
  const [dragOverProfile, setDragOverProfile] = useState(null);

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    try {
      const response = await api.get('/platform-config');
      const configMap = {};
      response.data.configs.forEach(config => {
        configMap[config.platform] = config;
      });
      setConfigs(configMap);
    } catch (error) {
      console.error('Error loading configs:', error);
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Get sorted profiles list (enabled profiles sorted by sort_order, disabled at the end)
  const getSortedProfiles = () => {
    const entries = Object.entries(configs);
    const enabled = entries.filter(([, c]) => c.enabled !== false);
    const disabled = entries.filter(([, c]) => c.enabled === false);
    
    // Sort each group by sort_order
    enabled.sort(([, a], [, b]) => (a.sort_order || 0) - (b.sort_order || 0));
    disabled.sort(([, a], [, b]) => (a.sort_order || 0) - (b.sort_order || 0));
    
    return [...enabled, ...disabled];
  };

  // Drag and drop handlers
  const handleDragStart = (e, profile) => {
    const config = configs[profile];
    // Don't allow dragging disabled profiles
    if (config.enabled === false) {
      e.preventDefault();
      return;
    }
    setDraggedProfile(profile);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', profile);
  };

  const handleDragOver = (e, profile) => {
    e.preventDefault();
    const targetConfig = configs[profile];
    // Don't allow dropping on disabled profiles
    if (targetConfig.enabled === false) {
      e.dataTransfer.dropEffect = 'none';
      return;
    }
    e.dataTransfer.dropEffect = 'move';
    if (profile !== draggedProfile) {
      setDragOverProfile(profile);
    }
  };

  const handleDragLeave = () => {
    setDragOverProfile(null);
  };

  const handleDrop = async (e, targetProfile) => {
    e.preventDefault();
    setDragOverProfile(null);
    
    if (!draggedProfile || draggedProfile === targetProfile) {
      setDraggedProfile(null);
      return;
    }

    const targetConfig = configs[targetProfile];
    // Don't allow dropping on disabled profiles
    if (targetConfig.enabled === false) {
      setDraggedProfile(null);
      return;
    }

    // Get only enabled profiles for reordering
    const enabledProfiles = getSortedProfiles()
      .filter(([, c]) => c.enabled !== false)
      .map(([p]) => p);

    const draggedIndex = enabledProfiles.indexOf(draggedProfile);
    const targetIndex = enabledProfiles.indexOf(targetProfile);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedProfile(null);
      return;
    }

    // Reorder the array
    const newOrder = [...enabledProfiles];
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedProfile);

    // Create new sort orders
    const orders = newOrder.map((platform, index) => ({
      platform,
      sort_order: index,
    }));

    try {
      const response = await api.post('/platform-config/reorder', { orders });
      const configMap = {};
      response.data.configs.forEach(config => {
        configMap[config.platform] = config;
      });
      setConfigs(configMap);
      showNotification('Profile order updated');
    } catch (error) {
      console.error('Error reordering profiles:', error);
      showNotification('Error updating profile order', 'error');
    }

    setDraggedProfile(null);
  };

  const handleDragEnd = () => {
    setDraggedProfile(null);
    setDragOverProfile(null);
  };

  const getDefaultConfig = (profile, profileType = 'social') => ({
    platform: profile,
    display_name: '',
    profile_type: profileType,
    // Social/text profile fields
    max_length: profileType === 'social' ? 5000 : null,
    min_length: profileType === 'social' ? 50 : null,
    include_hashtags: false,
    hashtag_count: 0,
    hook_length: null,
    avoid_header_generation: false,
    single_line_content: false,
    // Script profile fields
    min_duration_seconds: profileType === 'script' ? 30 : null,
    max_duration_seconds: profileType === 'script' ? 60 : null,
    min_scenes: profileType === 'script' ? 1 : null,
    max_scenes: profileType === 'script' ? 5 : null,
    narrator_on_camera: false,
    // Shared fields
    tone: 'conversational',
    style: 'engaging',
    custom_instructions: '',
    utm_enabled: true,
    utm_source: '',
    enabled: true,
  });

  const getConfig = (profile) => {
    return configs[profile] || getDefaultConfig(profile);
  };

  const getDisplayName = (profile) => {
    const config = configs[profile];
    return config?.display_name || profile.charAt(0).toUpperCase() + profile.slice(1);
  };

  const handleAddProfile = async () => {
    if (!newProfileName.trim()) {
      showNotification('Please enter a profile name', 'error');
      return;
    }

    // Create internal ID from the name (lowercase, replace spaces with dashes)
    const profileId = newProfileName.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9_-]/g, '');
    
    if (!profileId) {
      showNotification('Profile name must contain at least one letter or number', 'error');
      return;
    }

    if (configs[profileId]) {
      showNotification('A profile with this name already exists', 'error');
      return;
    }

    try {
      const defaultConfig = getDefaultConfig(profileId, newProfileType);
      defaultConfig.display_name = newProfileName.trim(); // Store original name with spaces
      await api.post(`/platform-config/${profileId}`, defaultConfig);
      await loadConfigs();
      setNewProfileName('');
      setNewProfileType('social');
      setShowAddForm(false);
      showNotification(`Profile "${newProfileName.trim()}" added successfully`);
    } catch (error) {
      console.error('Error adding profile:', error);
      showNotification('Error adding profile', 'error');
    }
  };

  const handleDeleteProfile = async (profile) => {
    const displayName = getDisplayName(profile);
    const confirmed = confirm(
      `⚠️ DELETE PROFILE: "${displayName}"\n\n` +
      `This action will PERMANENTLY delete:\n` +
      `• This content profile and all its settings\n` +
      `• ALL generated content using this profile across ALL posts\n\n` +
      `This cannot be undone. Are you sure?`
    );
    
    if (!confirmed) {
      return;
    }

    try {
      const response = await api.delete(`/platform-config/${profile}`);
      await loadConfigs();
      setEditing(prev => ({ ...prev, [profile]: false }));
      const deletedCount = response.data.deletedContentCount || 0;
      showNotification(
        deletedCount > 0 
          ? `Profile "${displayName}" deleted along with ${deletedCount} generated content item(s)`
          : `Profile "${displayName}" deleted`
      );
    } catch (error) {
      console.error('Error deleting profile:', error);
      showNotification('Error deleting profile', 'error');
    }
  };

  const handleToggleEnabled = async (profile) => {
    const config = getConfig(profile);
    const currentEnabled = config.enabled;
    const newEnabled = currentEnabled === false ? true : false; // Toggle: if false -> true, otherwise -> false
    const displayName = getDisplayName(profile);
    
    console.log('Toggle profile:', profile, 'current enabled:', currentEnabled, 'new enabled:', newEnabled);
    
    try {
      const payload = {
        ...config,
        enabled: newEnabled,
      };
      console.log('Sending payload:', payload);
      const response = await api.post(`/platform-config/${profile}`, payload);
      console.log('API response:', response.data);
      await loadConfigs();
      showNotification(
        newEnabled 
          ? `Profile "${displayName}" enabled - will be included in content generation`
          : `Profile "${displayName}" disabled - will be excluded from content generation`
      );
    } catch (error) {
      console.error('Error toggling profile:', error);
      showNotification('Error updating profile', 'error');
    }
  };

  const startEditing = (profile) => {
    const config = getConfig(profile);
    setEditedConfigs(prev => ({
      ...prev,
      [profile]: { ...config, display_name: config.display_name || getDisplayName(profile) }
    }));
    setEditing(prev => ({ ...prev, [profile]: true }));
  };

  const cancelEditing = (profile) => {
    setEditing(prev => ({ ...prev, [profile]: false }));
    setEditedConfigs(prev => {
      const newState = { ...prev };
      delete newState[profile];
      return newState;
    });
  };

  const updateEditedConfig = (profile, field, value) => {
    setEditedConfigs(prev => ({
      ...prev,
      [profile]: {
        ...prev[profile],
        [field]: value,
      },
    }));
  };

  const saveConfig = async (profile) => {
    setSaving(prev => ({ ...prev, [profile]: true }));
    try {
      const config = editedConfigs[profile];
      await api.post(`/platform-config/${profile}`, config);
      await loadConfigs();
      setEditing(prev => ({ ...prev, [profile]: false }));
      showNotification(`Profile saved successfully`);
    } catch (error) {
      console.error('Error saving config:', error);
      showNotification('Error saving settings', 'error');
    } finally {
      setSaving(prev => ({ ...prev, [profile]: false }));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-lg">Loading profiles...</div>
      </div>
    );
  }

  return (
    <div>
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

      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-gray-600">
            Create content profiles with different settings for length, style, and tone.
            Each profile generates a unique version of your content.
          </p>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            {showAddForm ? 'Cancel' : '+ Add Profile'}
          </button>
        </div>

        {/* Add Profile Form */}
        {showAddForm && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="space-y-4">
              {/* Profile Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Profile Type</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Object.entries(PROFILE_TYPES).map(([type, info]) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setNewProfileType(type)}
                      className={`p-3 rounded-lg border-2 text-left transition-colors ${
                        newProfileType === type
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="font-medium text-gray-900">{info.label}</div>
                      <div className="text-sm text-gray-500">{info.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Profile Name Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Profile Name</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newProfileName}
                    onChange={(e) => setNewProfileName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddProfile()}
                    placeholder={newProfileType === 'script' ? 'e.g., YouTube Short, TikTok, Explainer' : 'e.g., Short Form, LinkedIn Post, Newsletter'}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    maxLength={100}
                  />
                  <button
                    onClick={handleAddProfile}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-6">
        {Object.keys(configs).length === 0 && !loading && (
          <div className="text-center py-12 text-gray-500">
            <p className="mb-4">No content profiles configured yet.</p>
            <p>Click "Add Profile" to get started.</p>
          </div>
        )}
        {/* Sort profiles: enabled first (by sort_order), then disabled */}
        {getSortedProfiles().map(([profile, savedConfig]) => {
          const isEditing = editing[profile];
          const config = isEditing ? editedConfigs[profile] : savedConfig;
          const displayName = isEditing ? config.display_name : getDisplayName(profile);
          const profileColor = getProfileColor(profile);
          const isProfileEnabled = config.enabled !== false;
          const isDragging = draggedProfile === profile;
          const isDragOver = dragOverProfile === profile;

          const isScriptProfile = config.profile_type === 'script';

          return (
            <div 
              key={profile} 
              className={`bg-white rounded-lg shadow p-6 transition-all duration-200 ${!isProfileEnabled ? 'opacity-60' : ''} ${isDragging ? 'opacity-50 scale-[0.98]' : ''} ${isDragOver ? 'ring-2 ring-blue-400 ring-offset-2' : ''}`}
              draggable={isProfileEnabled && !isEditing}
              onDragStart={(e) => handleDragStart(e, profile)}
              onDragOver={(e) => handleDragOver(e, profile)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, profile)}
              onDragEnd={handleDragEnd}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  {/* Drag Handle - only for enabled profiles */}
                  {isProfileEnabled && !isEditing && (
                    <div className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600" title="Drag to reorder">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M7 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/>
                      </svg>
                    </div>
                  )}
                  <h2 className={`text-xl font-semibold ${isProfileEnabled ? 'text-gray-900' : 'text-gray-500'}`}>
                    {isEditing ? (config.display_name || displayName) : displayName}
                  </h2>
                  <span className={`px-2 py-0.5 text-xs rounded-full ${
                    isScriptProfile 
                      ? 'bg-purple-100 text-purple-800' 
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {isScriptProfile ? 'Video Script' : 'Social/Text'}
                  </span>
                  {!isProfileEnabled && (
                    <span className="px-2 py-0.5 text-xs rounded-full bg-gray-200 text-gray-600">
                      Disabled
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  {isEditing ? (
                    <>
                      <button
                        onClick={() => cancelEditing(profile)}
                        className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => saveConfig(profile)}
                        disabled={saving[profile]}
                        className="px-4 py-2 text-sm text-white rounded disabled:opacity-50 bg-blue-600 hover:bg-blue-700"
                      >
                        {saving[profile] ? 'Saving...' : 'Save'}
                      </button>
                    </>
                  ) : (
                    <>
                      {/* Enable/Disable Toggle with Label */}
                      <div className="flex items-center mr-2">
                        <button
                          type="button"
                          onClick={() => handleToggleEnabled(profile)}
                          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                            isProfileEnabled ? 'bg-green-500' : 'bg-gray-300'
                          }`}
                          role="switch"
                          aria-checked={isProfileEnabled}
                          title={isProfileEnabled ? 'Click to disable profile' : 'Click to enable profile'}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              isProfileEnabled ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                        <span className={`ml-2 text-sm ${isProfileEnabled ? 'text-green-600' : 'text-gray-500'}`}>
                          {isProfileEnabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                      <button
                        onClick={() => startEditing(profile)}
                        className="px-4 py-2 text-sm text-white rounded bg-blue-600 hover:bg-blue-700"
                      >
                        Edit
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Content - Read-only or Edit mode */}
              {isEditing ? (
                <div className="space-y-4">
                  {/* Row 1: Profile Name - Full Width */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Profile Name
                    </label>
                    <input
                      type="text"
                      value={config.display_name || ''}
                      onChange={(e) => updateEditedConfig(profile, 'display_name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Profile Name"
                    />
                  </div>

                  {/* Profile-type specific fields */}
                  {isScriptProfile ? (
                    <>
                      {/* Script Profile: Duration and Scenes */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Minimum Duration (seconds)
                          </label>
                          <input
                            type="number"
                            value={config.min_duration_seconds || ''}
                            onChange={(e) => updateEditedConfig(profile, 'min_duration_seconds', parseInt(e.target.value) || null)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            placeholder="30"
                            min="1"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Maximum Duration (seconds)
                          </label>
                          <input
                            type="number"
                            value={config.max_duration_seconds || ''}
                            onChange={(e) => updateEditedConfig(profile, 'max_duration_seconds', parseInt(e.target.value) || null)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            placeholder="60"
                            min="1"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Minimum Scenes
                          </label>
                          <input
                            type="number"
                            value={config.min_scenes || ''}
                            onChange={(e) => updateEditedConfig(profile, 'min_scenes', parseInt(e.target.value) || null)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            placeholder="1"
                            min="1"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Maximum Scenes
                          </label>
                          <input
                            type="number"
                            value={config.max_scenes || ''}
                            onChange={(e) => updateEditedConfig(profile, 'max_scenes', parseInt(e.target.value) || null)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            placeholder="5"
                            min="1"
                          />
                        </div>
                      </div>

                      {/* Narrator on Camera Toggle */}
                      <div className="flex items-center py-2">
                        <button
                          type="button"
                          onClick={() => updateEditedConfig(profile, 'narrator_on_camera', !config.narrator_on_camera)}
                          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                            config.narrator_on_camera ? 'bg-blue-600' : 'bg-gray-200'
                          }`}
                          role="switch"
                          aria-checked={config.narrator_on_camera}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              config.narrator_on_camera ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                        <span className="ml-3 text-sm text-gray-700">Narrator On Camera</span>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Social Profile: Character lengths */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Maximum Length
                          </label>
                          <input
                            type="number"
                            value={config.max_length || ''}
                            onChange={(e) => updateEditedConfig(profile, 'max_length', parseInt(e.target.value) || null)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            placeholder="5000"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Minimum Length
                          </label>
                          <input
                            type="number"
                            value={config.min_length || ''}
                            onChange={(e) => updateEditedConfig(profile, 'min_length', parseInt(e.target.value) || null)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            placeholder="50"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Hook Length
                          </label>
                          <input
                            type="number"
                            value={config.hook_length || ''}
                            onChange={(e) => updateEditedConfig(profile, 'hook_length', parseInt(e.target.value) || null)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            placeholder="125"
                          />
                        </div>
                      </div>

                      {/* Social Profile Toggles */}
                      <div className="flex flex-wrap gap-6 py-2">
                        {/* Include Hashtags Toggle */}
                        <div className="flex items-center">
                          <button
                            type="button"
                            onClick={() => updateEditedConfig(profile, 'include_hashtags', !config.include_hashtags)}
                            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                              config.include_hashtags ? 'bg-blue-600' : 'bg-gray-200'
                            }`}
                            role="switch"
                            aria-checked={config.include_hashtags}
                          >
                            <span
                              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                config.include_hashtags ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                          <span className="ml-3 text-sm text-gray-700">Include Hashtags</span>
                        </div>

                        {/* Avoid Header Toggle */}
                        <div className="flex items-center">
                          <button
                            type="button"
                            onClick={() => updateEditedConfig(profile, 'avoid_header_generation', !config.avoid_header_generation)}
                            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                              config.avoid_header_generation ? 'bg-blue-600' : 'bg-gray-200'
                            }`}
                            role="switch"
                            aria-checked={config.avoid_header_generation}
                          >
                            <span
                              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                config.avoid_header_generation ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                          <span className="ml-3 text-sm text-gray-700">Avoid Headers</span>
                        </div>

                        {/* Single Line Toggle */}
                        <div className="flex items-center">
                          <button
                            type="button"
                            onClick={() => updateEditedConfig(profile, 'single_line_content', !config.single_line_content)}
                            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                              config.single_line_content ? 'bg-blue-600' : 'bg-gray-200'
                            }`}
                            role="switch"
                            aria-checked={config.single_line_content}
                          >
                            <span
                              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                config.single_line_content ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                          <span className="ml-3 text-sm text-gray-700">Single Line</span>
                        </div>
                      </div>

                      {/* Number of Inserted Hashtags - only when enabled */}
                      {config.include_hashtags && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Number of Inserted Hashtags
                          </label>
                          <input
                            type="number"
                            value={config.hashtag_count || 0}
                            onChange={(e) => updateEditedConfig(profile, 'hashtag_count', parseInt(e.target.value) || 0)}
                            className="w-full md:w-1/3 px-3 py-2 border border-gray-300 rounded-md"
                            min="0"
                            max="30"
                          />
                        </div>
                      )}
                    </>
                  )}

                  {/* Tone and Style - Shared by both profile types */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tone
                      </label>
                      <select
                        value={config.tone || ''}
                        onChange={(e) => updateEditedConfig(profile, 'tone', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      >
                        <option value="">Select tone...</option>
                        {TONE_OPTIONS.map(tone => (
                          <option key={tone} value={tone}>{tone}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Style
                      </label>
                      <select
                        value={config.style || ''}
                        onChange={(e) => updateEditedConfig(profile, 'style', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      >
                        <option value="">Select style...</option>
                        {STYLE_OPTIONS.map(style => (
                          <option key={style} value={style}>{style}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Custom Instructions */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Custom Instructions (optional)
                    </label>
                    <textarea
                      value={config.custom_instructions || ''}
                      onChange={(e) => updateEditedConfig(profile, 'custom_instructions', e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder={isScriptProfile 
                        ? "Any additional instructions for script generation (e.g., include B-roll suggestions, specific call-to-action)..."
                        : "Any additional instructions for content generation..."
                      }
                    />
                  </div>

                  {/* UTM Tracking */}
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <button
                        type="button"
                        onClick={() => updateEditedConfig(profile, 'utm_enabled', !config.utm_enabled)}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                          config.utm_enabled !== false ? 'bg-blue-600' : 'bg-gray-200'
                        }`}
                        role="switch"
                        aria-checked={config.utm_enabled !== false}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            config.utm_enabled !== false ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                      <span className="ml-3 text-sm font-medium text-gray-700">Enable UTM Tracking</span>
                    </div>
                    
                    {config.utm_enabled !== false && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          UTM Source Name
                        </label>
                        <input
                          type="text"
                          value={config.utm_source || ''}
                          onChange={(e) => updateEditedConfig(profile, 'utm_source', e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                          className="w-full md:w-1/2 px-3 py-2 border border-gray-300 rounded-md"
                          placeholder={profile}
                          maxLength={100}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Custom name for utm_source parameter. Leave blank to use "{profile}".
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Delete Profile - Only visible when editing */}
                  <div className="pt-4 mt-4 border-t border-gray-200">
                    <button
                      onClick={() => handleDeleteProfile(profile)}
                      className="px-4 py-2 text-sm text-red-600 border border-red-300 rounded hover:bg-red-50 hover:border-red-400"
                    >
                      Delete Profile
                    </button>
                    <p className="text-xs text-gray-500 mt-1">
                      Permanently delete this profile and all generated content associated with it.
                    </p>
                  </div>
                </div>
              ) : (
                /* Read-only Summary View */
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  {isScriptProfile ? (
                    <>
                      <div>
                        <span className="text-gray-500">Duration:</span>
                        <span className="ml-2 text-gray-900">
                          {config.min_duration_seconds || 30}s - {config.max_duration_seconds || 60}s
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Scenes:</span>
                        <span className="ml-2 text-gray-900">
                          {config.min_scenes || 1} - {config.max_scenes || 5}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Tone:</span>
                        <span className="ml-2 text-gray-900">{config.tone || 'conversational'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Style:</span>
                        <span className="ml-2 text-gray-900">{config.style || 'engaging'}</span>
                      </div>
                      {config.narrator_on_camera && (
                        <div>
                          <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded text-xs">On Camera</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div>
                        <span className="text-gray-500">Length:</span>
                        <span className="ml-2 text-gray-900">{config.min_length || 50} - {config.max_length || 5000}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Tone:</span>
                        <span className="ml-2 text-gray-900">{config.tone || 'conversational'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Style:</span>
                        <span className="ml-2 text-gray-900">{config.style || 'engaging'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Hashtags:</span>
                        <span className="ml-2 text-gray-900">{config.include_hashtags ? `Yes (${config.hashtag_count || 0})` : 'No'}</span>
                      </div>
                      {config.hook_length && (
                        <div>
                          <span className="text-gray-500">Hook:</span>
                          <span className="ml-2 text-gray-900">{config.hook_length} chars</span>
                        </div>
                      )}
                      {config.single_line_content && (
                        <div>
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs">Single Line</span>
                        </div>
                      )}
                      {config.avoid_header_generation && (
                        <div>
                          <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded text-xs">No Headers</span>
                        </div>
                      )}
                    </>
                  )}
                  {config.custom_instructions && (
                    <div className="col-span-2 md:col-span-4 mt-2 p-2 bg-gray-50 rounded">
                      <span className="text-gray-500">Instructions:</span>
                      <span className="ml-2 text-gray-700 italic">{config.custom_instructions.substring(0, 100)}{config.custom_instructions.length > 100 ? '...' : ''}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ContentProfiles;
