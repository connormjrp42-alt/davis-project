(function initFactionsPage() {
  const MAX_IMAGE_SIZE_BYTES = 4 * 1024 * 1024;

  const detailMatch = window.location.pathname.match(/^\/factions\/([^/]+)$/i);
  const state = {
    mode: detailMatch ? 'detail' : 'list',
    factionId: detailMatch ? decodeURIComponent(detailMatch[1]) : '',
    activeSection: 'main',
    me: { authenticated: false, isAdmin: false, user: null },
    factions: [],
    faction: null,
    canManage: false,
    activeTestId: '',
    activeApplicationId: '',
    memoChecks: {},
    memoEditingId: '',
  };

  const el = {
    status: document.getElementById('factionsStatus'),
    listView: document.getElementById('factionsListView'),
    grid: document.getElementById('factionsGrid'),
    addCard: document.getElementById('factionAddCard'),
    detailView: document.getElementById('factionDetailView'),
    detailTitle: document.getElementById('factionDetailTitle'),
    detailDeleteBtn: document.getElementById('detailDeleteFactionBtn'),
    mainGrid: document.querySelector('.faction-main-grid'),
    paneGrids: Array.from(document.querySelectorAll('.faction-pane-grid')),
    subnavButtons: Array.from(document.querySelectorAll('.faction-subnav-btn')),
    sections: Array.from(document.querySelectorAll('.faction-section')),
    bannerPreview: document.getElementById('factionBannerPreview'),
    avatarPreview: document.getElementById('factionAvatarPreview'),
    mainName: document.getElementById('factionMainName'),
    mainLeader: document.getElementById('factionMainLeader'),
    mainLeaderDiscordId: document.getElementById('factionMainLeaderDiscordId'),
    mainLeaderDiscordProfile: document.getElementById('factionMainLeaderDiscordProfile'),
    mainLeaderDiscordCard: document.getElementById('factionMainLeaderDiscordCard'),
    mainDeputies: document.getElementById('factionMainDeputies'),
    mainAbout: document.getElementById('factionMainAbout'),
    profileForm: document.getElementById('factionProfileForm'),
    profileLeader: document.getElementById('profileLeaderInput'),
    profileLeaderDiscordId: document.getElementById('profileLeaderDiscordIdInput'),
    profileLeaderDiscordProfile: document.getElementById('profileLeaderDiscordProfileInput'),
    profileDeputies: document.getElementById('profileDeputiesInput'),
    profileAbout: document.getElementById('profileAboutInput'),
    profileDiscordServerId: document.getElementById('profileDiscordServerIdInput'),
    profileManagers: document.getElementById('profileManagersInput'),
    profileAvatar: document.getElementById('profileAvatarInput'),
    profileBanner: document.getElementById('profileBannerInput'),
    memoForm: document.getElementById('memoForm'),
    memoTitle: document.getElementById('memoTitle'),
    memoContent: document.getElementById('memoContent'),
    memoChecklist: document.getElementById('memoChecklist'),
    memoCategory: document.getElementById('memoCategory'),
    memoTags: document.getElementById('memoTags'),
    memoPinned: document.getElementById('memoPinned'),
    memoSearchInput: document.getElementById('memoSearchInput'),
    memoFilterCategory: document.getElementById('memoFilterCategory'),
    memoList: document.getElementById('memoList'),
    testForm: document.getElementById('testForm'),
    testTitle: document.getElementById('testTitle'),
    testDescription: document.getElementById('testDescription'),
    testPassPercent: document.getElementById('testPassPercent'),
    testWebhookInput: document.getElementById('testWebhookInput'),
    testQuestions: document.getElementById('testQuestions'),
    testAddQuestionBtn: document.getElementById('testAddQuestionBtn'),
    testList: document.getElementById('testList'),
    testRunner: document.getElementById('testRunner'),
    testRunnerTitle: document.getElementById('testRunnerTitle'),
    testRunnerForm: document.getElementById('testRunnerForm'),
    testRunnerRespondent: document.getElementById('testRunnerRespondent'),
    testRunnerQuestions: document.getElementById('testRunnerQuestions'),
    testRunnerResult: document.getElementById('testRunnerResult'),
    rosterForm: document.getElementById('rosterForm'),
    rosterTitle: document.getElementById('rosterTitle'),
    rosterList: document.getElementById('rosterList'),
    appBuilderForm: document.getElementById('applicationBuilderForm'),
    appTitleInput: document.getElementById('applicationTitleInput'),
    appDescriptionInput: document.getElementById('applicationDescriptionInput'),
    appWebhookInput: document.getElementById('applicationWebhookInput'),
    appFieldsBuilder: document.getElementById('applicationFieldsBuilder'),
    appAddFieldBtn: document.getElementById('applicationAddFieldBtn'),
    appList: document.getElementById('applicationList'),
    appRunner: document.getElementById('applicationRunner'),
    appRunnerTitle: document.getElementById('applicationRunnerTitle'),
    appRunnerForm: document.getElementById('applicationRunnerForm'),
    appApplicantInput: document.getElementById('applicationApplicantInput'),
    appRunnerFields: document.getElementById('applicationRunnerFields'),
    appRunnerResult: document.getElementById('applicationRunnerResult'),
    modal: document.getElementById('factionModal'),
    createForm: document.getElementById('factionForm'),
    createName: document.getElementById('factionName'),
    createAvatar: document.getElementById('factionAvatar'),
    createBanner: document.getElementById('factionBanner'),
    createCancelBtn: document.getElementById('factionCancelBtn'),
  };

  if (!el.status) return;

  function setStatus(message, isError) {
    el.status.textContent = message || '';
    el.status.style.color = isError ? '#ffadc7' : '#d8c2ff';
  }

  function formatDate(value) {
    const date = new Date(value || Date.now());
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('ru-RU');
  }

  function formatDateTime(value) {
    const date = new Date(value || Date.now());
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function parseTags(text) {
    return String(text || '')
      .split(',')
      .map((row) => row.trim())
      .filter(Boolean)
      .slice(0, 12);
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatWebhookReason(reason) {
    const key = String(reason || '').trim();
    if (!key) return 'неизвестная причина';
    if (key === 'webhook_not_configured') return 'webhook не настроен';
    if (key === 'not_attempted') return 'отправка не выполнялась';
    if (key.startsWith('discord_webhook_http_')) {
      const code = key.replace('discord_webhook_http_', '').split(':')[0];
      return `ошибка Discord webhook (${code})`;
    }
    return key;
  }

  function initials(name) {
    const parts = String(name || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    return `${parts[0]?.[0] || 'F'}${parts[1]?.[0] || ''}`.toUpperCase();
  }

  async function requestJson(url, options = {}) {
    const response = await fetch(url, options);
    const contentType = response.headers.get('content-type') || '';
    const payload = contentType.includes('application/json')
      ? await response.json().catch(() => ({}))
      : { message: await response.text().catch(() => '') };

    if (!response.ok) {
      throw new Error(payload?.message || payload?.error || `HTTP ${response.status}`);
    }
    return payload || {};
  }

  function toDataUrl(file) {
    if (!file) return Promise.resolve('');
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      return Promise.reject(new Error('Размер изображения больше 4 МБ.'));
    }
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Не удалось прочитать файл.'));
      reader.readAsDataURL(file);
    });
  }

  function textLines(value) {
    return String(value || '')
      .split('\n')
      .map((row) => row.trim())
      .filter(Boolean);
  }

  function normalizeDeputyEntry(input) {
    if (!input) return null;
    if (typeof input === 'string') {
      const parts = input
        .split('|')
        .map((row) => row.trim())
        .filter((row, index) => row || index === 0);
      const name = String(parts[0] || '').trim();
      if (!name) return null;
      const discordIdRaw = String(parts[1] || '').trim();
      const discordId = /^\d{5,30}$/.test(discordIdRaw) ? discordIdRaw : '';
      const urlRaw = String(parts.slice(2).join('|') || '').trim();
      const discordProfileUrl = /^https?:\/\//i.test(urlRaw) ? urlRaw : '';
      return { name, discordId, discordProfileUrl };
    }
    if (typeof input === 'object') {
      const name = String(input.name || '').trim();
      if (!name) return null;
      const discordIdRaw = String(input.discordId || '').trim();
      const discordId = /^\d{5,30}$/.test(discordIdRaw) ? discordIdRaw : '';
      const urlRaw = String(input.discordProfileUrl || '').trim();
      const discordProfileUrl = /^https?:\/\//i.test(urlRaw) ? urlRaw : '';
      const discordData = input.discordData && typeof input.discordData === 'object' ? input.discordData : null;
      return { name, discordId, discordProfileUrl, discordData };
    }
    return null;
  }

  function getDiscordDefaultAvatarIndex(discordId) {
    try {
      return Number((BigInt(String(discordId || '0')) >> 22n) % 6n);
    } catch {
      return 0;
    }
  }

  function getDiscordFallbackAvatar(discordId) {
    const index = getDiscordDefaultAvatarIndex(discordId);
    return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
  }

  function extractDiscordUserIdFromProfileUrl(value) {
    const url = String(value || '').trim();
    if (!/^https?:\/\//i.test(url)) return '';
    const match = url.match(/discord(?:app)?\.com\/users\/(\d{5,30})/i);
    return match ? String(match[1]) : '';
  }

  function createDiscordUserCard(options = {}) {
    const displayName = String(options.displayName || '').trim() || 'Профиль Discord';
    const username = String(options.username || '').trim();
    const discordId = String(options.discordId || '').trim();
    const status = String(options.status || '').trim();
    const profileUrlRaw = String(options.profileUrl || '').trim();
    const profileUrl = /^https?:\/\//i.test(profileUrlRaw) ? profileUrlRaw : '';
    const avatarUrl = String(options.avatarUrl || '').trim();
    const compact = Boolean(options.compact);

    const root = document.createElement(profileUrl ? 'a' : 'div');
    root.className = `faction-discord-user-card${compact ? ' compact' : ''}`;
    if (profileUrl) {
      root.href = profileUrl;
      root.target = '_blank';
      root.rel = 'noopener noreferrer';
    }

    const avatarWrap = document.createElement('div');
    avatarWrap.className = 'faction-discord-user-avatar-wrap';
    const avatar = document.createElement('img');
    avatar.className = 'faction-discord-user-avatar';
    avatar.alt = displayName;

    const fallback = document.createElement('div');
    fallback.className = 'faction-discord-user-avatar-fallback';
    fallback.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M20.3 4.37A19.8 19.8 0 0 0 15.4 3a13.7 13.7 0 0 0-.63 1.27 18.4 18.4 0 0 0-5.54 0A13.7 13.7 0 0 0 8.6 3a19.8 19.8 0 0 0-4.9 1.37C1.4 7.9.8 11.35 1 14.75a19.9 19.9 0 0 0 5.98 3 14.5 14.5 0 0 0 1.28-2.08c-.7-.26-1.36-.58-1.98-.95.17-.13.34-.27.5-.42a13.8 13.8 0 0 0 10.45 0c.16.15.33.29.5.42-.62.37-1.28.69-1.98.95.38.74.82 1.43 1.28 2.08a19.9 19.9 0 0 0 5.98-3c.25-3.95-.43-7.36-2.71-10.38ZM8.77 12.66c-.97 0-1.76-.9-1.76-2s.77-2 1.76-2c1 0 1.78.9 1.76 2 0 1.1-.77 2-1.76 2Zm6.46 0c-.97 0-1.76-.9-1.76-2s.77-2 1.76-2c1 0 1.78.9 1.76 2 0 1.1-.77 2-1.76 2Z"
        />
      </svg>
    `;

    if (avatarUrl) {
      avatar.src = avatarUrl;
      avatar.onerror = () => {
        avatar.hidden = true;
        fallback.hidden = false;
      };
      avatar.hidden = false;
      fallback.hidden = true;
    } else {
      avatar.hidden = true;
      fallback.hidden = false;
    }

    avatarWrap.append(avatar, fallback);

    const body = document.createElement('div');
    body.className = 'faction-discord-user-body';
    const title = document.createElement('div');
    title.className = 'faction-discord-user-title';
    title.textContent = displayName;
    const subtitle = document.createElement('div');
    subtitle.className = 'faction-discord-user-subtitle';
    const parts = [];
    if (status) parts.push(status);
    if (username) parts.push(`@${username}`);
    if (discordId) parts.push(`ID: ${discordId}`);
    subtitle.textContent = parts.join(' • ') || 'Профиль Discord';
    body.append(title, subtitle);

    root.append(avatarWrap, body);
    return root;
  }

  function parseDeputiesEditorText(text) {
    return String(text || '')
      .split('\n')
      .map((line) => normalizeDeputyEntry(line))
      .filter(Boolean)
      .slice(0, 20);
  }

  function formatDeputiesForEditor(deputies) {
    return (Array.isArray(deputies) ? deputies : [])
      .map((entry) => normalizeDeputyEntry(entry))
      .filter(Boolean)
      .map((entry) => {
        const parts = [entry.name];
        if (entry.discordId) parts.push(entry.discordId);
        if (entry.discordProfileUrl) parts.push(entry.discordProfileUrl);
        return parts.join(' | ');
      })
      .join('\n');
  }

  function showMode() {
    if (!el.listView || !el.detailView) return;
    const listActive = state.mode === 'list';
    el.listView.hidden = !listActive;
    el.detailView.hidden = listActive;
    el.listView.style.display = listActive ? '' : 'none';
    el.detailView.style.display = listActive ? 'none' : '';
  }

  function setSection(sectionName) {
    state.activeSection = sectionName;
    el.subnavButtons.forEach((button) => {
      button.classList.toggle('active', button.dataset.section === sectionName);
    });
    el.sections.forEach((section) => {
      section.classList.toggle('active', section.dataset.section === sectionName);
    });
  }

  function syncManagerOnlyPanels() {
    const visible = Boolean(state.canManage);
    const managerNodes = [el.detailDeleteBtn, el.profileForm, el.memoForm, el.testForm, el.rosterForm, el.appBuilderForm];
    managerNodes.forEach((node) => {
      if (!node) return;
      node.hidden = !visible;
      node.style.display = visible ? '' : 'none';
    });
    if (el.mainGrid) {
      el.mainGrid.classList.toggle('viewer-mode', !visible);
    }
    if (Array.isArray(el.paneGrids)) {
      el.paneGrids.forEach((grid) => {
        grid.classList.toggle('viewer-mode', !visible);
      });
    }
  }

  function createQuestionOptionRow(index, value = '') {
    const row = document.createElement('label');
    row.className = 'q-option-row';
    const title = document.createElement('span');
    title.className = 'q-option-label';
    title.textContent = `Вариант ${index + 1}`;
    const input = document.createElement('input');
    input.className = 'q-option';
    input.type = 'text';
    input.maxLength = 240;
    input.value = String(value || '');
    row.append(title, input);
    return row;
  }

  function syncQuestionOptions(block, preferredIndex) {
    if (!block) return;
    const rows = Array.from(block.querySelectorAll('.q-option-row'));
    const select = block.querySelector('.q-correct');
    if (!select) return;

    rows.forEach((row, index) => {
      const label = row.querySelector('.q-option-label');
      if (label) label.textContent = `Вариант ${index + 1}`;
    });

    const previous = Number.isFinite(Number(preferredIndex)) ? Number(preferredIndex) : Number(select.value || 0);
    select.innerHTML = '';
    rows.forEach((_, index) => {
      const option = document.createElement('option');
      option.value = String(index);
      option.textContent = `Вариант ${index + 1}`;
      select.append(option);
    });

    const normalized = Math.min(Math.max(previous, 0), Math.max(rows.length - 1, 0));
    select.value = String(normalized);
  }

  function addQuestionOption(block, value = '') {
    const optionsWrap = block?.querySelector('.faction-question-options');
    if (!optionsWrap) return;
    const nextIndex = optionsWrap.querySelectorAll('.q-option-row').length;
    optionsWrap.append(createQuestionOptionRow(nextIndex, value));
    syncQuestionOptions(block);
  }

  function createQuestionBuilder(initial = {}) {
    const block = document.createElement('div');
    block.className = 'faction-question-builder';
    block.innerHTML = `
      <label>Вопрос <input class="q-text" type="text" maxlength="800" /></label>
      <div class="faction-question-options"></div>
      <button class="faction-option-add q-option-add" type="button" aria-label="Добавить вариант ответа">+</button>
      <label>
        Правильный вариант
        <select class="q-correct"></select>
      </label>
      <button class="faction-mini-btn danger q-remove" type="button">Удалить вопрос</button>
    `;

    block.querySelector('.q-text').value = String(initial.text || '');
    const options = Array.isArray(initial.options) ? initial.options : [];
    const normalizedOptions = options.length >= 2 ? options : [options[0] || '', options[1] || ''];
    normalizedOptions.forEach((value) => addQuestionOption(block, value));
    syncQuestionOptions(block, Number.isFinite(Number(initial.correctIndex)) ? Number(initial.correctIndex) : 0);
    return block;
  }

  function ensureQuestionBuilder() {
    if (!el.testQuestions || el.testQuestions.querySelector('.faction-question-builder')) return;
    el.testQuestions.append(createQuestionBuilder());
  }

  function collectTestQuestions() {
    const blocks = Array.from(el.testQuestions.querySelectorAll('.faction-question-builder'));
    if (!blocks.length) throw new Error('Добавьте хотя бы один вопрос.');

    return blocks.map((block, index) => {
      const text = String(block.querySelector('.q-text')?.value || '').trim();
      if (!text) throw new Error(`Заполните вопрос #${index + 1}.`);
      const rawOptions = Array.from(block.querySelectorAll('.q-option')).map((input) => String(input.value || '').trim());
      const packed = rawOptions
        .map((value, rawIndex) => ({ value, rawIndex }))
        .filter((row) => row.value);
      if (packed.length < 2) {
        throw new Error(`У вопроса #${index + 1} должно быть минимум два варианта ответа.`);
      }
      const selectedRaw = Number(block.querySelector('.q-correct')?.value || 0);
      const correctIndex = Math.max(
        0,
        packed.findIndex((row) => row.rawIndex === selectedRaw)
      );
      return {
        text,
        options: packed.map((row) => row.value),
        correctIndex,
      };
    });
  }

  function createApplicationFieldBuilder(initial = {}) {
    const block = document.createElement('div');
    block.className = 'faction-question-builder';
    block.innerHTML = `
      <label>Название поля <input class="a-label" type="text" maxlength="120" /></label>
      <label>
        Тип поля
        <select class="a-type">
          <option value="text">Короткий текст</option>
          <option value="textarea">Большой текст</option>
          <option value="number">Число</option>
          <option value="date">Дата</option>
        </select>
      </label>
      <label>Подсказка <input class="a-placeholder" type="text" maxlength="180" /></label>
      <label>Максимальная длина <input class="a-max" type="number" min="10" max="4000" value="240" /></label>
      <label class="doc-el-check"><input class="a-required" type="checkbox" /> Обязательное поле</label>
      <button class="faction-mini-btn danger a-remove" type="button">Удалить поле</button>
    `;
    block.querySelector('.a-label').value = String(initial.label || '');
    block.querySelector('.a-type').value = ['text', 'textarea', 'number', 'date'].includes(initial.type) ? initial.type : 'text';
    block.querySelector('.a-placeholder').value = String(initial.placeholder || '');
    block.querySelector('.a-max').value = String(Number.isFinite(Number(initial.maxLength)) ? Number(initial.maxLength) : 240);
    block.querySelector('.a-required').checked = Boolean(initial.required);
    return block;
  }

  function ensureApplicationFieldBuilder() {
    if (!el.appFieldsBuilder || el.appFieldsBuilder.querySelector('.faction-question-builder')) return;
    el.appFieldsBuilder.append(createApplicationFieldBuilder());
  }

  function collectApplicationFields() {
    const blocks = Array.from(el.appFieldsBuilder.querySelectorAll('.faction-question-builder'));
    if (!blocks.length) throw new Error('Добавьте хотя бы одно поле заявления.');
    return blocks.map((block, index) => {
      const label = String(block.querySelector('.a-label')?.value || '').trim();
      if (!label) throw new Error(`Заполните название поля #${index + 1}.`);
      return {
        label,
        type: String(block.querySelector('.a-type')?.value || 'text'),
        placeholder: String(block.querySelector('.a-placeholder')?.value || '').trim(),
        maxLength: Number(block.querySelector('.a-max')?.value || 240),
        required: Boolean(block.querySelector('.a-required')?.checked),
      };
    });
  }

  function renderFactionCards() {
    if (!el.grid) return;
    el.grid.querySelectorAll('.faction-card').forEach((node) => node.remove());

    state.factions.forEach((faction) => {
      const card = document.createElement('article');
      card.className = 'faction-card';

      const link = document.createElement('a');
      link.className = 'faction-card-link';
      link.href = `/factions/${encodeURIComponent(faction.id)}`;

      const banner = document.createElement('div');
      banner.className = 'faction-banner';
      if (faction.bannerUrl) {
        const image = document.createElement('img');
        image.src = faction.bannerUrl;
        image.alt = `Баннер ${faction.name}`;
        banner.append(image);
      } else {
        banner.classList.add('faction-banner-empty');
      }

      const avatarWrap = document.createElement('div');
      avatarWrap.className = 'faction-avatar-wrap';
      if (faction.avatarUrl) {
        const image = document.createElement('img');
        image.className = 'faction-avatar';
        image.src = faction.avatarUrl;
        image.alt = `Аватар ${faction.name}`;
        avatarWrap.append(image);
      } else {
        const fallback = document.createElement('div');
        fallback.className = 'faction-avatar-fallback';
        fallback.textContent = initials(faction.name);
        avatarWrap.append(fallback);
      }

      const title = document.createElement('h3');
      title.textContent = faction.name;
      const meta = document.createElement('p');
      meta.className = 'faction-meta';
      meta.textContent = `Создана: ${formatDate(faction.createdAt)}`;

      link.append(banner, avatarWrap, title, meta);
      card.append(link);

      const canDeleteFromList = Boolean(
        state.me.authenticated && (state.me.isAdmin || faction.canManage || faction.canManage === undefined)
      );
      if (canDeleteFromList) {
        card.classList.add('manageable');
        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'faction-delete-btn';
        deleteBtn.setAttribute('data-action', 'delete-faction');
        deleteBtn.setAttribute('data-faction-id', faction.id);
        deleteBtn.setAttribute('data-tip', 'Удалить фракцию');
        deleteBtn.setAttribute('aria-label', `Удалить фракцию ${faction.name}`);
        deleteBtn.innerHTML = `
          <svg class="faction-delete-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path class="cap" d="M9 6.8h6"></path>
            <rect class="lid" x="7" y="5.2" width="10" height="2.2" rx="1.1"></rect>
            <rect class="body" x="8" y="8" width="8" height="10.5" rx="1.4"></rect>
            <path class="rail" d="M10.5 10.5v6M13.5 10.5v6"></path>
          </svg>
        `;
        card.append(deleteBtn);
      }

      el.grid.append(card);
    });

    if (el.addCard) {
      el.addCard.hidden = !state.me.authenticated;
    }
  }

  function renderMainInfo() {
    const faction = state.faction;
    if (!faction) return;
    const profile = faction.profile || {
      leader: '',
      leaderDiscordId: '',
      leaderDiscordProfileUrl: '',
      deputies: [],
      about: '',
      discordServerId: '',
    };

    if (el.detailTitle) el.detailTitle.textContent = faction.name;
    if (el.detailDeleteBtn) el.detailDeleteBtn.hidden = !state.canManage;
    if (el.mainName) el.mainName.textContent = faction.name;
    const leaderDiscordData =
      profile.leaderDiscordData && typeof profile.leaderDiscordData === 'object' ? profile.leaderDiscordData : null;
    const leaderName = String(leaderDiscordData?.displayName || profile.leader || '').trim();
    if (el.mainLeader) el.mainLeader.textContent = leaderName ? `Лидер: ${leaderName}` : 'Лидер не указан';
    const leaderDiscordId = String(profile.leaderDiscordId || '').trim();
    const profileLeaderUrlRaw = String(profile.leaderDiscordProfileUrl || '').trim();
    const leaderProfileId = extractDiscordUserIdFromProfileUrl(profileLeaderUrlRaw);
    const leaderResolvedId = leaderDiscordId || String(leaderDiscordData?.id || '').trim() || leaderProfileId;
    const explicitLeaderProfileUrl = profileLeaderUrlRaw || leaderDiscordData?.profileUrl || '';
    if (el.mainLeaderDiscordId) {
      el.mainLeaderDiscordId.textContent = leaderResolvedId ? `Discord ID: ${leaderResolvedId}` : '';
      el.mainLeaderDiscordId.hidden = !leaderResolvedId;
    }
    const leaderProfileUrl = /^https?:\/\//i.test(explicitLeaderProfileUrl)
      ? explicitLeaderProfileUrl
      : leaderResolvedId
        ? `https://discord.com/users/${leaderResolvedId}`
        : '';
    if (el.mainLeaderDiscordProfile) {
      if (leaderProfileUrl) {
        el.mainLeaderDiscordProfile.href = leaderProfileUrl;
        el.mainLeaderDiscordProfile.textContent = leaderDiscordData?.username
          ? `Профиль Discord (@${leaderDiscordData.username})`
          : 'Профиль Discord';
        el.mainLeaderDiscordProfile.hidden = false;
      } else {
        el.mainLeaderDiscordProfile.href = '#';
        el.mainLeaderDiscordProfile.textContent = 'Профиль Discord';
        el.mainLeaderDiscordProfile.hidden = true;
      }
    }
    if (el.mainLeaderDiscordCard) {
      el.mainLeaderDiscordCard.innerHTML = '';
      const shouldRenderCard = Boolean(leaderDiscordId || leaderDiscordData || leaderProfileUrl);
      if (shouldRenderCard) {
        el.mainLeaderDiscordCard.append(
          createDiscordUserCard({
            displayName: leaderDiscordData?.displayName || leaderName || 'Лидер',
            username: leaderDiscordData?.username || '',
            status: leaderDiscordData?.status || '',
            discordId: leaderResolvedId,
            profileUrl: leaderProfileUrl,
              avatarUrl: leaderDiscordData?.avatarUrl || (leaderResolvedId ? getDiscordFallbackAvatar(leaderResolvedId) : ''),
          })
        );
        el.mainLeaderDiscordCard.hidden = false;
      } else {
        el.mainLeaderDiscordCard.hidden = true;
      }
    }
    if (el.mainAbout) el.mainAbout.textContent = profile.about || 'Описание пока не заполнено.';
    if (el.bannerPreview) el.bannerPreview.src = faction.bannerUrl || '';
    if (el.avatarPreview) el.avatarPreview.src = faction.avatarUrl || '';

    if (el.mainDeputies) {
      el.mainDeputies.innerHTML = '';
      const deputies = Array.isArray(profile.deputies) ? profile.deputies : [];
      if (!deputies.length) {
        const li = document.createElement('li');
        li.textContent = 'Заместители не указаны';
        li.className = 'faction-main-deputy-empty';
        el.mainDeputies.append(li);
      } else {
        deputies.forEach((entryRaw) => {
          const entry = normalizeDeputyEntry(entryRaw);
          if (!entry) return;
          const li = document.createElement('li');
          li.className = 'faction-main-deputy-item';
          const deputyDiscord = entry.discordData && typeof entry.discordData === 'object' ? entry.discordData : null;
          const deputyProfileUrlRaw = String(entry.discordProfileUrl || '').trim();
          const deputyProfileId = extractDiscordUserIdFromProfileUrl(deputyProfileUrlRaw);
          const deputyResolvedId = String(entry.discordId || '').trim() || String(deputyDiscord?.id || '').trim() || deputyProfileId;
          const deputyProfileUrl =
            deputyDiscord?.profileUrl || deputyProfileUrlRaw || (deputyResolvedId ? `https://discord.com/users/${deputyResolvedId}` : '');
          li.append(
            createDiscordUserCard({
              displayName: deputyDiscord?.displayName || entry.name,
              username: deputyDiscord?.username || '',
              status: deputyDiscord?.status || '',
              discordId: deputyResolvedId,
              profileUrl: deputyProfileUrl,
              avatarUrl: deputyDiscord?.avatarUrl || (deputyResolvedId ? getDiscordFallbackAvatar(deputyResolvedId) : ''),
              compact: true,
            })
          );
          el.mainDeputies.append(li);
        });
      }
    }

    if (el.profileForm) {
      el.profileForm.hidden = !state.canManage;
      el.profileForm.style.display = state.canManage ? '' : 'none';
    }
    if (!state.canManage) return;
    if (el.profileLeader) el.profileLeader.value = profile.leader || '';
    if (el.profileLeaderDiscordId) el.profileLeaderDiscordId.value = profile.leaderDiscordId || '';
    if (el.profileLeaderDiscordProfile) el.profileLeaderDiscordProfile.value = profile.leaderDiscordProfileUrl || '';
    if (el.profileDeputies) el.profileDeputies.value = formatDeputiesForEditor(profile.deputies || []);
    if (el.profileAbout) el.profileAbout.value = profile.about || '';
    if (el.profileDiscordServerId) el.profileDiscordServerId.value = profile.discordServerId || '';
    if (el.profileManagers) {
      const managerNames = Array.isArray(faction.managerNames) ? faction.managerNames : [];
      el.profileManagers.value = managerNames.join(', ');
      el.profileManagers.disabled = !state.me.isAdmin;
    }
  }

  function renderMemos() {
    if (!el.memoList || !state.faction) return;
    if (el.memoForm) {
      el.memoForm.hidden = !state.canManage;
      el.memoForm.style.display = state.canManage ? '' : 'none';
    }
    el.memoList.innerHTML = '';

    const memos = Array.isArray(state.faction.memos) ? state.faction.memos : [];
    const searchQuery = String(el.memoSearchInput?.value || '')
      .trim()
      .toLowerCase();
    const filterCategory = String(el.memoFilterCategory?.value || '')
      .trim()
      .toLowerCase();

    const filtered = memos
      .filter((memo) => {
        if (filterCategory && !String(memo.category || '').toLowerCase().includes(filterCategory)) return false;
        if (!searchQuery) return true;
        const memoText = [
          String(memo.title || ''),
          String(memo.content || ''),
          String(memo.category || ''),
          ...(Array.isArray(memo.tags) ? memo.tags : []),
          ...(Array.isArray(memo.checklist) ? memo.checklist : []),
        ]
          .join(' ')
          .toLowerCase();
        return memoText.includes(searchQuery);
      })
      .sort((a, b) => {
        if (Boolean(a.pinned) !== Boolean(b.pinned)) return a.pinned ? -1 : 1;
        return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
      });

    if (!memos.length) {
      el.memoList.innerHTML = '<div class="faction-item-card"><p>Памяток пока нет.</p></div>';
      return;
    }
    if (!filtered.length) {
      el.memoList.innerHTML = '<div class="faction-item-card"><p>По текущим фильтрам памятки не найдены.</p></div>';
      return;
    }

    filtered.forEach((memo) => {
      const card = document.createElement('article');
      card.className = 'faction-item-card faction-memo-card';
      card.classList.toggle('is-pinned', Boolean(memo.pinned));

      const head = document.createElement('div');
      head.className = 'faction-memo-head';
      const title = document.createElement('h4');
      title.textContent = memo.title || 'Памятка';
      head.append(title);

      const badges = document.createElement('div');
      badges.className = 'faction-memo-badges';
      if (memo.pinned) {
        const pinBadge = document.createElement('span');
        pinBadge.className = 'faction-memo-badge pinned';
        pinBadge.textContent = 'Закреплено';
        badges.append(pinBadge);
      }
      if (memo.category) {
        const categoryBadge = document.createElement('span');
        categoryBadge.className = 'faction-memo-badge';
        categoryBadge.textContent = memo.category;
        badges.append(categoryBadge);
      }
      (Array.isArray(memo.tags) ? memo.tags : []).slice(0, 4).forEach((tag) => {
        const tagBadge = document.createElement('span');
        tagBadge.className = 'faction-memo-badge tag';
        tagBadge.textContent = `#${tag}`;
        badges.append(tagBadge);
      });
      head.append(badges);
      card.append(head);

      const meta = document.createElement('p');
      meta.className = 'faction-memo-meta';
      const metaChunks = [`Создано: ${formatDate(memo.createdAt) || '—'}`];
      if (memo.updatedAt) metaChunks.push(`Обновлено: ${formatDateTime(memo.updatedAt)}`);
      meta.textContent = metaChunks.join(' • ');
      card.append(meta);

      if (memo.content) {
        const text = document.createElement('p');
        text.textContent = memo.content;
        card.append(text);
      }
      const checklist = Array.isArray(memo.checklist) ? memo.checklist : [];
      if (checklist.length) {
        const progressWrap = document.createElement('div');
        progressWrap.className = 'faction-memo-progress';
        const progressText = document.createElement('span');
        progressText.className = 'faction-memo-progress-text';
        const progressBar = document.createElement('div');
        progressBar.className = 'faction-memo-progress-bar';
        const progressFill = document.createElement('div');
        progressFill.className = 'faction-memo-progress-fill';
        progressBar.append(progressFill);
        progressWrap.append(progressText, progressBar);
        card.append(progressWrap);

        const checkWrap = document.createElement('div');
        checkWrap.className = 'faction-test-answers';
        const updateProgress = () => {
          const done = checklist.reduce((sum, _, index) => sum + (state.memoChecks[`${memo.id}:${index}`] ? 1 : 0), 0);
          const percent = checklist.length ? Math.round((done / checklist.length) * 100) : 0;
          progressText.textContent = `Выполнено: ${done}/${checklist.length} (${percent}%)`;
          progressFill.style.width = `${percent}%`;
        };
        checklist.forEach((item, index) => {
          const key = `${memo.id}:${index}`;
          const row = document.createElement('label');
          row.className = 'faction-test-answer';
          const checkbox = document.createElement('input');
          checkbox.type = 'checkbox';
          checkbox.checked = Boolean(state.memoChecks[key]);
          checkbox.addEventListener('change', () => {
            state.memoChecks[key] = checkbox.checked;
            updateProgress();
          });
          const span = document.createElement('span');
          span.textContent = item;
          row.append(checkbox, span);
          checkWrap.append(row);
        });
        updateProgress();
        card.append(checkWrap);
      }
      if (state.canManage) {
        const actions = document.createElement('div');
        actions.className = 'faction-item-actions';
        const pinBtn = document.createElement('button');
        pinBtn.type = 'button';
        pinBtn.className = 'faction-mini-btn';
        pinBtn.textContent = memo.pinned ? 'Открепить' : 'Закрепить';
        pinBtn.setAttribute('data-action', 'toggle-pin-memo');
        pinBtn.setAttribute('data-memo-id', memo.id);
        actions.append(pinBtn);

        const editBtn = document.createElement('button');
        editBtn.type = 'button';
        editBtn.className = 'faction-mini-btn';
        editBtn.textContent = state.memoEditingId === memo.id ? 'Скрыть редактор' : 'Редактировать';
        editBtn.setAttribute('data-action', 'edit-memo');
        editBtn.setAttribute('data-memo-id', memo.id);
        actions.append(editBtn);

        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'faction-mini-btn danger';
        removeBtn.textContent = 'Удалить';
        removeBtn.setAttribute('data-action', 'delete-memo');
        removeBtn.setAttribute('data-memo-id', memo.id);
        actions.append(removeBtn);
        card.append(actions);

        if (state.memoEditingId === memo.id) {
          const editForm = document.createElement('form');
          editForm.className = 'faction-subform faction-memo-edit-form';
          editForm.setAttribute('data-memo-id', memo.id);
          editForm.innerHTML = `
            <h4>Редактирование памятки</h4>
            <label>Заголовок <input name="title" type="text" maxlength="120" required value="${escapeHtml(memo.title)}" /></label>
            <label>Текст <textarea name="content" rows="5" maxlength="6000">${escapeHtml(memo.content)}</textarea></label>
            <label>Чек-лист (пункты с новой строки) <textarea name="checklist" rows="4" maxlength="3000">${escapeHtml((Array.isArray(memo.checklist) ? memo.checklist : []).join('\n'))}</textarea></label>
            <div class="faction-inline-grid">
              <label>
                Категория
                <input name="category" type="text" maxlength="80" value="${escapeHtml(memo.category)}" />
              </label>
            </div>
            <label>Теги (через запятую) <input name="tags" type="text" maxlength="400" value="${escapeHtml(Array.isArray(memo.tags) ? memo.tags.join(', ') : '')}" /></label>
            <label class="doc-el-check"><input name="pinned" type="checkbox" ${memo.pinned ? 'checked' : ''} /> Закрепить памятку сверху</label>
            <div class="faction-item-actions">
              <button class="faction-mini-btn" type="submit">Сохранить изменения</button>
              <button class="faction-mini-btn danger" type="button" data-action="cancel-edit-memo" data-memo-id="${memo.id}">Отмена</button>
            </div>
          `;
          card.append(editForm);
        }
      }
      el.memoList.append(card);
    });
  }

  function renderTestRunner(test) {
    if (!el.testRunner || !el.testRunnerTitle || !el.testRunnerQuestions || !el.testRunnerResult) return;
    if (!test) {
      el.testRunner.hidden = true;
      el.testRunnerQuestions.innerHTML = '';
      el.testRunnerResult.textContent = '';
      return;
    }

    el.testRunner.hidden = false;
    el.testRunnerTitle.textContent = `Прохождение: ${test.title}`;
    el.testRunnerQuestions.innerHTML = '';
    el.testRunnerResult.textContent = '';

    (test.questions || []).forEach((question, index) => {
      const block = document.createElement('div');
      block.className = 'faction-test-question';
      const heading = document.createElement('h4');
      heading.className = 'faction-test-question-title';
      heading.textContent = `${index + 1}. ${question.text}`;
      block.append(heading);

      const answers = document.createElement('div');
      answers.className = 'faction-test-answers';
      (question.options || []).forEach((option, optionIndex) => {
        const label = document.createElement('label');
        label.className = 'faction-test-answer';
        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = `test-q-${index}`;
        radio.value = String(optionIndex);
        const span = document.createElement('span');
        span.className = 'faction-test-answer-text';
        span.textContent = option;
        label.append(radio, span);
        answers.append(label);
      });
      block.append(answers);
      el.testRunnerQuestions.append(block);
    });
  }

  function renderTests() {
    if (!el.testList || !state.faction) return;
    if (el.testForm) {
      el.testForm.hidden = !state.canManage;
      el.testForm.style.display = state.canManage ? '' : 'none';
    }
    el.testList.innerHTML = '';
    const tests = Array.isArray(state.faction.tests) ? state.faction.tests : [];
    if (!tests.length) {
      el.testList.innerHTML = '<div class="faction-item-card"><p>Тестов пока нет.</p></div>';
      renderTestRunner(null);
      return;
    }

    tests.forEach((test) => {
      const card = document.createElement('article');
      card.className = 'faction-item-card';
      card.innerHTML = `
        <h4>${test.title}</h4>
        ${test.description ? `<p>${test.description}</p>` : ''}
        <p>Вопросов: ${(test.questions || []).length}. Проходной порог: ${test.passPercent}%</p>
        <p>Webhook: ${test.webhookConfigured || test.webhookUrl ? 'настроен' : 'не настроен'}</p>
      `;
      const actions = document.createElement('div');
      actions.className = 'faction-item-actions';
      const runBtn = document.createElement('button');
      runBtn.type = 'button';
      runBtn.className = 'faction-mini-btn';
      runBtn.textContent = 'Пройти тест';
      runBtn.setAttribute('data-action', 'run-test');
      runBtn.setAttribute('data-test-id', test.id);
      actions.append(runBtn);
      if (state.canManage) {
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'faction-mini-btn danger';
        removeBtn.textContent = 'Удалить';
        removeBtn.setAttribute('data-action', 'delete-test');
        removeBtn.setAttribute('data-test-id', test.id);
        actions.append(removeBtn);
      }
      card.append(actions);
      el.testList.append(card);
    });

    const active = tests.find((row) => row.id === state.activeTestId);
    renderTestRunner(active || null);
  }

  function renderRosters() {
    if (!el.rosterList || !state.faction) return;
    if (el.rosterForm) {
      el.rosterForm.hidden = !state.canManage;
      el.rosterForm.style.display = state.canManage ? '' : 'none';
    }
    el.rosterList.innerHTML = '';
    const rosters = Array.isArray(state.faction.rosters) ? state.faction.rosters : [];
    if (!rosters.length) {
      el.rosterList.innerHTML = '<div class="faction-item-card"><p>Составы пока не созданы.</p></div>';
      return;
    }

    rosters.forEach((roster) => {
      const card = document.createElement('article');
      card.className = 'faction-item-card';
      const title = document.createElement('h4');
      title.textContent = roster.title;
      card.append(title);

      const membersWrap = document.createElement('div');
      membersWrap.className = 'faction-roster-members';
      const members = Array.isArray(roster.members) ? roster.members : [];
      if (!members.length) {
        membersWrap.innerHTML = '<p>Участников пока нет.</p>';
      } else {
        members.forEach((member) => {
          const row = document.createElement('div');
          row.className = 'faction-roster-member';
          row.innerHTML = `
            <div class="faction-roster-member-info">
              <strong>${member.name}</strong>
              <span class="faction-roster-member-role">${member.role || 'Роль не указана'}</span>
              ${member.note ? `<span class="faction-roster-member-role">${member.note}</span>` : ''}
            </div>
          `;
          if (state.canManage) {
            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.className = 'faction-mini-btn danger';
            removeBtn.textContent = 'Удалить';
            removeBtn.setAttribute('data-action', 'delete-member');
            removeBtn.setAttribute('data-roster-id', roster.id);
            removeBtn.setAttribute('data-member-id', member.id);
            row.append(removeBtn);
          }
          membersWrap.append(row);
        });
      }
      card.append(membersWrap);

      if (state.canManage) {
        const form = document.createElement('form');
        form.className = 'faction-subform';
        form.dataset.action = 'add-member';
        form.dataset.rosterId = roster.id;
        form.innerHTML = `
          <label>Имя участника <input name="name" type="text" maxlength="120" required /></label>
          <label>Должность <input name="role" type="text" maxlength="120" /></label>
          <label>Примечание <input name="note" type="text" maxlength="280" /></label>
          <div class="faction-item-actions">
            <button class="faction-mini-btn" type="submit">Добавить участника</button>
            <button class="faction-mini-btn danger" type="button" data-action="delete-roster" data-roster-id="${roster.id}">Удалить состав</button>
          </div>
        `;
        card.append(form);
      }
      el.rosterList.append(card);
    });
  }

  function renderApplicationRunner(form) {
    if (!el.appRunner || !el.appRunnerTitle || !el.appRunnerFields || !el.appRunnerResult) return;
    if (!form) {
      el.appRunner.hidden = true;
      el.appRunnerFields.innerHTML = '';
      el.appRunnerResult.textContent = '';
      return;
    }

    el.appRunner.hidden = false;
    el.appRunnerTitle.textContent = `Заявление: ${form.title}`;
    el.appRunnerFields.innerHTML = '';
    el.appRunnerResult.textContent = '';

    (form.fields || []).forEach((field) => {
      const label = document.createElement('label');
      label.textContent = field.label;
      let input;
      if (field.type === 'textarea') {
        input = document.createElement('textarea');
        input.rows = 4;
      } else {
        input = document.createElement('input');
        input.type = field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text';
      }
      input.required = Boolean(field.required);
      input.maxLength = Number(field.maxLength || 240);
      input.placeholder = field.placeholder || '';
      input.setAttribute('data-field-id', field.id);
      label.append(input);
      el.appRunnerFields.append(label);
    });
  }

  function renderApplications() {
    if (!el.appList || !state.faction) return;
    if (el.appBuilderForm) {
      el.appBuilderForm.hidden = !state.canManage;
      el.appBuilderForm.style.display = state.canManage ? '' : 'none';
    }
    el.appList.innerHTML = '';
    const forms = Array.isArray(state.faction.applications) ? state.faction.applications : [];
    if (!forms.length) {
      el.appList.innerHTML = '<div class="faction-item-card"><p>Форм заявлений пока нет.</p></div>';
      renderApplicationRunner(null);
      return;
    }

    forms.forEach((form) => {
      const card = document.createElement('article');
      card.className = 'faction-item-card';
      card.innerHTML = `
        <h4>${form.title}</h4>
        ${form.description ? `<p>${form.description}</p>` : ''}
        <p>Полей: ${(form.fields || []).length}</p>
      `;
      const actions = document.createElement('div');
      actions.className = 'faction-item-actions';
      const fillBtn = document.createElement('button');
      fillBtn.type = 'button';
      fillBtn.className = 'faction-mini-btn';
      fillBtn.textContent = 'Заполнить';
      fillBtn.setAttribute('data-action', 'run-application');
      fillBtn.setAttribute('data-application-id', form.id);
      actions.append(fillBtn);
      if (state.canManage) {
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'faction-mini-btn danger';
        removeBtn.textContent = 'Удалить';
        removeBtn.setAttribute('data-action', 'delete-application');
        removeBtn.setAttribute('data-application-id', form.id);
        actions.append(removeBtn);
      }
      card.append(actions);
      el.appList.append(card);
    });

    const active = forms.find((row) => row.id === state.activeApplicationId);
    renderApplicationRunner(active || null);
  }

  function renderDetail() {
    if (!state.faction) return;
    syncManagerOnlyPanels();
    renderMainInfo();
    renderMemos();
    renderTests();
    renderRosters();
    renderApplications();
    setSection(state.activeSection);
  }

  async function loadMe() {
    try {
      state.me = await requestJson('/api/me');
    } catch {
      state.me = { authenticated: false, isAdmin: false, user: null };
    }
  }

  async function loadList() {
    const payload = await requestJson('/api/factions');
    state.factions = Array.isArray(payload.factions) ? payload.factions : [];
    renderFactionCards();
  }

  async function loadDetail() {
    const payload = await requestJson(`/api/factions/${encodeURIComponent(state.factionId)}`);
    state.faction = payload.faction || null;
    state.canManage = Boolean(payload.canManage);
    state.memoEditingId = '';
    renderDetail();
  }

  async function saveFactionMainInfo(event) {
    event.preventDefault();
    if (!state.faction) return;

    try {
      const [avatarDataUrl, bannerDataUrl] = await Promise.all([
        toDataUrl(el.profileAvatar?.files?.[0] || null),
        toDataUrl(el.profileBanner?.files?.[0] || null),
      ]);
      const payload = await requestJson(`/api/factions/${encodeURIComponent(state.faction.id)}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leader: String(el.profileLeader?.value || '').trim(),
          leaderDiscordId: String(el.profileLeaderDiscordId?.value || '').trim(),
          leaderDiscordProfileUrl: String(el.profileLeaderDiscordProfile?.value || '').trim(),
          deputies: parseDeputiesEditorText(String(el.profileDeputies?.value || '')),
          deputiesText: String(el.profileDeputies?.value || ''),
          about: String(el.profileAbout?.value || '').trim(),
          discordServerId: String(el.profileDiscordServerId?.value || '').trim(),
          managerNamesText: String(el.profileManagers?.value || '').trim(),
          avatarDataUrl,
          bannerDataUrl,
        }),
      });
      state.faction = payload.faction;
      if (el.profileAvatar) el.profileAvatar.value = '';
      if (el.profileBanner) el.profileBanner.value = '';
      renderDetail();
      setStatus('Информация фракции обновлена.', false);
    } catch (error) {
      setStatus(String(error.message || 'Ошибка обновления информации.'), true);
    }
  }

  async function createFaction(event) {
    event.preventDefault();
    if (!state.me.authenticated) return setStatus('Для создания фракции нужно войти через Discord.', true);
    try {
      const [avatarDataUrl, bannerDataUrl] = await Promise.all([
        toDataUrl(el.createAvatar?.files?.[0] || null),
        toDataUrl(el.createBanner?.files?.[0] || null),
      ]);
      const payload = await requestJson('/api/factions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: String(el.createName?.value || '').trim(),
          avatarDataUrl,
          bannerDataUrl,
        }),
      });
      window.location.href = `/factions/${encodeURIComponent(payload.faction?.id || '')}`;
    } catch (error) {
      setStatus(String(error.message || 'Ошибка создания фракции.'), true);
    }
  }

  async function createMemo(event) {
    event.preventDefault();
    if (!state.faction) return;
    try {
      const payload = await requestJson(`/api/factions/${encodeURIComponent(state.faction.id)}/memos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: String(el.memoTitle?.value || '').trim(),
          content: String(el.memoContent?.value || '').trim(),
          checklist: textLines(el.memoChecklist?.value || ''),
          category: String(el.memoCategory?.value || '').trim(),
          tags: parseTags(el.memoTags?.value || ''),
          pinned: Boolean(el.memoPinned?.checked),
        }),
      });
      state.faction = payload.faction;
      el.memoForm?.reset();
      renderDetail();
      setStatus('Памятка создана.', false);
    } catch (error) {
      setStatus(String(error.message || 'Ошибка создания памятки.'), true);
    }
  }

  async function updateMemo(memoId, body, successMessage = 'Памятка обновлена.') {
    if (!state.faction) return;
    const id = String(memoId || '').trim();
    if (!id) return;
    const payload = await requestJson(`/api/factions/${encodeURIComponent(state.faction.id)}/memos/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {}),
    });
    state.faction = payload.faction;
    renderDetail();
    setStatus(successMessage, false);
  }

  async function createTest(event) {
    event.preventDefault();
    if (!state.faction) return;
    try {
      const payload = await requestJson(`/api/factions/${encodeURIComponent(state.faction.id)}/tests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: String(el.testTitle?.value || '').trim(),
          description: String(el.testDescription?.value || '').trim(),
          passPercent: Number(el.testPassPercent?.value || 70),
          webhookUrl: String(el.testWebhookInput?.value || '').trim(),
          questions: collectTestQuestions(),
        }),
      });
      state.faction = payload.faction;
      el.testForm?.reset();
      if (el.testPassPercent) el.testPassPercent.value = '70';
      if (el.testQuestions) el.testQuestions.innerHTML = '';
      ensureQuestionBuilder();
      renderDetail();
      setStatus('Тест создан.', false);
    } catch (error) {
      setStatus(String(error.message || 'Ошибка создания теста.'), true);
    }
  }

  async function createRoster(event) {
    event.preventDefault();
    if (!state.faction) return;
    try {
      const payload = await requestJson(`/api/factions/${encodeURIComponent(state.faction.id)}/rosters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: String(el.rosterTitle?.value || '').trim() }),
      });
      state.faction = payload.faction;
      el.rosterForm?.reset();
      renderDetail();
      setStatus('Состав создан.', false);
    } catch (error) {
      setStatus(String(error.message || 'Ошибка создания состава.'), true);
    }
  }

  async function createApplication(event) {
    event.preventDefault();
    if (!state.faction) return;
    try {
      const payload = await requestJson(`/api/factions/${encodeURIComponent(state.faction.id)}/applications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: String(el.appTitleInput?.value || '').trim(),
          description: String(el.appDescriptionInput?.value || '').trim(),
          webhookUrl: String(el.appWebhookInput?.value || '').trim(),
          fields: collectApplicationFields(),
        }),
      });
      state.faction = payload.faction;
      el.appBuilderForm?.reset();
      if (el.appFieldsBuilder) el.appFieldsBuilder.innerHTML = '';
      ensureApplicationFieldBuilder();
      renderDetail();
      setStatus('Форма заявления создана.', false);
    } catch (error) {
      setStatus(String(error.message || 'Ошибка создания формы заявления.'), true);
    }
  }

  async function deleteFaction(factionId, options = {}) {
    const redirectOnSuccess = Boolean(options.redirectOnSuccess);
    const id = String(factionId || '').trim();
    if (!id) return;
    if (!window.confirm('Удалить фракцию? Это действие нельзя отменить.')) return;
    try {
      await requestJson(`/api/factions/${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (redirectOnSuccess) {
        window.location.href = '/factions';
        return;
      }
      state.factions = state.factions.filter((row) => row.id !== id);
      renderFactionCards();
      if (!state.factions.length) {
        setStatus('Пока нет добавленных фракций.', false);
      } else {
        setStatus('Фракция удалена.', false);
      }
    } catch (error) {
      setStatus(String(error.message || 'Ошибка удаления фракции.'), true);
    }
  }

  function openTestRunner(testId) {
    if (!state.faction) return;
    state.activeTestId = String(testId || '');
    setSection('tests');
    renderTests();
    if (el.testRunner && !el.testRunner.hidden) {
      el.testRunner.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function openApplicationRunner(applicationId) {
    if (!state.faction) return;
    state.activeApplicationId = String(applicationId || '');
    setSection('applications');
    renderApplications();
    if (el.appRunner && !el.appRunner.hidden) {
      el.appRunner.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  async function deleteMemo(memoId) {
    if (!state.faction || !window.confirm('Удалить памятку?')) return;
    try {
      const payload = await requestJson(
        `/api/factions/${encodeURIComponent(state.faction.id)}/memos/${encodeURIComponent(memoId)}`,
        { method: 'DELETE' }
      );
      state.faction = payload.faction;
      if (state.memoEditingId === memoId) state.memoEditingId = '';
      Object.keys(state.memoChecks).forEach((key) => {
        if (key.startsWith(`${memoId}:`)) delete state.memoChecks[key];
      });
      renderDetail();
      setStatus('Памятка удалена.', false);
    } catch (error) {
      setStatus(String(error.message || 'Ошибка удаления памятки.'), true);
    }
  }

  async function deleteTest(testId) {
    if (!state.faction || !window.confirm('Удалить тест?')) return;
    try {
      const payload = await requestJson(
        `/api/factions/${encodeURIComponent(state.faction.id)}/tests/${encodeURIComponent(testId)}`,
        { method: 'DELETE' }
      );
      state.faction = payload.faction;
      if (state.activeTestId === testId) state.activeTestId = '';
      renderDetail();
      setStatus('Тест удален.', false);
    } catch (error) {
      setStatus(String(error.message || 'Ошибка удаления теста.'), true);
    }
  }

  async function submitTestResult(event) {
    event.preventDefault();
    if (!state.faction || !state.activeTestId) return;
    const test = (state.faction.tests || []).find((row) => row.id === state.activeTestId);
    if (!test) return;

    const answers = [];
    for (let idx = 0; idx < test.questions.length; idx += 1) {
      const checked = el.testRunnerForm?.querySelector(`input[name="test-q-${idx}"]:checked`);
      if (!checked) {
        if (el.testRunnerResult) {
          el.testRunnerResult.textContent = `Ответьте на вопрос #${idx + 1}.`;
          el.testRunnerResult.style.color = '#ffadc7';
        }
        return;
      }
      answers.push(Number(checked.value));
    }

    try {
      const payload = await requestJson(
        `/api/factions/${encodeURIComponent(state.faction.id)}/tests/${encodeURIComponent(test.id)}/submit`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            respondent: String(el.testRunnerRespondent?.value || '').trim(),
            answers,
          }),
        }
      );
      const result = payload.result || {};
      const webhook = payload.webhook || {};
      if (el.testRunnerResult) {
        const webhookText = webhook.sent
          ? 'Эмбед отправлен в Discord.'
          : `Эмбед не отправлен (${formatWebhookReason(webhook.reason)}).`;
        el.testRunnerResult.textContent =
          `Результат: ${result.score}/${result.total} (${result.percent}%). ` +
          `${result.passed ? 'Тест пройден.' : 'Тест не пройден.'} ` +
          webhookText;
        el.testRunnerResult.style.color = result.passed ? '#bdf4ce' : '#ffadc7';
      }
      setStatus('Результат теста обработан.', false);
    } catch (error) {
      if (el.testRunnerResult) {
        el.testRunnerResult.textContent = String(error.message || 'Ошибка отправки результата.');
        el.testRunnerResult.style.color = '#ffadc7';
      }
    }
  }

  function findMemoById(memoId) {
    const id = String(memoId || '').trim();
    if (!id || !state.faction) return null;
    const memos = Array.isArray(state.faction.memos) ? state.faction.memos : [];
    return memos.find((row) => String(row.id || '') === id) || null;
  }

  async function toggleMemoPinned(memoId) {
    const memo = findMemoById(memoId);
    if (!memo) return;
    try {
      await updateMemo(
        memo.id,
        {
          title: memo.title,
          content: memo.content,
          checklist: Array.isArray(memo.checklist) ? memo.checklist : [],
          category: memo.category || '',
          tags: Array.isArray(memo.tags) ? memo.tags : [],
          pinned: !memo.pinned,
        },
        memo.pinned ? 'Памятка откреплена.' : 'Памятка закреплена.'
      );
    } catch (error) {
      setStatus(String(error.message || 'Не удалось изменить закрепление памятки.'), true);
    }
  }

  async function saveMemoFromEditForm(formNode) {
    if (!formNode) return;
    const memoId = String(formNode.getAttribute('data-memo-id') || '').trim();
    if (!memoId) return;
    try {
      await updateMemo(memoId, {
        title: String(formNode.querySelector('[name="title"]')?.value || '').trim(),
        content: String(formNode.querySelector('[name="content"]')?.value || '').trim(),
        checklist: textLines(formNode.querySelector('[name="checklist"]')?.value || ''),
        category: String(formNode.querySelector('[name="category"]')?.value || '').trim(),
        tags: parseTags(formNode.querySelector('[name="tags"]')?.value || ''),
        pinned: Boolean(formNode.querySelector('[name="pinned"]')?.checked),
      });
      state.memoEditingId = '';
      renderMemos();
    } catch (error) {
      setStatus(String(error.message || 'Ошибка обновления памятки.'), true);
    }
  }

  async function addRosterMember(event) {
    const form = event.target.closest('form[data-action="add-member"]');
    if (!form || !state.faction) return;
    event.preventDefault();
    const rosterId = String(form.dataset.rosterId || '');
    try {
      const payload = await requestJson(
        `/api/factions/${encodeURIComponent(state.faction.id)}/rosters/${encodeURIComponent(rosterId)}/members`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: String(form.elements.name?.value || '').trim(),
            role: String(form.elements.role?.value || '').trim(),
            note: String(form.elements.note?.value || '').trim(),
          }),
        }
      );
      state.faction = payload.faction;
      renderDetail();
      setStatus('Участник добавлен.', false);
    } catch (error) {
      setStatus(String(error.message || 'Ошибка добавления участника.'), true);
    }
  }

  async function rosterAction(action, rosterId, memberId) {
    if (!state.faction) return;
    try {
      let payload;
      if (action === 'delete-member') {
        payload = await requestJson(
          `/api/factions/${encodeURIComponent(state.faction.id)}/rosters/${encodeURIComponent(rosterId)}/members/${encodeURIComponent(memberId)}`,
          { method: 'DELETE' }
        );
      } else {
        if (!window.confirm('Удалить состав?')) return;
        payload = await requestJson(
          `/api/factions/${encodeURIComponent(state.faction.id)}/rosters/${encodeURIComponent(rosterId)}`,
          { method: 'DELETE' }
        );
      }
      state.faction = payload.faction;
      renderDetail();
      setStatus(action === 'delete-member' ? 'Участник удален.' : 'Состав удален.', false);
    } catch (error) {
      setStatus(String(error.message || 'Ошибка операции с составом.'), true);
    }
  }

  async function deleteApplication(applicationId) {
    if (!state.faction || !window.confirm('Удалить форму заявления?')) return;
    try {
      const payload = await requestJson(
        `/api/factions/${encodeURIComponent(state.faction.id)}/applications/${encodeURIComponent(applicationId)}`,
        { method: 'DELETE' }
      );
      state.faction = payload.faction;
      if (state.activeApplicationId === applicationId) state.activeApplicationId = '';
      renderDetail();
      setStatus('Форма заявления удалена.', false);
    } catch (error) {
      setStatus(String(error.message || 'Ошибка удаления формы заявления.'), true);
    }
  }

  async function submitApplication(event) {
    event.preventDefault();
    if (!state.faction || !state.activeApplicationId) return;
    const form = (state.faction.applications || []).find((row) => row.id === state.activeApplicationId);
    if (!form) return;

    const answers = {};
    (form.fields || []).forEach((field) => {
      const control = el.appRunnerForm?.querySelector(`[data-field-id="${field.id}"]`);
      answers[field.id] = String(control?.value || '').trim();
    });

    try {
      const payload = await requestJson(
        `/api/factions/${encodeURIComponent(state.faction.id)}/applications/${encodeURIComponent(form.id)}/submit`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            applicant: String(el.appApplicantInput?.value || '').trim(),
            answers,
          }),
        }
      );
      if (el.appRunnerResult) {
        el.appRunnerResult.textContent = payload.message || 'Заявление отправлено.';
        el.appRunnerResult.style.color = '#bdf4ce';
      }
      setStatus('Заявление отправлено.', false);
    } catch (error) {
      if (el.appRunnerResult) {
        el.appRunnerResult.textContent = String(error.message || 'Ошибка отправки заявления.');
        el.appRunnerResult.style.color = '#ffadc7';
      }
    }
  }

  function bindListEvents() {
    if (el.addCard && el.modal) {
      el.addCard.addEventListener('click', () => {
        if (!state.me.authenticated) return setStatus('Для создания фракции войдите через Discord.', true);
        el.modal.hidden = false;
        document.body.style.overflow = 'hidden';
      });
    }
    el.createCancelBtn?.addEventListener('click', () => {
      if (!el.modal) return;
      el.modal.hidden = true;
      document.body.style.overflow = '';
      el.createForm?.reset();
    });
    el.modal?.addEventListener('click', (event) => {
      if (event.target === el.modal) {
        el.modal.hidden = true;
        document.body.style.overflow = '';
        el.createForm?.reset();
      }
    });
    window.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && el.modal && !el.modal.hidden) {
        el.modal.hidden = true;
        document.body.style.overflow = '';
      }
    });
    el.createForm?.addEventListener('submit', createFaction);
    el.grid?.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-action="delete-faction"]');
      if (!button) return;
      event.preventDefault();
      event.stopPropagation();
      const factionId = String(button.dataset.factionId || '');
      if (factionId) {
        void deleteFaction(factionId);
      }
    });
  }

  function bindDetailEvents() {
    el.detailDeleteBtn?.addEventListener('click', () => {
      if (!state.faction) return;
      void deleteFaction(state.faction.id, { redirectOnSuccess: true });
    });

    el.subnavButtons.forEach((button) => {
      button.addEventListener('click', () => setSection(String(button.dataset.section || 'main')));
    });
    el.profileForm?.addEventListener('submit', saveFactionMainInfo);
    el.memoForm?.addEventListener('submit', createMemo);
    el.memoSearchInput?.addEventListener('input', () => renderMemos());
    el.memoFilterCategory?.addEventListener('input', () => renderMemos());
    el.testForm?.addEventListener('submit', createTest);
    el.rosterForm?.addEventListener('submit', createRoster);
    el.appBuilderForm?.addEventListener('submit', createApplication);

    el.testAddQuestionBtn?.addEventListener('click', () => el.testQuestions?.append(createQuestionBuilder()));
    el.testQuestions?.addEventListener('click', (event) => {
      const addOptionButton = event.target.closest('.q-option-add');
      if (addOptionButton) {
        const block = addOptionButton.closest('.faction-question-builder');
        if (block) {
          addQuestionOption(block);
          block.querySelector('.q-option-row:last-child .q-option')?.focus();
        }
        return;
      }
      if (event.target.closest('.q-remove')) {
        event.target.closest('.faction-question-builder')?.remove();
        ensureQuestionBuilder();
      }
    });

    el.appAddFieldBtn?.addEventListener('click', () => el.appFieldsBuilder?.append(createApplicationFieldBuilder()));
    el.appFieldsBuilder?.addEventListener('click', (event) => {
      if (event.target.closest('.a-remove')) {
        event.target.closest('.faction-question-builder')?.remove();
        ensureApplicationFieldBuilder();
      }
    });

    el.memoList?.addEventListener('click', (event) => {
      const target = event.target.closest('button[data-action]');
      if (!target) return;
      const action = String(target.dataset.action || '');
      const memoId = String(target.dataset.memoId || '');
      if (!memoId) return;
      if (action === 'delete-memo') return void deleteMemo(memoId);
      if (action === 'toggle-pin-memo') return void toggleMemoPinned(memoId);
      if (action === 'edit-memo') {
        state.memoEditingId = state.memoEditingId === memoId ? '' : memoId;
        renderMemos();
        return;
      }
      if (action === 'cancel-edit-memo') {
        state.memoEditingId = '';
        renderMemos();
      }
    });
    el.memoList?.addEventListener('submit', (event) => {
      const formNode = event.target.closest('form.faction-memo-edit-form');
      if (!formNode) return;
      event.preventDefault();
      void saveMemoFromEditForm(formNode);
    });

    el.testList?.addEventListener('click', (event) => {
      const target = event.target.closest('button[data-action]');
      if (!target) return;
      const action = String(target.dataset.action || '');
      const testId = String(target.dataset.testId || '');
      if (!testId) return;
      if (action === 'run-test') {
        openTestRunner(testId);
        return;
      }
      if (action === 'delete-test') {
        void deleteTest(testId);
      }
    });
    el.testRunnerForm?.addEventListener('submit', submitTestResult);

    el.rosterList?.addEventListener('submit', (event) => {
      void addRosterMember(event);
    });
    el.rosterList?.addEventListener('click', (event) => {
      const target = event.target.closest('button[data-action]');
      if (!target) return;
      const action = String(target.dataset.action || '');
      if (action !== 'delete-member' && action !== 'delete-roster') return;
      const rosterId = String(target.dataset.rosterId || '');
      if (!rosterId) return;
      const memberId = String(target.dataset.memberId || '');
      void rosterAction(action, rosterId, memberId);
    });

    el.appList?.addEventListener('click', (event) => {
      const target = event.target.closest('button[data-action]');
      if (!target) return;
      const action = String(target.dataset.action || '');
      const applicationId = String(target.dataset.applicationId || '');
      if (!applicationId) return;
      if (action === 'run-application') {
        openApplicationRunner(applicationId);
        return;
      }
      if (action === 'delete-application') {
        void deleteApplication(applicationId);
      }
    });
    el.appRunnerForm?.addEventListener('submit', submitApplication);
  }

  async function init() {
    showMode();
    await loadMe();
    if (state.mode === 'list') {
      bindListEvents();
      await loadList();
      if (!state.factions.length) {
        setStatus(
          state.me.authenticated
            ? 'Нет доступных фракций. Доступ дают только для участников Discord-сервера фракции или создателя.'
            : 'Войдите через Discord, чтобы видеть доступные фракции.',
          false
        );
      }
      return;
    }

    bindDetailEvents();
    ensureQuestionBuilder();
    ensureApplicationFieldBuilder();
    syncManagerOnlyPanels();
    setSection('main');
    try {
      await loadDetail();
      setStatus('', false);
    } catch (error) {
      setStatus(String(error.message || 'Не удалось загрузить фракцию.'), true);
    }
  }

  void init();
})();

