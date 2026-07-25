const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/stats', authenticate, authorize('admin'), async (req, res) => {
  try {
    const q = async (sql, params = []) => { const r = await db.query(sql, params); return r.rows.length > 0 ? Object.values(r.rows[0])[0] : 0; };

    res.json({
      total_books: await q('SELECT COALESCE(SUM(total_copies), 0) FROM books'),
      available_books: await q('SELECT COALESCE(SUM(available_copies), 0) FROM books'),
      active_reservations: await q("SELECT COUNT(*) FROM reservations WHERE status = 'reserved'"),
      active_borrowings: await q("SELECT COUNT(*) FROM borrowings WHERE status = 'borrowed'"),
      total_students: await q("SELECT COUNT(*) FROM users WHERE role = 'student'"),
      total_teachers: await q("SELECT COUNT(*) FROM users WHERE role = 'teacher'"),
      today_reservations: await q("SELECT COUNT(*) FROM reservations WHERE DATE(reserved_at) = DATE('now')"),
      today_borrowed: await q("SELECT COUNT(*) FROM borrowings WHERE DATE(borrowed_at) = DATE('now')"),
      today_returned: await q("SELECT COUNT(*) FROM borrowings WHERE DATE(returned_at) = DATE('now') AND status = 'returned'"),
      overdue_count: await q("SELECT COUNT(*) FROM borrowings WHERE status = 'borrowed' AND due_date < datetime('now')"),
    });
  } catch (err) {
    console.error('Get stats error:', err);
    res.status(500).json({ error: 'Server xatosi' });
  }
});

router.get('/popular-books', authenticate, authorize('admin'), async (req, res) => {
  try {
    const result = await db.query(
      `SELECT b.title, b.isbn, a.name as author_name, COUNT(bw.id) as borrow_count
       FROM borrowings bw JOIN books b ON bw.book_id = b.id LEFT JOIN authors a ON b.author_id = a.id
       GROUP BY b.id, b.title, b.isbn, a.name ORDER BY borrow_count DESC LIMIT 10`);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: 'Server xatosi' }); }
});

router.get('/active-students', authenticate, authorize('admin'), async (req, res) => {
  try {
    const result = await db.query(
      `SELECT sp.first_name, sp.last_name, sp.class_number, sp.class_letter, COUNT(bw.id) as borrow_count
       FROM borrowings bw JOIN users u ON bw.user_id = u.id JOIN student_profiles sp ON u.id = sp.user_id
       GROUP BY sp.user_id, sp.first_name, sp.last_name, sp.class_number, sp.class_letter
       ORDER BY borrow_count DESC LIMIT 10`);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: 'Server xatosi' }); }
});

module.exports = router;
