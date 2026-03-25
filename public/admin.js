async function api(url, options = {}) {
  const response = await fetch(url, {
    credentials: 'same-origin',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || data.error || `HTTP ${response.status}`);
  }
  return data;
}

function setStatus(text, isError = false) {
  const node = document.getElementById('adminStatus');
  if (!node) return;
  node.textContent = text || '';
  node.style.color = isError ? '#ff9dc5' : '#d8c2ff';
}

function fmtDate(value) {
  const d = new Date(value || '');
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('ru-RU');
}

function initTabs() {
  const tabButtons = Array.from(document.querySelectorAll('.admin-tab-btn'));
  const sections = {
    roles: document.getElementById('adminRoles'),
    participants: document.getElementById('adminParticipants'),
    logs: document.getElementById('adminLogs'),
    posts: document.getElementById('adminPosts'),
  };
  tabButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const key = button.dataset.tab;
      tabButtons.forEach((b) => b.classList.toggle('active', b === button));
      Object.entries(sections).forEach(([id, node]) => {
        if (!node) return;
        node.classList.toggle('active', id === key);
      });
    });
  });
}

function rolePermsFromForm() {
  return {
    canManageRoles: Boolean(document.getElementById('permRoles')?.checked),
    canManageParticipants: Boolean(document.getElementById('permUsers')?.checked),
    canViewLogs: Boolean(document.getElementById('permLogs')?.checked),
    canManagePosts: Boolean(document.getElementById('permPosts')?.checked),
  };
}

async function loadRoles() {
  const wrap = document.getElementById('rolesList');
  if (!wrap) return;
  const data = await api('/api/admin/roles');
  const roles = Array.isArray(data.roles) ? data.roles : [];
  wrap.innerHTML = '';
  if (!roles.length) {
    wrap.innerHTML = '<p class="admin-muted">Ролей пока нет.</p>';
    return;
  }
  roles.forEach((role) => {
    const item = document.createElement('article');
    item.className = 'admin-item';
    item.innerHTML = `
      <div class="admin-item-head">
        <span class="admin-item-title">${role.name}</span>
        <span class="admin-badge" style="border-color:${role.color}; color:${role.color}">${role.color}</span>
      </div>
      <div class="admin-perms">
        ${role.permissions?.canManageRoles ? '<span class="admin-badge">Роли</span>' : ''}
        ${role.permissions?.canManageParticipants ? '<span class="admin-badge">Участники</span>' : ''}
        ${role.permissions?.canViewLogs ? '<span class="admin-badge">Логи</span>' : ''}
        ${role.permissions?.canManagePosts ? '<span class="admin-badge">Посты</span>' : ''}
      </div>
      <div class="admin-actions">
        <button class="cta cta-ghost" data-action="delete-role" data-id="${role.id}" type="button">Удалить</button>
      </div>
    `;
    wrap.append(item);
  });

  wrap.querySelectorAll('[data-action="delete-role"]').forEach((button) => {
    button.addEventListener('click', async () => {
      const id = button.dataset.id;
      if (!id) return;
      if (!window.confirm('Удалить роль?')) return;
      try {
        await api(`/api/admin/roles/${encodeURIComponent(id)}`, { method: 'DELETE' });
        setStatus('Роль удалена.');
        await loadRoles();
        await loadLogs();
      } catch (error) {
        setStatus(`Ошибка удаления роли: ${error.message}`, true);
      }
    });
  });
}

async function loadParticipants() {
  const wrap = document.getElementById('participantsList');
  if (!wrap) return;
  const data = await api('/api/admin/users');
  const users = Array.isArray(data.users) ? data.users : [];
  wrap.innerHTML = '';
  if (!users.length) {
    wrap.innerHTML = '<p class="admin-muted">Участников пока нет.</p>';
    return;
  }
  users.forEach((user) => {
    const name = user.global_name || user.username || user.id;
    const item = document.createElement('article');
    item.className = 'admin-item';
    item.innerHTML = `
      <div class="admin-item-head">
        <span class="admin-item-title">${name}</span>
        <span class="admin-badge">ID: ${user.id}</span>
      </div>
      <div class="admin-muted">Логин: ${user.username || '—'}</div>
      <div class="admin-muted">Последний вход: ${fmtDate(user.lastSeenAt)}</div>
      <div class="admin-muted">Входов: ${Number(user.loginCount || 0)}</div>
    `;
    wrap.append(item);
  });
}

async function loadLogs() {
  const wrap = document.getElementById('logsList');
  if (!wrap) return;
  const data = await api('/api/admin/logs');
  const logs = Array.isArray(data.logs) ? data.logs : [];
  wrap.innerHTML = '';
  if (!logs.length) {
    wrap.innerHTML = '<p class="admin-muted">Логов пока нет.</p>';
    return;
  }
  logs.forEach((log) => {
    const item = document.createElement('article');
    item.className = 'admin-item';
    item.innerHTML = `
      <div class="admin-item-head">
        <span class="admin-item-title">${log.action}</span>
        <span class="admin-badge">${log.level || 'info'}</span>
      </div>
      <div class="admin-muted">${log.section || 'general'} • ${fmtDate(log.createdAt)}</div>
      <div>${log.message || ''}</div>
      <div class="admin-muted">Исполнитель: ${log.actor || '—'}</div>
    `;
    wrap.append(item);
  });
}

