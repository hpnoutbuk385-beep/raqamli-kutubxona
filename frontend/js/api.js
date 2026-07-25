const API_BASE = '/api';

async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  };

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, config);
    const data = await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/';
        return;
      }
      throw new Error(data.error || 'Xatolik yuz berdi');
    }

    return data;
  } catch (error) {
    throw error;
  }
}

const api = {
  auth: {
    login: (username, password) =>
      apiRequest('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
    register: (data) =>
      apiRequest('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
    me: () => apiRequest('/auth/me'),
    updateProfile: (data) =>
      apiRequest('/auth/me', { method: 'PUT', body: JSON.stringify(data) }),
  },

  books: {
    list: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return apiRequest(`/books${query ? '?' + query : ''}`);
    },
    get: (id) => apiRequest(`/books/${id}`),
    create: (data) =>
      apiRequest('/books', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) =>
      apiRequest(`/books/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) =>
      apiRequest(`/books/${id}`, { method: 'DELETE' }),
    categories: () => apiRequest('/books/categories'),
    authors: () => apiRequest('/books/authors'),
    createAuthor: (data) =>
      apiRequest('/books/authors', { method: 'POST', body: JSON.stringify(data) }),
    createCategory: (data) =>
      apiRequest('/books/categories', { method: 'POST', body: JSON.stringify(data) }),
  },

  reservations: {
    list: () => apiRequest('/reservations'),
    create: (book_id) =>
      apiRequest('/reservations', { method: 'POST', body: JSON.stringify({ book_id }) }),
    qr: (id) => apiRequest(`/reservations/${id}/qr`),
    cancel: (id) =>
      apiRequest(`/reservations/${id}/cancel`, { method: 'POST' }),
  },

  borrowing: {
    confirm: (qr_token) =>
      apiRequest('/borrowing/confirm', { method: 'POST', body: JSON.stringify({ qr_token }) }),
    my: () => apiRequest('/borrowing/my'),
    all: () => apiRequest('/borrowing/all'),
    returnBook: (return_id) =>
      apiRequest('/borrowing/return', { method: 'POST', body: JSON.stringify({ return_id: return_id.toUpperCase() }) }),
    overdue: () => apiRequest('/borrowing/overdue'),
  },

  users: {
    students: (search = '') =>
      apiRequest(`/users/students${search ? '?search=' + encodeURIComponent(search) : ''}`),
    teachers: (search = '') =>
      apiRequest(`/users/teachers${search ? '?search=' + encodeURIComponent(search) : ''}`),
    createStudent: (data) =>
      apiRequest('/users/students', { method: 'POST', body: JSON.stringify(data) }),
    createTeacher: (data) =>
      apiRequest('/users/teachers', { method: 'POST', body: JSON.stringify(data) }),
    toggleActive: (id) =>
      apiRequest(`/users/${id}/toggle-active`, { method: 'PUT' }),
    delete: (id) =>
      apiRequest(`/users/${id}`, { method: 'DELETE' }),
  },

  admin: {
    stats: () => apiRequest('/admin/stats'),
    popularBooks: () => apiRequest('/admin/popular-books'),
    activeStudents: () => apiRequest('/admin/active-students'),
  },

  notifications: {
    list: () => apiRequest('/notifications'),
    unreadCount: () => apiRequest('/notifications/unread-count'),
    markRead: (id) =>
      apiRequest(`/notifications/${id}/read`, { method: 'PUT' }),
    markAllRead: () =>
      apiRequest('/notifications/read-all', { method: 'PUT' }),
  },
};
