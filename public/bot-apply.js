(function () {
  const titleEl = document.getElementById('applyTitle');
  const subtitleEl = document.getElementById('applySubtitle');
  const form = document.getElementById('applyForm');
  const questionsWrap = document.getElementById('applyQuestions');
  const statusEl = document.getElementById('applyStatus');
  const submitBtn = document.getElementById('applySubmitBtn');

  if (!titleEl || !subtitleEl || !form || !questionsWrap || !statusEl || !submitBtn) return;

  const projectId = String(window.location.pathname || '')
    .split('/')
    .filter(Boolean)
    .pop();

  if (!projectId) {
    setStatus('Не удалось определить проект заявки.', true);
    return;
  }

  let questions = [];
  form.addEventListener('submit', onSubmit);
  void loadForm();

  function setStatus(text, isError) {
    statusEl.textContent = text;
    statusEl.classList.toggle('bot-builder-error', Boolean(isError));
    statusEl.classList.toggle('bot-builder-success', !isError && Boolean(text));
  }

  function setSubmitting(isSubmitting) {
    submitBtn.disabled = isSubmitting;
    submitBtn.textContent = isSubmitting ? 'Отправка...' : 'Отправить заявку';
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
      const message = (payload && (payload.message || payload.error)) || `HTTP ${response.status}: запрос не выполнен`;
      throw new Error(String(message));
    }
    return payload || {};
  }

  function renderQuestions(rows) {
    questionsWrap.innerHTML = '';
    rows.forEach((question, index) => {
      const label = document.createElement('label');
      label.className = 'apply-question-label';

      const title = document.createElement('span');
      title.className = 'apply-question-title';
      title.textContent = `Вопрос ${index + 1}. ${String(question || '').trim()}`;

      const textarea = document.createElement('textarea');
      textarea.setAttribute('data-question-index', String(index));
      textarea.setAttribute('maxlength', '1000');
      textarea.placeholder = 'Введите ваш ответ';
      textarea.required = true;

      label.append(title, textarea);
      questionsWrap.append(label);
    });
  }

  async function loadForm() {
    setStatus('Загружаю форму...', false);
    try {
      const data = await apiRequest(`/api/bot-builder/public/${encodeURIComponent(projectId)}`);
      const project = data.project || {};
      const family = project.familyApplications || {};
      titleEl.textContent = family.embedTitle || `Заявка в ${project.name || 'проект'}`;
      subtitleEl.textContent = family.embedDescription || 'Заполните вопросы ниже и отправьте заявку.';
      questions = Array.isArray(family.questions) ? family.questions.filter(Boolean).slice(0, 5) : [];

      if (!questions.length) {
        subtitleEl.textContent = 'Модератор еще не добавил вопросы для этой формы.';
        form.hidden = true;
        setStatus('Форма пока недоступна: нет вопросов от модератора.', true);
        return;
      }

      renderQuestions(questions);
      form.hidden = false;
      setStatus('', false);
    } catch (error) {
      setStatus(`Не удалось открыть форму: ${error && error.message ? error.message : 'неизвестная ошибка'}`, true);
    }
  }

  async function onSubmit(event) {
    event.preventDefault();

    const answerNodes = Array.from(questionsWrap.querySelectorAll('textarea[data-question-index]'));
    const answers = answerNodes.map((node) => String(node.value || '').trim());

    try {
      setSubmitting(true);
      setStatus('Отправляю заявку в Discord...', false);
      const data = await apiRequest(`/api/bot-builder/public/${encodeURIComponent(projectId)}/apply`, {
        method: 'POST',
        body: JSON.stringify({ answers }),
      });
      setStatus(String(data.message || 'Заявка отправлена. Можете закрыть страницу.'), false);
      form.reset();
    } catch (error) {
      setStatus(`Не удалось отправить заявку: ${error && error.message ? error.message : 'неизвестная ошибка'}`, true);
    } finally {
      setSubmitting(false);
    }
  }
})();
