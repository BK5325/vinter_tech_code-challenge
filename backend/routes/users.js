const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const {
  getUsers, getUserById, updateUser,
  changeUserStatus, changeUserRole, deleteUser,
} = require('../controllers/userController');

router.get('/', verifyToken, requireRole('ADMIN', 'STAFF'), getUsers);
router.get('/:id', verifyToken, getUserById);
router.patch('/:id', verifyToken, updateUser);
router.delete('/:id', verifyToken, requireRole('ADMIN'), deleteUser);
router.patch('/:id/status', verifyToken, requireRole('ADMIN'), changeUserStatus);
router.patch('/:id/role', verifyToken, requireRole('ADMIN'), changeUserRole);

module.exports = router;
