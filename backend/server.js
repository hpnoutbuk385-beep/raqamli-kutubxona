const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, '..', 'frontend')));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/books', require('./routes/books'));
app.use('/api/reservations', require('./routes/reservations'));
app.use('/api/borrowing', require('./routes/borrowing'));
app.use('/api/users', require('./routes/users'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/notifications', require('./routes/notifications'));

app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'API topilmadi' });
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

const { getDb } = require('./config/database');

async function start() {
  await getDb();
  console.log('Database ready.');
  app.listen(PORT, () => {
    console.log(`Server ishga tushdi: http://localhost:${PORT}`);
  });
}

start().catch(err => {
  console.error('Server start error:', err);
  process.exit(1);
});
