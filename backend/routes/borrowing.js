const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

function generateReturnId() {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const l1 = letters[Math.floor(Math.random() * letters.length)];
  const l2 = letters[Math.floor(Math.random() * letters.length)];
  const num = String(Math.floor(Math.random() * 10000000)).padStart(7, '0');
  return l1 + l2 + num;
}

const JOIN_SQL = `FROM borrowings bw JOIN books b ON bw.book_id = b.id LEFT JOIN authors a ON b.author_id = a.id
  JOIN users u ON bw.user_id = u.id LEFT JOIN student_profiles sp ON u.id = sp.user_id
  LEFT JOIN teacher_profiles tp ON u.id = tp.user_id`;

const COLUMNS = `bw.*, b.title as book_title, b.isbn, a.name as author_name, b.daily_fee as book_daily_fee,
  CASE WHEN sp.user_id IS NOT NULL THEN sp.first_name || ' ' || sp.last_name
       WHEN tp.user_id IS NOT NULL THEN tp.first_name || ' ' || tp.last_name
       ELSE u.username END as user_name,
  COALESCE(sp.student_id, tp.teacher_id) as user_code,
  COALESCE(sp.class_number || '-' || sp.class_letter, '') as class_name,
  COALESCE(sp.phone, tp.phone) as phone,
  CASE WHEN sp.user_id IS NOT NULL THEN 'student' WHEN tp.user_id IS NOT NULL THEN 'teacher' ELSE u.role END as user_type,
  u.id as borrower_user_id`;

router.post('/confirm', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { qr_token } = req.body;
    if (!qr_token) return res.status(400).json({ error: 'QR token kiriting' });

    const reservationResult = await db.query(
      `SELECT r.*, b.title as book_title, b.isbn, a.name as author_name, b.daily_fee as book_daily_fee,
        CASE WHEN sp.user_id IS NOT NULL THEN sp.first_name || ' ' || sp.last_name
             WHEN tp.user_id IS NOT NULL THEN tp.first_name || ' ' || tp.last_name
             ELSE u.username END as user_name,
        COALESCE(sp.student_id, tp.teacher_id) as user_code,
        COALESCE(sp.class_number || '-' || sp.class_letter, '') as class_name,
        COALESCE(sp.phone, tp.phone) as phone,
        CASE WHEN sp.user_id IS NOT NULL THEN 'student' WHEN tp.user_id IS NOT NULL THEN 'teacher' ELSE u.role END as user_type,
        u.id as borrower_user_id
       FROM reservations r JOIN books b ON r.book_id = b.id LEFT JOIN authors a ON b.author_id = a.id
       JOIN users u ON r.user_id = u.id LEFT JOIN student_profiles sp ON u.id = sp.user_id
       LEFT JOIN teacher_profiles tp ON u.id = tp.user_id
       WHERE r.qr_token = ? AND r.status = 'reserved'`,
      [qr_token]);

    if (reservationResult.rows.length === 0) return res.status(404).json({ error: 'Bron topilmadi yoki allaqachon berilgan' });

    const reservation = reservationResult.rows[0];

    let returnId;
    let unique = false;
    while (!unique) {
      returnId = generateReturnId();
      const check = await db.query('SELECT id FROM borrowings WHERE return_id = ?', [returnId]);
      if (check.rows.length === 0) unique = true;
    }

    await db.query("UPDATE reservations SET status = 'borrowed' WHERE id = ?", [reservation.id]);
    if (reservation.book_copy_id) {
      await db.query("UPDATE book_copies SET status = 'borrowed' WHERE id = ?", [reservation.book_copy_id]);
    }

    const dueDays = reservation.due_days || 7;
    const totalPrice = reservation.total_price || (dueDays * (reservation.book_daily_fee || 1000));

    const borrowingId = 'bw-' + uuidv4().slice(0, 8);
    await db.query(
      `INSERT INTO borrowings (id, reservation_id, user_id, book_id, book_copy_id, return_id, status, due_days, total_price)
       VALUES (?, ?, ?, ?, ?, ?, 'borrowed', ?, ?)`,
      [borrowingId, reservation.id, reservation.borrower_user_id, reservation.book_id, reservation.book_copy_id, returnId, dueDays, totalPrice]);

    await db.query(
      "INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, ?)",
      [uuidv4(), reservation.borrower_user_id, 'Kitob berildi',
       `"${reservation.book_title}" kitobi sizga muvaffaqiyatli berildi. Qaytarish ID: ${returnId}. Muddat: ${dueDays} kun. Narx: ${totalPrice} so'm.`,
       'borrow']);

    const borrowingResult = await db.query('SELECT * FROM borrowings WHERE id = ?', [borrowingId]);

    res.json({
      message: 'Kitob muvaffaqiyatli berildi!',
      borrowing: borrowingResult.rows[0],
      return_id: returnId,
      book_title: reservation.book_title,
      user_name: reservation.user_name,
      due_days: dueDays,
      total_price: totalPrice,
      due_date: borrowingResult.rows[0].due_date,
    });
  } catch (err) {
    console.error('Confirm borrowing error:', err);
    res.status(500).json({ error: 'Server xatosi' });
  }
});

