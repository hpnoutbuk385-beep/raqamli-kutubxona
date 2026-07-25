const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

function generateReservationId() {
  return 'RES-' + String(Date.now()).slice(-6);
}

router.get('/', authenticate, async (req, res) => {
  try {
    let sql, params;
    if (req.user.role === 'admin') {
      sql = `SELECT r.*, b.title as book_title, b.isbn, a.name as author_name, b.daily_fee as book_daily_fee,
        CASE WHEN sp.user_id IS NOT NULL THEN sp.first_name || ' ' || sp.last_name
             WHEN tp.user_id IS NOT NULL THEN tp.first_name || ' ' || tp.last_name
             ELSE u.username END as user_name,
        COALESCE(sp.student_id, tp.teacher_id) as user_code,
        COALESCE(sp.class_number || '-' || sp.class_letter, '') as class_name,
        COALESCE(sp.phone, tp.phone) as phone,
        CASE WHEN sp.user_id IS NOT NULL THEN 'student' WHEN tp.user_id IS NOT NULL THEN 'teacher' ELSE u.role END as user_type
        FROM reservations r JOIN books b ON r.book_id = b.id LEFT JOIN authors a ON b.author_id = a.id
        JOIN users u ON r.user_id = u.id LEFT JOIN student_profiles sp ON u.id = sp.user_id
        LEFT JOIN teacher_profiles tp ON u.id = tp.user_id ORDER BY r.reserved_at DESC`;
      params = [];
    } else {
      sql = `SELECT r.*, b.title as book_title, b.isbn, a.name as author_name, b.daily_fee as book_daily_fee
        FROM reservations r JOIN books b ON r.book_id = b.id LEFT JOIN authors a ON b.author_id = a.id
        WHERE r.user_id = ? ORDER BY r.reserved_at DESC`;
      params = [req.user.id];
    }
    const result = await db.query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Get reservations error:', err);
    res.status(500).json({ error: 'Server xatosi' });
  }
});

router.post('/', authenticate, authorize('student', 'teacher'), async (req, res) => {
  try {
    const { book_id, due_days } = req.body;
    if (!book_id) return res.status(400).json({ error: 'Kitob ID kiriting' });

    const bookResult = await db.query('SELECT * FROM books WHERE id = ?', [book_id]);
    if (bookResult.rows.length === 0) return res.status(404).json({ error: 'Kitob topilmadi' });
    const book = bookResult.rows[0];
    if (book.available_copies <= 0) return res.status(400).json({ error: 'Kitob mavjud emas' });

    const existing = await db.query(
      "SELECT id FROM reservations WHERE user_id = ? AND book_id = ? AND status = 'reserved'",
      [req.user.id, book_id]);
    if (existing.rows.length > 0) return res.status(400).json({ error: 'Siz allaqachon bu kitobni bron qilgansiz' });

    const days = Math.max(1, Math.min(30, parseInt(due_days) || 7));
    const dailyFee = book.daily_fee || 1000;
    const totalPrice = days * dailyFee;

    const reservationId = generateReservationId();
    const qrToken = uuidv4();
    const reservationDbId = 'r-' + uuidv4().slice(0, 8);

    const copyResult = await db.query(
      "SELECT id FROM book_copies WHERE book_id = ? AND status = 'available' LIMIT 1",
      [book_id]);

    let bookCopyId = null;
    if (copyResult.rows.length > 0) {
      bookCopyId = copyResult.rows[0].id;
      await db.query("UPDATE book_copies SET status = 'reserved' WHERE id = ?", [bookCopyId]);
    }

    await db.query('UPDATE books SET available_copies = available_copies - 1 WHERE id = ?', [book_id]);
    await db.query(
      `INSERT INTO reservations (id, reservation_id, user_id, book_id, book_copy_id, qr_token, status, due_days, total_price)
       VALUES (?, ?, ?, ?, ?, ?, 'reserved', ?, ?)`,
      [reservationDbId, reservationId, req.user.id, book_id, bookCopyId, qrToken, days, totalPrice]);

    const result = await db.query('SELECT * FROM reservations WHERE id = ?', [reservationDbId]);
    res.status(201).json({ ...result.rows[0], book_title: book.title, daily_fee: dailyFee });
  } catch (err) {
    console.error('Create reservation error:', err);
    res.status(500).json({ error: 'Server xatosi' });
  }
});

router.get('/:id/qr', authenticate, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT r.*, b.title as book_title, b.isbn, a.name as author_name, b.daily_fee as book_daily_fee,
        CASE WHEN sp.user_id IS NOT NULL THEN sp.first_name || ' ' || sp.last_name
             WHEN tp.user_id IS NOT NULL THEN tp.first_name || ' ' || tp.last_name
             ELSE u.username END as user_name,
        COALESCE(sp.student_id, tp.teacher_id) as user_code,
        COALESCE(sp.class_number || '-' || sp.class_letter, '') as class_name,
        COALESCE(sp.phone, tp.phone) as phone,
        CASE WHEN sp.user_id IS NOT NULL THEN 'student' WHEN tp.user_id IS NOT NULL THEN 'teacher' ELSE u.role END as user_type
       FROM reservations r JOIN books b ON r.book_id = b.id LEFT JOIN authors a ON b.author_id = a.id
       JOIN users u ON r.user_id = u.id LEFT JOIN student_profiles sp ON u.id = sp.user_id
       LEFT JOIN teacher_profiles tp ON u.id = tp.user_id
       WHERE r.id = ? AND (r.user_id = ? OR ? = 'admin')`,
      [req.params.id, req.user.id, req.user.role]);

    if (result.rows.length === 0) return res.status(404).json({ error: 'Bron topilmadi' });

    const reservation = result.rows[0];
    const qrData = JSON.stringify({ token: reservation.qr_token, reservation_id: reservation.reservation_id });
    const qrDataUrl = await QRCode.toDataURL(qrData, { width: 300, margin: 2 });

    res.json({ reservation, qr: qrDataUrl });
  } catch (err) {
    console.error('Get QR error:', err);
    res.status(500).json({ error: 'Server xatosi' });
  }
});

router.post('/:id/cancel', authenticate, async (req, res) => {
  try {
    const result = await db.query(
      "SELECT * FROM reservations WHERE id = ? AND user_id = ? AND status = 'reserved'",
      [req.params.id, req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: "Bron topilmadi yoki bekor qilib bo'lmaydi" });

    const reservation = result.rows[0];
    await db.query("UPDATE reservations SET status = 'cancelled' WHERE id = ?", [reservation.id]);
    await db.query('UPDATE books SET available_copies = available_copies + 1 WHERE id = ?', [reservation.book_id]);
    if (reservation.book_copy_id) {
      await db.query("UPDATE book_copies SET status = 'available' WHERE id = ?", [reservation.book_copy_id]);
    }
    res.json({ message: 'Bron bekor qilindi' });
  } catch (err) {
    console.error('Cancel reservation error:', err);
    res.status(500).json({ error: 'Server xatosi' });
  }
});

module.exports = router;
