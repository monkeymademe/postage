import { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

const UserManagement = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [resettingPassword, setResettingPassword] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: 'user',
  });
  const [resetPasswordData, setResetPasswordData] = useState({
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await api.get('/users');
      setUsers(response.data.users || []);
    } catch (error) {
      console.error('Error loading users:', error);
      showNotification('Error loading users', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    try {
      await api.post('/users', formData);
      showNotification('User created successfully');
      setShowAddForm(false);
      setFormData({ email: '', password: '', role: 'user' });
      loadUsers();
    } catch (error) {
      showNotification(error.response?.data?.error || 'Error creating user', 'error');
    }
  };

  const handleUpdateUser = async (userId) => {
    try {
      const updates = {};
      if (formData.email) updates.email = formData.email;
      if (formData.role) updates.role = formData.role;
      
      await api.put(`/users/${userId}`, updates);
      showNotification('User updated successfully');
      setEditingUser(null);
      setFormData({ email: '', password: '', role: 'user' });
      loadUsers();
    } catch (error) {
      showNotification(error.response?.data?.error || 'Error updating user', 'error');
    }
  };

  const handleResetPassword = async (userId) => {
    if (resetPasswordData.newPassword !== resetPasswordData.confirmPassword) {
      showNotification('Passwords do not match', 'error');
      return;
    }

    if (resetPasswordData.newPassword.length < 6) {
      showNotification('Password must be at least 6 characters', 'error');
      return;
    }

    try {
      await api.post(`/users/${userId}/reset-password`, {
        newPassword: resetPasswordData.newPassword,
      });
      showNotification('Password reset successfully');
      setResettingPassword(null);
      setResetPasswordData({ newPassword: '', confirmPassword: '' });
    } catch (error) {
      showNotification(error.response?.data?.error || 'Error resetting password', 'error');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      await api.delete(`/users/${userId}`);
      showNotification('User deleted successfully');
      loadUsers();
    } catch (error) {
      showNotification(error.response?.data?.error || 'Error deleting user', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-lg">Loading users...</div>
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

      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          {showAddForm ? 'Cancel' : '+ Add User'}
        </button>
      </div>

      {/* Add User Form */}
      {showAddForm && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Add New User</h3>
          <form onSubmit={handleAddUser} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Role
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Create User
            </button>
          </form>
        </div>
      )}

      {/* Users List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  {editingUser === user.id ? (
                    <input
                      type="email"
                      value={formData.email || user.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                  ) : (
                    <div className="text-sm font-medium text-gray-900">
                      {user.email}
                      {user.id === currentUser?.id && (
                        <span className="ml-2 text-xs text-gray-500">(You)</span>
                      )}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {editingUser === user.id ? (
                    <select
                      value={formData.role || user.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      className="px-2 py-1 border border-gray-300 rounded text-sm"
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  ) : (
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      user.role === 'admin' 
                        ? 'bg-purple-100 text-purple-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {user.role}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(user.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {editingUser === user.id ? (
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleUpdateUser(user.id)}
                        className="text-green-600 hover:text-green-900"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setEditingUser(null);
                          setFormData({ email: '', password: '', role: 'user' });
                        }}
                        className="text-gray-600 hover:text-gray-900"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : resettingPassword === user.id ? (
                    <div className="flex flex-col gap-2 items-end">
                      <input
                        type="password"
                        placeholder="New password"
                        value={resetPasswordData.newPassword}
                        onChange={(e) => setResetPasswordData({ ...resetPasswordData, newPassword: e.target.value })}
                        className="px-2 py-1 border border-gray-300 rounded text-sm w-40"
                      />
                      <input
                        type="password"
                        placeholder="Confirm password"
                        value={resetPasswordData.confirmPassword}
                        onChange={(e) => setResetPasswordData({ ...resetPasswordData, confirmPassword: e.target.value })}
                        className="px-2 py-1 border border-gray-300 rounded text-sm w-40"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleResetPassword(user.id)}
                          className="text-green-600 hover:text-green-900 text-xs"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setResettingPassword(null);
                            setResetPasswordData({ newPassword: '', confirmPassword: '' });
                          }}
                          className="text-gray-600 hover:text-gray-900 text-xs"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setEditingUser(user.id);
                          setFormData({ email: user.email, password: '', role: user.role });
                        }}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          setResettingPassword(user.id);
                          setResetPasswordData({ newPassword: '', confirmPassword: '' });
                        }}
                        className="text-orange-600 hover:text-orange-900"
                      >
                        Reset Password
                      </button>
                      {user.id !== currentUser?.id && (
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UserManagement;
