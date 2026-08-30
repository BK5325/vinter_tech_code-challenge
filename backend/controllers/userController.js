const User = require('../models/User');
const RoleChangeLog = require('../models/RoleChangeLog');
const AuditLog = require('../models/AuditLog');
const { AppError } = require('../middleware/errorHandler');

// ─── Get All Users (Admin/Staff) ──────────────────────────────────────────────
const getUsers = async (req, res, next) => {
  try {
    const { role, status, search, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (role) filter.role = role;
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { studentId: { $regex: search, $options: 'i' } },
        { institution: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [users, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      User.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: { users, total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};

// ─── Get Single User ──────────────────────────────────────────────────────────
const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    // Participants can only view themselves
    if (req.user.role === 'PARTICIPANT' && req.user._id.toString() !== req.params.id) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    return res.status(200).json({ success: true, data: { user } });
  } catch (error) {
    next(error);
  }
};

// ─── Update User (Admin or self) ──────────────────────────────────────────────
const updateUser = async (req, res, next) => {
  try {
    const { name, phone, institution, course, studentId } = req.body;
    const targetId = req.params.id;

    // Non-admin can only update themselves
    if (req.user.role !== 'ADMIN' && req.user._id.toString() !== targetId) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const user = await User.findByIdAndUpdate(
      targetId,
      { name, phone, institution, course, studentId },
      { new: true, runValidators: true }
    );
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    return res.status(200).json({ success: true, data: { user }, message: 'User updated.' });
  } catch (error) {
    next(error);
  }
};

// ─── Change User Status (Admin) ───────────────────────────────────────────────
const changeUserStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['ACTIVE', 'INACTIVE', 'SUSPENDED'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status.' });
    }

    const user = await User.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    const action = status === 'ACTIVE' ? 'USER_ACTIVATE' : 'USER_DEACTIVATE';
    await AuditLog.create({
      userId: req.user._id,
      userEmail: req.user.email,
      action,
      description: `${action}: ${user.email} → ${status}`,
      relatedEntityId: user._id,
      relatedEntityType: 'User',
      ipAddress: req.ip,
      metadata: { targetUser: user.email, newStatus: status },
    });

    return res.status(200).json({ success: true, data: { user }, message: `User status changed to ${status}.` });
  } catch (error) {
    next(error);
  }
};

// ─── Change User Role (Admin) ─────────────────────────────────────────────────
const changeUserRole = async (req, res, next) => {
  try {
    const { role, reason } = req.body;
    if (!['PARTICIPANT', 'STAFF', 'ADMIN'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role.' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    // Prevent self-demotion
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot change your own role.' });
    }

    const oldRole = user.role;
    user.role = role;
    await user.save({ validateBeforeSave: false });

    await RoleChangeLog.create({
      userId: user._id,
      oldRole,
      newRole: role,
      changedBy: req.user._id,
      reason: reason || '',
    });

    await AuditLog.create({
      userId: req.user._id,
      userEmail: req.user.email,
      action: 'ROLE_CHANGE',
      description: `Role changed: ${user.email} ${oldRole} → ${role}`,
      relatedEntityId: user._id,
      relatedEntityType: 'User',
      ipAddress: req.ip,
      metadata: { targetUser: user.email, oldRole, newRole: role, reason },
    });

    return res.status(200).json({ success: true, data: { user }, message: `Role changed to ${role}.` });
  } catch (error) {
    next(error);
  }
};

// ─── Delete User (Admin) ──────────────────────────────────────────────────────
const deleteUser = async (req, res, next) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot delete your own account.' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    // ── Cascade delete all related data ───────────────────────────────────
    const Attempt    = require('../models/Attempt');
    const Answer     = require('../models/Answer');
    const SecurityEvent = require('../models/SecurityEvent');

    // Find all attempts by this user first
    const userAttempts = await Attempt.find({ userId: user._id }).select('_id');
    const attemptIds = userAttempts.map((a) => a._id);

    // Delete answers and security events for those attempts
    if (attemptIds.length > 0) {
      await Answer.deleteMany({ attemptId: { $in: attemptIds } });
      await SecurityEvent.deleteMany({ attemptId: { $in: attemptIds } });
    }

    // Delete attempts themselves
    await Attempt.deleteMany({ userId: user._id });

    // Delete security events directly tied to user (some may not have attemptId)
    await SecurityEvent.deleteMany({ userId: user._id });

    // Delete the user
    await user.deleteOne();

    await AuditLog.create({
      userId: req.user._id,
      userEmail: req.user.email,
      action: 'USER_DELETE',
      description: `User deleted: ${user.email} (with all associated data)`,
      ipAddress: req.ip,
      metadata: { deletedUser: user.email, deletedRole: user.role, deletedAttempts: attemptIds.length },
    });

    return res.status(200).json({ success: true, message: 'User and all associated data deleted.' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getUsers, getUserById, updateUser, changeUserStatus, changeUserRole, deleteUser };
