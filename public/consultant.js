(function initConsultant() {
  const form = document.getElementById('consultantForm');
  const serverSelect = document.getElementById('consultantServer');
  const questionInput = document.getElementById('consultantQuestion');
  const statusEl = document.getElementById('consultantStatus');
  const syncMetaEl = document.getElementById('consultantSyncMeta');
  const resultEl = document.getElementById('consultantResult');
  const answerEl = document.getElementById('consultantAnswer');
  const sourcesEl = document.getElementById('consultantSources');

  if (!form || !serverSelect || !questionInput || !statusEl || !resultEl || !answerEl || !sourcesEl) return;

  function setStatus(text, isError) {
    statusEl.textContent = text || '';
    statusEl.style.color = isError ? '#ff9cc7' : '#d8c2ff';
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

  async function loadSyncStatus() {
    try {
      const response = await fetch('/api/consultant/status');
      const data = await response.json();
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
      const response = await fetch('/api/consultant/servers');
      const data = await response.json();
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

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const server = serverSelect.value.trim();
    const question = questionInput.value.trim();

    if (!server || !question) {
      setStatus('Заполни сервер и вопрос.', true);
      return;
    }

    setStatus('Изучаю форум и законодательную базу сервера, подожди...', false);
    resultEl.hidden = true;
    answerEl.textContent = '';
    sourcesEl.innerHTML = '';

    try {
      const response = await fetch('/api/consultant/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ server, question }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || data.error || 'Ошибка обработки запроса');
      }

      answerEl.textContent = data.answer || 'Ответ не сформирован.';
      renderSources(data.references || []);
      resultEl.hidden = false;

      if (data.mode === 'cache') {
        const cacheTime = data.cacheUpdatedAt ? new Date(data.cacheUpdatedAt).toLocaleString('ru-RU') : 'неизвестно';
        setStatus(`Ответ сформирован из локальной базы (кэш от ${cacheTime}).`, false);
      } else {
        setStatus('Готово. Ответ сформирован по актуальным данным форума.', false);
      }
    } catch (error) {
      setStatus(`Ошибка: ${error.message}`, true);
    }
  });

  loadServers();
  loadSyncStatus();
  setInterval(loadSyncStatus, 60 * 1000);
})();