router.get('/my', authenticate, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT ${COLUMNS} ${JOIN_SQL} WHERE bw.user_id = ? ORDER BY bw.borrowed_at DESC`,
      [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    console.error('Get my borrowings error:', err);
    res.status(500).json({ error: 'Server xatosi' });
  }
});

router.get('/all', authenticate, authorize('admin'), async (req, res) => {
  try {
    const result = await db.query(`SELECT ${COLUMNS} ${JOIN_SQL} ORDER BY bw.borrowed_at DESC`);
    res.json(result.rows);
  } catch (err) {
    console.error('Get all borrowings error:', err);
    res.status(500).json({ error: 'Server xatosi' });
  }
});

router.post('/return', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { return_id } = req.body;
    if (!return_id) return res.status(400).json({ error: 'Return ID kiriting' });

    const result = await db.query(
      `SELECT ${COLUMNS} ${JOIN_SQL} WHERE bw.return_id = ? AND bw.status = 'borrowed'`,
      [return_id.toUpperCase()]);

    if (result.rows.length === 0) return res.status(404).json({ error: 'Return ID topilmadi yoki kitob allaqachon qaytarilgan' });

    const borrowing = result.rows[0];

    let penalty = 0;
    const dueDate = new Date(borrowing.due_date);
    const now = new Date();
    if (now > dueDate) {
      const overdueDays = Math.ceil((now - dueDate) / (1000 * 60 * 60 * 24));
      penalty = overdueDays * (borrowing.book_daily_fee || 1000) * 2;
    }

    await db.query(
      "UPDATE borrowings SET status = 'returned', returned_at = datetime('now'), penalty = ? WHERE id = ?",
      [penalty, borrowing.id]);
    await db.query("UPDATE reservations SET status = 'returned' WHERE id = ?", [borrowing.reservation_id]);
    await db.query('UPDATE books SET available_copies = available_copies + 1 WHERE id = ?', [borrowing.book_id]);
    if (borrowing.book_copy_id) {
      await db.query("UPDATE book_copies SET status = 'available' WHERE id = ?", [borrowing.book_copy_id]);
    }

    let notifMsg = `"${borrowing.book_title}" kitobi kutubxonaga muvaffaqiyatli qaytarildi. Rahmat!`;
    if (penalty > 0) {
      notifMsg += ` Kechikish uchun jarima: ${penalty} so'm.`;
      await db.query(
        "INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, ?)",
        [uuidv4(), borrowing.borrower_user_id, 'Jarima', `${borrowing.book_title} kitobi kech qaytarildi. Jarima: ${penalty} so'm.`, 'penalty']);
    }
    await db.query(
      "INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, ?)",
      [uuidv4(), borrowing.borrower_user_id, 'Kitob qaytarildi', notifMsg, 'return']);

    const nowDate = new Date();
    const formattedDate = nowDate.toLocaleDateString('uz-UZ') + ' ' + nowDate.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });

    res.json({
      message: penalty > 0 ? `Kitob qaytarildi. Jarima: ${penalty} so'm` : 'Kitob muvaffaqiyatli qaytarildi!',
      book_title: borrowing.book_title,
      user_name: borrowing.user_name,
      return_id: borrowing.return_id,
      returned_at: formattedDate,
      due_days: borrowing.due_days,
      total_price: borrowing.total_price,
      penalty: penalty,
    });
  } catch (err) {
    console.error('Return book error:', err);
    res.status(500).json({ error: 'Server xatosi' });
  }
});

router.get('/overdue', authenticate, authorize('admin'), async (req, res) => {
  try {
    const result = await db.query(
      `SELECT ${COLUMNS} ${JOIN_SQL} WHERE bw.status = 'borrowed' AND bw.due_date < datetime('now') ORDER BY bw.due_date ASC`);
    res.json(result.rows);
  } catch (err) {
    console.error('Get overdue error:', err);
    res.status(500).json({ error: 'Server xatosi' });
  }
});

router.post('/overdue-notify', authenticate, authorize('admin'), async (req, res) => {
  try {
    const overdue = await db.query(
      `SELECT ${COLUMNS} ${JOIN_SQL} WHERE bw.status = 'borrowed' AND bw.due_date < datetime('now')`);

    let count = 0;
    for (const b of overdue.rows) {
      const overdueDays = Math.ceil((new Date() - new Date(b.due_date)) / (1000 * 60 * 60 * 24));
      const msg = `"${b.book_title}" kitobiningz muddati ${overdueDays} kun kechdi. Iltimos, kitobni kutubxonaga qaytaring! Jarima: ${overdueDays * (b.book_daily_fee || 1000) * 2} so'm.`;

      const existing = await db.query(
        "SELECT id FROM notifications WHERE user_id = ? AND message = ? AND type = 'overdue'",
        [b.borrower_user_id, msg]);
      if (existing.rows.length === 0) {
        await db.query(
          "INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, ?)",
          [uuidv4(), b.borrower_user_id, 'Muddat o\'tdi!', msg, 'overdue']);
        count++;
      }
    }

    res.json({ message: `${count} ta ogohlantirish yuborildi`, count });
  } catch (err) {
    console.error('Overdue notify error:', err);
    res.status(500).json({ error: 'Server xatosi' });
  }
});

module.exports = router;