async function loadPosts() {
  const wrap = document.getElementById('postsList');
  if (!wrap) return;
  const data = await api('/api/admin/posts');
  const posts = Array.isArray(data.posts) ? data.posts : [];
  wrap.innerHTML = '';
  if (!posts.length) {
    wrap.innerHTML = '<p class="admin-muted">Постов пока нет.</p>';
    return;
  }
  posts.forEach((post) => {
    const item = document.createElement('article');
    item.className = 'admin-item';
    item.innerHTML = `
      <div class="admin-item-head">
        <span class="admin-item-title">${post.title}</span>
        <span class="admin-badge">${post.published ? 'Опубликован' : 'Черновик'}</span>
      </div>
      <div class="admin-muted">Обновлено: ${fmtDate(post.updatedAt)}</div>
      <div>${String(post.text || '').slice(0, 260)}</div>
      <div class="admin-actions">
        <button class="cta cta-ghost" data-action="toggle-post" data-id="${post.id}" data-published="${post.published ? '1' : '0'}" type="button">
          ${post.published ? 'Снять с публикации' : 'Опубликовать'}
        </button>
        <button class="cta cta-ghost" data-action="delete-post" data-id="${post.id}" type="button">Удалить</button>
      </div>
    `;
    wrap.append(item);
  });

  wrap.querySelectorAll('[data-action="toggle-post"]').forEach((button) => {
    button.addEventListener('click', async () => {
      const id = button.dataset.id;
      if (!id) return;
      const published = button.dataset.published === '1';
      try {
        await api(`/api/admin/posts/${encodeURIComponent(id)}`, {
          method: 'PUT',
          body: JSON.stringify({ published: !published }),
        });
        setStatus('Статус поста обновлен.');
        await loadPosts();
        await loadLogs();
      } catch (error) {
        setStatus(`Ошибка обновления поста: ${error.message}`, true);
      }
    });
  });

  wrap.querySelectorAll('[data-action="delete-post"]').forEach((button) => {
    button.addEventListener('click', async () => {
      const id = button.dataset.id;
      if (!id) return;
      if (!window.confirm('Удалить пост?')) return;
      try {
        await api(`/api/admin/posts/${encodeURIComponent(id)}`, { method: 'DELETE' });
        setStatus('Пост удален.');
        await loadPosts();
        await loadLogs();
      } catch (error) {
        setStatus(`Ошибка удаления поста: ${error.message}`, true);
      }
    });
  });
}

function bindActions() {
  const createRoleBtn = document.getElementById('createRoleBtn');
  if (createRoleBtn) {
    createRoleBtn.addEventListener('click', async () => {
      const name = String(document.getElementById('roleName')?.value || '').trim();
      const color = String(document.getElementById('roleColor')?.value || '#7d2dff');
      if (!name) {
        setStatus('Укажите название роли.', true);
        return;
      }
      try {
        await api('/api/admin/roles', {
          method: 'POST',
          body: JSON.stringify({ name, color, permissions: rolePermsFromForm() }),
        });
        setStatus('Роль создана.');
        document.getElementById('roleName').value = '';
        await loadRoles();
        await loadLogs();
      } catch (error) {
        setStatus(`Ошибка создания роли: ${error.message}`, true);
      }
    });
  }

  const addLogBtn = document.getElementById('addLogBtn');
  if (addLogBtn) {
    addLogBtn.addEventListener('click', async () => {
      const message = String(document.getElementById('logMessage')?.value || '').trim();
      if (!message) {
        setStatus('Введите текст лога.', true);
        return;
      }
      try {
        await api('/api/admin/logs', { method: 'POST', body: JSON.stringify({ message }) });
        setStatus('Лог добавлен.');
        document.getElementById('logMessage').value = '';
        await loadLogs();
      } catch (error) {
        setStatus(`Ошибка добавления лога: ${error.message}`, true);
      }
    });
  }

  const createPostBtn = document.getElementById('createPostBtn');
  if (createPostBtn) {
    createPostBtn.addEventListener('click', async () => {
      const title = String(document.getElementById('postTitle')?.value || '').trim();
      const text = String(document.getElementById('postText')?.value || '').trim();
      const imageUrl = String(document.getElementById('postImageUrl')?.value || '').trim();
      const published = Boolean(document.getElementById('postPublished')?.checked);
      if (!title || !text) {
        setStatus('Заполните заголовок и текст поста.', true);
        return;
      }
      try {
        await api('/api/admin/posts', {
          method: 'POST',
          body: JSON.stringify({ title, text, imageUrl, published }),
        });
        setStatus('Пост создан.');
        document.getElementById('postTitle').value = '';
        document.getElementById('postText').value = '';
        document.getElementById('postImageUrl').value = '';
        document.getElementById('postPublished').checked = true;
        await loadPosts();
        await loadLogs();
      } catch (error) {
        setStatus(`Ошибка создания поста: ${error.message}`, true);
      }
    });
  }
}

async function init() {
  try {
    const me = await api('/api/me');
    if (!me.authenticated || !me.isAdmin) {
      setStatus('Доступ запрещен: требуется администратор connordavis42.', true);
      return;
    }
    initTabs();
    bindActions();
    await Promise.all([loadRoles(), loadParticipants(), loadLogs(), loadPosts()]);
    setStatus('Админ панель загружена.');
  } catch (error) {
    setStatus(`Ошибка загрузки админки: ${error.message}`, true);
  }
}

init();
