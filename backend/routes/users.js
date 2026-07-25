const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/students', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { search } = req.query;
    let sql = `SELECT u.id, u.username, u.email, u.role, u.is_active, u.created_at,
      sp.first_name, sp.last_name, sp.father_name, sp.phone, sp.class_number, sp.class_letter, sp.student_id, sp.profile_image
      FROM users u LEFT JOIN student_profiles sp ON u.id = sp.user_id WHERE u.role = 'student'`;
    const params = [];
    if (search) {
      sql += ` AND (sp.first_name LIKE ? OR sp.last_name LIKE ? OR sp.student_id LIKE ? OR sp.phone LIKE ? OR u.username LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }
    sql += ' ORDER BY sp.last_name, sp.first_name';
    const result = await db.query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Get students error:', err);
    res.status(500).json({ error: 'Server xatosi' });
  }
});

router.get('/teachers', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { search } = req.query;
    let sql = `SELECT u.id, u.username, u.email, u.role, u.is_active, u.created_at,
      tp.first_name, tp.last_name, tp.phone, tp.subject, tp.position, tp.teacher_id, tp.profile_image
      FROM users u LEFT JOIN teacher_profiles tp ON u.id = tp.user_id WHERE u.role = 'teacher'`;
    const params = [];
    if (search) {
      sql += ` AND (tp.first_name LIKE ? OR tp.last_name LIKE ? OR tp.teacher_id LIKE ? OR tp.phone LIKE ? OR u.username LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }
    sql += ' ORDER BY tp.last_name, tp.first_name';
    const result = await db.query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Get teachers error:', err);
    res.status(500).json({ error: 'Server xatosi' });
  }
});

router.post('/students', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { username, password, first_name, last_name, father_name, phone, class_number, class_letter } = req.body;
    const passwordHash = await bcrypt.hash(password || 'student123', 10);
    const studentId = 'STU-' + String(Date.now()).slice(-6);
    const userId = 'u-' + uuidv4().slice(0, 8);
    const profileId = 'sp-' + uuidv4().slice(0, 8);

    await db.query('INSERT INTO users (id, username, password_hash, role) VALUES (?, ?, ?, ?)',
      [userId, username, passwordHash, 'student']);
    await db.query(
      'INSERT INTO student_profiles (id, user_id, first_name, last_name, father_name, phone, class_number, class_letter, student_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [profileId, userId, first_name, last_name, father_name || '', phone || '', class_number, class_letter, studentId]);

    const user = await db.query('SELECT id, username, role FROM users WHERE id = ?', [userId]);
    const profile = await db.query('SELECT * FROM student_profiles WHERE id = ?', [profileId]);
    res.status(201).json({ user: user.rows[0], profile: profile.rows[0] });
  } catch (err) {
    console.error('Create student error:', err);
    res.status(500).json({ error: 'Server xatosi' });
  }
});

router.post('/teachers', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { username, password, first_name, last_name, phone, subject, position } = req.body;
    const passwordHash = await bcrypt.hash(password || 'teacher123', 10);
    const teacherId = 'TCH-' + String(Date.now()).slice(-6);
    const userId = 'u-' + uuidv4().slice(0, 8);
    const profileId = 'tp-' + uuidv4().slice(0, 8);

    await db.query('INSERT INTO users (id, username, password_hash, role) VALUES (?, ?, ?, ?)',
      [userId, username, passwordHash, 'teacher']);
    await db.query(
      'INSERT INTO teacher_profiles (id, user_id, first_name, last_name, phone, subject, position, teacher_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [profileId, userId, first_name, last_name, phone || '', subject || '', position || '', teacherId]);

    const user = await db.query('SELECT id, username, role FROM users WHERE id = ?', [userId]);
    const profile = await db.query('SELECT * FROM teacher_profiles WHERE id = ?', [profileId]);
    res.status(201).json({ user: user.rows[0], profile: profile.rows[0] });
  } catch (err) {
    console.error('Create teacher error:', err);
    res.status(500).json({ error: 'Server xatosi' });
  }
});

router.put('/:id/toggle-active', authenticate, authorize('admin'), async (req, res) => {
  try {
    await db.query('UPDATE users SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END WHERE id = ?', [req.params.id]);
    const result = await db.query('SELECT id, is_active FROM users WHERE id = ?', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Foydalanuvchi topilmadi' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: 'Server xatosi' }); }
});

router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    await db.query('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ message: "Foydalanuvchi o'chirildi" });
  } catch (err) { res.status(500).json({ error: 'Server xatosi' }); }
});

module.exports = router;
