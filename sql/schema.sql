CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE user_role AS ENUM ('student', 'teacher', 'admin');
CREATE TYPE book_status AS ENUM ('available', 'reserved', 'borrowed', 'lost', 'repair');
CREATE TYPE reservation_status AS ENUM ('reserved', 'borrowed', 'returned', 'cancelled');
CREATE TYPE class_letter AS ENUM ('A', 'B', 'V', 'G', 'E');

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'student',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE student_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    father_name VARCHAR(100),
    phone VARCHAR(20),
    class_number INTEGER NOT NULL CHECK (class_number BETWEEN 1 AND 11),
    class_letter class_letter NOT NULL,
    student_id VARCHAR(20) UNIQUE,
    profile_image VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE teacher_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    subject VARCHAR(100),
    position VARCHAR(100),
    teacher_id VARCHAR(20) UNIQUE,
    profile_image VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE authors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE books (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    isbn VARCHAR(20) UNIQUE,
    title VARCHAR(300) NOT NULL,
    author_id INTEGER REFERENCES authors(id) ON DELETE SET NULL,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    publisher VARCHAR(200),
    published_year INTEGER,
    language VARCHAR(50) DEFAULT 'O''zbek',
    description TEXT,
    cover_image VARCHAR(255),
    total_copies INTEGER DEFAULT 1,
    available_copies INTEGER DEFAULT 1,
    shelf_number VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE book_copies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    status book_status DEFAULT 'available',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE reservations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reservation_id VARCHAR(20) UNIQUE NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    book_copy_id UUID REFERENCES book_copies(id) ON DELETE SET NULL,
    qr_token VARCHAR(255) UNIQUE NOT NULL,
    status reservation_status DEFAULT 'reserved',
    reserved_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '7 days')
);

CREATE TABLE borrowings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    book_copy_id UUID REFERENCES book_copies(id) ON DELETE SET NULL,
    return_id VARCHAR(20) UNIQUE NOT NULL,
    borrowed_at TIMESTAMP DEFAULT NOW(),
    due_date TIMESTAMP NOT NULL DEFAULT (NOW() + INTERVAL '14 days'),
    returned_at TIMESTAMP,
    status VARCHAR(20) DEFAULT 'borrowed'
);

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_books_title ON books(title);
CREATE INDEX idx_books_author ON books(author_id);
CREATE INDEX idx_books_category ON books(category_id);
CREATE INDEX idx_reservations_user ON reservations(user_id);
CREATE INDEX idx_reservations_status ON reservations(status);
CREATE INDEX idx_reservations_id ON reservations(reservation_id);
CREATE INDEX idx_borrowings_user ON borrowings(user_id);
CREATE INDEX idx_borrowings_return_id ON borrowings(return_id);
CREATE INDEX idx_borrowings_status ON borrowings(status);
CREATE INDEX idx_notifications_user ON notifications(user_id);

INSERT INTO authors (name) VALUES
('Alisher Navoiy'), ('Abdulla Qodiriy'), ('Cho''lpon'), ('O''tkir Hoshimov'),
('Mukhtar A''zamov'), ('Erkin Vohidov'), ('Said Ahmad'), ('Oybek');

INSERT INTO categories (name) VALUES
('Adabiyot'), ('Tarix'), ('Falsafa'), ('Ilmiy'),
('Diniy'), ('Bolalar adabiyoti'), ('Roman'), ('She''r');

INSERT INTO users (username, email, password_hash, role) VALUES
('admin', 'admin@school.uz', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin');

INSERT INTO student_profiles (user_id, first_name, last_name, father_name, phone, class_number, class_letter, student_id)
SELECT id, 'Test', 'O''quvchi', 'Otasi', '+998901234567', 9, 'B', 'STU-001'
FROM users WHERE username = 'admin';

INSERT INTO books (isbn, title, author_id, category_id, publisher, published_year, language, description, total_copies, available_copies, shelf_number) VALUES
('978-9943-123-45-1', 'Xamsa', 1, 1, 'Sharq', 2024, 'O''zbek', 'Alisher Navoiyning asosiy asari', 5, 3, 'A-12'),
('978-9943-123-45-2', 'Mehmon', 2, 7, 'O''qituvchi', 2023, 'O''zbek', 'Abdulla Qodiriyning mashhur romani', 3, 2, 'B-05'),
('978-9943-123-45-3', 'Hayot bobokalon', 4, 7, 'Adolat', 2022, 'O''zbek', 'O''tkir Hoshimovning badiiy asari', 4, 4, 'A-08'),
('978-9943-123-45-4', 'Buzilgan umidlar', 3, 8, 'Yangi asr', 2021, 'O''zbek', 'Cho''lponning she''rlar to''plami', 2, 2, 'C-15');
