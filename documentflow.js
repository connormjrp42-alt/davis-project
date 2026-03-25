(function initDocumentFlow() {
  const SERVERS = [
    'New York', 'Detroit', 'Chicago', 'San Francisco', 'Atlanta', 'San Diego',
    'Los Angeles', 'Miami', 'Las Vegas', 'Washington', 'Dallas', 'Boston',
    'Houston', 'Seattle', 'Phoenix', 'Denver', 'Portland', 'Orlando',
  ];

  const state = {
    apiBase: '/api/docflow',
    meta: null,
    templates: [],
    template: null,
    selectedTemplateId: '',
    selectedElementId: '',
    fillValues: {},
    mode: 'fill',
    zoom: 1,
    snap: true,
    grid: 10,
    drag: null,
    undo: [],
    redo: [],
    forceFitPage: true,
  };
  const DOC_WIDTH = 794;
  const DOC_HEIGHT = 1123;
  const ALLOWED_TYPES = new Set(['text', 'heading', 'image', 'date', 'signature', 'line']);

  const el = {
    status: $('#docflowStatus'),
    serverFilter: $('#docflowServerFilter'),
    templateList: $('#docflowTemplateList'),
    createBtn: $('#docflowCreateBtn'),
    title: $('#docflowTemplateTitle'),
    modeBtn: $('#docflowModeBtn'),
    saveFillBtn: $('#docflowSaveFillBtn'),
    pngBtn: $('#docflowPngBtn'),
    pdfBtn: $('#docflowPdfBtn'),
    saveTemplateBtn: $('#docflowSaveTemplateBtn'),
    deleteTemplateBtn: $('#docflowDeleteTemplateBtn'),
    editor: $('#docflowEditor'),
    tools: $('#docflowTools'),
    quick: $('#docflowQuickTools'),
    duplicateBtn: $('#docflowDuplicateBtn'),
    undoBtn: $('#docflowUndoBtn'),
    redoBtn: $('#docflowRedoBtn'),
    alignLeftBtn: $('#docflowAlignLeft'),
    alignCenterBtn: $('#docflowAlignCenter'),
    alignRightBtn: $('#docflowAlignRight'),
    bringFrontBtn: $('#docflowBringFront'),
    sendBackBtn: $('#docflowSendBack'),
    zoomRange: $('#docflowZoom'),
    snapCheckbox: $('#docflowSnap'),
    metaTitle: $('#docflowMetaTitle'),
    metaServer: $('#docflowMetaServer'),
    metaDescription: $('#docflowMetaDescription'),
    canvasWrap: $('#docflowCanvasWrap'),
    canvas: $('#docflowCanvas'),
    layers: $('#docflowLayerList'),
    props: $('#docflowProperties'),
    propDelete: $('#propDelete'),
    propSignatureWrap: $('#propSignatureWrap'),
    propSignatureValue: $('#propSignatureValue'),
  };

  const prop = {
    label: $('#propLabel'),
    text: $('#propText'),
    placeholder: $('#propPlaceholder'),
    src: $('#propSrc'),
    fontSize: $('#propFontSize'),
    color: $('#propColor'),
    bgColor: $('#propBgColor'),
    borderColor: $('#propBorderColor'),
    borderWidth: $('#propBorderWidth'),
    radius: $('#propRadius'),
    opacity: $('#propOpacity'),
    rotate: $('#propRotate'),
    weight: $('#propWeight'),
    align: $('#propAlign'),
    required: $('#propRequired'),
    locked: $('#propLocked'),
    hidden: $('#propHidden'),
  };

  const PROPERTY_VISIBLE_BY_TYPE = {
    text: ['label', 'text', 'placeholder', 'fontSize', 'color', 'bgColor', 'borderColor', 'borderWidth', 'radius', 'opacity', 'rotate', 'weight', 'align', 'required', 'locked', 'hidden'],
    heading: ['label', 'text', 'fontSize', 'color', 'opacity', 'rotate', 'weight', 'align', 'locked', 'hidden'],
    image: ['label', 'src', 'borderColor', 'borderWidth', 'radius', 'opacity', 'rotate', 'locked', 'hidden'],
    date: ['label', 'placeholder', 'fontSize', 'color', 'bgColor', 'borderColor', 'borderWidth', 'radius', 'opacity', 'rotate', 'align', 'required', 'locked', 'hidden'],
    signature: ['label', 'placeholder', 'bgColor', 'borderColor', 'borderWidth', 'radius', 'opacity', 'rotate', 'align', 'locked', 'hidden'],
    line: ['label', 'bgColor', 'opacity', 'rotate', 'locked', 'hidden'],
  };

  function $(selector) { return document.querySelector(selector); }
  function status(text, isError) {
    if (!el.status) return;
    el.status.textContent = text || '';
    el.status.style.color = isError ? '#ff9dc5' : '#d8c2ff';
  }
  function clamp(v, min, max, fallback) {
    const n = Number(v);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(min, Math.min(max, n));
  }
  function clone(v) { return JSON.parse(JSON.stringify(v)); }
  function canManage() { return Boolean(state.meta?.canManageTemplates); }
  function editing() { return canManage() && state.mode === 'edit'; }
  function selectedElement() {
    return (state.template?.elements || []).find((x) => x.id === state.selectedElementId) || null;
  }
  function isSignatureFillMode() {
    const item = selectedElement();
    return Boolean(item && item.type === 'signature' && !editing());
  }
  function fieldWrap(node) {
    return node && node.closest ? node.closest('label') : null;
  }
  function applyPropertyLayout(item, isEdit) {
    const type = item?.type || '';
    const visibleKeys = new Set(PROPERTY_VISIBLE_BY_TYPE[type] || []);
    Object.entries(prop).forEach(([key, node]) => {
      const wrap = fieldWrap(node);
      const show = Boolean(isEdit && item && visibleKeys.has(key));
      if (wrap) wrap.hidden = !show;
      if (node && 'disabled' in node) node.disabled = !show;
    });
    const showSignatureFillInput = Boolean(item && item.type === 'signature' && !isEdit);
    if (el.propSignatureWrap) el.propSignatureWrap.hidden = !showSignatureFillInput;
    if (el.propSignatureValue) el.propSignatureValue.disabled = !showSignatureFillInput;
  }
  function sortElements() {
    return [...(state.template?.elements || [])].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
  }
  function snap(v) {
    return state.snap ? Math.round(v / state.grid) * state.grid : v;
  }
  function normalizeType(type) {
    const map = {
      input: 'text',
      checkbox: 'text',
      box: 'text',
    };
    const normalized = map[type] || type;
    return ALLOWED_TYPES.has(normalized) ? normalized : 'text';
  }

  function pad2(num) {
    return String(num).padStart(2, '0');
  }

  function isoToRuDate(isoValue) {
    const value = String(isoValue || '').trim();
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return '';
    const [, year, month, day] = match;
    const dt = new Date(Number(year), Number(month) - 1, Number(day));
    if (
      Number.isNaN(dt.getTime()) ||
      dt.getFullYear() !== Number(year) ||
      dt.getMonth() + 1 !== Number(month) ||
      dt.getDate() !== Number(day)
    ) {
      return '';
    }
    return `${day}.${month}.${year}`;
  }

  function ruToIsoDate(ruValue) {
    const value = String(ruValue || '').trim();
    const match = value.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    if (!match) return '';
    const [, day, month, year] = match;
    const dt = new Date(Number(year), Number(month) - 1, Number(day));
    if (
      Number.isNaN(dt.getTime()) ||
      dt.getFullYear() !== Number(year) ||
      dt.getMonth() + 1 !== Number(month) ||
      dt.getDate() !== Number(day)
    ) {
      return '';
    }
    return `${year}-${month}-${day}`;
  }

  function normalizeStoredDate(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    if (/^\d{2}\.\d{2}\.\d{4}$/.test(raw)) return ruToIsoDate(raw) ? raw : '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return isoToRuDate(raw);
    return '';
  }

  async function req(url, options) {
    const res = await fetch(url, { credentials: 'same-origin', ...(options || {}) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || data.error || `HTTP ${res.status}`);
    return data;
  }

  async function detectApiBase() {
    const candidates = ['/api/docflow', '/api/documentflow'];
    for (const base of candidates) {
      try {
        await req(`${base}/meta`);
        state.apiBase = base;
        return;
      } catch {
        // continue
      }
    }
  }

  function normalizeElement(input, idx) {
    const s = input.style || {};
    const type = normalizeType(input.type || 'text');
    const defaultWidth = type === 'line' ? DOC_WIDTH - 20 : DOC_WIDTH - 48;
    const minHeight = type === 'line' ? 1 : 2;
    const defaultHeight = type === 'line' ? 1 : 80;
    return {
      id: input.id || `el-${Date.now()}-${idx}`,
      type,
      x: clamp(input.x, 0, DOC_WIDTH, 24 + idx * 6),
      y: clamp(input.y, 0, DOC_HEIGHT, 24 + idx * 10),
      w: clamp(input.w, 20, DOC_WIDTH, defaultWidth),
      h: type === 'line' ? 1 : clamp(input.h, minHeight, DOC_HEIGHT, defaultHeight),
      zIndex: clamp(input.zIndex, 0, 2000, idx + 1),
      label: String(input.label || ''),
      text: String(input.text || ''),
      placeholder: String(input.placeholder || ''),
      src: String(input.src || ''),
      required: Boolean(input.required),
      locked: Boolean(input.locked),
      hidden: Boolean(input.hidden),
      style: {
        fontSize: clamp(s.fontSize, 10, 64, 16),
        color: String(s.color || '#21183f'),
        backgroundColor: String(s.backgroundColor || '#ffffff'),
        borderColor: String(s.borderColor || '#00000000'),
        borderWidth: clamp(s.borderWidth, 0, 20, 0),
        borderRadius: clamp(s.borderRadius, 0, 120, type === 'line' ? 0 : 6),
        opacity: clamp(s.opacity, 0.1, 1, 1),
        rotation: clamp(s.rotation, -180, 180, 0),
        align: ['left', 'center', 'right'].includes(s.align) ? s.align : 'left',
        fontWeight: ['normal', '600', '700', '800'].includes(s.fontWeight) ? s.fontWeight : 'normal',
      },
    };
  }

  function newElement(type) {
    const idx = (state.template?.elements || []).length;
    const resolvedType = normalizeType(type);
    const base = {
      text: { label: 'Текст', text: 'Введите текст', w: DOC_WIDTH - 48, h: 120, placeholder: 'Введите текст', style: { backgroundColor: '#ffffff', borderColor: '#c8bddf', borderWidth: 1 } },
      heading: { label: 'Заголовок', text: 'Заголовок документа', w: DOC_WIDTH - 48, h: 86, style: { fontSize: 30, fontWeight: '700', align: 'center', borderWidth: 1, borderColor: '#c8bddf' } },
      image: { label: 'Изображение', w: DOC_WIDTH - 48, h: 250, style: { borderColor: '#b6abd5', borderWidth: 1, backgroundColor: '#faf8ff' } },
      date: { label: 'Дата', w: DOC_WIDTH - 48, h: 56, style: { backgroundColor: '#ffffff', borderColor: '#c8bddf', borderWidth: 1 } },
      signature: { label: 'Подпись', placeholder: 'Имя Фамилия', w: DOC_WIDTH - 48, h: 142, style: { backgroundColor: '#ffffff', borderColor: '#c8bddf', borderWidth: 1 } },
      line: { label: 'Линия', w: DOC_WIDTH - 20, h: 1, style: { backgroundColor: '#000000', borderWidth: 0, borderColor: '#00000000', borderRadius: 0 } },
    }[resolvedType] || {};

    return normalizeElement({
      id: `el-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
      type: resolvedType,
      x: resolvedType === 'line' ? 10 : 24,
      y: 30 + idx * 14,
      ...base,
    }, idx);
  }

  function pushUndo() {
    if (!editing() || !state.template) return;
    state.undo.push(clone({
      template: state.template,
      fillValues: state.fillValues,
      selectedElementId: state.selectedElementId,
      mode: state.mode,
    }));
    if (state.undo.length > 80) state.undo.shift();
    state.redo = [];
    updateUndoRedoButtons();
  }

  function applySnapshot(snapshot) {
    if (!snapshot) return;
    state.template = clone(snapshot.template);
    state.fillValues = clone(snapshot.fillValues || {});
    state.selectedElementId = snapshot.selectedElementId || '';
    state.mode = snapshot.mode || state.mode;
    renderAll();
  }

  function undo() {
    if (!state.undo.length) return;
    const current = clone({
      template: state.template,
      fillValues: state.fillValues,
      selectedElementId: state.selectedElementId,
      mode: state.mode,
    });
    const prev = state.undo.pop();
    state.redo.push(current);
    applySnapshot(prev);
  }

  function redo() {
    if (!state.redo.length) return;
    const current = clone({
      template: state.template,
      fillValues: state.fillValues,
      selectedElementId: state.selectedElementId,
      mode: state.mode,
    });
    const next = state.redo.pop();
    state.undo.push(current);
    applySnapshot(next);
  }

  function updateUndoRedoButtons() {
    if (el.undoBtn) el.undoBtn.disabled = !state.undo.length;
    if (el.redoBtn) el.redoBtn.disabled = !state.redo.length;
  }

  function updateVisibility() {
    const hasTemplate = Boolean(state.template);
    const isEdit = editing();
    const signatureFill = isSignatureFillMode();
    if (el.createBtn) el.createBtn.hidden = !canManage();
    if (el.modeBtn) {
      el.modeBtn.hidden = !canManage() || !hasTemplate;
      el.modeBtn.textContent = isEdit ? 'Режим: редактирование' : 'Режим: заполнение';
    }
    if (el.saveFillBtn) el.saveFillBtn.hidden = !hasTemplate || !state.meta?.authenticated || isEdit;
    if (el.pngBtn) el.pngBtn.hidden = !hasTemplate;
    if (el.pdfBtn) el.pdfBtn.hidden = !hasTemplate;
    if (el.saveTemplateBtn) el.saveTemplateBtn.hidden = !isEdit;
    if (el.deleteTemplateBtn) el.deleteTemplateBtn.hidden = !(isEdit && state.template?.id);
    if (el.tools) el.tools.hidden = !isEdit;
    if (el.quick) el.quick.hidden = !isEdit;
    if (el.props) el.props.hidden = !(state.selectedElementId && (isEdit || signatureFill));
    applyPropertyLayout(selectedElement(), isEdit);
    if (el.propDelete) el.propDelete.hidden = !isEdit || !state.selectedElementId;
    [el.metaTitle, el.metaServer, el.metaDescription].forEach((node) => {
      if (node) node.disabled = !isEdit;
    });
    updateUndoRedoButtons();
  }

  function renderTemplateList() {
    if (!el.templateList) return;
    const filterServer = el.serverFilter?.value || '';
    const list = state.templates.filter((t) => !filterServer || t.server === filterServer);
    el.templateList.innerHTML = '';
    if (!list.length) {
      const p = document.createElement('p');
      p.className = 'docflow-empty';
      p.textContent = 'Шаблонов пока нет.';
      el.templateList.append(p);
      return;
    }
    list.forEach((t) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'docflow-template-item';
      if (t.id === state.selectedTemplateId) btn.classList.add('active');
      const title = document.createElement('strong');
      title.textContent = t.title;
      const server = document.createElement('span');
      server.textContent = t.server;
      btn.append(title, server);
      btn.addEventListener('click', () => loadTemplate(t.id));
      el.templateList.append(btn);
    });
  }

  function applyElementStyle(node, item) {
    const s = item.style || {};
    node.style.left = `${item.x}px`;
    node.style.top = `${item.y}px`;
    node.style.width = `${item.w}px`;
    node.style.height = `${Math.max(2, item.h)}px`;
    node.style.zIndex = String(item.zIndex || 1);
    node.style.fontSize = `${s.fontSize || 16}px`;
    node.style.color = s.color || '#21183f';
    node.style.textAlign = s.align || 'left';
    node.style.fontWeight = s.fontWeight || 'normal';
    node.style.opacity = String(s.opacity || 1);
    node.style.borderRadius = `${s.borderRadius || 0}px`;
    node.style.background = s.backgroundColor || 'transparent';
    node.style.border = `${s.borderWidth || 0}px solid ${s.borderColor || 'transparent'}`;
    node.style.transform = `rotate(${s.rotation || 0}deg)`;
    node.style.transformOrigin = 'center center';
  }

  function generateSignatureDataUrl(name, width, height) {
    const translitMap = {
      '\u0430': 'a',
      '\u0431': 'b',
      '\u0432': 'v',
      '\u0433': 'g',
      '\u0434': 'd',
      '\u0435': 'e',
      '\u0451': 'e',
      '\u0436': 'zh',
      '\u0437': 'z',
      '\u0438': 'i',
      '\u0439': 'y',
      '\u043a': 'k',
      '\u043b': 'l',
      '\u043c': 'm',
      '\u043d': 'n',
      '\u043e': 'o',
      '\u043f': 'p',
      '\u0440': 'r',
      '\u0441': 's',
      '\u0442': 't',
      '\u0443': 'u',
      '\u0444': 'f',
      '\u0445': 'kh',
      '\u0446': 'ts',
      '\u0447': 'ch',
      '\u0448': 'sh',
      '\u0449': 'sch',
      '\u044a': '',
      '\u044b': 'y',
      '\u044c': '',
      '\u044d': 'e',
      '\u044e': 'yu',
      '\u044f': 'ya',
    };

    const toEnglishName = (raw) => {
      const value = String(raw || '').trim();
      if (!value) return '';
      let out = '';
      for (const ch of value) {
        const low = ch.toLowerCase();
        if (translitMap[low] !== undefined) {
          const part = translitMap[low];
          out += ch === low ? part : (part.charAt(0).toUpperCase() + part.slice(1));
        } else {
          out += ch;
        }
      }
      out = out
        .replace(/[^A-Za-z\s'-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (!out) return '';
      return out
        .split(' ')
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join(' ');
    };

    const escapeXml = (value) =>
      String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');

    const english = toEnglishName(name) || 'Signature';
    const words = english.split(' ').filter(Boolean);
    const first = words[0] || '';
    const surname = words.length > 1 ? words.slice(1).join(' ') : first;
    const monogram = `${first ? first[0].toUpperCase() : 'S'}. ${surname || 'Signature'}`.trim();

    let seed = 0;
    for (let i = 0; i < english.length; i += 1) seed += english.charCodeAt(i) * (i + 5);

    const w = Math.max(180, Math.round(width));
    const h = Math.max(70, Math.round(height));
    const baseY = h * 0.64;
    const tilt = -4 + (seed % 7);
    const textSize = Math.max(26, Math.min(46, Math.round(h * 0.44)));

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <g transform="rotate(${tilt} ${w * 0.43} ${baseY})">
        <text x="${w * 0.16}" y="${baseY}" font-family="'Segoe Script','Lucida Handwriting','Brush Script MT',cursive" font-size="${textSize}" fill="#0b0b0b" letter-spacing="0.35">${escapeXml(monogram)}</text>
      </g>
    </svg>`;

    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }

  function renderLocalSignature(item, input, signNode) {
    const name = String(input.value || '').trim();
    if (!item || !signNode) return;
    const boxW = Math.max(160, item.w - 14);
    const boxH = Math.max(60, item.h - 54);
    const w = Math.max(180, Math.min(360, Math.round(boxW * 0.56)));
    const h = Math.max(68, Math.min(120, Math.round(boxH * 0.9)));
    signNode.style.width = `${w}px`;
    signNode.style.maxWidth = '100%';
    signNode.style.height = `${h}px`;
    signNode.style.objectFit = 'contain';
    signNode.style.objectPosition = 'left center';
    signNode.src = generateSignatureDataUrl(name, w, h);
  }

  function applySignatureValueFromProperties() {
    const item = selectedElement();
    if (!item || item.type !== 'signature' || !el.propSignatureValue) return;
    state.fillValues[item.id] = String(el.propSignatureValue.value || '').trim();
    renderCanvas();
  }

  function chooseImageFile() {
    return new Promise((resolve) => {
      const picker = document.createElement('input');
      picker.type = 'file';
      picker.accept = 'image/*';
      picker.addEventListener('change', () => resolve(picker.files && picker.files[0] ? picker.files[0] : null), { once: true });
      picker.click();
    });
  }

  async function pickImageForElement(item) {
    if (!editing() || !item) return;
    const file = await chooseImageFile();
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      pushUndo();
      item.src = String(reader.result || '');
      renderAll();
      status('Изображение добавлено.', false);
    };
    reader.onerror = () => status('Не удалось прочитать изображение.', true);
    reader.readAsDataURL(file);
  }

  function renderCanvas() {
    if (!el.canvas) return;
    el.canvas.innerHTML = '';
    el.canvas.classList.toggle('mode-edit', editing());
    el.canvas.classList.toggle('mode-fill', !editing());
    if (!state.template) return;
    sortElements().forEach((item) => {
      if (!editing() && item.hidden) return;
      const card = document.createElement('div');
      card.className = 'doc-el';
      card.dataset.id = item.id;
      applyElementStyle(card, item);
      if (['text', 'heading', 'date', 'signature'].includes(item.type)) {
        card.style.border = '0';
        card.style.background = 'transparent';
        card.style.padding = '0';
      }
      if (editing() && item.id === state.selectedElementId) card.classList.add('selected');
      if (editing() && item.hidden) card.classList.add('doc-el-hidden');
      if (editing() && item.locked) card.classList.add('doc-el-locked');
      if (item.type === 'line') card.classList.add('doc-el-line');

      if (item.type === 'image') {
        const img = document.createElement('img');
        img.className = 'doc-el-image';
        img.src = item.src || '';
        img.alt = item.label || 'Изображение';
        if (editing()) {
          img.title = 'Нажмите, чтобы выбрать изображение';
          img.addEventListener('click', (event) => {
            event.stopPropagation();
            pickImageForElement(item);
          });
        }
        card.append(img);
        if (!item.src) {
          if (!editing()) {
            el.canvas.append(card);
            return;
          }
          const empty = document.createElement('button');
          empty.className = 'doc-el-image-pick';
          empty.type = 'button';
          empty.textContent = editing() ? 'Выбрать изображение' : 'Изображение не выбрано';
          empty.disabled = !editing();
          if (editing()) {
            empty.addEventListener('click', (event) => {
              event.stopPropagation();
              pickImageForElement(item);
            });
          }
          card.append(empty);
        }
      } else if (item.type === 'date') {
        const input = document.createElement('input');
        input.className = 'doc-el-input';
        const currentDate = normalizeStoredDate(state.fillValues[item.id] || '');
        if (editing()) {
          input.type = 'text';
          input.value = currentDate;
          input.readOnly = true;
          input.disabled = true;
          input.placeholder = item.placeholder || 'ДД.ММ.ГГГГ';
        } else {
          input.type = 'date';
          input.value = ruToIsoDate(currentDate);
          input.placeholder = item.placeholder || 'ДД.ММ.ГГГГ';
          input.addEventListener('change', () => {
            const normalized = normalizeStoredDate(input.value);
            state.fillValues[item.id] = normalized;
          });
          input.addEventListener('input', () => {
            const normalized = normalizeStoredDate(input.value);
            state.fillValues[item.id] = normalized;
          });
        }
        card.append(input);
      } else if (item.type === 'signature') {
        const sign = document.createElement('img');
        sign.className = 'doc-el-sign-image';
        sign.alt = 'Подпись';
        const source = { value: String(state.fillValues[item.id] || '') };
        renderLocalSignature(item, source, sign);
        card.append(sign);
        card.addEventListener('click', () => {
          if (state.selectedElementId === item.id) return;
          state.selectedElementId = item.id;
          renderAll();
        });
      } else if (item.type === 'heading') {
        const head = document.createElement(editing() ? 'input' : 'div');
        head.className = 'doc-el-heading';
        if (editing()) {
          head.value = item.text || '';
          head.placeholder = 'Заголовок документа';
          head.addEventListener('input', () => {
            item.text = head.value;
          });
        } else {
          head.textContent = item.text || '';
        }
        card.append(head);
      } else if (item.type === 'text') {
        const txt = document.createElement('textarea');
        txt.className = 'doc-el-input';
        if (editing()) {
          txt.value = item.text || '';
          txt.placeholder = item.placeholder || 'Введите текст';
          txt.addEventListener('input', () => {
            item.text = txt.value;
          });
        } else {
          txt.value = String(state.fillValues[item.id] || item.text || '');
          txt.placeholder = item.placeholder || '';
          txt.addEventListener('input', () => {
            state.fillValues[item.id] = txt.value;
          });
        }
        txt.readOnly = false;
        card.append(txt);
      }

      if (editing()) {
        card.addEventListener('mousedown', (event) => {
          if (event.target instanceof HTMLElement && ['INPUT', 'TEXTAREA', 'BUTTON', 'IMG'].includes(event.target.tagName)) return;
          state.selectedElementId = item.id;
          renderAll();
          if (!item.locked) startDrag(event, item.id, 'drag');
        });
        if (!item.locked) {
          const handle = document.createElement('button');
          handle.type = 'button';
          handle.className = 'doc-resize-handle doc-resize-se';
          handle.title = 'Растянуть';
          handle.addEventListener('mousedown', (event) => {
            event.preventDefault();
            event.stopPropagation();
            state.selectedElementId = item.id;
            startDrag(event, item.id, item.type === 'line' ? 'resize-line' : 'resize');
          });
          card.append(handle);
        }
      }
      el.canvas.append(card);
    });
    el.canvas.style.transform = `scale(${state.zoom})`;
    el.canvas.style.transformOrigin = 'top left';
  }

  function renderLayers() {
    if (!el.layers) return;
    el.layers.innerHTML = '';
    const rows = sortElements().reverse();
    if (!rows.length) {
      const p = document.createElement('p');
      p.className = 'docflow-empty';
      p.textContent = 'Слоев нет.';
      el.layers.append(p);
      return;
    }
    rows.forEach((item) => {
      const row = document.createElement('div');
      row.className = 'doc-layer-row';
      if (item.id === state.selectedElementId) row.classList.add('active');
      const name = document.createElement('button');
      name.type = 'button';
      name.className = 'doc-layer-name';
      name.textContent = `${item.label || item.type} (#${item.zIndex || 0})`;
      name.addEventListener('click', () => {
        state.selectedElementId = item.id;
        renderAll();
      });
      const lock = document.createElement('button');
      lock.type = 'button';
      lock.className = 'doc-layer-toggle';
      lock.textContent = item.locked ? 'Забл' : 'Ред';
      lock.addEventListener('click', () => {
        if (!editing()) return;
        pushUndo();
        item.locked = !item.locked;
        renderAll();
      });
      const vis = document.createElement('button');
      vis.type = 'button';
      vis.className = 'doc-layer-toggle';
      vis.textContent = item.hidden ? 'Скр' : 'Пок';
      vis.addEventListener('click', () => {
        if (!editing()) return;
        pushUndo();
        item.hidden = !item.hidden;
        renderAll();
      });
      row.append(name, lock, vis);
      el.layers.append(row);
    });
  }

  function syncMetaFields() {
    if (!state.template) return;
    if (el.metaTitle) el.metaTitle.value = state.template.title || '';
    if (el.metaServer) el.metaServer.value = state.template.server || '';
    if (el.metaDescription) el.metaDescription.value = state.template.description || '';
  }

  function syncPropertyFields() {
    const item = selectedElement();
    if (!el.props || !item) return;
    if (el.propSignatureValue && item.type === 'signature') {
      el.propSignatureValue.value = String(state.fillValues[item.id] || '');
    }
    const s = item.style || {};
    prop.label.value = item.label || '';
    prop.text.value = item.text || '';
    prop.placeholder.value = item.placeholder || '';
    prop.src.value = item.src || '';
    prop.fontSize.value = s.fontSize || 16;
    prop.color.value = s.color || '#21183f';
    prop.bgColor.value = s.backgroundColor || '#ffffff';
    prop.borderColor.value = s.borderColor || '#000000';
    prop.borderWidth.value = s.borderWidth || 0;
    prop.radius.value = s.borderRadius || 0;
    prop.opacity.value = s.opacity || 1;
    prop.rotate.value = s.rotation || 0;
    prop.weight.value = s.fontWeight || 'normal';
    prop.align.value = s.align || 'left';
    prop.required.checked = Boolean(item.required);
    prop.locked.checked = Boolean(item.locked);
    prop.hidden.checked = Boolean(item.hidden);
  }

  function applyPropertyFields() {
    const item = selectedElement();
    if (!item || !editing()) return;
    item.label = prop.label.value;
    item.text = prop.text.value;
    item.placeholder = prop.placeholder.value;
    item.src = prop.src.value;
    item.required = Boolean(prop.required.checked);
    item.locked = Boolean(prop.locked.checked);
    item.hidden = Boolean(prop.hidden.checked);
    item.style.fontSize = clamp(prop.fontSize.value, 10, 64, item.style.fontSize || 16);
    item.style.color = prop.color.value || '#21183f';
    item.style.backgroundColor = prop.bgColor.value || (item.type === 'line' ? '#000000' : '#ffffff');
    item.style.borderColor = prop.borderColor.value || '#00000000';
    item.style.borderWidth = item.type === 'line' ? 0 : clamp(prop.borderWidth.value, 0, 20, item.style.borderWidth || 0);
    item.style.borderRadius = item.type === 'line' ? 0 : clamp(prop.radius.value, 0, 120, item.style.borderRadius || 0);
    item.style.opacity = clamp(prop.opacity.value, 0.1, 1, item.style.opacity || 1);
    item.style.rotation = clamp(prop.rotate.value, -180, 180, item.style.rotation || 0);
    item.style.fontWeight = prop.weight.value || 'normal';
    item.style.align = prop.align.value || 'left';
    if (item.type === 'line') item.h = 1;
    renderAll();
  }

  function renderAll() {
    renderTemplateList();
    if (state.forceFitPage) {
      fitCanvasToViewport(false);
    }
    renderCanvas();
    renderLayers();
    syncMetaFields();
    syncPropertyFields();
    updateVisibility();
  }

  function payload() {
    return {
      title: String(state.template?.title || '').trim(),
      server: String(state.template?.server || '').trim(),
      description: String(state.template?.description || '').trim(),
      elements: (state.template?.elements || []).map((x, i) => normalizeElement(x, i)),
    };
  }

  function missingRequiredFields() {
    if (!state.template) return [];
    const missing = [];
    (state.template.elements || []).forEach((item) => {
      if (!item || !item.required || item.hidden) return;
      if (!['text', 'date', 'signature'].includes(item.type)) return;
      const value = String(state.fillValues[item.id] || '').trim();
      const fallback = item.type === 'text' ? String(item.text || '').trim() : '';
      if (!value && !fallback) {
        missing.push(item.label || item.type || 'поле');
      }
    });
    return missing;
  }

  function invalidDateFields() {
    if (!state.template) return [];
    const invalid = [];
    (state.template.elements || []).forEach((item) => {
      if (!item || item.type !== 'date' || item.hidden) return;
      const raw = String(state.fillValues[item.id] || '').trim();
      if (!raw) return;
      const normalized = normalizeStoredDate(raw);
      if (!normalized) {
        invalid.push(item.label || 'Дата');
        return;
      }
      state.fillValues[item.id] = normalized;
    });
    return invalid;
  }

  function normalizeFillValuesByTemplate(values) {
    const source = values && typeof values === 'object' ? values : {};
    const normalized = { ...source };
    (state.template?.elements || []).forEach((item) => {
      if (!item || item.type !== 'date') return;
      normalized[item.id] = normalizeStoredDate(source[item.id] || '');
    });
    return normalized;
  }

  function toCanvasPoint(clientX, clientY) {
    const rect = el.canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) / state.zoom,
      y: (clientY - rect.top) / state.zoom,
    };
  }

  function fitCanvasToViewport(shouldRender = true) {
    if (!el.canvasWrap || !el.zoomRange || !state.template) return;
    const availW = Math.max(300, el.canvasWrap.clientWidth - 8);
    const availH = Math.max(260, el.canvasWrap.clientHeight - 8);
    const fit = Math.min(availW / DOC_WIDTH, availH / DOC_HEIGHT);
    const target = clamp(fit, 0.2, 1.2, 1);
    state.zoom = target;
    el.zoomRange.value = String(Math.round(target * 100));
    if (shouldRender) renderCanvas();
  }

  function snapToCenterX(x, width) {
    const target = (DOC_WIDTH - width) / 2;
    return Math.abs(x - target) <= 12 ? target : x;
  }

  function startDrag(event, elementId, mode) {
    const item = (state.template?.elements || []).find((x) => x.id === elementId);
    if (!item) return;
    const p = toCanvasPoint(event.clientX, event.clientY);
    pushUndo();
    state.drag = {
      mode,
      elementId,
      startX: p.x,
      startY: p.y,
      origin: clone(item),
    };
    window.addEventListener('mousemove', onDragMove);
    window.addEventListener('mouseup', stopDrag);
  }

  function onDragMove(event) {
    if (!state.drag) return;
    const item = (state.template?.elements || []).find((x) => x.id === state.drag.elementId);
    if (!item) return;
    const p = toCanvasPoint(event.clientX, event.clientY);
    const dx = p.x - state.drag.startX;
    const dy = p.y - state.drag.startY;
    if (state.drag.mode === 'drag') {
      let nextX = snap(clamp(state.drag.origin.x + dx, 0, DOC_WIDTH - item.w, item.x));
      const nextY = snap(clamp(state.drag.origin.y + dy, 0, DOC_HEIGHT - item.h, item.y));
      nextX = snapToCenterX(nextX, item.w);
      item.x = nextX;
      item.y = nextY;
    } else if (state.drag.mode === 'resize') {
      const nextW = snap(clamp(state.drag.origin.w + dx, 40, DOC_WIDTH - state.drag.origin.x, item.w));
      const nextH = snap(clamp(state.drag.origin.h + dy, 24, DOC_HEIGHT - state.drag.origin.y, item.h));
      item.w = nextW;
      item.h = item.type === 'line' ? 1 : nextH;
    } else if (state.drag.mode === 'resize-line') {
      const nextW = snap(clamp(state.drag.origin.w + dx, 100, DOC_WIDTH - state.drag.origin.x, item.w));
      item.w = nextW;
      item.h = 1;
    }
    renderAll();
  }

  function stopDrag() {
    state.drag = null;
    window.removeEventListener('mousemove', onDragMove);
    window.removeEventListener('mouseup', stopDrag);
  }

  async function loadMeta() {
    await detectApiBase();
    let meta;
    try {
      meta = await req(`${state.apiBase}/meta`);
    } catch {
      meta = { servers: SERVERS, authenticated: false, canManageTemplates: false };
      status('API документооборота недоступен.', true);
    }
    state.meta = meta;
    const servers = meta.servers || SERVERS;
    if (el.serverFilter) {
      el.serverFilter.innerHTML = '<option value="">Все серверы</option>';
      servers.forEach((s) => {
        const o = document.createElement('option');
        o.value = s;
        o.textContent = s;
        el.serverFilter.append(o);
      });
    }
    if (el.metaServer) {
      el.metaServer.innerHTML = '';
      servers.forEach((s) => {
        const o = document.createElement('option');
        o.value = s;
        o.textContent = s;
        el.metaServer.append(o);
      });
    }
    status(meta.authenticated ? 'Вы авторизованы через Discord.' : 'Войдите через Discord для сохранения заполнений.', !meta.authenticated);
  }

  async function loadTemplates() {
    try {
      const data = await req(`${state.apiBase}/templates`);
      state.templates = Array.isArray(data.templates) ? data.templates : [];
    } catch (error) {
      state.templates = [];
      status(`Не удалось загрузить шаблоны: ${error.message}`, true);
    }
    renderTemplateList();
  }

  async function loadTemplate(id) {
    try {
      const data = await req(`${state.apiBase}/templates/${encodeURIComponent(id)}`);
      if (!data.template) return;
      state.selectedTemplateId = id;
      state.template = {
        ...data.template,
        elements: (data.template.elements || []).map((x, i) => normalizeElement(x, i)),
      };
      state.fillValues = normalizeFillValuesByTemplate((data.myFill && data.myFill.values) || {});
      state.selectedElementId = '';
      state.mode = canManage() ? 'edit' : 'fill';
      state.undo = [];
      state.redo = [];
      if (el.editor) el.editor.hidden = false;
      if (el.title) el.title.textContent = state.template.title || 'Шаблон';
      renderAll();
      fitCanvasToViewport();
      status('Шаблон загружен.', false);
    } catch (error) {
      status(`Ошибка загрузки шаблона: ${error.message}`, true);
    }
  }

  function createDraft() {
    if (!canManage()) return;
    state.template = {
      id: '',
      title: 'Новый шаблон',
      server: (state.meta?.servers || SERVERS)[0] || '',
      description: '',
      elements: [],
    };
    state.selectedTemplateId = '';
    state.selectedElementId = '';
    state.fillValues = {};
    state.mode = 'edit';
    state.undo = [];
    state.redo = [];
    if (el.editor) el.editor.hidden = false;
    if (el.title) el.title.textContent = 'Новый шаблон';
    renderAll();
    fitCanvasToViewport();
    status('Черновик создан.', false);
  }

  async function saveTemplate() {
    if (!editing() || !state.template) return;
    const data = payload();
    if (!data.title || !data.server) {
      status('Укажите название и сервер.', true);
      return;
    }
    try {
      if (state.template.id) {
        const res = await req(`${state.apiBase}/templates/${encodeURIComponent(state.template.id)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        state.template = {
          ...res.template,
          elements: (res.template.elements || []).map((x, i) => normalizeElement(x, i)),
        };
        status('Шаблон обновлен.', false);
      } else {
        const res = await req(`${state.apiBase}/templates`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        await loadTemplates();
        await loadTemplate(res.template.id);
        status('Шаблон создан.', false);
        return;
      }
      await loadTemplates();
      renderAll();
    } catch (error) {
      status(`Ошибка сохранения: ${error.message}`, true);
    }
  }

  async function deleteTemplate() {
    if (!editing() || !state.template?.id) return;
    if (!window.confirm('Удалить шаблон?')) return;
    try {
      await req(`${state.apiBase}/templates/${encodeURIComponent(state.template.id)}`, { method: 'DELETE' });
      state.template = null;
      state.selectedTemplateId = '';
      state.selectedElementId = '';
      state.fillValues = {};
      if (el.editor) el.editor.hidden = true;
      if (el.title) el.title.textContent = 'Выберите шаблон';
      await loadTemplates();
      renderAll();
      status('Шаблон удален.', false);
    } catch (error) {
      status(`Ошибка удаления: ${error.message}`, true);
    }
  }

  async function saveFill() {
    if (!state.template || !state.meta?.authenticated) {
      status('Нужен вход через Discord.', true);
      return;
    }
    const missing = missingRequiredFields();
    if (missing.length) {
      status(`Заполните обязательные поля: ${missing.join(', ')}.`, true);
      return;
    }
    const invalidDates = invalidDateFields();
    if (invalidDates.length) {
      status(`Проверьте дату в полях: ${invalidDates.join(', ')}. Формат: ДД.ММ.ГГГГ.`, true);
      return;
    }
    try {
      await req(`${state.apiBase}/templates/${encodeURIComponent(state.template.id)}/my-fill`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: state.fillValues }),
      });
      status('Заполнение сохранено.', false);
    } catch (error) {
      status(`Ошибка сохранения заполнения: ${error.message}`, true);
    }
  }

  async function exportDoc(format) {
    if (!state.template || !el.canvasWrap) return;
    try {
      const canvas = await window.html2canvas(el.canvasWrap, { backgroundColor: '#ffffff', scale: 2, useCORS: true });
      if (format === 'png') {
        const a = document.createElement('a');
        a.download = `${state.template.title || 'document'}.png`;
        a.href = canvas.toDataURL('image/png');
        a.click();
      } else {
        const img = canvas.toDataURL('image/png');
        const pdf = new window.jspdf.jsPDF('p', 'pt', 'a4');
        const pw = pdf.internal.pageSize.getWidth();
        const ph = (canvas.height * pw) / canvas.width;
        pdf.addImage(img, 'PNG', 0, 0, pw, ph);
        pdf.save(`${state.template.title || 'document'}.pdf`);
      }
      status('Экспорт выполнен.', false);
    } catch (error) {
      status(`Ошибка экспорта: ${error.message}`, true);
    }
  }

  function bind() {
    if (el.serverFilter) el.serverFilter.addEventListener('change', renderTemplateList);
    if (el.createBtn) el.createBtn.addEventListener('click', createDraft);
    if (el.modeBtn) el.modeBtn.addEventListener('click', () => {
      if (!canManage() || !state.template) return;
      state.mode = state.mode === 'edit' ? 'fill' : 'edit';
      renderAll();
    });
    if (el.tools) el.tools.addEventListener('click', (event) => {
      const t = event.target;
      if (!(t instanceof HTMLElement) || !t.dataset.add || !editing() || !state.template) return;
      pushUndo();
      const item = newElement(t.dataset.add);
      state.template.elements.push(item);
      state.selectedElementId = item.id;
      renderAll();
      if (item.type === 'image') pickImageForElement(item);
    });
    if (el.duplicateBtn) el.duplicateBtn.addEventListener('click', () => {
      const item = selectedElement();
      if (!editing() || !item || !state.template) return;
      pushUndo();
      const copy = normalizeElement({
        ...clone(item),
        id: `el-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
        x: item.x + 16,
        y: item.y + 16,
      }, state.template.elements.length);
      state.template.elements.push(copy);
      state.selectedElementId = copy.id;
      renderAll();
    });
    if (el.undoBtn) el.undoBtn.addEventListener('click', undo);
    if (el.redoBtn) el.redoBtn.addEventListener('click', redo);
    if (el.alignLeftBtn) el.alignLeftBtn.addEventListener('click', () => { const item = selectedElement(); if (!item || !editing()) return; pushUndo(); item.x = 10; renderAll(); });
    if (el.alignCenterBtn) el.alignCenterBtn.addEventListener('click', () => { const item = selectedElement(); if (!item || !editing()) return; pushUndo(); item.x = (794 - item.w) / 2; renderAll(); });
    if (el.alignRightBtn) el.alignRightBtn.addEventListener('click', () => { const item = selectedElement(); if (!item || !editing()) return; pushUndo(); item.x = 794 - item.w - 10; renderAll(); });
    if (el.bringFrontBtn) el.bringFrontBtn.addEventListener('click', () => { const item = selectedElement(); if (!item || !editing()) return; pushUndo(); item.zIndex += 1; renderAll(); });
    if (el.sendBackBtn) el.sendBackBtn.addEventListener('click', () => { const item = selectedElement(); if (!item || !editing()) return; pushUndo(); item.zIndex = Math.max(0, item.zIndex - 1); renderAll(); });
    if (el.zoomRange) el.zoomRange.addEventListener('input', () => {
      state.forceFitPage = false;
      state.zoom = clamp(el.zoomRange.value / 100, 0.2, 1.2, 1);
      renderCanvas();
    });
    if (el.snapCheckbox) el.snapCheckbox.addEventListener('change', () => { state.snap = Boolean(el.snapCheckbox.checked); });
    [el.metaTitle, el.metaServer, el.metaDescription].forEach((node) => {
      if (!node) return;
      node.addEventListener('input', () => {
        if (!state.template || !editing()) return;
        state.template.title = el.metaTitle.value;
        state.template.server = el.metaServer.value;
        state.template.description = el.metaDescription.value;
        if (el.title) el.title.textContent = state.template.title || 'Шаблон';
      });
    });
    Object.values(prop).forEach((node) => {
      if (!node) return;
      node.addEventListener('input', applyPropertyFields);
      node.addEventListener('change', applyPropertyFields);
    });
    if (el.propSignatureValue) {
      el.propSignatureValue.addEventListener('input', applySignatureValueFromProperties);
      el.propSignatureValue.addEventListener('change', applySignatureValueFromProperties);
    }
    if (el.propDelete) el.propDelete.addEventListener('click', () => {
      if (!editing() || !state.template || !state.selectedElementId) return;
      pushUndo();
      state.template.elements = state.template.elements.filter((x) => x.id !== state.selectedElementId);
      state.selectedElementId = '';
      renderAll();
    });
    if (el.saveTemplateBtn) el.saveTemplateBtn.addEventListener('click', saveTemplate);
    if (el.deleteTemplateBtn) el.deleteTemplateBtn.addEventListener('click', deleteTemplate);
    if (el.saveFillBtn) el.saveFillBtn.addEventListener('click', saveFill);
    if (el.pngBtn) el.pngBtn.addEventListener('click', () => exportDoc('png'));
    if (el.pdfBtn) el.pdfBtn.addEventListener('click', () => exportDoc('pdf'));
    window.addEventListener('resize', () => {
      state.forceFitPage = true;
      fitCanvasToViewport();
    });
  }

  (async () => {
    try {
      await loadMeta();
      await loadTemplates();
      bind();
      updateVisibility();
    } catch (error) {
      status(`Ошибка инициализации: ${error.message}`, true);
    }
  })();
})();



