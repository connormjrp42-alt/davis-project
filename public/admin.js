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

const adminState = {
  roles: [],
};

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

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
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

function getRoleById(roleId) {
  return adminState.roles.find((role) => role.id === roleId) || null;
}

function renderRoleBadges(roleIds) {
  const ids = Array.isArray(roleIds) ? roleIds : [];
  if (!ids.length) {
    return '<span class="admin-badge">Без ролей</span>';
  }
  return ids
    .map((roleId) => {
      const role = getRoleById(roleId);
      if (!role) return '';
      const color = role.color || '#bda2ff';
      return `<span class="admin-badge" style="border-color:${escapeHtml(color)};color:${escapeHtml(color)}">${escapeHtml(role.name)}</span>`;
    })
    .filter(Boolean)
    .join('');
}

function renderRoleEditor(roleIds) {
  if (!adminState.roles.length) {
    return '<p class="admin-muted">Сначала создайте роли в разделе «Роли сервера».</p>';
  }
  const selectedSet = new Set(Array.isArray(roleIds) ? roleIds : []);
  return adminState.roles
    .map((role) => {
      const checked = selectedSet.has(role.id) ? 'checked' : '';
      return `
        <label class="admin-check admin-role-check">
          <input type="checkbox" value="${escapeHtml(role.id)}" ${checked} />
          <span>${escapeHtml(role.name)}</span>
        </label>
      `;
    })
    .join('');
}

async function loadRoles() {
  const wrap = document.getElementById('rolesList');
  if (!wrap) return;
  const data = await api('/api/admin/roles');
  const roles = Array.isArray(data.roles) ? data.roles : [];
  adminState.roles = roles;

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
        <span class="admin-item-title">${escapeHtml(role.name)}</span>
        <span class="admin-badge" style="border-color:${escapeHtml(role.color)}; color:${escapeHtml(role.color)}">${escapeHtml(role.color)}</span>
      </div>
      <div class="admin-perms">
        ${role.permissions?.canManageRoles ? '<span class="admin-badge">Роли</span>' : ''}
        ${role.permissions?.canManageParticipants ? '<span class="admin-badge">Участники</span>' : ''}
        ${role.permissions?.canViewLogs ? '<span class="admin-badge">Логи</span>' : ''}
        ${role.permissions?.canManagePosts ? '<span class="admin-badge">Посты</span>' : ''}
      </div>
      <div class="admin-actions">
        <button class="cta cta-ghost" data-action="delete-role" data-id="${escapeHtml(role.id)}" type="button">Удалить</button>
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
        await Promise.all([loadRoles(), loadParticipants(), loadLogs()]);
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
    const roleIds = Array.isArray(user.roleIds) ? user.roleIds : [];
    const item = document.createElement('article');
    item.className = 'admin-item';
    item.innerHTML = `
      <div class="admin-item-head">
        <span class="admin-item-title">${escapeHtml(name)}</span>
        <span class="admin-badge">ID: ${escapeHtml(user.id)}</span>
      </div>
      <div class="admin-muted">Логин: ${escapeHtml(user.username || '—')}</div>
      <div class="admin-muted">Последний вход: ${escapeHtml(fmtDate(user.lastSeenAt))}</div>
      <div class="admin-muted">Входов: ${escapeHtml(Number(user.loginCount || 0))}</div>
      <div class="admin-perms">${renderRoleBadges(roleIds)}</div>
      <div class="admin-role-editor" data-user-id="${escapeHtml(user.id)}">
        ${renderRoleEditor(roleIds)}
      </div>
      <div class="admin-actions">
        <button class="cta cta-primary" data-action="save-user-roles" data-id="${escapeHtml(user.id)}" type="button">Сохранить роли</button>
      </div>
    `;
    wrap.append(item);
  });

  wrap.querySelectorAll('[data-action="save-user-roles"]').forEach((button) => {
    button.addEventListener('click', async () => {
      const userId = button.dataset.id;
      if (!userId) return;
      const editor = wrap.querySelector(`.admin-role-editor[data-user-id="${CSS.escape(userId)}"]`);
      if (!editor) return;
      const selectedIds = Array.from(editor.querySelectorAll('input[type="checkbox"]:checked'))
        .map((node) => String(node.value || '').trim())
        .filter(Boolean);

      try {
        await api(`/api/admin/users/${encodeURIComponent(userId)}/roles`, {
          method: 'PUT',
          body: JSON.stringify({ roleIds: selectedIds }),
        });
        setStatus('Роли участника обновлены.');
        await Promise.all([loadParticipants(), loadLogs()]);
      } catch (error) {
        setStatus(`Ошибка сохранения ролей: ${error.message}`, true);
      }
    });
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
        <span class="admin-item-title">${escapeHtml(log.action)}</span>
        <span class="admin-badge">${escapeHtml(log.level || 'info')}</span>
      </div>
      <div class="admin-muted">${escapeHtml(log.section || 'general')} • ${escapeHtml(fmtDate(log.createdAt))}</div>
      <div>${escapeHtml(log.message || '')}</div>
      <div class="admin-muted">Исполнитель: ${escapeHtml(log.actor || '—')}</div>
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
        <span class="admin-item-title">${escapeHtml(post.title)}</span>
        <span class="admin-badge">${post.published ? 'Опубликован' : 'Черновик'}</span>
      </div>
      <div class="admin-muted">Обновлено: ${escapeHtml(fmtDate(post.updatedAt))}</div>
      <div>${escapeHtml(String(post.text || '').slice(0, 260))}</div>
      <div class="admin-actions">
        <button class="cta cta-ghost" data-action="toggle-post" data-id="${escapeHtml(post.id)}" data-published="${post.published ? '1' : '0'}" type="button">
          ${post.published ? 'Снять с публикации' : 'Опубликовать'}
        </button>
        <button class="cta cta-ghost" data-action="delete-post" data-id="${escapeHtml(post.id)}" type="button">Удалить</button>
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
        await Promise.all([loadPosts(), loadLogs()]);
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
        await Promise.all([loadPosts(), loadLogs()]);
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
        await Promise.all([loadRoles(), loadParticipants(), loadLogs()]);
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
        await Promise.all([loadPosts(), loadLogs()]);
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
    await loadRoles();
    await Promise.all([loadParticipants(), loadLogs(), loadPosts()]);
    setStatus('Админ панель загружена.');
  } catch (error) {
    setStatus(`Ошибка загрузки админки: ${error.message}`, true);
  }
}

init();
