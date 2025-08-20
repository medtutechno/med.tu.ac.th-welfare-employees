import express from 'express';
import bcrypt from 'bcryptjs';
import db from '../db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

/**
 * GET /users
 *
 * List all users in the system. Only superadmins can access this endpoint.
 */
router.get('/', authenticateToken, requireRole(['superadmin']), async (_req, res) => {
  try {
    const [rows] = await db.query('SELECT id, fname, lname, username, role FROM users ORDER BY id');
    return res.json({ users: rows });
  } catch (err) {
    console.error('users list error:', err);
    return res.status(500).json({ message: 'internal server error' });
  }
});

/**
 * POST /users
 *
 * Create a new user. Only superadmins can access this endpoint. The
 * request body must include username, password, fname, lname and role.
 */
router.post('/', authenticateToken, requireRole(['superadmin']), async (req, res) => {
  const { username, password, fname, lname, role } = req.body || {};
  if (!username || !password || !fname || !lname || !role) {
    return res.status(400).json({ message: 'missing fields' });
  }
  // Only allow roles that are recognised by the system.
  const allowedRoles = ['superadmin', 'staff', 'user'];
  if (!allowedRoles.includes(role)) {
    return res.status(400).json({ message: 'invalid role' });
  }
  try {
    // Check if the username already exists
    const [[existing]] = await db.query('SELECT id FROM users WHERE username = ?', [username]);
    if (existing) {
      return res.status(400).json({ message: 'duplicate username' });
    }
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 10;
    const hashed = await bcrypt.hash(password, saltRounds);
    await db.query(
      `
        INSERT INTO users (fname, lname, username, password, role, created_date)
        VALUES (?, ?, ?, ?, ?, NOW())
      `,
      [fname, lname, username, hashed, role]
    );
    return res.json({ ok: true });
  } catch (err) {
    console.error('create user error:', err);
    return res.status(500).json({ message: 'internal server error' });
  }
});

/**
 * DELETE /users/:id
 *
 * Remove a user by id. Only superadmins can access this endpoint. The
 * superadmin should not be able to delete themselves to prevent lock out.
 */
router.delete('/:id', authenticateToken, requireRole(['superadmin']), async (req, res) => {
  const { id } = req.params;
  const userId = Number(id);
  if (!userId) {
    return res.status(400).json({ message: 'invalid id' });
  }
  // Prevent deleting your own account
  if (req.user && req.user.id === userId) {
    return res.status(400).json({ message: 'cannot delete yourself' });
  }
  try {
    const [result] = await db.query('DELETE FROM users WHERE id = ?', [userId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'not found' });
    }
    return res.json({ ok: true });
  } catch (err) {
    console.error('delete user error:', err);
    return res.status(500).json({ message: 'internal server error' });
  }
});

export default router;