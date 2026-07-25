function renderSidebar() {
  const user = getUser();
  if (!user) return;

  const isAdminUser = user.role === 'admin';
  const pagePath = window.location.pathname;

  let navHTML = '';

  if (isAdminUser) {
    navHTML = `
      <div class="sidebar-section" data-i18n="nav_main">${t('nav_main')}</div>
      <a class="sidebar-link ${pagePath.includes('dashboard') ? 'active' : ''}" href="dashboard.html">
        <span class="icon">📊</span> <span data-i18n="nav_dashboard">${t('nav_dashboard')}</span>
      </a>
      <a class="sidebar-link ${pagePath.includes('scan') ? 'active' : ''}" href="scan.html">
        <span class="icon">📷</span> <span data-i18n="nav_scan">${t('nav_scan')}</span>
      </a>
      <a class="sidebar-link ${pagePath.includes('return') ? 'active' : ''}" href="return.html">
        <span class="icon">🔄</span> <span data-i18n="nav_return">${t('nav_return')}</span>
      </a>
      <div class="sidebar-section" data-i18n="nav_management">${t('nav_management')}</div>
      <a class="sidebar-link ${pagePath.includes('admin/books') ? 'active' : ''}" href="books.html">
        <span class="icon">📚</span> <span data-i18n="nav_manage_books">${t('nav_manage_books')}</span>
      </a>
      <a class="sidebar-link ${pagePath.includes('admin/users') ? 'active' : ''}" href="users.html">
        <span class="icon">👥</span> <span data-i18n="nav_manage_users">${t('nav_manage_users')}</span>
      </a>
      <a class="sidebar-link ${pagePath.includes('statistics') ? 'active' : ''}" href="statistics.html">
        <span class="icon">📈</span> <span data-i18n="nav_statistics">${t('nav_statistics')}</span>
      </a>
    `;
  } else {
    navHTML = `
      <div class="sidebar-section" data-i18n="nav_main">${t('nav_main')}</div>
      <a class="sidebar-link ${pagePath.includes('dashboard') ? 'active' : ''}" href="${isAdminUser ? '' : '../../'}pages/dashboard.html">
        <span class="icon">🏠</span> <span data-i18n="nav_home">${t('nav_home')}</span>
      </a>
      <a class="sidebar-link ${pagePath.includes('books') && !pagePath.includes('admin') ? 'active' : ''}" href="${isAdminUser ? '' : '../../'}pages/books.html">
        <span class="icon">📚</span> <span data-i18n="nav_books">${t('nav_books')}</span>
      </a>
      <a class="sidebar-link ${pagePath.includes('reservations') ? 'active' : ''}" href="${isAdminUser ? '' : '../../'}pages/reservations.html">
        <span class="icon">📋</span> <span data-i18n="nav_reservations">${t('nav_reservations')}</span>
      </a>
      <div class="sidebar-section" data-i18n="nav_account">${t('nav_account')}</div>
      <a class="sidebar-link ${pagePath.includes('profile') ? 'active' : ''}" href="${isAdminUser ? '' : '../../'}pages/profile.html">
        <span class="icon">👤</span> <span data-i18n="nav_profile">${t('nav_profile')}</span>
      </a>
    `;
  }

  const initials = getUserInitials(user);
  const roleKey = user.role === 'student' ? 'student' : user.role === 'teacher' ? 'teacher' : 'admin';
  const langOptions = langOptionsList();

  document.getElementById('sidebar').innerHTML = `
    <div class="sidebar-header">
      <h2>📚 <span data-i18n="app_name">${t('app_name')}</span></h2>
      <p data-i18n="app_desc">${t('app_desc')}</p>
    </div>
    <nav class="sidebar-nav">
      ${navHTML}
    </nav>
    <div class="sidebar-lang">
      ${langOptions.map(l => `
        <button class="lang-btn ${l.code === getLang() ? 'active' : ''}" onclick="switchLang('${l.code}')">
          ${l.flag} ${l.label}
        </button>
      `).join('')}
    </div>
    <div class="sidebar-footer">
      <div class="sidebar-user">
        <div class="sidebar-avatar">${initials}</div>
        <div class="sidebar-user-info">
          <div class="sidebar-user-name">${getUserFullName(user)}</div>
          <div class="sidebar-user-role" data-i18n="${roleKey}">${t(roleKey)}</div>
        </div>
      </div>
      <button onclick="logout()" class="btn btn-outline btn-sm" style="width:100%;margin-top:12px;">
        <span data-i18n="logout">${t('logout')}</span>
      </button>
    </div>
  `;
}

function langOptionsList() {
  return [
    { code: 'uz', label: "O'zbek", flag: "🇺🇿" },
    { code: 'ru', label: "Русский", flag: "🇷🇺" },
    { code: 'en', label: "English", flag: "🇬🇧" },
  ];
}

function switchLang(lang) {
  setLanguage(lang);
  renderSidebar();
  if (typeof refreshPage === 'function') refreshPage();
}

function applyLangToElements() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const val = t(key);
    if (val) el.textContent = val;
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    const val = t(key);
    if (val) el.placeholder = val;
  });
}
