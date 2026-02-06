import { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

const SystemSettings = ({ isAdmin = false }) => {
  const { user } = useAuth();
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const response = await api.get('/settings');
      setSettings(response.data.settings || {});
    } catch (error) {
      console.error('Error loading settings:', error);
      showNotification('Error loading settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleToggleRegistration = async (enabled) => {
    setSaving(true);
    try {
      await api.put('/settings/registration_enabled', {
        value: enabled ? 'true' : 'false',
        description: 'Allow new user registration',
      });
      setSettings({ ...settings, registration_enabled: enabled ? 'true' : 'false' });
      showNotification(`Registration ${enabled ? 'enabled' : 'disabled'} successfully`);
    } catch (error) {
      showNotification(error.response?.data?.error || 'Error updating setting', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showNotification('New passwords do not match', 'error');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      showNotification('Password must be at least 6 characters', 'error');
      return;
    }

    setResettingPassword(true);
    try {
      await api.post(`/users/${user?.id}/reset-password`, {
        newPassword: passwordData.newPassword,
      });
      showNotification('Password updated successfully');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      showNotification(error.response?.data?.error || 'Error updating password', 'error');
    } finally {
      setResettingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-lg">Loading settings...</div>
      </div>
    );
  }

  const registrationEnabled = settings.registration_enabled === 'true';

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
        <h2 className="text-2xl font-bold text-gray-900">System Settings</h2>
        <p className="mt-2 text-sm text-gray-600">
          Manage system-wide settings and preferences.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="space-y-6">
          {/* Registration Toggle */}
          <div className="flex items-center justify-between border-b border-gray-200 pb-4">
            <div className="flex-1">
              <h3 className="text-lg font-medium text-gray-900">User Registration</h3>
              <p className="mt-1 text-sm text-gray-500">
                {registrationEnabled
                  ? 'New users can create accounts through the registration page.'
                  : 'Registration is disabled. Only administrators can create new user accounts.'}
              </p>
              {!isAdmin && (
                <p className="mt-2 text-xs text-amber-600">
                  Only administrators can change this setting.
                </p>
              )}
            </div>
            {isAdmin && (
              <div className="ml-4">
                <button
                  onClick={() => handleToggleRegistration(!registrationEnabled)}
                  disabled={saving}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    registrationEnabled ? 'bg-blue-600' : 'bg-gray-200'
                  } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                  role="switch"
                  aria-checked={registrationEnabled}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      registrationEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            )}
            {!isAdmin && (
              <div className="ml-4 px-3 py-1 text-sm text-gray-500 bg-gray-100 rounded">
                {registrationEnabled ? 'Enabled' : 'Disabled'}
              </div>
            )}
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 mb-2">About Registration</h4>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>When registration is enabled, anyone can create an account.</li>
              <li>When disabled, only administrators can create new users.</li>
              <li>The first user to register automatically becomes an admin.</li>
              <li>After the first admin is created, registration is automatically disabled.</li>
            </ul>
          </div>

        </div>
      </div>

      {/* Password Reset Section - Available to all users */}
      <div className="bg-white rounded-lg shadow p-6 mt-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Change Your Password</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              New Password
            </label>
            <input
              type="password"
              value={passwordData.newPassword}
              onChange={(e) =>
                setPasswordData({ ...passwordData, newPassword: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter new password"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirm New Password
            </label>
            <input
              type="password"
              value={passwordData.confirmPassword}
              onChange={(e) =>
                setPasswordData({ ...passwordData, confirmPassword: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Confirm new password"
            />
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleResetPassword}
              disabled={resettingPassword || !passwordData.newPassword || !passwordData.confirmPassword}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {resettingPassword ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemSettings;
