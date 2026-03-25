(function () {
  const titleEl = document.getElementById('contractReportTitle');
  const subtitleEl = document.getElementById('contractReportSubtitle');
  const form = document.getElementById('contractReportForm');
  const applicantInput = document.getElementById('contractReportApplicantInput');
  const contractSelect = document.getElementById('contractReportContractSelect');
  const screenshotInput = document.getElementById('contractReportScreenshotInput');
  const screenshotPreview = document.getElementById('contractReportScreenshotPreview');
  const commentInput = document.getElementById('contractReportCommentInput');
  const statusEl = document.getElementById('contractReportStatus');
  const submitBtn = document.getElementById('contractReportSubmitBtn');

  if (
    !titleEl ||
    !subtitleEl ||
    !form ||
    !applicantInput ||
    !contractSelect ||
    !screenshotInput ||
    !screenshotPreview ||
    !commentInput ||
    !statusEl ||
    !submitBtn
  ) {
    return;
  }

  const projectId = String(window.location.pathname || '')
    .split('/')
    .filter(Boolean)
    .pop();

  if (!projectId) {
    setStatus('Не удалось определить проект контракта.', true);
    return;
  }

  let availableContracts = [];

  form.addEventListener('submit', onSubmit);
  screenshotInput.addEventListener('change', onScreenshotChange);
  void loadForm();

  function setStatus(text, isError) {
    statusEl.textContent = text;
    statusEl.classList.toggle('bot-builder-error', Boolean(isError));
    statusEl.classList.toggle('bot-builder-success', !isError && Boolean(text));
  }

  async function apiRequest(url, options) {
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'same-origin',
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options && options.headers ? options.headers : {}),
      },
    });

    let payload = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    if (!response.ok) {
      const message =
        (payload && (payload.message || payload.error)) || `HTTP ${response.status}: запрос не выполнен`;
      throw new Error(String(message));
    }
    return payload || {};
  }

  function renderContractOptions(list) {
    contractSelect.innerHTML = '';
    const rows = Array.isArray(list) ? list.filter(Boolean) : [];
    rows.forEach((name) => {
      const option = document.createElement('option');
      option.value = name;
      option.textContent = name;
      contractSelect.append(option);
    });
  }

  function onScreenshotChange() {
    const file = screenshotInput.files && screenshotInput.files[0] ? screenshotInput.files[0] : null;
    if (!file) {
      screenshotPreview.style.display = 'none';
      screenshotPreview.removeAttribute('src');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      screenshotInput.value = '';
      screenshotPreview.style.display = 'none';
      screenshotPreview.removeAttribute('src');
      setStatus('Скриншот слишком большой. Максимум 8MB.', true);
      return;
    }
    const localUrl = URL.createObjectURL(file);
    screenshotPreview.src = localUrl;
    screenshotPreview.style.display = 'block';
  }

  async function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Не удалось прочитать скриншот.'));
      reader.readAsDataURL(file);
    });
  }

  async function loadForm() {
    setStatus('Загружаю форму отчета...', false);
    try {
      const data = await apiRequest(`/api/bot-builder/public/${encodeURIComponent(projectId)}/contracts`);
      const project = data.project || {};
      const contracts = project.contracts || {};

      titleEl.textContent = contracts.embedTitle || 'Отчет по контракту';
      subtitleEl.textContent = `Проект: ${project.name || 'Без названия'}`;

      availableContracts = Array.isArray(contracts.selectedContracts)
        ? contracts.selectedContracts.filter(Boolean)
        : [];
      if (!availableContracts.length) {
        throw new Error('Для этого бота не настроены контракты.');
      }

      renderContractOptions(availableContracts);
      form.hidden = false;
      setStatus('', false);
    } catch (error) {
      setStatus(`Не удалось открыть форму: ${error && error.message ? error.message : 'неизвестная ошибка'}`, true);
    }
  }

  async function onSubmit(event) {
    event.preventDefault();
    const applicantName = String(applicantInput.value || '').trim();
    if (!applicantName) {
      setStatus('Укажите имя или ник.', true);
      return;
    }

    const contractName = String(contractSelect.value || '').trim();
    if (!contractName || !availableContracts.includes(contractName)) {
      setStatus('Выберите контракт из списка.', true);
      return;
    }

    const screenshotFile = screenshotInput.files && screenshotInput.files[0] ? screenshotInput.files[0] : null;
    if (!screenshotFile) {
      setStatus('Прикрепите скриншот выполнения контракта.', true);
      return;
    }
    if (screenshotFile.size > 8 * 1024 * 1024) {
      setStatus('Скриншот слишком большой. Максимум 8MB.', true);
      return;
    }

    const comment = String(commentInput.value || '').trim();

    try {
      submitBtn.disabled = true;
      setStatus('Отправляю отчет в Discord...', false);
      const screenshotDataUrl = await fileToDataUrl(screenshotFile);
      await apiRequest(`/api/bot-builder/public/${encodeURIComponent(projectId)}/contracts/report`, {
        method: 'POST',
        body: JSON.stringify({
          applicantName,
          contractName,
          comment,
          screenshotDataUrl,
        }),
      });
      setStatus('Отчет отправлен. Можете закрыть страницу.', false);
      form.reset();
      screenshotPreview.style.display = 'none';
      screenshotPreview.removeAttribute('src');
      renderContractOptions(availableContracts);
    } catch (error) {
      setStatus(`Не удалось отправить отчет: ${error && error.message ? error.message : 'неизвестная ошибка'}`, true);
    } finally {
      submitBtn.disabled = false;
    }
  }
})();
