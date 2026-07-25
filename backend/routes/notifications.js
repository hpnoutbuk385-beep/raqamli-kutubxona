const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
      [req.user.id]);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: 'Server xatosi' }); }
});

router.get('/unread-count', authenticate, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT COUNT(*) as cnt FROM notifications WHERE user_id = ? AND is_read = 0',
      [req.user.id]);
    res.json({ count: result.rows[0] ? result.rows[0].cnt : 0 });
  } catch (err) { res.status(500).json({ error: 'Server xatosi' }); }
});

router.put('/:id/read', authenticate, async (req, res) => {
  try {
    await db.query('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ message: "O'qilgan deb belgilandi" });
  } catch (err) { res.status(500).json({ error: 'Server xatosi' }); }
});

router.put('/read-all', authenticate, async (req, res) => {
  try {
    await db.query('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [req.user.id]);
    res.json({ message: "Barcha xabarlar o'qilgan deb belgilandi" });
  } catch (err) { res.status(500).json({ error: 'Server xatosi' }); }
});

module.exports = router;
