import { useState, useEffect } from 'react';
import api from '../utils/api';

const GhostSitesSettings = ({ isAdmin = false }) => {
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingSite, setEditingSite] = useState(null);
  const [notification, setNotification] = useState(null);
  const [testing, setTesting] = useState({});

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    apiKey: '',
  });

  useEffect(() => {
    loadSites();
  }, []);

  const loadSites = async () => {
    try {
      const response = await api.get('/ghost-sites');
      setSites(response.data.sites || []);
    } catch (error) {
      console.error('Error loading Ghost sites:', error);
      showNotification('Error loading Ghost sites', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setFormData({ name: '', url: '', apiKey: '' });
    setEditingSite(null);
    setShowAddForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (editingSite) {
        // Update existing site
        await api.put(`/ghost-sites/${editingSite.id}`, formData);
        showNotification('Ghost site updated successfully');
      } else {
        // Create new site
        await api.post('/ghost-sites', formData);
        showNotification('Ghost site added successfully');
      }
      resetForm();
      loadSites();
    } catch (error) {
      console.error('Error saving Ghost site:', error);
      showNotification(error.response?.data?.error || 'Error saving Ghost site', 'error');
    }
  };

  const handleEdit = (site) => {
    setEditingSite(site);
    setFormData({
      name: site.name,
      url: site.url,
      apiKey: '', // Don't show API key for security
    });
    setShowAddForm(true);
  };

  const handleDelete = async (siteId, siteName) => {
    if (!confirm(`Are you sure you want to delete "${siteName}"?`)) {
      return;
    }

    try {
      await api.delete(`/ghost-sites/${siteId}`);
      showNotification('Ghost site deleted successfully');
      loadSites();
    } catch (error) {
      console.error('Error deleting Ghost site:', error);
      showNotification('Error deleting Ghost site', 'error');
    }
  };

  const handleTest = async (siteId) => {
    setTesting(prev => ({ ...prev, [siteId]: true }));
    try {
      const response = await api.post(`/ghost-sites/${siteId}/test`);
      if (response.data.success) {
        showNotification(response.data.message);
      } else {
        showNotification(response.data.error || 'Connection test failed', 'error');
      }
    } catch (error) {
      showNotification(error.response?.data?.error || 'Connection test failed', 'error');
    } finally {
      setTesting(prev => ({ ...prev, [siteId]: false }));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-lg">Loading Ghost sites...</div>
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
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Ghost CMS Sites</h2>
            <p className="text-sm text-gray-600 mt-1">
              {isAdmin
                ? 'Manage your Ghost CMS connections. Add multiple sites to easily import posts.'
                : 'View Ghost CMS connections. Only administrators can add or remove sites.'}
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={() => setShowAddForm(true)}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-sm font-medium"
            >
              + Add Ghost Site
            </button>
          )}
        </div>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="bg-white rounded-lg shadow p-6 mb-6 border-2 border-purple-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editingSite ? 'Edit Ghost Site' : 'Add New Ghost Site'}
          </h3>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Site Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="My Blog"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ghost URL
                </label>
                <input
                  type="url"
                  value={formData.url}
                  onChange={(e) => handleInputChange('url', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="https://yourblog.com"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Your Ghost blog URL (without trailing slash)
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Content API Key
                </label>
                <input
                  type="password"
                  value={formData.apiKey}
                  onChange={(e) => handleInputChange('apiKey', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder={editingSite ? 'Leave blank to keep existing key' : 'Your Ghost API key'}
                  required={!editingSite}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Get your API key from Ghost Admin → Settings → Integrations → Add custom integration
                </p>
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-sm"
              >
                {editingSite ? 'Update Site' : 'Add Site'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Sites List */}
      {sites.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-500 mb-4">No Ghost sites configured yet.</p>
          {isAdmin && (
            <button
              onClick={() => setShowAddForm(true)}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
            >
              Add Your First Ghost Site
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {sites.map((site) => (
            <div key={site.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">{site.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{site.url}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Added {new Date(site.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleTest(site.id)}
                    disabled={testing[site.id]}
                    className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200 disabled:opacity-50"
                  >
                    {testing[site.id] ? 'Testing...' : 'Test Connection'}
                  </button>
                  {isAdmin && (
                    <>
                      <button
                        onClick={() => handleEdit(site)}
                        className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(site.id, site.name)}
                        className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GhostSitesSettings;
