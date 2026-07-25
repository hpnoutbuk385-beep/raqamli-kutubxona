# 📚 Raqamli Kutubxona - School Library Management System

Maktab kutubxonasi uchun zamonaviy boshqaruv tizimi.

## 🚀 Xususiyatlar

- 📚 Elektron kitob katalogni boshqarish
- 👨‍🎓 O'quvchilar kitob bron qilishi
- 👨‍🏫 O'qituvchilar kitob bron qilishi
- 📱 QR-kod orqali bronni tasdiqlash
- 🔑 Return ID orqali kitob qaytarish
- 📊 Admin dashboard va statistika
- 🔔 Bildirishnomalar tizimi

## 🛠️ Texnologiyalar

- **Backend:** Node.js + Express.js
- **Frontend:** HTML + CSS + JavaScript
- **Database:** SQLite (sql.js)
- **Auth:** JWT (JSON Web Token)
- **QR:** qrcode + html5-qrcode

## 🏃‍♂️ Ishga tushirish

```bash
# 1. Clone
git clone https://github.com/hpnoutbuk385-beep/raqamli-kutubxona.git
cd raqamli-kutubxona

# 2. O'rnatish
npm install

# 3. Serverni ishga tushirish
npm start
```

Brauzer da oching: `http://localhost:3000`

## 🔐 Test login

| Foydalanuvchi | Login | Parol |
|---|---|---|
| Admin | admin | admin123 |

## 📁 Loyiha tuzilishi

```
├── backend/
│   ├── server.js          # Express server
│   ├── config/database.js  # SQLite DB
│   ├── middleware/auth.js   # JWT auth
│   └── routes/             # API routes
├── frontend/
│   ├── index.html          # Login
│   ├── css/style.css       # Uslublar
│   ├── js/                 # JavaScript
│   └── pages/              # Sahifalar
└── sql/schema.sql          # DB schema
```

## 📋 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/login | Kirish |
| POST | /api/auth/register | Ro'yxatdan o'tish |
| GET | /api/books | Kitoblar ro'yxati |
| POST | /api/reservations | Bron qilish |
| POST | /api/borrowing/confirm | Kitob berish |
| POST | /api/borrowing/return | Kitob qaytarish |

---

Made with ❤️ for Maktab Kutubxonasi
