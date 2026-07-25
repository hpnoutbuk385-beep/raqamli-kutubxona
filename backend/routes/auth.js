const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'school-library-secret-key-2026';

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Login va parol kiriting' });

    const result = await db.query('SELECT * FROM users WHERE username = ?', [username]);
    if (result.rows.length === 0) return res.status(401).json({ error: 'Login yoki parol xato' });

    const user = result.rows[0];
    if (!user.is_active) return res.status(403).json({ error: 'Hisob faollashtirilmagan' });

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) return res.status(401).json({ error: 'Login yoki parol xato' });

    let profile = null;
    if (user.role === 'student') {
      const p = await db.query('SELECT * FROM student_profiles WHERE user_id = ?', [user.id]);
      profile = p.rows[0] || null;
    } else if (user.role === 'teacher') {
      const p = await db.query('SELECT * FROM teacher_profiles WHERE user_id = ?', [user.id]);
      profile = p.rows[0] || null;
    }

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '12h' });
    res.json({ token, user: { id: user.id, username: user.username, email: user.email, role: user.role, profile } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server xatosi' });
  }
});

router.post('/register', async (req, res) => {
  try {
    const { username, password, role, profile } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Login va parol kiriting' });

    const existing = await db.query('SELECT id FROM users WHERE username = ?', [username]);
    if (existing.rows.length > 0) return res.status(400).json({ error: 'Bu login allaqachon mavjud' });

    const passwordHash = await bcrypt.hash(password, 10);
    const userRole = role || 'student';
    const userId = 'u-' + uuidv4().slice(0, 8);

    await db.query('INSERT INTO users (id, username, password_hash, role) VALUES (?, ?, ?, ?)',
      [userId, username, passwordHash, userRole]);

    let profileData = null;
    if (userRole === 'student' && profile) {
      const studentId = 'STU-' + String(Date.now()).slice(-6);
      const pid = 'sp-' + uuidv4().slice(0, 8);
      await db.query(
        'INSERT INTO student_profiles (id, user_id, first_name, last_name, father_name, phone, class_number, class_letter, student_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [pid, userId, profile.first_name, profile.last_name, profile.father_name || '', profile.phone || '', profile.class_number, profile.class_letter, studentId]);
      const p = await db.query('SELECT * FROM student_profiles WHERE id = ?', [pid]);
      profileData = p.rows[0] || null;
    } else if (userRole === 'teacher' && profile) {
      const teacherId = 'TCH-' + String(Date.now()).slice(-6);
      const pid = 'tp-' + uuidv4().slice(0, 8);
      await db.query(
        'INSERT INTO teacher_profiles (id, user_id, first_name, last_name, phone, subject, position, teacher_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [pid, userId, profile.first_name, profile.last_name, profile.phone || '', profile.subject || '', profile.position || '', teacherId]);
      const p = await db.query('SELECT * FROM teacher_profiles WHERE id = ?', [pid]);
      profileData = p.rows[0] || null;
    }

    const token = jwt.sign({ id: userId, username, role: userRole }, JWT_SECRET, { expiresIn: '12h' });
    res.status(201).json({ token, user: { id: userId, username, role: userRole, profile: profileData } });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Server xatosi' });
  }
});

router.get('/me', authenticate, async (req, res) => {
  try {
    const result = await db.query('SELECT id, username, email, role FROM users WHERE id = ?', [req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Foydalanuvchi topilmadi' });

    const user = result.rows[0];
    let profile = null;
    if (user.role === 'student') {
      const p = await db.query('SELECT * FROM student_profiles WHERE user_id = ?', [user.id]);
      profile = p.rows[0] || null;
    } else if (user.role === 'teacher') {
      const p = await db.query('SELECT * FROM teacher_profiles WHERE user_id = ?', [user.id]);
      profile = p.rows[0] || null;
    }
    res.json({ ...user, profile });
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ error: 'Server xatosi' });
  }
});

router.put('/me', authenticate, async (req, res) => {
  try {
    const { phone, email } = req.body;
    await db.query('UPDATE users SET email = COALESCE(?, email), updated_at = datetime(\'now\') WHERE id = ?', [email, req.user.id]);
    if (req.user.role === 'student') {
      await db.query('UPDATE student_profiles SET phone = COALESCE(?, phone), updated_at = datetime(\'now\') WHERE user_id = ?', [phone, req.user.id]);
    } else if (req.user.role === 'teacher') {
      await db.query('UPDATE teacher_profiles SET phone = COALESCE(?, phone), updated_at = datetime(\'now\') WHERE user_id = ?', [phone, req.user.id]);
    }
    res.json({ message: 'Profil yangilandi' });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Server xatosi' });
  }
});

module.exports = router;
