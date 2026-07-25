const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, async (req, res) => {
  try {
    const { search, category, author, language } = req.query;
    let sql = `SELECT b.*, a.name as author_name, c.name as category_name FROM books b LEFT JOIN authors a ON b.author_id = a.id LEFT JOIN categories c ON b.category_id = c.id WHERE 1=1`;
    const params = [];

    if (search) { sql += ` AND (b.title LIKE ? OR a.name LIKE ? OR b.isbn LIKE ?)`; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
    if (category) { sql += ` AND b.category_id = ?`; params.push(category); }
    if (author) { sql += ` AND b.author_id = ?`; params.push(author); }
    if (language) { sql += ` AND b.language LIKE ?`; params.push(`%${language}%`); }
    sql += ' ORDER BY b.title ASC';

    const result = await db.query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Get books error:', err);
    res.status(500).json({ error: 'Server xatosi' });
  }
});

router.get('/categories', authenticate, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM categories ORDER BY name');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: 'Server xatosi' }); }
});

router.get('/authors', authenticate, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM authors ORDER BY name');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: 'Server xatosi' }); }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT b.*, a.name as author_name, c.name as category_name FROM books b LEFT JOIN authors a ON b.author_id = a.id LEFT JOIN categories c ON b.category_id = c.id WHERE b.id = ?',
      [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Kitob topilmadi' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get book error:', err);
    res.status(500).json({ error: 'Server xatosi' });
  }
});

router.post('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { isbn, title, author_id, category_id, publisher, published_year, language, description, total_copies, shelf_number } = req.body;
    const bookId = 'b-' + uuidv4().slice(0, 8);
    const copies = total_copies || 1;
    await db.query(
      'INSERT INTO books (id, isbn, title, author_id, category_id, publisher, published_year, language, description, total_copies, available_copies, shelf_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [bookId, isbn || null, title, author_id || null, category_id || null, publisher || null, published_year || null, language || "O'zbek", description || '', copies, copies, shelf_number || '']);

    for (let i = 0; i < copies; i++) {
      await db.query('INSERT INTO book_copies (id, book_id, status) VALUES (?, ?, ?)', [`bc-${uuidv4().slice(0, 8)}`, bookId, 'available']);
    }
    const result = await db.query('SELECT * FROM books WHERE id = ?', [bookId]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create book error:', err);
    res.status(500).json({ error: 'Server xatosi' });
  }
});

router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { isbn, title, author_id, category_id, publisher, published_year, language, description, total_copies, shelf_number } = req.body;
    await db.query(
      'UPDATE books SET isbn=?, title=?, author_id=?, category_id=?, publisher=?, published_year=?, language=?, description=?, total_copies=?, shelf_number=?, updated_at=datetime(\'now\') WHERE id=?',
      [isbn, title, author_id || null, category_id || null, publisher || null, published_year || null, language, description, total_copies, shelf_number, req.params.id]);
    const result = await db.query('SELECT * FROM books WHERE id = ?', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Kitob topilmadi' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update book error:', err);
    res.status(500).json({ error: 'Server xatosi' });
  }
});

router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    await db.query('DELETE FROM book_copies WHERE book_id = ?', [req.params.id]);
    await db.query('DELETE FROM books WHERE id = ?', [req.params.id]);
    res.json({ message: "Kitob o'chirildi" });
  } catch (err) {
    console.error('Delete book error:', err);
    res.status(500).json({ error: 'Server xatosi' });
  }
});

router.post('/authors', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { name } = req.body;
    await db.query('INSERT INTO authors (name) VALUES (?)', [name]);
    const result = await db.query('SELECT * FROM authors ORDER BY id DESC LIMIT 1');
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: 'Server xatosi' }); }
});

router.post('/categories', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { name } = req.body;
    await db.query('INSERT INTO categories (name) VALUES (?)', [name]);
    const result = await db.query('SELECT * FROM categories ORDER BY id DESC LIMIT 1');
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: 'Server xatosi' }); }
});

module.exports = router;
