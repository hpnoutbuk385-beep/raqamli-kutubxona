const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', '..', 'data', 'library.db');

let db = null;
let saveTimer = null;

function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => saveDb(), 500);
}

async function getDb() {
  if (db) return db;
  const SQL = await initSqlJs();
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run('PRAGMA journal_mode = WAL');
  db.run('PRAGMA foreign_keys = ON');
  initSchema(db);
  seedData(db);
  saveDb();
  return db;
}

function saveDb() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DB_PATH, buffer);
}

function toSql(text) {
  let sql = text
    .replace(/NOW\(\)/g, "datetime('now')")
    .replace(/ILIKE/g, 'LIKE')
    .replace(/RETURNING\s+\*/gi, '')
    .replace(/RETURNING\s+[\w_,\s]+/gi, '')
    .replace(/;\s*$/, '');
  let idx = 0;
  sql = sql.replace(/\$\d+/g, () => `?`);
  return sql;
}

function initSchema(db) {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, email TEXT,
    password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'student',
    is_active INTEGER DEFAULT 1, created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS student_profiles (
    id TEXT PRIMARY KEY, user_id TEXT UNIQUE NOT NULL,
    first_name TEXT NOT NULL, last_name TEXT NOT NULL,
    father_name TEXT DEFAULT '', phone TEXT DEFAULT '',
    class_number INTEGER NOT NULL, class_letter TEXT NOT NULL,
    student_id TEXT UNIQUE, profile_image TEXT,
    created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS teacher_profiles (
    id TEXT PRIMARY KEY, user_id TEXT UNIQUE NOT NULL,
    first_name TEXT NOT NULL, last_name TEXT NOT NULL,
    phone TEXT DEFAULT '', subject TEXT DEFAULT '', position TEXT DEFAULT '',
    teacher_id TEXT UNIQUE, profile_image TEXT,
    created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS authors (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS books (
    id TEXT PRIMARY KEY, isbn TEXT UNIQUE, title TEXT NOT NULL,
    author_id INTEGER, category_id INTEGER,
    publisher TEXT, published_year INTEGER, language TEXT DEFAULT 'O''zbek',
    description TEXT DEFAULT '', cover_image TEXT,
    total_copies INTEGER DEFAULT 1, available_copies INTEGER DEFAULT 1,
    shelf_number TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS book_copies (
    id TEXT PRIMARY KEY, book_id TEXT NOT NULL, status TEXT DEFAULT 'available',
    created_at TEXT DEFAULT (datetime('now'))
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS reservations (
    id TEXT PRIMARY KEY, reservation_id TEXT UNIQUE NOT NULL,
    user_id TEXT NOT NULL, book_id TEXT NOT NULL, book_copy_id TEXT,
    qr_token TEXT UNIQUE NOT NULL, status TEXT DEFAULT 'reserved',
    reserved_at TEXT DEFAULT (datetime('now')),
    expires_at TEXT DEFAULT (datetime('now', '+7 days'))
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS borrowings (
    id TEXT PRIMARY KEY, reservation_id TEXT NOT NULL,
    user_id TEXT NOT NULL, book_id TEXT NOT NULL, book_copy_id TEXT,
    return_id TEXT UNIQUE NOT NULL, borrowed_at TEXT DEFAULT (datetime('now')),
    due_date TEXT NOT NULL DEFAULT (datetime('now', '+14 days')),
    returned_at TEXT, status TEXT DEFAULT 'borrowed'
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL, title TEXT NOT NULL,
    message TEXT NOT NULL, is_read INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  )`);
}

function seedData(db) {
  const existing = db.exec("SELECT COUNT(*) as c FROM users");
  if (existing[0] && existing[0].values[0][0] > 0) return;
  const bcrypt = require('bcryptjs');
  const h = bcrypt.hashSync('admin123', 10);
  db.run(`INSERT INTO users (id, username, email, password_hash, role) VALUES (?, ?, ?, ?, ?)`,
    ['u-admin-001', 'admin', 'admin@school.uz', h, 'admin']);
  ['Alisher Navoiy','Abdulla Qodiriy',"Cho'lpon","O'tkir Hoshimov","Mukhtar A'zamov",'Erkin Vohidov','Said Ahmad','Oybek'].forEach(n => db.run(`INSERT INTO authors (name) VALUES (?)`, [n]));
  ['Adabiyot','Tarix','Falsafa','Ilmiy','Diniy','Bolalar adabiyoti',"Roman","She'r"].forEach(n => db.run(`INSERT INTO categories (name) VALUES (?)`, [n]));
  const books = [
    ['b-001','978-9943-123-45-1','Xamsa',1,1,'Sharq',2024,"O'zbek",'Navoiyning asosiy asari',5,3,'A-12'],
    ['b-002','978-9943-123-45-2','Mehmon',2,7,"O'qituvchi",2023,"O'zbek",'Qodiriyning romani',3,2,'B-05'],
    ['b-003','978-9943-123-45-3','Hayot bobokalon',4,7,'Adolat',2022,"O'zbek",'Hoshimovning asari',4,4,'A-08'],
    ['b-004','978-9943-123-45-4',"Buzilgan umidlar",3,8,'Yangi asr',2021,"O'zbek",'She\'rlar to\'plami',2,2,'C-15'],
  ];
  books.forEach(b => db.run(`INSERT INTO books (id,isbn,title,author_id,category_id,publisher,published_year,language,description,total_copies,available_copies,shelf_number) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`, b));
  [[3,'bc-001','b-001'],[2,'bc-002','b-002'],[4,'bc-003','b-003'],[2,'bc-004','b-004']].forEach(([n,prefix,bid]) => {
    for(let i=0;i<n;i++) db.run(`INSERT INTO book_copies (id,book_id,status) VALUES (?,?,?)`,[`${prefix}-${i}`,bid,'available']);
  });
}

module.exports = {
  query: async (text, params) => {
    const database = await getDb();
    const sql = toSql(text);
    const isSelect = /^\s*SELECT/i.test(sql);

    if (isSelect) {
      try {
        const stmt = database.prepare(sql);
        if (params && params.length > 0) stmt.bind(params);
        const rows = [];
        while (stmt.step()) rows.push(stmt.getAsObject());
        stmt.free();
        return { rows };
      } catch (e) {
        console.error('SELECT error:', e.message);
        console.error('SQL:', sql);
        return { rows: [] };
      }
    }

    try {
      database.run(sql, params || []);
      scheduleSave();

      const isInsert = /^\s*INSERT/i.test(sql);
      if (isInsert) {
        const ri = database.exec("SELECT last_insert_rowid() as id");
        const lastID = ri[0] ? ri[0].values[0][0] : null;
        const matches = text.match(/INSERT\s+INTO\s+\w+\s*\(([^)]+)\)/i);
        const hasId = matches && matches[1].toLowerCase().includes('id');
        const insertedId = hasId && params && params[0] ? params[0] : lastID;
        return { rows: [{ id: insertedId, lastID }], changes: database.getRowsModified() };
      }

      return { rows: [], changes: database.getRowsModified() };
    } catch (e) {
      console.error('Query error:', e.message);
      console.error('SQL:', sql);
      console.error('Params:', params);
      throw e;
    }
  },

  getDb,
  saveDb,
};
