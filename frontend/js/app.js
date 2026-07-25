function renderSidebar() {
  const user = getUser();
  if (!user) return;

  const isAdminUser = user.role === 'admin';
  const basePath = isAdminUser ? '' : '../../';
  const pagePath = window.location.pathname;

  let navHTML = '';

  if (isAdminUser) {
    navHTML = `
      <div class="sidebar-section">Asosiy</div>
      <a class="sidebar-link ${pagePath.includes('dashboard') ? 'active' : ''}" href="dashboard.html">
        <span class="icon">📊</span> Dashboard
      </a>
      <a class="sidebar-link ${pagePath.includes('scan') ? 'active' : ''}" href="scan.html">
        <span class="icon">📷</span> QR Scanner
      </a>
      <a class="sidebar-link ${pagePath.includes('return') ? 'active' : ''}" href="return.html">
        <span class="icon">🔄</span> Kitob qaytarish
      </a>
      <div class="sidebar-section">Boshqarish</div>
      <a class="sidebar-link ${pagePath.includes('admin/books') ? 'active' : ''}" href="books.html">
        <span class="icon">📚</span> Kitoblar
      </a>
      <a class="sidebar-link ${pagePath.includes('admin/users') ? 'active' : ''}" href="users.html">
        <span class="icon">👥</span> Foydalanuvchilar
      </a>
      <a class="sidebar-link ${pagePath.includes('statistics') ? 'active' : ''}" href="statistics.html">
        <span class="icon">📈</span> Statistika
      </a>
    `;
  } else {
    navHTML = `
      <div class="sidebar-section">Asosiy</div>
      <a class="sidebar-link ${pagePath.includes('dashboard') ? 'active' : ''}" href="${basePath}pages/dashboard.html">
        <span class="icon">🏠</span> Bosh sahifa
      </a>
      <a class="sidebar-link ${pagePath.includes('books') && !pagePath.includes('admin') ? 'active' : ''}" href="${basePath}pages/books.html">
        <span class="icon">📚</span> Kitoblar
      </a>
      <a class="sidebar-link ${pagePath.includes('reservations') ? 'active' : ''}" href="${basePath}pages/reservations.html">
        <span class="icon">📋</span> Bronlarim
      </a>
      <div class="sidebar-section">Hisob</div>
      <a class="sidebar-link ${pagePath.includes('profile') ? 'active' : ''}" href="${basePath}pages/profile.html">
        <span class="icon">👤</span> Profil
      </a>
    `;
  }

  const initials = getUserInitials(user);
  const roleLabel = user.role === 'student' ? 'O\'quvchi' : user.role === 'teacher' ? 'O\'qituvchi' : 'Admin';

  document.getElementById('sidebar').innerHTML = `
    <div class="sidebar-header">
      <h2>📚 Kutubxona</h2>
      <p>Library Management System</p>
    </div>
    <nav class="sidebar-nav">
      ${navHTML}
    </nav>
    <div class="sidebar-footer">
      <div class="sidebar-user">
        <div class="sidebar-avatar">${initials}</div>
        <div class="sidebar-user-info">
          <div class="sidebar-user-name">${getUserFullName(user)}</div>
          <div class="sidebar-user-role">${roleLabel}</div>
        </div>
      </div>
      <button onclick="logout()" class="btn btn-outline btn-sm" style="width:100%;margin-top:12px;">
        Chiqish
      </button>
    </div>
  `;
}
