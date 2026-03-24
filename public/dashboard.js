async function getJSON(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json();
}

function fillForm(settings) {
  document.getElementById('displayName').value = settings.displayName || '';
  document.getElementById('rolePath').value = settings.rolePath || 'newbie';
  document.getElementById('preferredSection').value = settings.preferredSection || 'guides';
  document.getElementById('notificationsEnabled').checked = Boolean(settings.notificationsEnabled);
}

async function initDashboard() {
  const accountName = document.getElementById('accountName');
  const status = document.getElementById('saveStatus');
  const form = document.getElementById('settingsForm');

  try {
    const me = await getJSON('/api/me');
    if (!me.authenticated) {
      accountName.textContent = 'Авторизация не завершена.';
      status.innerHTML = 'Не удалось подтвердить вход через Discord. <a href="/auth/discord">Попробовать снова</a>.';
      return;
    }

    const userName = me.user.global_name || me.user.username;
    accountName.textContent = `Профиль Discord: ${userName}`;

    const settingsData = await getJSON('/api/settings');
    fillForm(settingsData.settings);
  } catch (error) {
    accountName.textContent = 'Не удалось загрузить профиль.';
    status.textContent = 'Ошибка загрузки настроек.';
    return;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    status.textContent = 'Сохраняем...';

    const payload = {
      displayName: document.getElementById('displayName').value,
      rolePath: document.getElementById('rolePath').value,
      preferredSection: document.getElementById('preferredSection').value,
      notificationsEnabled: document.getElementById('notificationsEnabled').checked,
    };

    try {
      const result = await getJSON('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      fillForm(result.settings);
      status.textContent = 'Настройки сохранены.';
    } catch (error) {
      status.textContent = 'Ошибка сохранения. Попробуйте снова.';
    }
  });
}

initDashboard();
