(function initConsultant() {
  const form = document.getElementById('consultantForm');
  const serverSelect = document.getElementById('consultantServer');
  const questionInput = document.getElementById('consultantQuestion');
  const statusEl = document.getElementById('consultantStatus');
  const syncMetaEl = document.getElementById('consultantSyncMeta');
  const resultEl = document.getElementById('consultantResult');
  const answerEl = document.getElementById('consultantAnswer');
  const sourcesEl = document.getElementById('consultantSources');
  const forumCookieEl = document.getElementById('consultantForumCookie');
  const sessionStatusEl = document.getElementById('consultantSessionStatus');
  const connectSessionBtn = document.getElementById('consultantConnectSessionBtn');
  const disconnectSessionBtn = document.getElementById('consultantDisconnectSessionBtn');

  if (!form || !serverSelect || !questionInput || !statusEl || !resultEl || !answerEl || !sourcesEl) return;

  function setStatus(text, isError) {
    statusEl.textContent = text || '';
    statusEl.style.color = isError ? '#ff9cc7' : '#d8c2ff';
  }

  function setSessionStatus(text, isError) {
    if (!sessionStatusEl) return;
    sessionStatusEl.textContent = text || '';
    sessionStatusEl.style.color = isError ? '#ff9cc7' : '#d8c2ff';
  }

  function renderSources(sources) {
    sourcesEl.innerHTML = '';
    if (!Array.isArray(sources) || !sources.length) return;
    const title = document.createElement('h3');
    title.textContent = 'Источники';
    sourcesEl.append(title);
    sources.forEach((source) => {
      const a = document.createElement('a');
      a.href = source.url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.textContent = source.title || source.url;
      sourcesEl.append(a);
    });
  }

  function setSyncMeta(text, isError) {
    if (!syncMetaEl) return;
    syncMetaEl.textContent = text || '';
    syncMetaEl.style.color = isError ? '#ffb1d1' : '#a898c6';
  }

  async function fetchJsonSafe(url, options = {}) {
    const response = await fetch(url, options);
    const raw = await response.text();
    let data = {};
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {
      data = { message: raw || `HTTP ${response.status}` };
    }
    return { response, data };
  }

  async function loadForumSessionStatus() {
    if (!sessionStatusEl) return;
    try {
      const { response, data } = await fetchJsonSafe('/api/consultant/forum-session', {
        credentials: 'same-origin',
      });
      if (!response.ok) throw new Error(data.message || data.error || 'session_status_failed');

      if (data.requiresDiscordAuth) {
        setSessionStatus('Для подключения сессии форума сначала войдите через Discord на сайте.', true);
        return;
      }
      if (data.connected) {
        const updated = data.updatedAt ? new Date(data.updatedAt).toLocaleString('ru-RU') : 'неизвестно';
        setSessionStatus(`Сессия форума подключена. Обновлено: ${updated}.`, false);
      } else {
        setSessionStatus('Сессия форума не подключена. Работает только общий кэш.', false);
      }
    } catch {
      setSessionStatus('Статус сессии форума временно недоступен.', true);
    }
  }

  async function loadSyncStatus() {
    try {
      const { response, data } = await fetchJsonSafe('/api/consultant/status', {
        credentials: 'same-origin',
      });
      if (!response.ok) throw new Error(data.error || 'status_failed');

      const sync = data.sync || {};
      const servers = Array.isArray(data.servers) ? data.servers : [];
      const cachedCount = servers.filter((row) => row.cached).length;
      const nextRun = sync.nextRunAt ? new Date(sync.nextRunAt).toLocaleString('ru-RU') : 'не назначен';

      if (!sync.enabled) {
        setSyncMeta('Фоновая синхронизация отключена в настройках сервера.', true);
        return;
      }

      if (sync.inProgress) {
        setSyncMeta(
          `Идет фоновое обновление базы. В кэше: ${cachedCount}/${servers.length} серверов.`,
          false
        );
        return;
      }

      setSyncMeta(
        `Фоновая синхронизация активна. В кэше: ${cachedCount}/${servers.length}. Следующая проверка: ${nextRun}.`,
        false
      );
    } catch {
      setSyncMeta('Статус фоновой синхронизации временно недоступен.', true);
    }
  }

  async function loadServers() {
    serverSelect.innerHTML = '';
    try {
      const { response, data } = await fetchJsonSafe('/api/consultant/servers');
      if (!response.ok) throw new Error(data.message || data.error || 'servers_failed');
      const servers = Array.isArray(data.servers) ? data.servers : [];
      servers.forEach((name) => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        serverSelect.append(option);
      });
      if (!servers.length) {
        const fallback = document.createElement('option');
        fallback.value = 'Phoenix';
        fallback.textContent = 'Phoenix';
        serverSelect.append(fallback);
      }
    } catch {
      const fallback = document.createElement('option');
      fallback.value = 'Phoenix';
      fallback.textContent = 'Phoenix';
      serverSelect.append(fallback);
    }
  }

  connectSessionBtn?.addEventListener('click', async () => {
    const cookieHeader = String(forumCookieEl?.value || '').trim();
    if (!cookieHeader) {
      setSessionStatus('Вставьте Cookie заголовок форума.', true);
      return;
    }

    setSessionStatus('Проверяю и подключаю сессию форума...', false);
    try {
      const { response, data } = await fetchJsonSafe('/api/consultant/forum-session', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cookieHeader }),
      });
      if (!response.ok) {
        throw new Error(data.message || data.error || 'session_connect_failed');
      }
      setSessionStatus('Сессия форума подключена успешно.', false);
      await loadSyncStatus();
    } catch (error) {
      setSessionStatus(`Ошибка подключения сессии: ${error.message}`, true);
    }
  });

  disconnectSessionBtn?.addEventListener('click', async () => {
    setSessionStatus('Отключаю сессию форума...', false);
    try {
      const { response, data } = await fetchJsonSafe('/api/consultant/forum-session', {
        method: 'DELETE',
        credentials: 'same-origin',
      });
      if (!response.ok || !data.ok) {
        throw new Error(data.message || data.error || 'session_disconnect_failed');
      }
      setSessionStatus('Сессия форума отключена.', false);
      await loadSyncStatus();
    } catch (error) {
      setSessionStatus(`Ошибка отключения: ${error.message}`, true);
    }
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const server = serverSelect.value.trim();
    const question = questionInput.value.trim();
    const forumCookieHeader = String(forumCookieEl?.value || '').trim();

    if (!server || !question) {
      setStatus('Заполни сервер и вопрос.', true);
      return;
    }

    if (!forumCookieHeader) {
      try {
        const { response, data } = await fetchJsonSafe('/api/consultant/forum-session', {
          credentials: 'same-origin',
        });
        if (!response.ok) {
          throw new Error(data.message || data.error || 'session_status_failed');
        }
        if (!data.connected) {
          setStatus(
            'Для этого сервера нет локальной базы. Вставь Cookie форума в поле выше или нажми "Подключить сессию".',
            true
          );
          return;
        }
      } catch {
        setStatus(
          'Не удалось проверить подключение сессии форума. Вставь Cookie форума в поле и повтори.',
          true
        );
        return;
      }
    }

    setStatus('Изучаю форум и законодательную базу сервера, подожди...', false);
    resultEl.hidden = true;
    answerEl.textContent = '';
    sourcesEl.innerHTML = '';

    try {
      const { response, data } = await fetchJsonSafe('/api/consultant/ask', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ server, question, forumCookieHeader }),
      });
      if (!response.ok) {
        throw new Error(data.message || data.error || 'Ошибка обработки запроса');
      }

      answerEl.textContent = data.answer || 'Ответ не сформирован.';
      renderSources(data.references || []);
      resultEl.hidden = false;

      if (data.mode === 'cache') {
        const cacheTime = data.cacheUpdatedAt ? new Date(data.cacheUpdatedAt).toLocaleString('ru-RU') : 'неизвестно';
        setStatus(`Ответ сформирован из локальной базы (кэш от ${cacheTime}).`, false);
      } else if (data.mode === 'no-cache') {
        setStatus('Для этого сервера нет локальной базы. Подключи сессию форума пользователя.', true);
      } else if (data.mode === 'user-session') {
        setStatus('Готово. Ответ собран через подключенную сессию пользователя на форуме.', false);
      } else {
        setStatus('Готово. Ответ сформирован по актуальным данным форума.', false);
      }
    } catch (error) {
      setStatus(`Ошибка: ${error.message}`, true);
    }
  });

  loadServers();
  loadForumSessionStatus();
  loadSyncStatus();
  setInterval(loadSyncStatus, 60 * 1000);
})();
