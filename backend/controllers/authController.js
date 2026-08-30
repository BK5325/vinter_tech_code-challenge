const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { AppError } = require('../middleware/errorHandler');

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true, // Always true for cross-site cookies between Vercel/Render
  sameSite: 'none', // Always 'none' for cross-domain auth
  maxAge: parseInt(process.env.JWT_COOKIE_EXPIRES_IN || '7', 10) * 24 * 60 * 60 * 1000,
};

const signToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

// ─── Register ─────────────────────────────────────────────────────────────────
const register = async (req, res, next) => {
  try {
    const { name, email, password, phone, institution, course, studentId } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
    }

    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' });
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash: password, // pre-save hook hashes it
      phone: phone || '',
      institution: institution || '',
      course: course || '',
      studentId: studentId || '',
    });

    await AuditLog.create({
      userId: user._id,
      userEmail: user.email,
      action: 'USER_REGISTER',
      description: `New participant registered: ${user.email}`,
      relatedEntityId: user._id,
      relatedEntityType: 'User',
      ipAddress: req.ip,
    });

    const token = signToken(user._id);
    res.cookie('token', token, COOKIE_OPTIONS);

    return res.status(201).json({
      success: true,
      message: 'Registration successful.',
      data: { user, token },
    });
  } catch (error) {
    next(error);
  }
};

// ─── Login ────────────────────────────────────────────────────────────────────
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+passwordHash');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({ success: false, message: 'Your account has been deactivated. Please contact support.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    user.lastLoginAt = new Date();
    await user.save({ validateBeforeSave: false });

    await AuditLog.create({
      userId: user._id,
      userEmail: user.email,
      action: 'USER_LOGIN',
      description: `User logged in: ${user.email}`,
      ipAddress: req.ip,
    });

    const token = signToken(user._id);
    res.cookie('token', token, COOKIE_OPTIONS);

    const userObj = user.toJSON();

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      data: { user: userObj, token },
    });
  } catch (error) {
    next(error);
  }
};

// ─── Logout ───────────────────────────────────────────────────────────────────
const logout = async (req, res, next) => {
  try {
    if (req.user) {
      await AuditLog.create({
        userId: req.user._id,
        userEmail: req.user.email,
        action: 'USER_LOGOUT',
        description: `User logged out: ${req.user.email}`,
        ipAddress: req.ip,
      });
    }

    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    });

    return res.status(200).json({ success: true, message: 'Logged out successfully.' });
  } catch (error) {
    next(error);
  }
};

// ─── Me ───────────────────────────────────────────────────────────────────────
const getMe = async (req, res) => {
  return res.status(200).json({
    success: true,
    data: { user: req.user },
  });
};

// ─── Change Password ──────────────────────────────────────────────────────────
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current and new password are required.' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'New password must be at least 8 characters.' });
    }

    const user = await User.findById(req.user._id).select('+passwordHash');
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
    }

    user.passwordHash = newPassword; // pre-save hook hashes it
    await user.save({ validateBeforeSave: false });

    await AuditLog.create({
      userId: user._id, userEmail: user.email,
      action: 'PASSWORD_CHANGE', description: 'User changed their password.',
      ipAddress: req.ip,
    });

    return res.status(200).json({ success: true, message: 'Password changed successfully.' });
  } catch (error) { next(error); }
};

module.exports = { register, login, logout, getMe, changePassword };
