import { useState, useEffect } from 'react';
import api from '../utils/api';

const LLMSettings = () => {
  const [ollamaSettings, setOllamaSettings] = useState({
    enabled: true,
    url: '',
    model: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [availableModels, setAvailableModels] = useState([]);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const response = await api.get('/settings/llm');
      const ollama = response.data.ollama || {};
      setOllamaSettings({
        enabled: ollama.enabled !== false,
        url: ollama.url || '',
        model: ollama.model || '',
      });
      
      // Auto-load models if URL is already set and Ollama is enabled
      if (ollama.enabled !== false && ollama.url && ollama.url.trim()) {
        await loadModels(ollama.url);
      }
    } catch (error) {
      console.error('Error loading LLM settings:', error);
      showNotification('Error loading LLM settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadModels = async (url) => {
    if (!url || !url.trim()) {
      setAvailableModels([]);
      return;
    }

    setTesting(true);
    try {
      const response = await api.post('/settings/ollama/test', {
        url: url.trim(),
      });

      if (response.data.success) {
        const models = response.data.models || [];
        setAvailableModels(models);
      } else {
        setAvailableModels([]);
      }
    } catch (error) {
      // Silently fail - models just won't be available
      setAvailableModels([]);
    } finally {
      setTesting(false);
    }
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleToggleOllama = async (enabled) => {
    setSaving(true);
    try {
      await api.put('/settings/ollama_enabled', {
        value: enabled ? 'true' : 'false',
        description: 'Enable/disable Ollama LLM provider',
      });
      setOllamaSettings({ ...ollamaSettings, enabled });
      showNotification(`Ollama ${enabled ? 'enabled' : 'disabled'} successfully`);
    } catch (error) {
      showNotification(
        error.response?.data?.error || 'Error updating Ollama status',
        'error'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSaveOllama = async () => {
    if (!ollamaSettings.url || !ollamaSettings.model) {
      showNotification('Both URL and Model are required', 'error');
      return;
    }

    setSaving(true);
    try {
      // Update all Ollama settings
      await Promise.all([
        api.put('/settings/ollama_url', {
          value: ollamaSettings.url.trim(),
          description: 'Ollama API URL',
        }),
        api.put('/settings/ollama_model', {
          value: ollamaSettings.model.trim(),
          description: 'Ollama model name',
        }),
      ]);

      showNotification('Ollama settings saved successfully');
    } catch (error) {
      showNotification(
        error.response?.data?.error || 'Error saving Ollama settings',
        'error'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!ollamaSettings.url) {
      showNotification('Please enter an Ollama URL first', 'error');
      return;
    }

    setTesting(true);
    try {
      const response = await api.post('/settings/ollama/test', {
        url: ollamaSettings.url.trim(),
      });

      if (response.data.success) {
        const models = response.data.models || [];
        setAvailableModels(models);
        
        if (models.length > 0) {
          showNotification(
            `${response.data.message}: ${models.slice(0, 3).join(', ')}${models.length > 3 ? '...' : ''}`,
            'success'
          );
        } else {
          showNotification(response.data.message, 'success');
        }
      } else {
        setAvailableModels([]);
        showNotification(response.data.error || 'Connection test failed', 'error');
      }
    } catch (error) {
      setAvailableModels([]);
      const errorMessage = error.response?.data?.error || error.message || 'Connection test failed';
      showNotification(errorMessage, 'error');
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-lg">Loading LLM settings...</div>
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
        <h2 className="text-2xl font-bold text-gray-900">LLM Settings</h2>
        <p className="mt-2 text-sm text-gray-600">
          Configure LLM providers for content generation. Enable or disable providers as needed.
        </p>
      </div>

      <div className="space-y-6">
        {/* Ollama Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Ollama</h3>
              <p className="mt-1 text-sm text-gray-500">
                Local or remote Ollama instance for content generation
              </p>
            </div>
            <div className="ml-4">
              <button
                onClick={() => handleToggleOllama(!ollamaSettings.enabled)}
                disabled={saving}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  ollamaSettings.enabled ? 'bg-blue-600' : 'bg-gray-200'
                } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                role="switch"
                aria-checked={ollamaSettings.enabled}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    ollamaSettings.enabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {ollamaSettings.enabled && (
            <div className="space-y-6 mt-4">
              {/* Ollama URL */}
              <div>
                <label
                  htmlFor="ollama_url"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Ollama API URL
                </label>
                <input
                  id="ollama_url"
                  type="text"
                  value={ollamaSettings.url}
                  onChange={(e) =>
                    setOllamaSettings({ ...ollamaSettings, url: e.target.value })
                  }
                  placeholder="http://localhost:11434"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  The URL where your Ollama instance is running (e.g., http://localhost:11434 or
                  http://192.168.1.61:11434)
                </p>
              </div>

              {/* Ollama Model */}
              <div>
                <label
                  htmlFor="ollama_model"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Ollama Model
                </label>
                {availableModels.length > 0 ? (
                  <select
                    id="ollama_model"
                    value={ollamaSettings.model}
                    onChange={(e) =>
                      setOllamaSettings({ ...ollamaSettings, model: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select a model...</option>
                    {availableModels.map((model) => (
                      <option key={model} value={model}>
                        {model}
                      </option>
                    ))}
                  </select>
                ) : (
                  <>
                    <input
                      id="ollama_model"
                      type="text"
                      value={ollamaSettings.model}
                      onChange={(e) =>
                        setOllamaSettings({ ...ollamaSettings, model: e.target.value })
                      }
                      placeholder="llama3.1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Enter model name manually, or click "Test Connection" to load available
                      models
                    </p>
                  </>
                )}
                {availableModels.length > 0 && (
                  <p className="mt-1 text-xs text-gray-500">
                    {availableModels.length} model(s) available. Select from the list above.
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-4 pt-4 border-t border-gray-200">
                <button
                  onClick={handleSaveOllama}
                  disabled={saving || !ollamaSettings.url || !ollamaSettings.model}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : 'Save Ollama Settings'}
                </button>
                <button
                  onClick={handleTestConnection}
                  disabled={testing || !ollamaSettings.url}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {testing
                    ? 'Testing...'
                    : availableModels.length > 0
                    ? 'Refresh Models'
                    : 'Test Connection & Load Models'}
                </button>
              </div>
            </div>
          )}

          {!ollamaSettings.enabled && (
            <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-md">
              <p className="text-sm text-gray-600">
                Ollama is currently disabled. Enable it above to configure settings.
              </p>
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-900 mb-2">About LLM Settings</h4>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>You can enable or disable LLM providers as needed.</li>
            <li>At least one LLM provider must be enabled for content generation to work.</li>
            <li>Changes take effect immediately for new content generation requests.</li>
            <li>Settings are stored in the database and persist across server restarts.</li>
            <li>Additional LLM providers can be added in future updates.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default LLMSettings;
