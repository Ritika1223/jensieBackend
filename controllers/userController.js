import bcrypt from 'bcryptjs';
import User from '../models/User.js';

// Get user profile
export const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-passwordHash -resetPasswordToken -resetPasswordExpires');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Update user profile
export const updateUserProfile = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update name if provided
    if (name !== undefined) {
      user.name = name;
    }

    // Update email if provided
    if (email !== undefined && email !== user.email) {
      // Check if new email is already taken
      const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
      if (existingUser) {
        return res.status(400).json({ error: 'Email already in use' });
      }
      user.email = email.toLowerCase().trim();
    }

    // Update password if provided
    if (password !== undefined) {
      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }
      const saltRounds = 10;
      user.passwordHash = await bcrypt.hash(password, saltRounds);
    }

    await user.save();

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    console.error('Update user profile error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Delete user profile (admin only)
export const deleteUserProfile = async (req, res) => {
  try {
    const { userId } = req.params;

    // Only admins can delete profiles
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required to delete user profiles' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await User.findByIdAndDelete(userId);

    res.json({ message: 'User profile deleted successfully' });
  } catch (error) {
    console.error('Delete user profile error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

