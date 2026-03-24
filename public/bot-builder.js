
(function () {
  const MODULES = [];
  const CONTRACT_CATALOG = [
    'Товар со склада',
    'Гровер I',
    'Гровер II',
    'Гровер III',
    'Гровер IV',
    'Гровер V',
    'Металлургия I',
    'Металлургия II',
    'Металлургия III',
    'Металлургия IV',
    'Дары моря I',
    'Дары моря II',
    'Дары моря III',
    'Дары моря IV',
    'Дары моря V',
    'Дары моря VI',
    'Дары моря VII',
    'Дары моря VIII',
  ];

  const form = document.getElementById('botBuilderForm');
  const panel = document.getElementById('botBuilderPanel');
  const panelTitle = document.getElementById('botBuilderTitle');
  const panelCloseBtn = document.getElementById('botBuilderCancelBtn');
  const botProjectGrid = document.getElementById('botProjectGrid');
  const botManagerStatus = document.getElementById('botManagerStatus');
  const botProjectSearchInput = document.getElementById('botProjectSearchInput');
  const botProjectFilters = document.getElementById('botProjectFilters');
  const botNameInput = document.getElementById('botNameInput');
  const botFolderInput = document.getElementById('botFolderInput');
  const botTypeInput = document.getElementById('botTypeInput');
  const botPrefixInput = document.getElementById('botPrefixInput');
  const botTokenInput = document.getElementById('botTokenInput');
  const botClientIdInput = document.getElementById('botClientIdInput');
  const botGuildIdInput = document.getElementById('botGuildIdInput');
  const familyEmbedTitleInput = document.getElementById('familyEmbedTitleInput');
  const familyEmbedTextInput = document.getElementById('familyEmbedTextInput');
  const familyEmbedFooterInput = document.getElementById('familyEmbedFooterInput');
  const familyPublishChannelIdInput = document.getElementById('familyPublishChannelIdInput');
  const familyOpenButtonLabelInput = document.getElementById('familyOpenButtonLabelInput');
  const familyOpenButtonStyleInput = document.getElementById('familyOpenButtonStyleInput');
  const familyQuestionsInput = document.getElementById('familyQuestionsInput');
  const familyTicketCategoryIdInput = document.getElementById('familyTicketCategoryIdInput');
  const familyCallChannelIdInput = document.getElementById('familyCallChannelIdInput');
  const familyApproveRoleIdsInput = document.getElementById('familyApproveRoleIdsInput');
  const familyReviewerRoleIdsInput = document.getElementById('familyReviewerRoleIdsInput');
  const contractEmbedTitleInput = document.getElementById('contractEmbedTitleInput');
  const contractEmbedTextInput = document.getElementById('contractEmbedTextInput');
  const contractEmbedFooterInput = document.getElementById('contractEmbedFooterInput');
  const contractPublishChannelIdInput = document.getElementById('contractPublishChannelIdInput');
  const contractReportChannelIdInput = document.getElementById('contractReportChannelIdInput');
  const contractOpenButtonLabelInput = document.getElementById('contractOpenButtonLabelInput');
  const contractOpenButtonStyleInput = document.getElementById('contractOpenButtonStyleInput');
  const contractReviewerRoleIdsInput = document.getElementById('contractReviewerRoleIdsInput');
  const contractCatalogWrap = document.getElementById('contractCatalogWrap');
  const contractSelectedCount = document.getElementById('contractSelectedCount');
  const contractSelectAllBtn = document.getElementById('contractSelectAllBtn');
  const contractClearAllBtn = document.getElementById('contractClearAllBtn');
  const botCloudAutoSyncInput = document.getElementById('botCloudAutoSyncInput');
  const botCloudStatus = document.getElementById('botCloudStatus');
  const botCloudConnectBtn = document.getElementById('botCloudConnectBtn');
  const botCloudSyncBtn = document.getElementById('botCloudSyncBtn');
  const botCloudDisconnectBtn = document.getElementById('botCloudDisconnectBtn');
  const botBuilderQuickNav = document.getElementById('botBuilderQuickNav');
  const botBuilderQuickNavBtns = Array.from(document.querySelectorAll('.bot-builder-quicknav-btn'));
  const botBuilderSections = Array.from(document.querySelectorAll('.bot-builder-section'));
  const botFeatureTabs = document.getElementById('botFeatureTabs');
  const botFeatureTabButtons = Array.from(document.querySelectorAll('.bot-feature-tab'));
  const botFeaturePanels = Array.from(document.querySelectorAll('.bot-feature-panel'));
  const botBuilderChecklist = document.getElementById('botBuilderChecklist');
  const botBuilderChecklistItems = Array.from(document.querySelectorAll('.bot-check-item'));
  const botBuilderLiveStatus = document.getElementById('botBuilderLiveStatus');
  const botModulesGrid = document.getElementById('botModulesGrid');
  const botBuilderStatus = document.getElementById('botBuilderStatus');
  const publishFamilyEmbedBtn = document.getElementById('publishFamilyEmbedBtn');
  const publishContractsEmbedBtn = document.getElementById('publishContractsEmbedBtn');
  const submitBtn = form?.querySelector('button[type="submit"]');
  const BOT_PROJECTS_API = '/api/bot-builder/projects';

  if (
    !form ||
    !panel ||
    !panelTitle ||
    !panelCloseBtn ||
    !botProjectGrid ||
    !botProjectSearchInput ||
    !botProjectFilters ||
    !botNameInput ||
    !botFolderInput ||
    !botTypeInput ||
    !botPrefixInput ||
    !familyEmbedTitleInput ||
    !familyEmbedTextInput ||
    !familyEmbedFooterInput ||
    !familyPublishChannelIdInput ||
    !familyOpenButtonLabelInput ||
    !familyOpenButtonStyleInput ||
    !familyQuestionsInput ||
    !familyTicketCategoryIdInput ||
    !familyCallChannelIdInput ||
    !familyApproveRoleIdsInput ||
    !familyReviewerRoleIdsInput ||
    !contractEmbedTitleInput ||
    !contractEmbedTextInput ||
    !contractEmbedFooterInput ||
    !contractPublishChannelIdInput ||
    !contractReportChannelIdInput ||
    !contractOpenButtonLabelInput ||
    !contractOpenButtonStyleInput ||
    !contractReviewerRoleIdsInput ||
    !contractCatalogWrap ||
    !contractSelectedCount ||
    !contractSelectAllBtn ||
    !contractClearAllBtn ||
    !botCloudAutoSyncInput ||
    !botCloudStatus ||
    !botCloudConnectBtn ||
    !botCloudSyncBtn ||
    !botCloudDisconnectBtn ||
    !botBuilderQuickNav ||
    !botFeatureTabs ||
    !botBuilderChecklist ||
    !botBuilderLiveStatus ||
    !botModulesGrid ||
    !botBuilderStatus ||
    !publishFamilyEmbedBtn ||
    !publishContractsEmbedBtn ||
    !submitBtn
  ) {
    return;
  }

  let editingProjectId = null;
  let projects = [];
  let isProjectsLoaded = false;
  let isAuthenticated = true;
  let autoSaveTimer = null;
  let isAutoSaving = false;
  let projectFilterMode = 'all';
  let projectSearchQuery = '';
  let cloudDiagnosticsText = '';
  let activeFeatureTab = 'applications';

  panel.hidden = true;
  publishFamilyEmbedBtn.textContent = 'Опубликовать эмбед';
  publishFamilyEmbedBtn.disabled = true;
  publishContractsEmbedBtn.textContent = 'Опубликовать контракты';
  publishContractsEmbedBtn.disabled = true;
  botCloudConnectBtn.textContent = 'Подключить бота';
  botCloudSyncBtn.textContent = 'Синхронизировать';
  botCloudDisconnectBtn.textContent = 'Отключить';
  botCloudSyncBtn.disabled = true;
  botCloudDisconnectBtn.disabled = true;
  renderModules();
  form.addEventListener('submit', onSubmitCreate);
  form.addEventListener('input', onFormInputChange);
  panelCloseBtn.addEventListener('click', closeBuilderPanel);
  publishFamilyEmbedBtn.addEventListener('click', onPublishFamilyEmbed);
  publishContractsEmbedBtn.addEventListener('click', onPublishContractsEmbed);
  botCloudConnectBtn.addEventListener('click', onCloudConnect);
  botCloudSyncBtn.addEventListener('click', onCloudSyncNow);
  botCloudDisconnectBtn.addEventListener('click', onCloudDisconnect);
  initBuilderQuickNav();
  initFeatureTabs();
  initContractsPicker();
  initInputHelpers();
  initProjectFilters();
  initKeyboardShortcuts();
  resetChecklistState();
  setLiveStatus('Статус: откройте плитку бота для редактирования.', 'neutral');
  renderProjectGrid();
  void init();

  async function init() {
    setStatus('Загружаю список ботов...', false);
    try {
      await reloadProjectsFromServer();
      if (!projects.length) {
        setStatus('Список ботов пуст. Нажмите "+ Создать бота".', false);
      } else {
        setStatus('', false);
      }
    } catch (error) {
      setStatus(
        `Не удалось загрузить ботов: ${error && error.message ? error.message : 'неизвестная ошибка'}`,
        true
      );
    }
  }

  function initProjectFilters() {
    botProjectSearchInput.addEventListener('input', () => {
      projectSearchQuery = String(botProjectSearchInput.value || '').trim().toLowerCase();
      renderProjectGrid();
    });

    Array.from(botProjectFilters.querySelectorAll('.bot-filter-btn')).forEach((btn) => {
      btn.addEventListener('click', () => {
        const nextMode = String(btn.dataset.filter || 'all').trim();
        if (!nextMode || nextMode === projectFilterMode) return;
        projectFilterMode = nextMode;
        Array.from(botProjectFilters.querySelectorAll('.bot-filter-btn')).forEach((node) => {
          node.classList.toggle('active', node === btn);
        });
        renderProjectGrid();
      });
    });
  }

  function initKeyboardShortcuts() {
    window.addEventListener('keydown', (event) => {
      const isSaveHotkey = (event.ctrlKey || event.metaKey) && String(event.key || '').toLowerCase() === 's';
      if (!isSaveHotkey || panel.hidden) return;
      event.preventDefault();
      if (submitBtn.disabled) return;
      submitBtn.click();
    });
  }

  function initBuilderQuickNav() {
    if (!botBuilderQuickNavBtns.length || !botBuilderSections.length) return;

    botBuilderQuickNavBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const targetId = String(btn.dataset.target || '').trim();
        if (!targetId) return;
        const section = document.getElementById(targetId);
        if (!section) return;
        setActiveBuilderSection(targetId);
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible?.target?.id) return;
        setActiveBuilderSection(visible.target.id);
      },
      { threshold: [0.2, 0.45, 0.7], rootMargin: '-20% 0px -55% 0px' }
    );

    botBuilderSections.forEach((section) => observer.observe(section));
  }

  function setActiveBuilderSection(sectionId) {
    botBuilderQuickNavBtns.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.target === sectionId);
    });
  }

  function initFeatureTabs() {
    if (!botFeatureTabButtons.length || !botFeaturePanels.length) return;
    botFeatureTabButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const tabId = String(btn.dataset.featureTab || '').trim();
        if (!tabId) return;
        setActiveFeatureTab(tabId);
      });
    });
    setActiveFeatureTab(activeFeatureTab);
  }

  function setActiveFeatureTab(tabIdInput) {
    const tabId = String(tabIdInput || '').trim() || 'applications';
    activeFeatureTab = tabId;

    botFeatureTabButtons.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.featureTab === tabId);
    });
    botFeaturePanels.forEach((panelNode) => {
      panelNode.classList.toggle('active', panelNode.dataset.featurePanel === tabId);
    });
  }

  function setLiveStatus(text, tone) {
    botBuilderLiveStatus.textContent = text;
    botBuilderLiveStatus.classList.remove('ok', 'warn', 'work', 'neutral');
    botBuilderLiveStatus.classList.add(tone || 'neutral');
  }

  function resetChecklistState() {
    botBuilderChecklistItems.forEach((item) => item.classList.remove('done'));
  }

  function updateChecklistState() {
    if (panel.hidden || !editingProjectId) {
      resetChecklistState();
      return;
    }

    const config = getConfig();
    const current = projects.find((row) => row.id === editingProjectId);
    const cloud = normalizeCloudSettings(current?.cloud);
    const hasQuestions = parseQuestionLines(familyQuestionsInput.value).length > 0;
    const hasReviewers = parseIdLines(familyReviewerRoleIdsInput.value).length > 0;
    const hasFamilyConfig = Boolean(
      config.familyApplications.embedTitle &&
        config.familyApplications.embedDescription &&
        config.familyApplications.publishChannelId &&
        config.familyApplications.ticketCategoryId &&
        hasQuestions &&
        hasReviewers
    );
    const hasContractsConfig = Boolean(
      config.contracts.embedTitle &&
        config.contracts.embedDescription &&
        config.contracts.publishChannelId &&
        config.contracts.reportChannelId &&
        Array.isArray(config.contracts.selectedContracts) &&
        config.contracts.selectedContracts.length > 0
    );

    const checks = {
      base: Boolean(config.botName && config.folderName && config.prefix),
      cloud: Boolean(cloud.connected || config.botToken || isStoredTokenAvailable()),
      family: Boolean(hasFamilyConfig || hasContractsConfig),
    };
    checks.actions = checks.base && checks.family;

    botBuilderChecklistItems.forEach((item) => {
      const key = String(item.dataset.check || '').trim();
      item.classList.toggle('done', Boolean(checks[key]));
    });
  }

  function initInputHelpers() {
    const idInputs = [
      botClientIdInput,
      botGuildIdInput,
      familyPublishChannelIdInput,
      familyTicketCategoryIdInput,
      familyCallChannelIdInput,
      contractPublishChannelIdInput,
      contractReportChannelIdInput,
    ];

    idInputs.forEach((input) => {
      input?.addEventListener('input', () => {
        const cleaned = String(input.value || '')
          .replace(/\D+/g, '')
          .slice(0, 30);
        if (cleaned !== input.value) input.value = cleaned;
      });
    });

    botNameInput?.addEventListener('input', () => {
      if (String(botFolderInput.value || '').trim()) return;
      botFolderInput.value = sanitizeProjectFolderName(botNameInput.value || '');
    });
  }

  function onFormInputChange() {
    updateChecklistState();
    renderModules();
    if (!editingProjectId || panel.hidden) {
      setStatus('Настройки обновлены. Нажмите "Сохранить настройки".', false);
      setLiveStatus('Статус: изменения не привязаны к открытому боту.', 'warn');
      return;
    }
    setLiveStatus('Статус: изменения обнаружены.', 'warn');
    scheduleAutoSave();
  }

  function scheduleAutoSave() {
    if (autoSaveTimer) clearTimeout(autoSaveTimer);
    setStatus('Есть изменения. Идет автосохранение...', false);
    setLiveStatus('Статус: автосохранение запланировано.', 'work');
    autoSaveTimer = setTimeout(() => {
      autoSaveTimer = null;
      void runAutoSave();
    }, 900);
  }

  async function runAutoSave() {
    if (isAutoSaving || !editingProjectId || panel.hidden || !isProjectsLoaded || !isAuthenticated) return;
    isAutoSaving = true;
    setLiveStatus('Статус: выполняется автосохранение...', 'work');
    try {
      const config = getConfig();
      await upsertProject(config, getSelectedModules());
      renderProjectGrid();
      const current = projects.find((row) => row.id === editingProjectId);
      renderCloudState(current?.cloud);
      updateChecklistState();
      const stamp = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
      setStatus(`Изменения сохранены автоматически (${stamp}).`, false);
      setLiveStatus(`Статус: сохранено автоматически в ${stamp}.`, 'ok');
    } catch (error) {
      setStatus(
        `Автосохранение не выполнено: ${error && error.message ? error.message : 'неизвестная ошибка'}`,
        true
      );
      setLiveStatus('Статус: ошибка автосохранения.', 'warn');
    } finally {
      isAutoSaving = false;
    }
  }

  function createDefaultBotName() {
    let index = projects.length + 1;
    let name = `Новый бот ${index}`;
    const used = new Set(projects.map((row) => String(row.name || '').toLowerCase()));
    while (used.has(name.toLowerCase())) {
      index += 1;
      name = `Новый бот ${index}`;
    }
    return name;
  }

  function getTypeLabel(type) {
    return type === 'faction' ? 'Фракция' : 'Семья';
  }

  function formatDate(value) {
    try {
      return new Date(value).toLocaleDateString('ru-RU');
    } catch {
      return '';
    }
  }

  function parseIdLines(value) {
    return Array.from(
      new Set(
        String(value || '')
          .split('\n')
          .map((row) => row.trim())
          .filter((row) => /^\d{5,30}$/.test(row))
      )
    );
  }

  function parseQuestionLines(value) {
    return String(value || '')
      .split('\n')
      .map((row) => row.trim())
      .filter(Boolean)
      .slice(0, 5);
  }

  function normalizeButtonStyle(value) {
    const style = String(value || '').trim().toLowerCase();
    return ['primary', 'secondary', 'success', 'danger'].includes(style) ? style : 'primary';
  }

  function defaultFamilyApplications() {
    return {
      embedTitle: 'Заявки в семью',
      embedDescription: 'Нажмите кнопку ниже и заполните форму заявки.',
      embedFooter: 'Davis Project',
      publishChannelId: '',
      openButtonLabel: 'Открыть форму',
      openButtonStyle: 'primary',
      questions: [],
      ticketCategoryId: '',
      callChannelId: '',
      approveRoleIds: [],
      reviewerRoleIds: [],
    };
  }

  function defaultCloudSettings() {
    return {
      connected: false,
      autoSync: true,
      connectedAt: '',
      lastSyncedAt: '',
      lastSyncError: '',
      botUserId: '',
      botUsername: '',
    };
  }

  function normalizeCloudSettings(input) {
    const source = input && typeof input === 'object' ? input : {};
    const base = defaultCloudSettings();
    return {
      connected: Boolean(source.connected),
      autoSync: source.autoSync !== false,
      connectedAt: String(source.connectedAt || base.connectedAt).trim().slice(0, 80),
      lastSyncedAt: String(source.lastSyncedAt || base.lastSyncedAt).trim().slice(0, 80),
      lastSyncError: String(source.lastSyncError || base.lastSyncError).trim().slice(0, 240),
      botUserId: sanitizeNumericId(source.botUserId),
      botUsername: String(source.botUsername || base.botUsername).trim().slice(0, 120),
    };
  }

  function normalizeFamilyApplicationsInput(input) {
    const source = input && typeof input === 'object' ? input : {};
    const base = defaultFamilyApplications();
    const questions = Array.isArray(source.questions)
      ? source.questions.map((row) => String(row || '').trim()).filter(Boolean).slice(0, 5)
      : parseQuestionLines(source.questionsText || '');

    return {
      embedTitle: String(source.embedTitle || base.embedTitle).trim().slice(0, 150) || base.embedTitle,
      embedDescription:
        String(source.embedDescription || base.embedDescription).trim().slice(0, 4000) || base.embedDescription,
      embedFooter: String(source.embedFooter || base.embedFooter).trim().slice(0, 120),
      publishChannelId: sanitizeNumericId(source.publishChannelId),
      openButtonLabel: String(source.openButtonLabel || base.openButtonLabel).trim().slice(0, 80) || base.openButtonLabel,
      openButtonStyle: normalizeButtonStyle(source.openButtonStyle || base.openButtonStyle),
      questions,
      ticketCategoryId: sanitizeNumericId(source.ticketCategoryId),
      callChannelId: sanitizeNumericId(source.callChannelId),
      approveRoleIds: Array.isArray(source.approveRoleIds) ? source.approveRoleIds.filter((id) => /^\d{5,30}$/.test(String(id))) : [],
      reviewerRoleIds: Array.isArray(source.reviewerRoleIds)
        ? source.reviewerRoleIds.filter((id) => /^\d{5,30}$/.test(String(id)))
        : [],
    };
  }

  function normalizeContractNameList(input) {
    const hasArrayInput = Array.isArray(input);
    const selected = hasArrayInput ? input.map((row) => String(row || '').trim()).filter(Boolean) : [];
    const allowed = new Set(CONTRACT_CATALOG);
    const picked = Array.from(new Set(selected.filter((row) => allowed.has(row))));
    if (picked.length) return picked.slice(0, CONTRACT_CATALOG.length);
    if (hasArrayInput) return [];
    return CONTRACT_CATALOG.slice();
  }

  function defaultContractsConfig() {
    return {
      embedTitle: 'Отчеты по контрактам',
      embedDescription: 'Выберите контракт, прикрепите скриншот выполнения и отправьте отчет.',
      embedFooter: 'Davis Project',
      publishChannelId: '',
      reportChannelId: '',
      openButtonLabel: 'Отправить отчет',
      openButtonStyle: 'primary',
      selectedContracts: CONTRACT_CATALOG.slice(),
      reviewerRoleIds: [],
    };
  }

  function normalizeContractsInput(input) {
    const source = input && typeof input === 'object' ? input : {};
    const base = defaultContractsConfig();
    return {
      embedTitle: String(source.embedTitle || base.embedTitle).trim().slice(0, 150) || base.embedTitle,
      embedDescription:
        String(source.embedDescription || base.embedDescription).trim().slice(0, 4000) || base.embedDescription,
      embedFooter: String(source.embedFooter || base.embedFooter).trim().slice(0, 120),
      publishChannelId: sanitizeNumericId(source.publishChannelId),
      reportChannelId: sanitizeNumericId(source.reportChannelId),
      openButtonLabel: String(source.openButtonLabel || base.openButtonLabel).trim().slice(0, 80) || base.openButtonLabel,
      openButtonStyle: normalizeButtonStyle(source.openButtonStyle || base.openButtonStyle),
      selectedContracts: normalizeContractNameList(source.selectedContracts),
      reviewerRoleIds: Array.isArray(source.reviewerRoleIds)
        ? source.reviewerRoleIds.filter((id) => /^\d{5,30}$/.test(String(id)))
        : [],
    };
  }

  function getSelectedContractNames() {
    return normalizeContractNameList(
      Array.from(contractCatalogWrap.querySelectorAll('input[type="checkbox"][data-contract-name]:checked')).map((node) =>
        String(node.dataset.contractName || '').trim()
      )
    );
  }

  function updateContractSelectedCount() {
    const selectedCount = contractCatalogWrap.querySelectorAll(
      'input[type="checkbox"][data-contract-name]:checked'
    ).length;
    contractSelectedCount.textContent = String(selectedCount);
  }

  function setContractSelection(namesInput) {
    const selected = new Set(normalizeContractNameList(namesInput));
    Array.from(contractCatalogWrap.querySelectorAll('input[type="checkbox"][data-contract-name]')).forEach((node) => {
      const name = String(node.dataset.contractName || '').trim();
      node.checked = selected.has(name);
    });
    updateContractSelectedCount();
  }

  function renderContractCatalog(selectedNamesInput) {
    const selected = new Set(normalizeContractNameList(selectedNamesInput));
    contractCatalogWrap.innerHTML = '';

    CONTRACT_CATALOG.forEach((name) => {
      const label = document.createElement('label');
      label.className = 'bot-contract-card';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.dataset.contractName = name;
      checkbox.checked = selected.has(name);

      const text = document.createElement('span');
      text.textContent = name;

      label.append(checkbox, text);
      contractCatalogWrap.append(label);
    });

    updateContractSelectedCount();
  }

  function initContractsPicker() {
    renderContractCatalog(CONTRACT_CATALOG);

    contractCatalogWrap.addEventListener('change', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement) || target.type !== 'checkbox') return;
      updateContractSelectedCount();
      onFormInputChange();
    });

    contractSelectAllBtn.addEventListener('click', () => {
      setContractSelection(CONTRACT_CATALOG);
      onFormInputChange();
    });

    contractClearAllBtn.addEventListener('click', () => {
      setContractSelection([]);
      onFormInputChange();
    });
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
      if (response.status === 401) {
        isAuthenticated = false;
        throw new Error('Войдите через Discord для управления ботами.');
      }
      const message =
        (payload && (payload.message || payload.error)) || `HTTP ${response.status}: запрос не выполнен`;
      throw new Error(String(message));
    }

    isAuthenticated = true;
    return payload || {};
  }

  async function reloadProjectsFromServer() {
    const data = await apiRequest(BOT_PROJECTS_API);
    const nextProjects = Array.isArray(data.projects) ? data.projects : [];
    projects = nextProjects
      .map((row) => normalizeProject(row))
      .filter(Boolean)
      .sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1));
    isProjectsLoaded = true;
    renderProjectGrid();
  }

  function normalizeProject(input) {
    if (!input || typeof input !== 'object') return null;
    const id = String(input.id || '').trim();
    const name = String(input.name || '').trim();
    const folderName = sanitizeProjectFolderName(input.folderName || name);
    if (!id || !name) return null;

    return {
      id,
      name,
      folderName,
      botType: input.botType === 'faction' ? 'faction' : 'family',
      prefix: String(input.prefix || '!').slice(0, 4) || '!',
      modules: [],
      clientId: sanitizeNumericId(input.clientId),
      guildId: sanitizeNumericId(input.guildId),
      familyApplications: normalizeFamilyApplicationsInput(input.familyApplications),
      contracts: normalizeContractsInput(input.contracts),
      cloud: normalizeCloudSettings(input.cloud),
      hasStoredToken: Boolean(input.hasStoredToken),
      createdAt: String(input.createdAt || new Date().toISOString()),
      updatedAt: String(input.updatedAt || new Date().toISOString()),
    };
  }

  function matchesProjectFilters(project) {
    if (!project) return false;
    if (projectFilterMode === 'connected' && !project.cloud?.connected) return false;
    if (projectFilterMode === 'disconnected' && project.cloud?.connected) return false;
    if (!projectSearchQuery) return true;

    const haystack = [
      String(project.name || ''),
      String(project.folderName || ''),
      String(getTypeLabel(project.botType) || ''),
      project.cloud?.connected ? 'подключено облако connected' : 'не подключено offline disconnected',
      String(project.cloud?.botUsername || ''),
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(projectSearchQuery);
  }

  function renderProjectGrid() {
    botProjectGrid.innerHTML = '';

    const addButton = document.createElement('button');
    addButton.type = 'button';
    addButton.className = 'bot-create-card';
    addButton.innerHTML = `
      <span class="bot-create-plus">+</span>
      <span class="bot-create-label">Создать бота</span>
    `;
    addButton.addEventListener('click', createProjectTile);
    addButton.disabled = !isAuthenticated || !isProjectsLoaded;
    botProjectGrid.append(addButton);

    if (!isProjectsLoaded) {
      const loadingCard = document.createElement('article');
      loadingCard.className = 'bot-project-card';
      loadingCard.innerHTML = '<div class="bot-project-open"><h3>Загрузка...</h3></div>';
      botProjectGrid.append(loadingCard);
      return;
    }

    const filteredProjects = projects.filter(matchesProjectFilters);
    if (!filteredProjects.length) {
      const emptyCard = document.createElement('article');
      emptyCard.className = 'bot-project-card';
      emptyCard.innerHTML = `
        <div class="bot-project-open">
          <h3>Ничего не найдено</h3>
          <p class="bot-project-meta">Измените фильтры или очистите строку поиска.</p>
        </div>
      `;
      botProjectGrid.append(emptyCard);
      return;
    }

    filteredProjects.forEach((project) => {
      const card = document.createElement('article');
      card.className = `bot-project-card${project.id === editingProjectId ? ' active' : ''}`;
      const contractsCount = Array.isArray(project.contracts?.selectedContracts)
        ? project.contracts.selectedContracts.length
        : 0;
      card.innerHTML = `
        <button class="bot-project-delete" type="button" title="Удалить бота">✕</button>
        <button class="bot-project-open" type="button">
          <h3>${escapeHtml(project.name)}</h3>
          <p class="bot-project-meta">Тип: ${getTypeLabel(project.botType)}</p>
          <p class="bot-project-meta">Функции: заявки + контракты</p>
          <p class="bot-project-meta">Контракты выбраны: ${contractsCount}</p>
          <p class="bot-project-meta">Токен: ${project.hasStoredToken ? 'сохранен' : 'не сохранен'}</p>
          <p class="bot-project-meta">Облако: ${project.cloud?.connected ? 'подключено' : 'не подключено'}</p>
          <p class="bot-project-meta">Создан: ${formatDate(project.createdAt)}</p>
        </button>
      `;

      const openButton = card.querySelector('.bot-project-open');
      const deleteButton = card.querySelector('.bot-project-delete');

      openButton.addEventListener('click', () => openEditPanel(project.id));
      deleteButton.addEventListener('click', () => deleteProject(project.id));

      botProjectGrid.append(card);
    });
  }

  async function createProjectTile() {
    if (!isAuthenticated) {
      setStatus('Войдите через Discord для управления ботами.', true);
      return;
    }

    try {
      const name = createDefaultBotName();
      const data = await apiRequest(BOT_PROJECTS_API, {
        method: 'POST',
        body: JSON.stringify({
          name,
          folderName: sanitizeProjectFolderName(name),
          botType: 'family',
          prefix: '!',
          modules: [],
          clientId: '',
          guildId: '',
          familyApplications: defaultFamilyApplications(),
          contracts: defaultContractsConfig(),
          cloud: defaultCloudSettings(),
        }),
      });
      const nextProject = normalizeProject(data.project);
      if (!nextProject) throw new Error('server_invalid_project');
      projects = [nextProject, ...projects.filter((row) => row.id !== nextProject.id)];
      editingProjectId = null;
      panel.hidden = true;
      renderProjectGrid();
      setStatus('Плитка бота добавлена. Нажмите на нее, чтобы открыть конструктор.', false);
    } catch (error) {
      setStatus(`Не удалось создать бота: ${error && error.message ? error.message : 'неизвестная ошибка'}`, true);
    }
  }

  function openEditPanel(projectId) {
    const project = projects.find((row) => row.id === projectId);
    if (!project) return;

    editingProjectId = project.id;
    panelTitle.textContent = `Редактирование: ${project.name}`;
    submitBtn.textContent = 'Сохранить настройки';

    botNameInput.value = project.name;
    botFolderInput.value = project.folderName;
    botTypeInput.value = project.botType;
    botPrefixInput.value = project.prefix || '!';
    botClientIdInput.value = project.clientId || '';
    botGuildIdInput.value = project.guildId || '';
    const family = normalizeFamilyApplicationsInput(project.familyApplications);
    familyEmbedTitleInput.value = family.embedTitle;
    familyEmbedTextInput.value = family.embedDescription;
    familyEmbedFooterInput.value = family.embedFooter;
    familyPublishChannelIdInput.value = family.publishChannelId;
    familyOpenButtonLabelInput.value = family.openButtonLabel;
    familyOpenButtonStyleInput.value = family.openButtonStyle;
    familyQuestionsInput.value = family.questions.join('\n');
    familyTicketCategoryIdInput.value = family.ticketCategoryId;
    familyCallChannelIdInput.value = family.callChannelId;
    familyApproveRoleIdsInput.value = family.approveRoleIds.join('\n');
    familyReviewerRoleIdsInput.value = family.reviewerRoleIds.join('\n');
    const contracts = normalizeContractsInput(project.contracts);
    contractEmbedTitleInput.value = contracts.embedTitle;
    contractEmbedTextInput.value = contracts.embedDescription;
    contractEmbedFooterInput.value = contracts.embedFooter;
    contractPublishChannelIdInput.value = contracts.publishChannelId;
    contractReportChannelIdInput.value = contracts.reportChannelId;
    contractOpenButtonLabelInput.value = contracts.openButtonLabel;
    contractOpenButtonStyleInput.value = contracts.openButtonStyle;
    contractReviewerRoleIdsInput.value = contracts.reviewerRoleIds.join('\n');
    renderContractCatalog(contracts.selectedContracts);
    const cloud = normalizeCloudSettings(project.cloud);
    botCloudAutoSyncInput.checked = cloud.autoSync;
    cloudDiagnosticsText = '';
    renderCloudState(cloud);
    refreshTokenInputState(project.id);
    void refreshCloudDiagnostics(project.id);
    setStatus(`Открыт бот: ${project.name}`, false);

    setActiveBuilderSection('botSectionBase');
    setActiveFeatureTab('applications');
    renderModules();
    publishFamilyEmbedBtn.disabled = false;
    publishContractsEmbedBtn.disabled = false;
    panel.hidden = false;
    updateChecklistState();
    setLiveStatus('Статус: панель открыта, можно редактировать.', 'neutral');
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    renderProjectGrid();
  }

  function closeBuilderPanel() {
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
      autoSaveTimer = null;
    }
    editingProjectId = null;
    panel.hidden = true;
    publishFamilyEmbedBtn.disabled = true;
    publishContractsEmbedBtn.disabled = true;
    botCloudAutoSyncInput.checked = true;
    botCloudConnectBtn.disabled = true;
    botCloudSyncBtn.disabled = true;
    botCloudDisconnectBtn.disabled = true;
    cloudDiagnosticsText = '';
    botCloudStatus.textContent = '';
    setActiveFeatureTab('applications');
    renderContractCatalog(CONTRACT_CATALOG);
    renderModules();
    if (botTokenInput) {
      botTokenInput.value = '';
      botTokenInput.placeholder = 'Токен вашего Discord-бота';
    }
    resetChecklistState();
    setLiveStatus('Статус: панель закрыта.', 'neutral');
    setStatus('', false);
    renderProjectGrid();
  }

  async function deleteProject(projectId) {
    if (!window.confirm('Удалить этого бота из списка?')) return;

    try {
      await apiRequest(`${BOT_PROJECTS_API}/${encodeURIComponent(projectId)}`, {
        method: 'DELETE',
      });
      projects = projects.filter((row) => row.id !== projectId);
      if (editingProjectId === projectId) {
        closeBuilderPanel();
        return;
      }
      renderProjectGrid();
      setStatus('Бот удален из списка.', false);
    } catch (error) {
      setStatus(`Не удалось удалить бота: ${error && error.message ? error.message : 'неизвестная ошибка'}`, true);
    }
  }

  async function upsertProject(config, selectedModules) {
    const now = new Date().toISOString();
    const payload = {
      name: config.botName,
      folderName: config.folderName,
      botType: config.botType,
      prefix: config.prefix,
      modules: [],
      botToken: config.botToken,
      clientId: config.clientId,
      guildId: config.guildId,
      familyApplications: config.familyApplications,
      contracts: config.contracts,
      cloud: config.cloud,
      updatedAt: now,
    };

    let data;
    if (editingProjectId) {
      data = await apiRequest(`${BOT_PROJECTS_API}/${encodeURIComponent(editingProjectId)}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    } else {
      data = await apiRequest(BOT_PROJECTS_API, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    }

    const saved = normalizeProject(data.project);
    if (!saved) throw new Error('server_invalid_project');
    const existingIndex = projects.findIndex((row) => row.id === saved.id);
    if (existingIndex >= 0) projects[existingIndex] = saved;
    else projects.unshift(saved);
    projects = projects.map((row) => normalizeProject(row)).filter(Boolean);
    editingProjectId = saved.id;
  }

  function renderModules() {
    botModulesGrid.innerHTML = '';
    const contractsSelected = getSelectedContractNames();
    botModulesGrid.innerHTML = `
      <article class="bot-feature-coming">
        <h4>Заявки в семью</h4>
        <p>Форма вступления, публикация embed и отправка ответов в Discord уже активны.</p>
      </article>
      <article class="bot-feature-coming">
        <h4>Контракты</h4>
        <p>Выбрано контрактов: <strong>${contractsSelected.length}</strong>. Доступна публикация формы отчета со скриншотом.</p>
      </article>
    `;
    return;
    MODULES.forEach((moduleItem) => {
      const row = document.createElement('label');
      row.className = 'bot-module-card';
      row.innerHTML = `
        <input type="checkbox" name="botModule" value="${moduleItem.id}" class="bot-module-check" />
        <span class="bot-module-title">${moduleItem.title}</span>
        <span class="bot-module-description">${moduleItem.description}</span>
      `;
      botModulesGrid.append(row);
    });
    setModulesSelection([]);
  }

  function setModulesSelection(moduleIds) {
    const selected = new Set(Array.isArray(moduleIds) ? moduleIds : []);
    const checkboxes = Array.from(form.querySelectorAll('input[name="botModule"]'));
    checkboxes.forEach((checkbox, index) => {
      checkbox.checked = selected.size ? selected.has(checkbox.value) : index < 3;
    });
  }

  function getSelectedModules() {
    const picked = new Set(
      Array.from(form.querySelectorAll('input[name="botModule"]:checked'))
        .map((node) => node.value)
        .filter(Boolean)
    );
    return MODULES.filter((moduleItem) => picked.has(moduleItem.id));
  }

  function transliterateRuToLat(input) {
    const map = {
      а: 'a',
      б: 'b',
      в: 'v',
      г: 'g',
      д: 'd',
      е: 'e',
      ё: 'e',
      ж: 'zh',
      з: 'z',
      и: 'i',
      й: 'y',
      к: 'k',
      л: 'l',
      м: 'm',
      н: 'n',
      о: 'o',
      п: 'p',
      р: 'r',
      с: 's',
      т: 't',
      у: 'u',
      ф: 'f',
      х: 'h',
      ц: 'ts',
      ч: 'ch',
      ш: 'sh',
      щ: 'sch',
      ъ: '',
      ы: 'y',
      ь: '',
      э: 'e',
      ю: 'yu',
      я: 'ya',
    };
    return String(input || '')
      .split('')
      .map((char) => {
        const lower = char.toLowerCase();
        if (!Object.prototype.hasOwnProperty.call(map, lower)) return char;
        const value = map[lower];
        return char === lower ? value : value.toUpperCase();
      })
      .join('');
  }

  function slugifyFolderName(input) {
    const text = transliterateRuToLat(input)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 64);
    return text || 'davis-discord-bot';
  }

  function isWindowsReservedName(name) {
    return /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/i.test(String(name || ''));
  }

  function sanitizeProjectFolderName(input) {
    let value = slugifyFolderName(input)
      .replace(/[<>:"/\\|?*\x00-\x1f]/g, '-')
      .replace(/[. ]+$/g, '')
      .slice(0, 64);

    if (!value || isWindowsReservedName(value)) {
      value = `bot-${Date.now().toString(36)}`;
    }
    return value;
  }

  function sanitizeNumericId(value) {
    const text = String(value || '').trim();
    if (!text) return '';
    return /^\d{5,30}$/.test(text) ? text : '';
  }

  function getConfig() {
    const botName = String(botNameInput.value || '').trim() || 'Davis Discord Bot';
    const folderName = sanitizeProjectFolderName(botFolderInput.value || botName);
    const botType = botTypeInput.value === 'faction' ? 'faction' : 'family';
    const rawPrefix = String(botPrefixInput.value || '').trim();
    const prefix = rawPrefix.slice(0, 4) || '!';
    const botToken = String(botTokenInput?.value || '').trim();
    const clientId = sanitizeNumericId(botClientIdInput?.value);
    const guildId = sanitizeNumericId(botGuildIdInput?.value);
    const familyApplications = normalizeFamilyApplicationsInput({
      embedTitle: familyEmbedTitleInput.value,
      embedDescription: familyEmbedTextInput.value,
      embedFooter: familyEmbedFooterInput.value,
      publishChannelId: familyPublishChannelIdInput.value,
      openButtonLabel: familyOpenButtonLabelInput.value,
      openButtonStyle: familyOpenButtonStyleInput.value,
      questions: parseQuestionLines(familyQuestionsInput.value),
      ticketCategoryId: familyTicketCategoryIdInput.value,
      callChannelId: familyCallChannelIdInput.value,
      approveRoleIds: parseIdLines(familyApproveRoleIdsInput.value),
      reviewerRoleIds: parseIdLines(familyReviewerRoleIdsInput.value),
    });
    const contracts = normalizeContractsInput({
      embedTitle: contractEmbedTitleInput.value,
      embedDescription: contractEmbedTextInput.value,
      embedFooter: contractEmbedFooterInput.value,
      publishChannelId: contractPublishChannelIdInput.value,
      reportChannelId: contractReportChannelIdInput.value,
      openButtonLabel: contractOpenButtonLabelInput.value,
      openButtonStyle: contractOpenButtonStyleInput.value,
      selectedContracts: getSelectedContractNames(),
      reviewerRoleIds: parseIdLines(contractReviewerRoleIdsInput.value),
    });

    return {
      botName,
      folderName,
      botType,
      prefix,
      botToken,
      clientId,
      guildId,
      familyApplications,
      contracts,
      cloud: {
        autoSync: Boolean(botCloudAutoSyncInput.checked),
      },
    };
  }

  function setStatus(text, isError) {
    botBuilderStatus.textContent = text;
    botBuilderStatus.classList.toggle('bot-builder-error', Boolean(isError));
    botBuilderStatus.classList.toggle('bot-builder-success', !isError && Boolean(text));
    if (botManagerStatus) {
      botManagerStatus.textContent = text;
      botManagerStatus.classList.toggle('bot-builder-error', Boolean(isError));
      botManagerStatus.classList.toggle('bot-builder-success', !isError && Boolean(text));
    }
  }

  function setCloudStatus(text, isError) {
    botCloudStatus.textContent = text;
    botCloudStatus.classList.toggle('bot-builder-error', Boolean(isError));
    botCloudStatus.classList.toggle('bot-builder-success', !isError && Boolean(text));
  }

  function formatDateTime(value) {
    try {
      if (!value) return '';
      return new Date(value).toLocaleString('ru-RU');
    } catch {
      return '';
    }
  }

  function isStoredTokenAvailable(projectIdInput) {
    const projectId = String(projectIdInput || editingProjectId || '').trim();
    if (!projectId) return false;
    const project = projects.find((row) => row.id === projectId);
    return Boolean(project?.hasStoredToken);
  }

  function refreshTokenInputState(projectIdInput) {
    if (!botTokenInput) return;
    const hasStoredToken = isStoredTokenAvailable(projectIdInput);
    botTokenInput.value = '';
    botTokenInput.placeholder = hasStoredToken
      ? 'Токен уже сохранен на сервере. Введите новый только если хотите заменить.'
      : 'Токен вашего Discord-бота';
  }

  function mergeCloudStatusText(baseText) {
    const base = String(baseText || '').trim();
    const extra = String(cloudDiagnosticsText || '').trim();
    if (base && extra) return `${base} | ${extra}`;
    return base || extra;
  }

  async function refreshCloudDiagnostics(projectIdInput) {
    const projectId = String(projectIdInput || editingProjectId || '').trim();
    if (!projectId || panel.hidden) return;

    try {
      const data = await apiRequest(`${BOT_PROJECTS_API}/${encodeURIComponent(projectId)}/cloud/status`);
      const projectIndex = projects.findIndex((row) => row.id === projectId);
      if (projectIndex >= 0) {
        projects[projectIndex] = {
          ...projects[projectIndex],
          cloud: normalizeCloudSettings(data.cloud || projects[projectIndex].cloud),
          hasStoredToken: Boolean(data.hasStoredToken),
        };
      }

      const hints = [];
      if (data.hasStoredToken) hints.push('Токен сохранен');
      if (data?.diagnostics?.inGuild === false) hints.push('Бот не найден на сервере');
      if (data?.diagnostics?.publishChannelAccess === false) hints.push('Нет доступа к каналу эмбеда');
      if (data?.diagnostics?.contractsPublishChannelAccess === false) {
        hints.push('Нет доступа к каналу эмбеда контрактов');
      }
      if (data?.diagnostics?.contractsReportChannelAccess === false) {
        hints.push('Нет доступа к каналу отчетов контрактов');
      }
      if (Array.isArray(data?.diagnostics?.hints)) {
        data.diagnostics.hints
          .map((row) => String(row || '').trim())
          .filter(Boolean)
          .slice(0, 2)
          .forEach((row) => hints.push(row));
      }
      if (data?.inviteUrl) {
        hints.push(`Пригласить бота: ${data.inviteUrl}`);
      }

      cloudDiagnosticsText = hints.join(' | ');
      const current = projects.find((row) => row.id === projectId);
      renderCloudState(current?.cloud);
      refreshTokenInputState(projectId);
      updateChecklistState();
      renderProjectGrid();
    } catch {
      // Keep the base cloud status if diagnostics endpoint is unavailable.
    }
  }

  function renderCloudState(cloudInput) {
    const cloud = normalizeCloudSettings(cloudInput);
    botCloudConnectBtn.disabled = false;
    botCloudSyncBtn.disabled = !cloud.connected;
    botCloudDisconnectBtn.disabled = !cloud.connected;
    botCloudConnectBtn.textContent = cloud.connected ? 'Обновить подключение' : 'Подключить бота';

    const hasStoredToken = isStoredTokenAvailable();

    if (!cloud.connected) {
      if (hasStoredToken) {
        setCloudStatus(mergeCloudStatusText('BOT_TOKEN сохранен на сервере. Можно не вводить его повторно.'), false);
      } else {
        setCloudStatus(mergeCloudStatusText('Бот не подключен. Укажите BOT_TOKEN и нажмите "Подключить бота".'), false);
      }
      return;
    }

    const rows = [];
    rows.push(`Подключено: ${cloud.botUsername || 'бот Discord'}${cloud.botUserId ? ` (${cloud.botUserId})` : ''}`);
    if (cloud.lastSyncedAt) rows.push(`Последняя синхронизация: ${formatDateTime(cloud.lastSyncedAt)}`);
    if (cloud.lastSyncError) rows.push(`Ошибка синхронизации: ${cloud.lastSyncError}`);
    setCloudStatus(mergeCloudStatusText(rows.join(' | ')), Boolean(cloud.lastSyncError));
  }

  function upsertProjectInMemory(nextProject) {
    const saved = normalizeProject(nextProject);
    if (!saved) return null;
    const existingIndex = projects.findIndex((row) => row.id === saved.id);
    if (existingIndex >= 0) projects[existingIndex] = saved;
    else projects.unshift(saved);
    projects = projects.map((row) => normalizeProject(row)).filter(Boolean);
    editingProjectId = saved.id;
    renderProjectGrid();
    return saved;
  }

  function escapeHtml(input) {
    return String(input || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  async function onCloudConnect() {
    if (!editingProjectId) {
      setCloudStatus('Сначала откройте плитку нужного бота.', true);
      return;
    }

    const token = String(botTokenInput?.value || '').trim();
    const hasStoredToken = isStoredTokenAvailable(editingProjectId);
    if (!token && !hasStoredToken) {
      setCloudStatus('Укажите BOT_TOKEN в Discord-настройках, затем подключите облако.', true);
      return;
    }

    const payload = {
      botToken: token,
      autoSync: Boolean(botCloudAutoSyncInput.checked),
      clientId: sanitizeNumericId(botClientIdInput?.value),
      guildId: sanitizeNumericId(botGuildIdInput?.value),
    };

    const previousText = botCloudConnectBtn.textContent;
    botCloudConnectBtn.disabled = true;
    botCloudSyncBtn.disabled = true;
    botCloudDisconnectBtn.disabled = true;
    botCloudConnectBtn.textContent = 'Подключение...';
    setLiveStatus('Статус: подключение облачного режима...', 'work');

    try {
      const data = await apiRequest(`${BOT_PROJECTS_API}/${encodeURIComponent(editingProjectId)}/cloud/connect`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const saved = upsertProjectInMemory(data.project);
      if (saved) {
        const cloud = normalizeCloudSettings(saved.cloud);
        botCloudAutoSyncInput.checked = cloud.autoSync;
        renderCloudState(cloud);
      }
      refreshTokenInputState(editingProjectId);
      const inviteUrl = String(data.inviteUrl || '').trim();
      setStatus(
        inviteUrl
          ? `${data.message || 'Облачный режим подключен.'} Ссылка приглашения: ${inviteUrl}`
          : data.message || 'Облачный режим подключен.',
        false
      );
      updateChecklistState();
      setLiveStatus('Статус: облачный режим подключен.', 'ok');
    } catch (error) {
      setCloudStatus(`Не удалось подключить облако: ${error && error.message ? error.message : 'неизвестная ошибка'}`, true);
      setLiveStatus('Статус: ошибка подключения облака.', 'warn');
    } finally {
      botCloudConnectBtn.textContent = previousText || 'Подключить бота';
      const current = projects.find((row) => row.id === editingProjectId);
      renderCloudState(current?.cloud);
      void refreshCloudDiagnostics(editingProjectId);
    }
  }

  async function onCloudSyncNow() {
    if (!editingProjectId) {
      setCloudStatus('Сначала откройте плитку нужного бота.', true);
      return;
    }

    botCloudSyncBtn.disabled = true;
    const previousText = botCloudSyncBtn.textContent;
    botCloudSyncBtn.textContent = 'Синхронизация...';
    setLiveStatus('Статус: идет синхронизация с облаком...', 'work');

    try {
      const config = getConfig();
      await upsertProject(config, []);
      const sync = await apiRequest(`${BOT_PROJECTS_API}/${encodeURIComponent(editingProjectId)}/cloud/sync`, {
        method: 'POST',
      });
      const saved = upsertProjectInMemory(sync.project);
      renderCloudState(saved?.cloud);
      setStatus(sync.message || 'Синхронизация выполнена.', false);
      updateChecklistState();
      setLiveStatus('Статус: синхронизация выполнена.', 'ok');
    } catch (error) {
      setCloudStatus(
        `Синхронизация не выполнена: ${error && error.message ? error.message : 'неизвестная ошибка'}`,
        true
      );
      setLiveStatus('Статус: ошибка синхронизации.', 'warn');
    } finally {
      botCloudSyncBtn.textContent = previousText || 'Синхронизировать';
      const current = projects.find((row) => row.id === editingProjectId);
      renderCloudState(current?.cloud);
      void refreshCloudDiagnostics(editingProjectId);
    }
  }

  async function onCloudDisconnect() {
    if (!editingProjectId) {
      setCloudStatus('Сначала откройте плитку нужного бота.', true);
      return;
    }
    if (!window.confirm('Отключить облачный режим для этого бота?')) return;

    botCloudDisconnectBtn.disabled = true;
    const previousText = botCloudDisconnectBtn.textContent;
    botCloudDisconnectBtn.textContent = 'Отключение...';
    setLiveStatus('Статус: отключение облака...', 'work');

    try {
      const data = await apiRequest(`${BOT_PROJECTS_API}/${encodeURIComponent(editingProjectId)}/cloud/disconnect`, {
        method: 'POST',
      });
      const saved = upsertProjectInMemory(data.project);
      renderCloudState(saved?.cloud);
      refreshTokenInputState(editingProjectId);
      setStatus(data.message || 'Облачный режим отключен.', false);
      updateChecklistState();
      setLiveStatus('Статус: облако отключено.', 'warn');
    } catch (error) {
      setCloudStatus(
        `Не удалось отключить облако: ${error && error.message ? error.message : 'неизвестная ошибка'}`,
        true
      );
      setLiveStatus('Статус: ошибка отключения облака.', 'warn');
    } finally {
      botCloudDisconnectBtn.textContent = previousText || 'Отключить';
      const current = projects.find((row) => row.id === editingProjectId);
      renderCloudState(current?.cloud);
      void refreshCloudDiagnostics(editingProjectId);
    }
  }

  async function onPublishFamilyEmbed() {
    if (!editingProjectId) {
      setStatus('Сначала откройте плитку нужного бота.', true);
      return;
    }

    if (!isAuthenticated || !isProjectsLoaded) {
      setStatus('Войдите через Discord и дождитесь загрузки списка ботов.', true);
      return;
    }

    const config = getConfig();
    const activeProject = projects.find((row) => row.id === editingProjectId);
    const cloud = normalizeCloudSettings(activeProject?.cloud);
    const hasStoredToken = isStoredTokenAvailable(editingProjectId);
    if (!config.botToken && !cloud.connected && !hasStoredToken) {
      setStatus('Укажите BOT_TOKEN или подключите облачный режим.', true);
      return;
    }

    if (!config.familyApplications.publishChannelId) {
      setStatus('Укажите ID канала для публикации embed.', true);
      return;
    }

    const previousText = publishFamilyEmbedBtn.textContent;
    publishFamilyEmbedBtn.disabled = true;
    publishFamilyEmbedBtn.textContent = 'Публикация...';
    setLiveStatus('Статус: публикация эмбеда...', 'work');

    try {
      const data = await apiRequest(`${BOT_PROJECTS_API}/${encodeURIComponent(editingProjectId)}/publish-embed`, {
        method: 'POST',
        body: JSON.stringify({
          botToken: config.botToken,
          familyApplications: config.familyApplications,
        }),
      });
      const channelId = String(data.channelId || config.familyApplications.publishChannelId);
      const botName = String(data.botUsername || '').trim();
      const applyUrl = String(data.applyUrl || '').trim();
      const inviteUrl = String(data.inviteUrl || '').trim();
      const details = [
        botName ? `бот: ${botName}` : '',
        applyUrl ? `форма: ${applyUrl}` : '',
        inviteUrl ? `инвайт: ${inviteUrl}` : '',
      ]
        .filter(Boolean)
        .join(' | ');
      setStatus(`Эмбед опубликован в канал ${channelId}.${details ? ` ${details}` : ''}`, false);
      setLiveStatus('Статус: эмбед опубликован.', 'ok');
    } catch (error) {
      setStatus(`Не удалось опубликовать эмбед: ${error && error.message ? error.message : 'неизвестная ошибка'}`, true);
      setLiveStatus('Статус: ошибка публикации эмбеда.', 'warn');
    } finally {
      publishFamilyEmbedBtn.textContent = previousText || 'Опубликовать эмбед';
      publishFamilyEmbedBtn.disabled = false;
    }
  }

  async function onPublishContractsEmbed() {
    if (!editingProjectId) {
      setStatus('Сначала откройте плитку нужного бота.', true);
      return;
    }

    if (!isAuthenticated || !isProjectsLoaded) {
      setStatus('Войдите через Discord и дождитесь загрузки списка ботов.', true);
      return;
    }

    const config = getConfig();
    const activeProject = projects.find((row) => row.id === editingProjectId);
    const cloud = normalizeCloudSettings(activeProject?.cloud);
    const hasStoredToken = isStoredTokenAvailable(editingProjectId);
    if (!config.botToken && !cloud.connected && !hasStoredToken) {
      setStatus('Укажите BOT_TOKEN или подключите облачный режим.', true);
      return;
    }

    if (!config.contracts.publishChannelId) {
      setStatus('Укажите ID канала для публикации эмбеда контрактов.', true);
      return;
    }
    if (!config.contracts.reportChannelId) {
      setStatus('Укажите ID канала для отчетов по контрактам.', true);
      return;
    }
    if (!Array.isArray(config.contracts.selectedContracts) || !config.contracts.selectedContracts.length) {
      setStatus('Выберите хотя бы один контракт для формы отчета.', true);
      return;
    }

    const previousText = publishContractsEmbedBtn.textContent;
    publishContractsEmbedBtn.disabled = true;
    publishContractsEmbedBtn.textContent = 'Публикация...';
    setLiveStatus('Статус: публикация эмбеда контрактов...', 'work');

    try {
      const data = await apiRequest(
        `${BOT_PROJECTS_API}/${encodeURIComponent(editingProjectId)}/publish-contracts-embed`,
        {
          method: 'POST',
          body: JSON.stringify({
            botToken: config.botToken,
            contracts: config.contracts,
          }),
        }
      );
      const channelId = String(data.channelId || config.contracts.publishChannelId);
      const botName = String(data.botUsername || '').trim();
      const reportUrl = String(data.reportUrl || '').trim();
      const inviteUrl = String(data.inviteUrl || '').trim();
      const details = [
        botName ? `бот: ${botName}` : '',
        reportUrl ? `форма: ${reportUrl}` : '',
        inviteUrl ? `инвайт: ${inviteUrl}` : '',
      ]
        .filter(Boolean)
        .join(' | ');
      setStatus(`Эмбед контрактов опубликован в канал ${channelId}.${details ? ` ${details}` : ''}`, false);
      setLiveStatus('Статус: эмбед контрактов опубликован.', 'ok');
    } catch (error) {
      setStatus(
        `Не удалось опубликовать эмбед контрактов: ${error && error.message ? error.message : 'неизвестная ошибка'}`,
        true
      );
      setLiveStatus('Статус: ошибка публикации эмбеда контрактов.', 'warn');
    } finally {
      publishContractsEmbedBtn.textContent = previousText || 'Опубликовать контракты';
      publishContractsEmbedBtn.disabled = false;
    }
  }

  async function onSubmitCreate(event) {
    event.preventDefault();
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
      autoSaveTimer = null;
    }
    if (!isAuthenticated || !isProjectsLoaded) {
      setStatus('Войдите через Discord и дождитесь загрузки списка ботов.', true);
      return;
    }
    if (isAutoSaving) {
      setStatus('Подождите пару секунд: автосохранение уже выполняется.', false);
      return;
    }

    const config = getConfig();
    const selectedModules = getSelectedModules();

    submitBtn.disabled = true;
    setLiveStatus('Статус: сохранение проекта...', 'work');

    try {
      setStatus('Сохраняю настройки проекта...', false);
      await upsertProject(config, selectedModules);
      renderProjectGrid();
      const current = projects.find((row) => row.id === editingProjectId);
      renderCloudState(current?.cloud);

      if (current?.cloud?.connected) {
        setStatus('Настройки сохранены и отправлены в облачный режим.', false);
      } else {
        setStatus('Настройки сохранены. Подключите облачный режим, чтобы бот работал без файлов.', false);
      }
      updateChecklistState();
      setLiveStatus('Статус: проект сохранен.', 'ok');
    } catch (error) {
      setStatus(`Ошибка сохранения проекта: ${error && error.message ? error.message : 'неизвестная ошибка'}`, true);
      setLiveStatus('Статус: ошибка сохранения.', 'warn');
    } finally {
      submitBtn.disabled = false;
    }
  }

  async function downloadProjectArchive(filesMap, folderName) {
    if (window.JSZip) {
      const zip = new window.JSZip();
      Object.entries(filesMap).forEach(([relativePath, content]) => {
        zip.file(relativePath, content);
      });
      const blob = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${folderName}.zip`;
      document.body.append(link);
      link.click();
      setTimeout(() => {
        URL.revokeObjectURL(link.href);
        link.remove();
      }, 2500);
      return;
    }

    // Fallback for environments where JSZip is blocked.
    Object.entries(filesMap).forEach(([relativePath, content], index) => {
      const safeName = `${folderName}__${relativePath.replace(/[\\/]/g, '__')}`;
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = safeName;
      document.body.append(link);
      setTimeout(() => link.click(), index * 80);
      setTimeout(() => {
        URL.revokeObjectURL(link.href);
        link.remove();
      }, 1800 + index * 80);
    });
  }

  function buildProjectFiles(config, selectedModules) {
    const files = {
      '.env.example': buildEnvFile(config, true),
      '.gitignore': buildGitignore(),
      'README.md': buildReadme(config),
      'package.json': buildPackageJson(config),
      'run.bat': buildRunBat(),
      'data/.gitkeep': '',
      'src/commands/familyapplications.js': buildFamilyApplicationsCommandJs(),
      'src/config.js': buildConfigJs(config),
      'src/storage.js': buildStorageJs(),
      'src/index.js': buildIndexJs(),
      'src/register-commands.js': buildRegisterJs(),
      'src/family-applications-config.js': buildFamilyApplicationsConfigJs(config.familyApplications),
    };

    if (config.botToken) {
      files['.env'] = buildEnvFile(config, false);
    }

    return files;
  }
  function buildPackageJson(config) {
    return `${JSON.stringify(
      {
        name: config.folderName,
        version: '1.0.0',
        private: true,
        description: `Discord-бот "${config.botName}" (создан в Davis Project)`,
        main: 'src/index.js',
        scripts: {
          start: 'node src/index.js',
          register: 'node src/register-commands.js',
        },
        dependencies: {
          'discord.js': '^14.16.3',
          dotenv: '^16.4.5',
        },
      },
      null,
      2
    )}\n`;
  }

  function buildEnvFile(config, exampleMode) {
    const token = exampleMode ? '' : config.botToken;
    const clientId = exampleMode ? '' : config.clientId;
    const guildId = exampleMode ? '' : config.guildId;

    return [
      '# Discord bot settings',
      `BOT_TOKEN=${token}`,
      `CLIENT_ID=${clientId}`,
      `GUILD_ID=${guildId}`,
      `BOT_PREFIX=${config.prefix}`,
      `BOT_TYPE=${config.botType}`,
      '',
    ].join('\n');
  }

  function buildGitignore() {
    return ['node_modules/', '.env', 'npm-debug.log*', ''].join('\n');
  }

  function buildReadme(config) {
    return [
      `# ${config.botName}`,
      '',
      'Рабочий Discord-бот, сгенерированный в Davis Project.',
      '',
      '## Включенный функционал',
      '- Система заявок в семью (embed + форма + канал заявки + кнопки модерации + выдача ролей).',
      '',
      '## Быстрый запуск (Windows)',
      '1. Заполните `.env` (обязательно `BOT_TOKEN`, `CLIENT_ID` можно оставить пустым).',
      '2. Запустите `run.bat`.',
      '',
      '## Ручной запуск',
      '1. `npm install`',
      '2. `npm start`',
      '',
      '## Команда',
      '- `/familyapplications post` — публикует embed с кнопкой открытия формы заявки.',
      '',
    ].join('\n');
  }

  function buildRunBat() {
    return [
      '@echo off',
      'setlocal',
      'title Davis Project Bot Runner',
      'cd /d "%~dp0"',
      'if errorlevel 1 goto :pause_exit',
      '',
      'where npm.cmd >nul 2>&1',
      'if errorlevel 1 (',
      '  echo [ERROR] npm не найден. Установите Node.js LTS и попробуйте снова.',
      '  goto :pause_exit',
      ')',
      '',
      'if not exist ".env" (',
      '  echo Файл .env не найден. Создаю из .env.example ...',
      '  copy /Y ".env.example" ".env" >nul',
      '  echo Заполните .env и запустите run.bat снова.',
      '  goto :pause_exit',
      ')',
      '',
      'if not exist "node_modules" (',
      '  echo Устанавливаю зависимости...',
      '  call npm.cmd install',
      '  if errorlevel 1 (',
      '    echo [ERROR] Не удалось установить зависимости.',
      '    goto :pause_exit',
      '  )',
      ')',
      '',
      'echo Запуск бота...',
      'call npm.cmd start',
      'if errorlevel 1 (',
      '  echo [ERROR] Бот завершился с ошибкой. Проверьте сообщения выше.',
      ') else (',
      '  echo Бот завершил работу.',
      ')',
      '',
      ':pause_exit',
      'echo.',
      'echo Нажмите любую клавишу, чтобы закрыть окно...',
      'pause',
      'endlocal',
      '',
    ].join('\r\n');
  }

  function buildConfigJs(config) {
    return [
      "require('dotenv').config();",
      '',
      "const token = String(process.env.BOT_TOKEN || '').trim();",
      "const clientId = String(process.env.CLIENT_ID || '').trim();",
      "const guildId = String(process.env.GUILD_ID || '').trim();",
      `const defaultPrefix = ${JSON.stringify(config.prefix)};`,
      `const defaultBotType = ${JSON.stringify(config.botType)};`,
      '',
      'if (!token) throw new Error("Не найден BOT_TOKEN в .env");',
      '',
      'module.exports = {',
      '  token,',
      '  clientId,',
      '  guildId,',
      "  prefix: String(process.env.BOT_PREFIX || defaultPrefix || '!').slice(0, 4),",
      "  botType: String(process.env.BOT_TYPE || defaultBotType || 'family').toLowerCase(),",
      '};',
      '',
    ].join('\n');
  }

  function buildFamilyApplicationsConfigJs(featureConfig) {
    const safe = normalizeFamilyApplicationsInput(featureConfig);
    return [
      'module.exports = ',
      `${JSON.stringify(safe, null, 2)};`,
      '',
    ].join('\n');
  }

  function buildFamilyApplicationsCommandJs() {
    return [
      "const {",
      '  ActionRowBuilder,',
      '  ButtonBuilder,',
      '  ButtonStyle,',
      '  ChannelType,',
      '  EmbedBuilder,',
      '  ModalBuilder,',
      '  PermissionFlagsBits,',
      '  SlashCommandBuilder,',
      '  TextInputBuilder,',
      '  TextInputStyle,',
      "} = require('discord.js');",
      "const { readStore, writeStore } = require('../storage');",
      "const appConfig = require('../family-applications-config');",
      '',
      "const STORE = 'family_applications';",
      "const OPEN_BTN_ID = 'family_apply_open';",
      "const MODAL_ID = 'family_apply_modal';",
      "const ACTION_ACCEPT = 'family_apply_accept';",
      "const ACTION_REJECT = 'family_apply_reject';",
      "const ACTION_REVIEW = 'family_apply_review';",
      "const ACTION_CALL = 'family_apply_call';",
      '',
      'function toIdArray(input) {',
      '  if (!Array.isArray(input)) return [];',
      '  return Array.from(new Set(input.map((row) => String(row || "").trim()).filter((row) => /^\\d{5,30}$/.test(row))));',
      '}',
      '',
      'function toQuestions(input) {',
      '  const base = Array.isArray(input) ? input : [];',
      '  const rows = base.map((row) => String(row || "").trim()).filter(Boolean).slice(0, 5);',
      '  return rows;',
      '}',
      '',
      'function normalizeConfig(raw) {',
      '  const source = raw && typeof raw === "object" ? raw : {};',
      '  const style = String(source.openButtonStyle || "primary").toLowerCase();',
      '  const buttonStyleMap = {',
      '    primary: ButtonStyle.Primary,',
      '    secondary: ButtonStyle.Secondary,',
      '    success: ButtonStyle.Success,',
      '    danger: ButtonStyle.Danger,',
      '  };',
      '  return {',
      '    embedTitle: String(source.embedTitle || "Заявки в семью").trim().slice(0, 150),',
      '    embedDescription: String(source.embedDescription || "Нажмите кнопку ниже и заполните форму заявки.").trim().slice(0, 4000),',
      '    embedFooter: String(source.embedFooter || "").trim().slice(0, 120),',
      '    publishChannelId: /^\\d{5,30}$/.test(String(source.publishChannelId || "").trim()) ? String(source.publishChannelId).trim() : "",',
      '    openButtonLabel: String(source.openButtonLabel || "Открыть форму").trim().slice(0, 80),',
      '    openButtonStyle: buttonStyleMap[style] || ButtonStyle.Primary,',
      '    questions: toQuestions(source.questions),',
      '    ticketCategoryId: /^\\d{5,30}$/.test(String(source.ticketCategoryId || "").trim()) ? String(source.ticketCategoryId).trim() : "",',
      '    callChannelId: /^\\d{5,30}$/.test(String(source.callChannelId || "").trim()) ? String(source.callChannelId).trim() : "",',
      '    approveRoleIds: toIdArray(source.approveRoleIds),',
      '    reviewerRoleIds: toIdArray(source.reviewerRoleIds),',
      '  };',
      '}',
      '',
      'function getConfig() {',
      '  return normalizeConfig(appConfig);',
      '}',
      '',
      'function getStoreRows() {',
      '  const rows = readStore(STORE, []);',
      '  return Array.isArray(rows) ? rows : [];',
      '}',
      '',
      'function saveStoreRows(rows) {',
      '  writeStore(STORE, Array.isArray(rows) ? rows.slice(0, 3000) : []);',
      '}',
      '',
      'function sanitizeChannelSuffix(text) {',
      '  return String(text || "")',
      '    .toLowerCase()',
      '    .replace(/[^a-z0-9а-яё_-]+/gi, "-")',
      '    .replace(/-+/g, "-")',
      '    .replace(/^-+|-+$/g, "")',
      '    .slice(0, 24) || "user";',
      '}',
      '',
      'function mapStatusToText(status) {',
      '  if (status === "accepted") return "Принято";',
      '  if (status === "rejected") return "Отклонено";',
      '  if (status === "review") return "На рассмотрении";',
      '  if (status === "call") return "Вызван на обзвон";',
      '  return "Новая";',
      '}',
      '',
      'function findApplicationByChannel(channelId) {',
      '  const rows = getStoreRows();',
      '  const index = rows.findIndex((row) => String(row.channelId || "") === String(channelId || ""));',
      '  if (index === -1) return { rows, index: -1, row: null };',
      '  return { rows, index, row: rows[index] };',
      '}',
      '',
      'async function postApplicationEmbed(interaction) {',
      '  const cfg = getConfig();',
      '  if (!cfg.publishChannelId) {',
      '    await interaction.reply({ content: "Не указан канал публикации (ID) в настройках сайта.", ephemeral: true });',
      '    return;',
      '  }',
      '',
      '  const publishChannel = await interaction.guild.channels.fetch(cfg.publishChannelId).catch(() => null);',
      '  if (!publishChannel || !publishChannel.isTextBased()) {',
      '    await interaction.reply({ content: "Канал публикации не найден или недоступен.", ephemeral: true });',
      '    return;',
      '  }',
      '',
      '  const embed = new EmbedBuilder()',
      '    .setColor(0x9f48ff)',
      '    .setTitle(cfg.embedTitle)',
      '    .setDescription(cfg.embedDescription);',
      '  if (cfg.embedFooter) embed.setFooter({ text: cfg.embedFooter });',
      '',
      '  const row = new ActionRowBuilder().addComponents(',
      '    new ButtonBuilder().setCustomId(OPEN_BTN_ID).setLabel(cfg.openButtonLabel).setStyle(cfg.openButtonStyle)',
      '  );',
      '',
      '  const sent = await publishChannel.send({ embeds: [embed], components: [row] });',
      '  await interaction.reply({ content: `Embed отправлен: ${sent.url}`, ephemeral: true });',
      '}',
      '',
      'async function openApplyModal(interaction) {',
      '  const cfg = getConfig();',
      '  const modal = new ModalBuilder().setCustomId(MODAL_ID).setTitle("Заявка в семью");',
      '  cfg.questions.forEach((question, index) => {',
      '    const input = new TextInputBuilder()',
      '      .setCustomId(`q_${index}`)',
      '      .setLabel(String(question).slice(0, 45) || `Вопрос ${index + 1}`)',
      '      .setStyle(index === 0 ? TextInputStyle.Short : TextInputStyle.Paragraph)',
      '      .setRequired(true)',
      '      .setMaxLength(index === 0 ? 120 : 1000);',
      '    const row = new ActionRowBuilder().addComponents(input);',
      '    modal.addComponents(row);',
      '  });',
      '  await interaction.showModal(modal);',
      '}',
      '',
      'async function createApplicationChannel(interaction) {',
      '  const cfg = getConfig();',
      '  const answers = cfg.questions.map((question, index) => ({',
      '    question,',
      '    answer: String(interaction.fields.getTextInputValue(`q_${index}`) || "").trim().slice(0, 2000),',
      '  }));',
      '',
      '  const guild = interaction.guild;',
      '  const me = guild.members.me;',
      '  const channelName = `заявка-${sanitizeChannelSuffix(interaction.user.username)}-${Date.now().toString(36).slice(-4)}`;',
      '',
      '  const overwrites = [',
      '    { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },',
      '    {',
      '      id: interaction.user.id,',
      '      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],',
      '    },',
      '    {',
      '      id: me.id,',
      '      allow: [',
      '        PermissionFlagsBits.ViewChannel,',
      '        PermissionFlagsBits.SendMessages,',
      '        PermissionFlagsBits.ReadMessageHistory,',
      '        PermissionFlagsBits.ManageChannels,',
      '        PermissionFlagsBits.ManageMessages,',
      '      ],',
      '    },',
      '  ];',
      '',
      '  cfg.reviewerRoleIds.forEach((roleId) => {',
      '    if (guild.roles.cache.has(roleId)) {',
      '      overwrites.push({',
      '        id: roleId,',
      '        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],',
      '      });',
      '    }',
      '  });',
      '',
      '  const channelOptions = {',
      '    name: channelName,',
      '    type: ChannelType.GuildText,',
      '    permissionOverwrites: overwrites,',
      '    topic: `Заявка от ${interaction.user.tag} (${interaction.user.id})`,',
      '  };',
      '  if (cfg.ticketCategoryId) channelOptions.parent = cfg.ticketCategoryId;',
      '',
      '  const ticketChannel = await guild.channels.create(channelOptions);',
      '',
      '  const createdAt = new Date().toISOString();',
      '  const application = {',
      '    id: `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}` ,',
      '    guildId: guild.id,',
      '    channelId: ticketChannel.id,',
      '    userId: interaction.user.id,',
      '    userTag: interaction.user.tag,',
      '    questions: cfg.questions,',
      '    answers,',
      '    status: "new",',
      '    createdAt,',
      '    updatedAt: createdAt,',
      '  };',
      '',
      '  const rows = getStoreRows();',
      '  rows.unshift(application);',
      '  saveStoreRows(rows);',
      '',
      '  const qaFields = answers.map((row, index) => ({',
      '    name: `${index + 1}. ${row.question}`.slice(0, 256),',
      '    value: row.answer || "—",',
      '    inline: false,',
      '  }));',
      '',
      '  const embed = new EmbedBuilder()',
      '    .setColor(0x9f48ff)',
      '    .setTitle("Новая заявка в семью")',
      '    .addFields(',
      '      { name: "Пользователь", value: `${interaction.user} | ${interaction.user.tag} | ${interaction.user.id}` },',
      '      { name: "Дата", value: `<t:${Math.floor(Date.now() / 1000)}:F>` },',
      '      ...qaFields',
      '    )',
      '    .setFooter({ text: "Статус: Новая" });',
      '',
      '  const controls = new ActionRowBuilder().addComponents(',
      '    new ButtonBuilder().setCustomId(ACTION_ACCEPT).setLabel("Принять").setStyle(ButtonStyle.Success),',
      '    new ButtonBuilder().setCustomId(ACTION_REJECT).setLabel("Отклонить").setStyle(ButtonStyle.Danger),',
      '    new ButtonBuilder().setCustomId(ACTION_REVIEW).setLabel("Взять на рассмотрение").setStyle(ButtonStyle.Secondary),',
      '    new ButtonBuilder().setCustomId(ACTION_CALL).setLabel("Вызвать на обзвон").setStyle(ButtonStyle.Primary)',
      '  );',
      '',
      '  await ticketChannel.send({ content: `${interaction.user}`, embeds: [embed], components: [controls] });',
      '  await interaction.reply({ content: `Заявка отправлена. Канал: ${ticketChannel}`, ephemeral: true });',
      '}',
      '',
      'function canReviewApplication(interaction, cfg) {',
      '  const member = interaction.member;',
      '  if (!member) return false;',
      '  if (member.permissions.has(PermissionFlagsBits.ManageChannels)) return true;',
      '  return cfg.reviewerRoleIds.some((roleId) => member.roles.cache.has(roleId));',
      '}',
      '',
      'async function handleAction(interaction, actionType) {',
      '  const cfg = getConfig();',
      '  if (!canReviewApplication(interaction, cfg)) {',
      '    await interaction.reply({ content: "Недостаточно прав для обработки заявок.", ephemeral: true });',
      '    return true;',
      '  }',
      '',
      '  const payload = findApplicationByChannel(interaction.channelId);',
      '  if (!payload.row) {',
      '    await interaction.reply({ content: "Заявка для этого канала не найдена.", ephemeral: true });',
      '    return true;',
      '  }',
      '',
      '  const nowIso = new Date().toISOString();',
      '  payload.row.status = actionType;',
      '  payload.row.updatedAt = nowIso;',
      '  payload.row.reviewedBy = interaction.user.id;',
      '  saveStoreRows(payload.rows);',
      '',
      '  let extraText = "";',
      '  if (actionType === "accepted" && cfg.approveRoleIds.length) {',
      '    const member = await interaction.guild.members.fetch(payload.row.userId).catch(() => null);',
      '    if (member) {',
      '      const rolesToAdd = cfg.approveRoleIds.filter((roleId) => interaction.guild.roles.cache.has(roleId));',
      '      if (rolesToAdd.length) {',
      '        await member.roles.add(rolesToAdd).catch(() => null);',
      '        extraText = `Роли выданы: ${rolesToAdd.map((id) => `<@&${id}>`).join(", ")}`;',
      '      }',
      '    }',
      '  }',
      '',
      '  if (actionType === "call" && cfg.callChannelId) {',
      '    extraText = `Пользователь вызван на обзвон в канал <#${cfg.callChannelId}>.`;',
      '  }',
      '',
      '  await interaction.reply({',
      '    content: `Статус заявки изменен: ${mapStatusToText(actionType)}.${extraText ? ` ${extraText}` : ""}`,',
      '    ephemeral: true,',
      '  });',
      '',
      '  await interaction.channel.send(',
      '    `Модератор ${interaction.user} изменил статус: **${mapStatusToText(actionType)}**.` + (extraText ? ` ${extraText}` : "")',
      '  );',
      '  return true;',
      '}',
      '',
      'module.exports = {',
      '  data: new SlashCommandBuilder()',
      "    .setName('familyapplications')",
      "    .setDescription('Управление заявками в семью')",
      '    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)',
      '    .addSubcommand((sub) => sub',
      "      .setName('post')",
      "      .setDescription('Опубликовать embed с кнопкой формы заявки')),",
      '',
      '  async execute(interaction) {',
      '    const sub = interaction.options.getSubcommand();',
      "    if (sub === 'post') {",
      '      await postApplicationEmbed(interaction);',
      '    }',
      '  },',
      '',
      '  async handleButton(interaction) {',
      '    if (interaction.customId === OPEN_BTN_ID) {',
      '      await openApplyModal(interaction);',
      '      return true;',
      '    }',
      '    if (interaction.customId === ACTION_ACCEPT) return handleAction(interaction, "accepted");',
      '    if (interaction.customId === ACTION_REJECT) return handleAction(interaction, "rejected");',
      '    if (interaction.customId === ACTION_REVIEW) return handleAction(interaction, "review");',
      '    if (interaction.customId === ACTION_CALL) return handleAction(interaction, "call");',
      '    return false;',
      '  },',
      '',
      '  async handleModalSubmit(interaction) {',
      '    if (interaction.customId !== MODAL_ID) return false;',
      '    await createApplicationChannel(interaction);',
      '    return true;',
      '  },',
      '};',
      '',
    ].join('\n');
  }

  function buildStorageJs() {
    return [
      "const fs = require('node:fs');",
      "const path = require('node:path');",
      '',
      "const dataDir = path.join(__dirname, '..', 'data');",
      '',
      'function ensureDir() {',
      '  fs.mkdirSync(dataDir, { recursive: true });',
      '}',
      '',
      'function getStorePath(storeName) {',
      "  const safe = String(storeName || 'default').replace(/[^a-z0-9_-]/gi, '').toLowerCase() || 'default';",
      "  return path.join(dataDir, `${safe}.json`);",
      '}',
      '',
      'function readStore(storeName, fallback = []) {',
      '  ensureDir();',
      '  const filePath = getStorePath(storeName);',
      '  if (!fs.existsSync(filePath)) {',
      "    fs.writeFileSync(filePath, JSON.stringify(fallback, null, 2), 'utf8');",
      '    return Array.isArray(fallback) ? [...fallback] : { ...fallback };',
      '  }',
      '  try {',
      "    return JSON.parse(fs.readFileSync(filePath, 'utf8'));",
      '  } catch {',
      '    return Array.isArray(fallback) ? [...fallback] : { ...fallback };',
      '  }',
      '}',
      '',
      'function writeStore(storeName, value) {',
      '  ensureDir();',
      '  const filePath = getStorePath(storeName);',
      "  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf8');",
      '}',
      '',
      'module.exports = { readStore, writeStore };',
      '',
    ].join('\n');
  }

  function buildIndexJs() {
    return [
      "const fs = require('node:fs');",
      "const path = require('node:path');",
      "const { Client, Collection, GatewayIntentBits, Events, REST, Routes } = require('discord.js');",
      "const { token, clientId, guildId } = require('./config');",
      '',
      'const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });',
      'client.commands = new Collection();',
      'const extraHandlers = [];',
      '',
      "const commandsPath = path.join(__dirname, 'commands');",
      "const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.js'));",
      '',
      'for (const file of commandFiles) {',
      '  const command = require(path.join(commandsPath, file));',
      '  if (!command || !command.data || typeof command.execute !== "function") continue;',
      '  client.commands.set(command.data.name, command);',
      '  if (typeof command.handleButton === "function" || typeof command.handleModalSubmit === "function") {',
      '    extraHandlers.push(command);',
      '  }',
      '}',
      '',
      'async function registerSlashCommands(runtimeClientId) {',
      '  if (!runtimeClientId) {',
      '    console.warn("CLIENT_ID не определен. Регистрация slash-команд пропущена.");',
      '    return;',
      '  }',
      '',
      '  const rest = new REST({ version: "10" }).setToken(token);',
      '  const payload = Array.from(client.commands.values()).map((command) => command.data.toJSON());',
      '',
      '  if (guildId) {',
      '    await rest.put(Routes.applicationGuildCommands(runtimeClientId, guildId), { body: payload });',
      '    console.log(`Slash-команды зарегистрированы на сервере ${guildId}.`);',
      '    return;',
      '  }',
      '',
      '  await rest.put(Routes.applicationCommands(runtimeClientId), { body: payload });',
      '  console.log("Slash-команды зарегистрированы глобально.");',
      '  console.log("Глобальные команды могут появляться в Discord до 1 часа.");',
      '}',
      '',
      'client.once(Events.ClientReady, async (readyClient) => {',
      '  console.log(`Бот запущен: ${readyClient.user.tag}`);',
      '  const runtimeClientId = clientId || readyClient.application?.id || "";',
      '  try {',
      '    await registerSlashCommands(runtimeClientId);',
      '  } catch (error) {',
      '    console.error("Не удалось зарегистрировать команды:", error);',
      '  }',
      '});',
      '',
      'client.on(Events.InteractionCreate, async (interaction) => {',
      '  try {',
      '    if (interaction.isButton()) {',
      '      for (const handler of extraHandlers) {',
      '        if (typeof handler.handleButton !== "function") continue;',
      '        const handled = await handler.handleButton(interaction);',
      '        if (handled) return;',
      '      }',
      '      return;',
      '    }',
      '',
      '    if (interaction.isModalSubmit()) {',
      '      for (const handler of extraHandlers) {',
      '        if (typeof handler.handleModalSubmit !== "function") continue;',
      '        const handled = await handler.handleModalSubmit(interaction);',
      '        if (handled) return;',
      '      }',
      '      return;',
      '    }',
      '',
      '    if (!interaction.isChatInputCommand()) return;',
      '    const command = client.commands.get(interaction.commandName);',
      '    if (!command) return;',
      '    await command.execute(interaction);',
      '  } catch (error) {',
      '    console.error("Ошибка выполнения команды:", error);',
      '    const payload = { content: "Ошибка выполнения команды.", ephemeral: true };',
      '    if (interaction.isRepliable()) {',
      '      if (interaction.replied || interaction.deferred) await interaction.followUp(payload);',
      '      else await interaction.reply(payload);',
      '    }',
      '  }',
      '});',
      '',
      'client.login(token);',
      '',
    ].join('\n');
  }
  function buildRegisterJs() {
    return [
      "const fs = require('node:fs');",
      "const path = require('node:path');",
      "const { REST, Routes } = require('discord.js');",
      "const { token, clientId, guildId } = require('./config');",
      '',
      'const commands = [];',
      "const commandsPath = path.join(__dirname, 'commands');",
      "const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.js'));",
      '',
      'for (const file of commandFiles) {',
      '  const command = require(path.join(commandsPath, file));',
      '  if (!command || !command.data) continue;',
      '  commands.push(command.data.toJSON());',
      '}',
      '',
      'const rest = new REST({ version: "10" }).setToken(token);',
      '',
      '(async () => {',
      '  try {',
      '    if (!clientId) {',
      '      throw new Error("Не найден CLIENT_ID. Заполните .env или используйте npm start (авторегистрация).");',
      '    }',
      '',
      '    if (guildId) {',
      '      await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });',
      '      console.log(`Команды зарегистрированы на сервере ${guildId}.`);',
      '    } else {',
      '      await rest.put(Routes.applicationCommands(clientId), { body: commands });',
      '      console.log("Команды зарегистрированы глобально.");',
      '    }',
      '  } catch (error) {',
      '    console.error("Ошибка регистрации команд:", error);',
      '    process.exitCode = 1;',
      '  }',
      '})();',
      '',
    ].join('\n');
  }

  function buildPingCommandJs() {
    return [
      "const { SlashCommandBuilder } = require('discord.js');",
      '',
      'module.exports = {',
      '  data: new SlashCommandBuilder()',
      "    .setName('ping')",
      "    .setDescription('Проверка, что бот работает'),",
      '',
      '  async execute(interaction) {',
      "    await interaction.reply({ content: 'Бот работает.', ephemeral: true });",
      '  },',
      '};',
      '',
    ].join('\n');
  }

  function buildHelpCommandJs(selectedModules) {
    const lines = selectedModules.map((item) => `• ${item.title} — /${item.commandName}`).join('\\n');
    const text = lines || '• Модули не выбраны';
    return [
      "const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');",
      '',
      'module.exports = {',
      '  data: new SlashCommandBuilder()',
      "    .setName('helpbot')",
      "    .setDescription('Показать список модулей бота'),",
      '',
      '  async execute(interaction) {',
      '    const embed = new EmbedBuilder()',
      '      .setColor(0x9f48ff)',
      '      .setTitle("Модули бота")',
      `      .setDescription(${JSON.stringify(text)})`,
      '      .setFooter({ text: "Davis Project" });',
      '    await interaction.reply({ embeds: [embed], ephemeral: true });',
      '  },',
      '};',
      '',
    ].join('\n');
  }

  function buildModuleCommandJs(moduleItem) {
    if (moduleItem.kind === 'warehouse') return buildWarehouseCommandJs(moduleItem);
    if (moduleItem.kind === 'finance') return buildFinanceCommandJs(moduleItem);
    if (moduleItem.kind === 'roster') return buildRosterCommandJs(moduleItem);
    return buildRecordsCommandJs(moduleItem);
  }

  function buildRecordsCommandJs(moduleItem) {
    return [
      "const { SlashCommandBuilder } = require('discord.js');",
      "const { readStore, writeStore } = require('../storage');",
      '',
      `const STORE = ${JSON.stringify(moduleItem.commandName)};`,
      '',
      'module.exports = {',
      '  data: new SlashCommandBuilder()',
      `    .setName(${JSON.stringify(moduleItem.commandName)})`,
      `    .setDescription(${JSON.stringify(`${moduleItem.title}: добавить, список, удалить`)})`,
      "    .addSubcommand((sub) => sub",
      "      .setName('add')",
      "      .setDescription('Добавить запись')",
      "      .addStringOption((opt) => opt.setName('title').setDescription('Заголовок').setRequired(true))",
      "      .addStringOption((opt) => opt.setName('details').setDescription('Описание').setRequired(false)))",
      "    .addSubcommand((sub) => sub",
      "      .setName('list')",
      "      .setDescription('Показать последние записи'))",
      "    .addSubcommand((sub) => sub",
      "      .setName('remove')",
      "      .setDescription('Удалить запись по номеру')",
      "      .addIntegerOption((opt) => opt.setName('index').setDescription('Номер записи из списка').setRequired(true)))",
      "    .addSubcommand((sub) => sub",
      "      .setName('clear')",
      "      .setDescription('Очистить все записи')),",
      '',
      '  async execute(interaction) {',
      '    const action = interaction.options.getSubcommand();',
      '    const rows = readStore(STORE, []);',
      '',
      "    if (action === 'add') {",
      "      const title = interaction.options.getString('title', true).trim();",
      "      const details = (interaction.options.getString('details') || '').trim();",
      '      rows.unshift({',
      '        id: Date.now().toString(36),',
      '        title,',
      '        details,',
      '        authorTag: interaction.user.tag,',
      '        createdAt: new Date().toISOString(),',
      '      });',
      '      writeStore(STORE, rows.slice(0, 1000));',
      "      await interaction.reply({ content: 'Запись добавлена.', ephemeral: true });",
      '      return;',
      '    }',
      '',
      "    if (action === 'clear') {",
      '      writeStore(STORE, []);',
      "      await interaction.reply({ content: 'Все записи удалены.', ephemeral: true });",
      '      return;',
      '    }',
      '',
      "    if (action === 'remove') {",
      "      const index = interaction.options.getInteger('index', true);",
      '      const zero = index - 1;',
      '      if (zero < 0 || zero >= rows.length) {',
      "        await interaction.reply({ content: 'Неверный номер записи.', ephemeral: true });",
      '        return;',
      '      }',
      '      rows.splice(zero, 1);',
      '      writeStore(STORE, rows);',
      "      await interaction.reply({ content: 'Запись удалена.', ephemeral: true });",
      '      return;',
      '    }',
      '',
      '    if (!rows.length) {',
      "      await interaction.reply({ content: 'Список пуст.', ephemeral: true });",
      '      return;',
      '    }',
      '',
      '    const lines = rows.slice(0, 10).map((row, idx) => {',
      "      const tail = row.details ? ` — ${row.details}` : '';",
      "      return `${idx + 1}. ${row.title}${tail}`;",
      '    });',
      "    await interaction.reply({ content: lines.join('\\n'), ephemeral: true });",
      '  },',
      '};',
      '',
    ].join('\n');
  }
  function buildWarehouseCommandJs(moduleItem) {
    return [
      "const { SlashCommandBuilder } = require('discord.js');",
      "const { readStore, writeStore } = require('../storage');",
      '',
      `const STORE = ${JSON.stringify(moduleItem.commandName)};`,
      '',
      'module.exports = {',
      '  data: new SlashCommandBuilder()',
      `    .setName(${JSON.stringify(moduleItem.commandName)})`,
      "    .setDescription('Склад: движения и остатки')",
      "    .addSubcommand((sub) => sub",
      "      .setName('move')",
      "      .setDescription('Добавить движение по складу')",
      "      .addStringOption((opt) => opt.setName('item').setDescription('Позиция').setRequired(true))",
      "      .addIntegerOption((opt) => opt.setName('delta').setDescription('Количество (+/-)').setRequired(true))",
      "      .addStringOption((opt) => opt.setName('note').setDescription('Комментарий').setRequired(false)))",
      "    .addSubcommand((sub) => sub",
      "      .setName('balance')",
      "      .setDescription('Показать баланс склада'))",
      "    .addSubcommand((sub) => sub",
      "      .setName('history')",
      "      .setDescription('Показать историю движений'))",
      "    .addSubcommand((sub) => sub",
      "      .setName('clear')",
      "      .setDescription('Очистить складской журнал')),",
      '',
      '  async execute(interaction) {',
      '    const action = interaction.options.getSubcommand();',
      '    const rows = readStore(STORE, []);',
      '',
      "    if (action === 'move') {",
      "      const item = interaction.options.getString('item', true).trim();",
      "      const delta = interaction.options.getInteger('delta', true);",
      "      const note = (interaction.options.getString('note') || '').trim();",
      '      rows.unshift({',
      '        id: Date.now().toString(36),',
      '        item,',
      '        delta,',
      '        note,',
      '        authorTag: interaction.user.tag,',
      '        createdAt: new Date().toISOString(),',
      '      });',
      '      writeStore(STORE, rows.slice(0, 5000));',
      "      await interaction.reply({ content: `Операция добавлена: ${item} (${delta > 0 ? '+' : ''}${delta}).`, ephemeral: true });",
      '      return;',
      '    }',
      '',
      "    if (action === 'clear') {",
      '      writeStore(STORE, []);',
      "      await interaction.reply({ content: 'Складской журнал очищен.', ephemeral: true });",
      '      return;',
      '    }',
      '',
      '    if (!rows.length) {',
      "      await interaction.reply({ content: 'Данных по складу пока нет.', ephemeral: true });",
      '      return;',
      '    }',
      '',
      "    if (action === 'history') {",
      '      const lines = rows.slice(0, 12).map((row, idx) => {',
      "        const sign = row.delta > 0 ? '+' : '';",
      "        const note = row.note ? ` — ${row.note}` : '';",
      "        return `${idx + 1}. ${row.item}: ${sign}${row.delta}${note}`;",
      '      });',
      "      await interaction.reply({ content: lines.join('\\n'), ephemeral: true });",
      '      return;',
      '    }',
      '',
      '    const summary = new Map();',
      '    rows.forEach((row) => {',
      '      summary.set(row.item, (summary.get(row.item) || 0) + Number(row.delta || 0));',
      '    });',
      '',
      '    const lines = Array.from(summary.entries())',
      '      .sort((a, b) => b[1] - a[1])',
      '      .slice(0, 20)',
      '      .map(([item, value], idx) => `${idx + 1}. ${item}: ${value}`);',
      "    await interaction.reply({ content: lines.join('\\n'), ephemeral: true });",
      '  },',
      '};',
      '',
    ].join('\n');
  }
  function buildFinanceCommandJs(moduleItem) {
    return [
      "const { SlashCommandBuilder } = require('discord.js');",
      "const { readStore, writeStore } = require('../storage');",
      '',
      `const STORE = ${JSON.stringify(moduleItem.commandName)};`,
      '',
      'module.exports = {',
      '  data: new SlashCommandBuilder()',
      `    .setName(${JSON.stringify(moduleItem.commandName)})`,
      "    .setDescription('Финансы: доходы, расходы, отчет')",
      "    .addSubcommand((sub) => sub",
      "      .setName('income')",
      "      .setDescription('Добавить доход')",
      "      .addNumberOption((opt) => opt.setName('amount').setDescription('Сумма').setRequired(true))",
      "      .addStringOption((opt) => opt.setName('note').setDescription('Комментарий').setRequired(false)))",
      "    .addSubcommand((sub) => sub",
      "      .setName('expense')",
      "      .setDescription('Добавить расход')",
      "      .addNumberOption((opt) => opt.setName('amount').setDescription('Сумма').setRequired(true))",
      "      .addStringOption((opt) => opt.setName('note').setDescription('Комментарий').setRequired(false)))",
      "    .addSubcommand((sub) => sub",
      "      .setName('report')",
      "      .setDescription('Показать финансовый отчет'))",
      "    .addSubcommand((sub) => sub",
      "      .setName('clear')",
      "      .setDescription('Очистить финансовый журнал')),",
      '',
      '  async execute(interaction) {',
      '    const action = interaction.options.getSubcommand();',
      '    const rows = readStore(STORE, []);',
      '',
      "    if (action === 'clear') {",
      '      writeStore(STORE, []);',
      "      await interaction.reply({ content: 'Финансовый журнал очищен.', ephemeral: true });",
      '      return;',
      '    }',
      '',
      "    if (action === 'income' || action === 'expense') {",
      "      const amount = Math.abs(Number(interaction.options.getNumber('amount', true)));",
      "      const note = (interaction.options.getString('note') || '').trim();",
      '      rows.unshift({',
      '        id: Date.now().toString(36),',
      '        type: action,',
      '        amount,',
      '        note,',
      '        authorTag: interaction.user.tag,',
      '        createdAt: new Date().toISOString(),',
      '      });',
      '      writeStore(STORE, rows.slice(0, 5000));',
      "      await interaction.reply({ content: `Операция добавлена: ${action} ${amount.toFixed(2)}.`, ephemeral: true });",
      '      return;',
      '    }',
      '',
      '    if (!rows.length) {',
      "      await interaction.reply({ content: 'Финансовых данных пока нет.', ephemeral: true });",
      '      return;',
      '    }',
      '',
      '    let income = 0;',
      '    let expense = 0;',
      '    rows.forEach((row) => {',
      "      if (row.type === 'income') income += Number(row.amount || 0);",
      '      else expense += Number(row.amount || 0);',
      '    });',
      '    const balance = income - expense;',
      '',
      '    const lines = [',
      '      `Доходы: ${income.toFixed(2)}`,',
      '      `Расходы: ${expense.toFixed(2)}`,',
      '      `Баланс: ${balance.toFixed(2)}`,',
      '    ];',
      "    await interaction.reply({ content: lines.join('\\n'), ephemeral: true });",
      '  },',
      '};',
      '',
    ].join('\n');
  }

  function buildRosterCommandJs(moduleItem) {
    return [
      "const { SlashCommandBuilder } = require('discord.js');",
      "const { readStore, writeStore } = require('../storage');",
      '',
      `const STORE = ${JSON.stringify(moduleItem.commandName)};`,
      '',
      'module.exports = {',
      '  data: new SlashCommandBuilder()',
      `    .setName(${JSON.stringify(moduleItem.commandName)})`,
      "    .setDescription('Состав: добавить, удалить, список')",
      "    .addSubcommand((sub) => sub",
      "      .setName('add')",
      "      .setDescription('Добавить участника')",
      "      .addStringOption((opt) => opt.setName('name').setDescription('Имя').setRequired(true))",
      "      .addStringOption((opt) => opt.setName('role').setDescription('Роль/должность').setRequired(false)))",
      "    .addSubcommand((sub) => sub",
      "      .setName('remove')",
      "      .setDescription('Удалить участника по имени')",
      "      .addStringOption((opt) => opt.setName('name').setDescription('Имя').setRequired(true)))",
      "    .addSubcommand((sub) => sub",
      "      .setName('list')",
      "      .setDescription('Показать состав'))",
      "    .addSubcommand((sub) => sub",
      "      .setName('clear')",
      "      .setDescription('Очистить состав')),",
      '',
      '  async execute(interaction) {',
      '    const action = interaction.options.getSubcommand();',
      '    const rows = readStore(STORE, []);',
      '',
      "    if (action === 'add') {",
      "      const name = interaction.options.getString('name', true).trim();",
      "      const role = (interaction.options.getString('role') || 'без роли').trim();",
      '      rows.push({ name, role, createdAt: new Date().toISOString() });',
      '      writeStore(STORE, rows.slice(-1000));',
      "      await interaction.reply({ content: `Участник добавлен: ${name}.`, ephemeral: true });",
      '      return;',
      '    }',
      '',
      "    if (action === 'remove') {",
      "      const name = interaction.options.getString('name', true).trim().toLowerCase();",
      '      const next = rows.filter((row) => String(row.name || "").toLowerCase() !== name);',
      '      if (next.length === rows.length) {',
      "        await interaction.reply({ content: 'Участник не найден.', ephemeral: true });",
      '        return;',
      '      }',
      '      writeStore(STORE, next);',
      "      await interaction.reply({ content: 'Участник удален.', ephemeral: true });",
      '      return;',
      '    }',
      '',
      "    if (action === 'clear') {",
      '      writeStore(STORE, []);',
      "      await interaction.reply({ content: 'Состав очищен.', ephemeral: true });",
      '      return;',
      '    }',
      '',
      '    if (!rows.length) {',
      "      await interaction.reply({ content: 'Состав пока пуст.', ephemeral: true });",
      '      return;',
      '    }',
      '',
      '    const lines = rows.slice(0, 30).map((row, idx) => `${idx + 1}. ${row.name} — ${row.role}`);',
      "    await interaction.reply({ content: lines.join('\\n'), ephemeral: true });",
      '  },',
      '};',
      '',
    ].join('\n');
  }
})();
