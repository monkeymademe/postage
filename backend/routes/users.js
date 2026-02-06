import express from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { User } from '../models/User.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get all users (admin only)
router.get('/', requireAdmin, async (req, res) => {
  try {
    const users = await User.findAll();
    res.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user
router.get('/me', async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create user (admin only)
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { email, password, role = 'user' } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    if (role !== 'admin' && role !== 'user') {
      return res.status(400).json({ error: 'Role must be admin or user' });
    }

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const user = await User.create(email, password, role);
    res.status(201).json({ user });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user (admin only, or user updating themselves)
router.put('/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    const { email, role } = req.body;

    // Check if user is admin or updating themselves
    const isAdmin = await User.isAdmin(req.user.userId);
    const isSelf = req.user.userId === userId;

    if (!isAdmin && !isSelf) {
      return res.status(403).json({ error: 'You can only update your own account' });
    }

    // Only admins can change roles
    if (role !== undefined && !isAdmin) {
      return res.status(403).json({ error: 'Only admins can change user roles' });
    }

    // Users can only update their email, not role
    const updates = {};
    if (email !== undefined) {
      updates.email = email;
    }
    if (role !== undefined && isAdmin) {
      updates.role = role;
    }

    // Prevent removing the last admin
    if (role === 'user' && isAdmin) {
      const userToUpdate = await User.findById(userId);
      if (userToUpdate && userToUpdate.role === 'admin') {
        const allAdmins = await User.findAll();
        const adminCount = allAdmins.filter(u => u.role === 'admin').length;
        if (adminCount === 1) {
          return res.status(400).json({ error: 'Cannot remove the last admin user' });
        }
      }
    }

    const user = await User.update(userId, updates);
    res.json({ user });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reset password (admin can reset any, user can reset their own)
router.post('/:id/reset-password', async (req, res) => {
  try {
    const userId = req.params.id;
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({ error: 'New password is required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if user is admin or resetting their own password
    const isAdmin = await User.isAdmin(req.user.userId);
    const isSelf = req.user.userId === userId;

    if (!isAdmin && !isSelf) {
      return res.status(403).json({ error: 'You can only reset your own password' });
    }

    await User.updatePassword(userId, newPassword);
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete user (admin only)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const userId = req.params.id;

    // Prevent deleting yourself
    if (req.user.userId === userId) {
      return res.status(400).json({ error: 'You cannot delete your own account' });
    }

    // Prevent deleting the last admin
    const userToDelete = await User.findById(userId);
    if (userToDelete && userToDelete.role === 'admin') {
      const allAdmins = await User.findAll();
      const adminCount = allAdmins.filter(u => u.role === 'admin').length;
      if (adminCount === 1) {
        return res.status(400).json({ error: 'Cannot delete the last admin user' });
      }
    }

    await User.delete(userId);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
