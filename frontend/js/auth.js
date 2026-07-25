function getUser() {
  try {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  } catch { return null; }
}

function getToken() {
  return localStorage.getItem('token');
}

function isLoggedIn() {
  return !!getToken() && !!getUser();
}

function isAdmin() {
  const user = getUser();
  return user && user.role === 'admin';
}

function isTeacher() {
  const user = getUser();
  return user && user.role === 'teacher';
}

function isStudent() {
  const user = getUser();
  return user && user.role === 'student';
}

function saveAuth(token, user) {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/';
}

function getUserFullName(user) {
  if (!user || !user.profile) return user?.username || '';
  const p = user.profile;
  return `${p.last_name || ''} ${p.first_name || ''}`.trim() || user.username;
}

function getUserInitials(user) {
  const name = getUserFullName(user);
  const parts = name.split(' ').filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.substring(0, 2).toUpperCase();
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatDateTime(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
}

function getBookColor(index) {
  const colors = [
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
    'linear-gradient(135deg, #fccb90 0%, #d57eeb 100%)',
    'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)',
  ];
  return colors[index % colors.length];
}

function showAlert(message, type = 'error') {
  const existing = document.querySelector('.alert');
  if (existing) existing.remove();
  const div = document.createElement('div');
  div.className = `alert alert-${type}`;
  div.textContent = message;
  document.querySelector('.page-header')?.after(div) || document.body.prepend(div);
  setTimeout(() => div.remove(), 5000);
}

function showLoading(container) {
  container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
}

function showEmpty(container, icon, title, message) {
  container.innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">${icon}</div>
      <h3>${title}</h3>
      <p>${message}</p>
    </div>
  `;
}

function statusBadge(status) {
  const map = {
    available: ['Mavjud', 'badge-available'],
    reserved: ['Bron qilingan', 'badge-reserved'],
    borrowed: ['Olingan', 'badge-borrowed'],
    returned: ['Qaytarilgan', 'badge-returned'],
    cancelled: ['Bekor qilingan', 'badge-cancelled'],
    lost: ['Yo\'qolgan', 'badge-borrowed'],
    repair: ['Ta\'mirda', 'badge-reserved'],
    overdue: ['Kechikkan', 'badge-overdue'],
  };
  const [label, cls] = map[status] || [status, 'badge-available'];
  return `<span class="badge ${cls}">${label}</span>`;
}

function roleBadge(role) {
  const map = {
    student: ['O\'quvchi', 'badge-student'],
    teacher: ['O\'qituvchi', 'badge-teacher'],
    admin: ['Admin', 'badge-admin'],
  };
  const [label, cls] = map[role] || [role, 'badge-admin'];
  return `<span class="badge ${cls}">${label}</span>`;
}

function isOverdue(dueDate) {
  return new Date(dueDate) < new Date();
}
