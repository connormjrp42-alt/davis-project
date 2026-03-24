require('dotenv').config();

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const express = require('express');
const session = require('express-session');

const app = express();
const port = process.env.PORT || 3000;

const {
  DISCORD_CLIENT_ID,
  DISCORD_CLIENT_SECRET,
  DISCORD_REDIRECT_URI,
  SESSION_SECRET,
  OPENAI_API_KEY,
  OPENAI_SIGNATURE_MODEL,
  OPENAI_SIGNATURE_TEXT_MODEL,
  DISCORD_TEST_RESULTS_WEBHOOK,
  DISCORD_BOT_TOKEN,
} = process.env;

const ADMIN_DISCORD_USERNAME = 'connordavis42';

const CONTENT_FILE = path.join(__dirname, 'data', 'site-content.json');
const LAYOUT_FILE = path.join(__dirname, 'data', 'layout-overrides.json');
const PAGES_FILE = path.join(__dirname, 'data', 'pages.json');
const TABS_FILE = path.join(__dirname, 'data', 'tabs.json');
const TAB_BLOCKS_FILE = path.join(__dirname, 'data', 'tab-blocks.json');
const POSTS_FILE = path.join(__dirname, 'data', 'posts.json');
const USERS_FILE = path.join(__dirname, 'data', 'users.json');
const NAVIGATOR_FILE = path.join(__dirname, 'data', 'page-navigators.json');
const LAW_CACHE_FILE = path.join(__dirname, 'data', 'law-cache.json');
const DOC_TEMPLATES_FILE = path.join(__dirname, 'data', 'doc-templates.json');
const DOC_FILLS_FILE = path.join(__dirname, 'data', 'doc-template-fills.json');
const FACTIONS_FILE = path.join(__dirname, 'data', 'factions.json');
const BOT_PROJECTS_FILE = path.join(__dirname, 'data', 'bot-projects.json');
const BOT_PROJECT_SECRETS_FILE = path.join(__dirname, 'data', 'bot-project-secrets.json');
const BOT_FAMILY_APPLICATIONS_FILE = path.join(__dirname, 'data', 'bot-family-applications.json');
const BOT_CONTRACT_REPORTS_FILE = path.join(__dirname, 'data', 'bot-contract-reports.json');
const PAGES_DIR = path.join(__dirname, 'public', 'pages');
const FACTIONS_UPLOAD_DIR = path.join(__dirname, 'public', 'uploads', 'factions');

const TAB_TYPES = ['section', 'page', 'url'];
const TAB_BLOCK_TYPES = ['text', 'image', 'combo'];
const BOT_BUILDER_MODULE_IDS = [];
const BOT_BUILDER_CONTRACT_NAMES = [
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
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;
const BOT_FAMILY_ACTION_TTL_MS = 14 * 24 * 60 * 60 * 1000;
const BOT_FAMILY_ACTION_CUSTOM_ID_PREFIX = 'familyapp';
const BOT_FAMILY_CALL_SELECT_CUSTOM_ID_PREFIX = 'familyappcallsel';
const BOT_CONTRACT_ACTION_CUSTOM_ID_PREFIX = 'contractrep';
const DISCORD_GATEWAY_URL = 'wss://gateway.discord.gg/?v=10&encoding=json';
const DISCORD_GATEWAY_SYNC_INTERVAL_MS = 30 * 1000;
const DOC_TEMPLATE_CREATOR_NAMES = String(process.env.DOC_TEMPLATE_CREATORS || ADMIN_DISCORD_USERNAME)
  .split(',')
  .map((row) => row.trim().toLowerCase())
  .filter(Boolean);
const DISCORD_USER_CACHE_TTL_MS = 10 * 60 * 1000;
const DISCORD_GUILD_MEMBER_CACHE_TTL_MS = 3 * 60 * 1000;
const AUTH_COOKIE_NAME = 'dp_auth';
const AUTH_COOKIE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const discordUserCache = new Map();
const discordUserInFlight = new Map();
const discordGuildMemberCache = new Map();
const discordGuildMemberInFlight = new Map();

const DEFAULT_CONTENT = {
  serverTitle: 'Информация сервера',
  serverAnnouncement:
    'Ежедневные ивенты, поддержка игроков и свежие RP-гайды доступны в Davis Project.',
  serverHowToStart:
    '1) Войти через Discord  2) Выбрать направление  3) Следовать персональному плану развития.',
  serverContacts: 'Discord администратора: connordavis42',
  roleNewbie: 'Гайды по интерфейсу, заработку, первым квестам и безопасному развитию.',
  roleState: 'Ролевые шаблоны, карьерные пути, дисциплина и взаимодействие в структурах.',
  roleCrime: 'Тактики, командная координация, RP-этика и минимизация рисков на сервере.',
};

const DEFAULT_TABS = [
  { id: crypto.randomUUID(), label: 'О проекте', type: 'section', target: '#about', order: 1 },
  { id: crypto.randomUUID(), label: 'Посты', type: 'section', target: '#posts', order: 2 },
  { id: crypto.randomUUID(), label: 'Помощь', type: 'section', target: '#help', order: 3 },
  { id: crypto.randomUUID(), label: 'Направления', type: 'section', target: '#roles', order: 4 },
];

const DEFAULT_POSTS = [
  {
    id: crypto.randomUUID(),
    title: 'Стартовый набор гайдов',
    text: 'Открой пошаговый маршрут старта на Majestic RP и начни развитие без хаоса.',
    imageUrl: '',
    buttonText: 'Читать',
    buttonUrl: '#about',
    published: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

function ensureDirFor(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function readJSON(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) {
      ensureDirFor(filePath);
      fs.writeFileSync(filePath, JSON.stringify(fallback, null, 2), 'utf8');
      return JSON.parse(JSON.stringify(fallback));
    }

    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    return JSON.parse(JSON.stringify(fallback));
  }
}

function writeJSON(filePath, value) {
  ensureDirFor(filePath);
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf8');
}

function sanitizeText(value, max = 1000) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function parseCookieHeader(headerValue) {
  const map = {};
  const raw = typeof headerValue === 'string' ? headerValue : '';
  if (!raw) return map;
  raw.split(';').forEach((chunk) => {
    const [k, ...rest] = chunk.split('=');
    const key = String(k || '').trim();
    if (!key) return;
    map[key] = decodeURIComponent(String(rest.join('=') || '').trim());
  });
  return map;
}

function toBase64Url(input) {
  return Buffer.from(input).toString('base64url');
}

function fromBase64Url(input) {
  return Buffer.from(String(input || ''), 'base64url').toString('utf8');
}

function sanitizeSessionUser(user) {
  const row = user && typeof user === 'object' ? user : {};
  return {
    id: sanitizeText(row.id, 80),
    username: sanitizeText(row.username, 80),
    global_name: sanitizeText(row.global_name, 80),
    avatar: sanitizeText(row.avatar, 160),
    email: sanitizeText(row.email, 120),
  };
}

function createSignedAuthCookieValue(user) {
  const safeUser = sanitizeSessionUser(user);
  if (!safeUser.id) return '';
  const payload = JSON.stringify({
    user: safeUser,
    exp: Date.now() + AUTH_COOKIE_TTL_MS,
  });
  const payloadB64 = toBase64Url(payload);
  const signature = crypto
    .createHmac('sha256', SESSION_SECRET || 'dev-secret-change-me')
    .update(payloadB64)
    .digest('hex');
  return `${payloadB64}.${signature}`;
}

function verifySignedAuthCookieValue(value) {
  const raw = sanitizeText(value, 10_000);
  if (!raw || !raw.includes('.')) return null;
  const [payloadB64, signature] = raw.split('.');
  if (!payloadB64 || !signature) return null;
  if (!/^[a-f0-9]{64}$/i.test(signature)) return null;

  const expected = crypto
    .createHmac('sha256', SESSION_SECRET || 'dev-secret-change-me')
    .update(payloadB64)
    .digest('hex');
  const expectedBuf = Buffer.from(expected, 'hex');
  const providedBuf = Buffer.from(signature, 'hex');
  if (expectedBuf.length !== providedBuf.length) return null;
  if (!crypto.timingSafeEqual(expectedBuf, providedBuf)) return null;

  try {
    const decoded = JSON.parse(fromBase64Url(payloadB64));
    const exp = Number(decoded?.exp);
    if (!Number.isFinite(exp) || exp < Date.now()) return null;
    const user = sanitizeSessionUser(decoded?.user);
    if (!user.id) return null;
    return user;
  } catch (error) {
    return null;
  }
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizeUrl(value) {
  const trimmed = sanitizeText(value, 2048);
  if (!trimmed) return '';
  if (trimmed.startsWith('/') || trimmed.startsWith('#')) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return '';
}

function clampNumber(value, min, max, fallback) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(min, Math.min(max, num));
}

function sanitizeSlug(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/--+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

function normalizeRoutePath(value) {
  const cleaned = sanitizeUrl(value);
  if (!cleaned || cleaned.startsWith('#') || /^https?:\/\//i.test(cleaned)) return '/';
  const noHash = cleaned.split('#')[0] || '/';
  if (!noHash.startsWith('/')) return '/';
  if (noHash.length > 1 && noHash.endsWith('/')) return noHash.slice(0, -1);
  return noHash;
}

function normalizeContent(input) {
  const source = input && typeof input === 'object' ? input : {};
  const content = { ...DEFAULT_CONTENT };

  Object.keys(DEFAULT_CONTENT).forEach((key) => {
    const next = sanitizeText(source[key], 1000);
    if (next) {
      content[key] = next;
    }
  });

  return content;
}

function normalizeLayout(input) {
  const source = input && typeof input === 'object' ? input : {};
  const output = {};

  Object.keys(source).forEach((key) => {
    const row = source[key];
    if (!row || typeof row !== 'object') return;

    const text = sanitizeText(row.text, 2000);
    const tag = sanitizeText(row.tag, 10).toUpperCase();
    const isTagValid = ['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'SPAN', 'DIV'].includes(tag);

    if (!text) return;

    output[key] = {
      text,
      tag: isTagValid ? tag : 'P',
    };
  });

  return output;
}

function normalizePages(input) {
  if (!Array.isArray(input)) return [];

  return input
    .map((item) => {
      const slug = sanitizeSlug(item.slug);
      const title = sanitizeText(item.title, 80);
      const pagePath = sanitizeUrl(item.path);

      if (!slug || !title || !pagePath) {
        return null;
      }

      return {
        slug,
        title,
        path: pagePath,
      };
    })
    .filter(Boolean);
}

function normalizeTabs(input) {
  if (!Array.isArray(input)) return [];

  return input
    .map((item, idx) => {
      const label = sanitizeText(item.label, 40);
      const type = sanitizeText(item.type, 10).toLowerCase();
      const target = sanitizeUrl(item.target);
      const id = sanitizeText(item.id, 80) || crypto.randomUUID();
      const order = Number.isFinite(Number(item.order)) ? Number(item.order) : idx + 1;

      if (!label || !TAB_TYPES.includes(type) || !target) {
        return null;
      }

      return {
        id,
        label,
        type,
        target,
        order,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.order - b.order)
    .map((item, idx) => ({ ...item, order: idx + 1 }));
}

function normalizePosts(input) {
  if (!Array.isArray(input)) return [];

  return input
    .map((item) => {
      const id = sanitizeText(item.id, 80) || crypto.randomUUID();
      const title = sanitizeText(item.title, 100);
      const text = sanitizeText(item.text, 4000);
      const imageUrl = sanitizeUrl(item.imageUrl);
      const buttonText = sanitizeText(item.buttonText, 40);
      const buttonUrl = sanitizeUrl(item.buttonUrl);
      const published = Boolean(item.published);
      const createdAt = sanitizeText(item.createdAt, 60) || new Date().toISOString();
      const updatedAt = sanitizeText(item.updatedAt, 60) || new Date().toISOString();

      if (!title || !text) return null;

      return {
        id,
        title,
        text,
        imageUrl,
        buttonText,
        buttonUrl,
        published,
        createdAt,
        updatedAt,
      };
    })
    .filter(Boolean);
}

function normalizeTabBlocks(input) {
  const source = input && typeof input === 'object' ? input : {};
  const output = {};

  Object.entries(source).forEach(([tabId, blocks]) => {
    if (!Array.isArray(blocks)) return;

    const normalizedBlocks = blocks
      .map((item) => {
        const id = sanitizeText(item.id, 80) || crypto.randomUUID();
        const type = sanitizeText(item.type, 20).toLowerCase();
        const title = sanitizeText(item.title, 100);
        const text = sanitizeText(item.text, 4000);
        const imageUrl = sanitizeUrl(item.imageUrl);

        if (!TAB_BLOCK_TYPES.includes(type)) return null;
        if ((type === 'text' || type === 'combo') && !text && !title) return null;
        if ((type === 'image' || type === 'combo') && !imageUrl) return null;

        return {
          id,
          type,
          title,
          text,
          imageUrl,
          x: clampNumber(item.x, 0, 95, 0),
          y: clampNumber(item.y, 0, 2000, 0),
          width: clampNumber(item.width, 180, 1200, 320),
          height: clampNumber(item.height, 120, 1200, 220),
        };
      })
      .filter(Boolean);

    output[tabId] = normalizedBlocks;
  });

  return output;
}

function normalizeUsers(input) {
  if (!Array.isArray(input)) return [];

  return input
    .map((item) => {
      const id = sanitizeText(item.id, 80);
      if (!id) return null;

      return {
        id,
        username: sanitizeText(item.username, 80),
        global_name: sanitizeText(item.global_name, 80),
        avatar: sanitizeText(item.avatar, 120),
        email: sanitizeText(item.email, 120),
        firstSeenAt: sanitizeText(item.firstSeenAt, 60) || new Date().toISOString(),
        lastSeenAt: sanitizeText(item.lastSeenAt, 60) || new Date().toISOString(),
        loginCount: Number.isFinite(Number(item.loginCount)) ? Number(item.loginCount) : 1,
      };
    })
    .filter(Boolean);
}

function normalizeFactionChecklist(input) {
  if (!Array.isArray(input)) return [];
  return input
    .map((row) => sanitizeText(row, 240))
    .filter(Boolean)
    .slice(0, 40);
}

function normalizeFactionMemo(input) {
  const row = input && typeof input === 'object' ? input : {};
  const title = sanitizeText(row.title, 120);
  const content = sanitizeText(row.content, 6000);
  const checklist = normalizeFactionChecklist(row.checklist);
  const category = sanitizeText(row.category, 80);
  const pinned = Boolean(row.pinned);
  const tagsSource = Array.isArray(row.tags)
    ? row.tags
    : typeof row.tags === 'string'
      ? row.tags.split(',')
      : [];
  const tags = tagsSource
    .map((item) => sanitizeText(item, 30))
    .filter(Boolean)
    .slice(0, 12);
  if (!title && !content && !checklist.length) return null;
  return {
    id: sanitizeText(row.id, 80) || crypto.randomUUID(),
    title: title || 'Памятка',
    content,
    checklist,
    category,
    pinned,
    tags,
    createdAt: sanitizeText(row.createdAt, 80) || new Date().toISOString(),
    updatedAt: sanitizeText(row.updatedAt, 80) || new Date().toISOString(),
  };
}

function normalizeFactionQuestion(input) {
  const row = input && typeof input === 'object' ? input : {};
  const text = sanitizeText(row.text, 800);
  const options = Array.isArray(row.options)
    ? row.options.map((item) => sanitizeText(item, 240)).filter(Boolean).slice(0, 8)
    : [];
  if (!text || options.length < 2) return null;
  const correctIndex = clampNumber(row.correctIndex, 0, Math.max(0, options.length - 1), 0);
  return {
    id: sanitizeText(row.id, 80) || crypto.randomUUID(),
    text,
    options,
    correctIndex,
  };
}

function normalizeFactionTest(input) {
  const row = input && typeof input === 'object' ? input : {};
  const title = sanitizeText(row.title, 120);
  const description = sanitizeText(row.description, 2000);
  const webhookUrl = sanitizeDiscordWebhookUrl(row.webhookUrl);
  const questions = Array.isArray(row.questions)
    ? row.questions.map((item) => normalizeFactionQuestion(item)).filter(Boolean).slice(0, 40)
    : [];
  if (!title || !questions.length) return null;
  return {
    id: sanitizeText(row.id, 80) || crypto.randomUUID(),
    title,
    description,
    passPercent: clampNumber(row.passPercent, 1, 100, 70),
    webhookUrl,
    questions,
    createdAt: sanitizeText(row.createdAt, 80) || new Date().toISOString(),
    updatedAt: sanitizeText(row.updatedAt, 80) || new Date().toISOString(),
  };
}

function normalizeFactionMember(input) {
  const row = input && typeof input === 'object' ? input : {};
  const name = sanitizeText(row.name, 120);
  if (!name) return null;
  return {
    id: sanitizeText(row.id, 80) || crypto.randomUUID(),
    name,
    role: sanitizeText(row.role, 120),
    note: sanitizeText(row.note, 280),
    addedAt: sanitizeText(row.addedAt, 80) || new Date().toISOString(),
  };
}

function normalizeFactionRoster(input) {
  const row = input && typeof input === 'object' ? input : {};
  const title = sanitizeText(row.title, 120);
  if (!title) return null;
  const members = Array.isArray(row.members)
    ? row.members.map((item) => normalizeFactionMember(item)).filter(Boolean).slice(0, 200)
    : [];
  return {
    id: sanitizeText(row.id, 80) || crypto.randomUUID(),
    title,
    members,
    createdAt: sanitizeText(row.createdAt, 80) || new Date().toISOString(),
    updatedAt: sanitizeText(row.updatedAt, 80) || new Date().toISOString(),
  };
}

function normalizeFactionManagerIds(input) {
  if (!Array.isArray(input)) return [];
  const uniq = new Set();
  input.forEach((row) => {
    const id = sanitizeText(row, 80);
    if (id) uniq.add(id);
  });
  return Array.from(uniq).slice(0, 30);
}

function normalizeFactionManagerNames(input) {
  if (!Array.isArray(input)) return [];
  const uniq = new Set();
  input.forEach((row) => {
    const value = sanitizeText(row, 80).toLowerCase();
    if (value) uniq.add(value);
  });
  return Array.from(uniq).slice(0, 30);
}

function parseManagerNamesText(value) {
  return normalizeFactionManagerNames(
    String(value || '')
      .split(/[\n,;]/g)
      .map((row) => row.trim())
      .filter(Boolean)
  );
}

function normalizeFactionDeputy(input) {
  if (typeof input === 'string') {
    const parts = input
      .split('|')
      .map((row) => row.trim())
      .filter((row, index) => row || index === 0);
    const name = sanitizeText(parts[0], 120);
    if (!name) return null;
    const discordIdRaw = sanitizeText(parts[1], 40);
    const discordId = /^\d{5,30}$/.test(discordIdRaw) ? discordIdRaw : '';
    const profileUrlRaw = sanitizeText(parts.slice(2).join('|'), 2048);
    const discordProfileUrl = /^https?:\/\/.+/i.test(profileUrlRaw) ? profileUrlRaw : '';
    return { name, discordId, discordProfileUrl };
  }

  const row = input && typeof input === 'object' ? input : {};
  const name = sanitizeText(row.name, 120);
  if (!name) return null;
  const discordIdRaw = sanitizeText(row.discordId || row.discordUserId, 40);
  const discordId = /^\d{5,30}$/.test(discordIdRaw) ? discordIdRaw : '';
  const profileUrlRaw = sanitizeText(row.discordProfileUrl, 2048);
  const discordProfileUrl = /^https?:\/\/.+/i.test(profileUrlRaw) ? profileUrlRaw : '';
  return { name, discordId, discordProfileUrl };
}

function normalizeFactionProfile(input) {
  const row = input && typeof input === 'object' ? input : {};
  const deputies = Array.isArray(row.deputies)
    ? row.deputies.map((value) => normalizeFactionDeputy(value)).filter(Boolean).slice(0, 20)
    : [];
  const leaderDiscordIdRaw = sanitizeText(row.leaderDiscordId, 40);
  const leaderDiscordId = /^\d{5,30}$/.test(leaderDiscordIdRaw) ? leaderDiscordIdRaw : '';
  const leaderDiscordProfileUrl = sanitizeText(row.leaderDiscordProfileUrl, 2048);
  const validLeaderDiscordProfileUrl = /^https?:\/\/.+/i.test(leaderDiscordProfileUrl) ? leaderDiscordProfileUrl : '';
  const discordServerIdRaw = sanitizeText(row.discordServerId, 40);
  const discordServerId = /^\d{5,30}$/.test(discordServerIdRaw) ? discordServerIdRaw : '';
  return {
    leader: sanitizeText(row.leader, 120),
    leaderDiscordId,
    leaderDiscordProfileUrl: validLeaderDiscordProfileUrl,
    deputies,
    about: sanitizeText(row.about, 5000),
    discordServerId,
  };
}

function sanitizeDiscordWebhookUrl(value) {
  const url = sanitizeText(value, 2048);
  if (!url) return '';
  if (
    !/^https:\/\/(?:(?:discord(?:app)?\.com)|(?:ptb\.discord\.com)|(?:canary\.discord\.com))\/api(?:\/v\d+)?\/webhooks\/\d+\/[^/\s?]+\/?(?:\?.*)?$/i.test(
      url
    )
  ) {
    return '';
  }
  return url;
}

function normalizeFactionApplicationField(input) {
  const row = input && typeof input === 'object' ? input : {};
  const label = sanitizeText(row.label, 120);
  if (!label) return null;
  const type = sanitizeText(row.type, 20).toLowerCase();
  return {
    id: sanitizeText(row.id, 80) || crypto.randomUUID(),
    label,
    type: ['text', 'textarea', 'number', 'date'].includes(type) ? type : 'text',
    placeholder: sanitizeText(row.placeholder, 180),
    required: Boolean(row.required),
    maxLength: clampNumber(row.maxLength, 10, 4000, 240),
  };
}

function normalizeFactionApplication(input) {
  const row = input && typeof input === 'object' ? input : {};
  const title = sanitizeText(row.title, 120);
  const webhookUrl = sanitizeDiscordWebhookUrl(row.webhookUrl);
  const fields = Array.isArray(row.fields)
    ? row.fields.map((item) => normalizeFactionApplicationField(item)).filter(Boolean).slice(0, 30)
    : [];
  if (!title || !webhookUrl || !fields.length) return null;
  return {
    id: sanitizeText(row.id, 80) || crypto.randomUUID(),
    title,
    description: sanitizeText(row.description, 2000),
    webhookUrl,
    fields,
    createdAt: sanitizeText(row.createdAt, 80) || new Date().toISOString(),
    updatedAt: sanitizeText(row.updatedAt, 80) || new Date().toISOString(),
  };
}

function normalizeFactions(input) {
  if (!Array.isArray(input)) return [];

  return input
    .map((item) => {
      const id = sanitizeText(item.id, 80) || crypto.randomUUID();
      const name = sanitizeText(item.name, 80);
      if (!name) return null;

      const managerNames = normalizeFactionManagerNames(
        Array.isArray(item.managerNames)
          ? item.managerNames
          : Array.isArray(item.managers)
            ? item.managers
            : [ADMIN_DISCORD_USERNAME]
      );
      const managerIds = normalizeFactionManagerIds(item.managerIds);
      const createdByUserIdRaw = sanitizeText(item.createdByUserId || item.creatorId || managerIds[0], 80);
      const createdByUserId = /^\d{5,30}$/.test(createdByUserIdRaw) ? createdByUserIdRaw : '';

      return {
        id,
        name,
        avatarUrl: sanitizeUrl(item.avatarUrl),
        bannerUrl: sanitizeUrl(item.bannerUrl),
        createdAt: sanitizeText(item.createdAt, 80) || new Date().toISOString(),
        createdByUserId,
        managerIds,
        managerNames: managerNames.length ? managerNames : [ADMIN_DISCORD_USERNAME.toLowerCase()],
        profile: normalizeFactionProfile(item.profile),
        memos: Array.isArray(item.memos)
          ? item.memos.map((row) => normalizeFactionMemo(row)).filter(Boolean).slice(0, 120)
          : [],
        tests: Array.isArray(item.tests)
          ? item.tests.map((row) => normalizeFactionTest(row)).filter(Boolean).slice(0, 80)
          : [],
        rosters: Array.isArray(item.rosters)
          ? item.rosters.map((row) => normalizeFactionRoster(row)).filter(Boolean).slice(0, 80)
          : [],
        applications: Array.isArray(item.applications)
          ? item.applications.map((row) => normalizeFactionApplication(row)).filter(Boolean).slice(0, 80)
          : [],
      };
    })
    .filter(Boolean)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

function normalizeBotBuilderModules(input) {
  if (!Array.isArray(input)) return [];
  const picked = input
    .map((row) => sanitizeText(row, 40))
    .filter((id) => BOT_BUILDER_MODULE_IDS.includes(id));
  return Array.from(new Set(picked));
}

function normalizeBotProjectIdList(input, max = 30) {
  if (!Array.isArray(input)) return [];
  return Array.from(
    new Set(
      input
        .map((row) => sanitizeText(row, 40))
        .filter((row) => /^\d{5,30}$/.test(row))
        .slice(0, max)
    )
  );
}

function normalizeBotProjectQuestions(input) {
  const base = Array.isArray(input) ? input : [];
  const rows = base.map((row) => sanitizeText(row, 200)).filter(Boolean).slice(0, 5);
  const legacyDefaults = ['Ваш ник в игре', 'Ваш возраст', 'Почему хотите вступить в семью?'];
  if (rows.length === legacyDefaults.length && rows.every((row, index) => row === legacyDefaults[index])) {
    return [];
  }
  return rows;
}

function normalizeBotProjectFamilyApplications(input) {
  const row = input && typeof input === 'object' ? input : {};
  const style = sanitizeText(row.openButtonStyle, 20).toLowerCase();
  return {
    embedTitle: sanitizeText(row.embedTitle, 150) || 'Заявки в семью',
    embedDescription:
      sanitizeText(row.embedDescription, 4000) || 'Нажмите кнопку ниже и заполните форму заявки.',
    embedFooter: sanitizeText(row.embedFooter, 120) || 'Davis Project',
    publishChannelId: /^\d{5,30}$/.test(sanitizeText(row.publishChannelId, 40)) ? sanitizeText(row.publishChannelId, 40) : '',
    openButtonLabel: sanitizeText(row.openButtonLabel, 80) || 'Открыть форму',
    openButtonStyle: ['primary', 'secondary', 'success', 'danger'].includes(style) ? style : 'primary',
    questions: normalizeBotProjectQuestions(row.questions),
    ticketCategoryId: /^\d{5,30}$/.test(sanitizeText(row.ticketCategoryId, 40)) ? sanitizeText(row.ticketCategoryId, 40) : '',
    callChannelId: /^\d{5,30}$/.test(sanitizeText(row.callChannelId, 40)) ? sanitizeText(row.callChannelId, 40) : '',
    approveRoleIds: normalizeBotProjectIdList(row.approveRoleIds, 30),
    reviewerRoleIds: normalizeBotProjectIdList(row.reviewerRoleIds, 30),
  };
}

function normalizeBotProjectContractNames(input) {
  const hasArrayInput = Array.isArray(input);
  const selected = hasArrayInput ? input.map((row) => sanitizeText(row, 120)).filter(Boolean) : [];
  const allowed = new Set(BOT_BUILDER_CONTRACT_NAMES);
  const picked = Array.from(new Set(selected.filter((row) => allowed.has(row))));
  if (picked.length) return picked.slice(0, BOT_BUILDER_CONTRACT_NAMES.length);
  if (hasArrayInput) return [];
  return BOT_BUILDER_CONTRACT_NAMES.slice();
}

function normalizeBotProjectContracts(input) {
  const row = input && typeof input === 'object' ? input : {};
  const style = sanitizeText(row.openButtonStyle, 20).toLowerCase();
  return {
    embedTitle: sanitizeText(row.embedTitle, 150) || 'Отчеты по контрактам',
    embedDescription:
      sanitizeText(row.embedDescription, 4000) ||
      'Выберите контракт, прикрепите скриншот выполнения и отправьте отчет.',
    embedFooter: sanitizeText(row.embedFooter, 120) || 'Davis Project',
    publishChannelId: /^\d{5,30}$/.test(sanitizeText(row.publishChannelId, 40)) ? sanitizeText(row.publishChannelId, 40) : '',
    reportChannelId: /^\d{5,30}$/.test(sanitizeText(row.reportChannelId, 40)) ? sanitizeText(row.reportChannelId, 40) : '',
    openButtonLabel: sanitizeText(row.openButtonLabel, 80) || 'Отправить отчет',
    openButtonStyle: ['primary', 'secondary', 'success', 'danger'].includes(style) ? style : 'primary',
    selectedContracts: normalizeBotProjectContractNames(row.selectedContracts),
    reviewerRoleIds: normalizeBotProjectIdList(row.reviewerRoleIds, 30),
  };
}

function normalizeBotProjectCloud(input) {
  const row = input && typeof input === 'object' ? input : {};
  const connectedRaw = Boolean(row.connected);
  const connectedAt = sanitizeText(row.connectedAt, 80);
  const botUserId = sanitizeText(row.botUserId, 40);
  return {
    connected: connectedRaw,
    autoSync: row.autoSync !== false,
    connectedAt: connectedRaw ? connectedAt || new Date().toISOString() : '',
    lastSyncedAt: sanitizeText(row.lastSyncedAt, 80),
    lastSyncError: sanitizeText(row.lastSyncError, 240),
    botUserId: /^\d{5,30}$/.test(botUserId) ? botUserId : '',
    botUsername: sanitizeText(row.botUsername, 120),
  };
}

function normalizeBotFamilyApplicationStatus(input) {
  const value = sanitizeText(input, 20).toLowerCase();
  if (['approved', 'rejected', 'review', 'call'].includes(value)) return value;
  return 'new';
}

function normalizeBotFamilyApplicationAnswers(input) {
  if (!Array.isArray(input)) return [];
  return input
    .map((row) => {
      const item = row && typeof row === 'object' ? row : {};
      const question = sanitizeText(item.question, 256);
      const answer = sanitizeText(item.answer, 1000);
      if (!question) return null;
      return { question, answer: answer || '—' };
    })
    .filter(Boolean)
    .slice(0, 12);
}

function normalizeBotFamilyApplication(input, projectIdFallback = '') {
  const row = input && typeof input === 'object' ? input : {};
  const projectId = sanitizeText(row.projectId, 80) || sanitizeText(projectIdFallback, 80);
  const id = sanitizeText(row.id, 80) || crypto.randomUUID();
  if (!projectId) return null;

  const createdAt = sanitizeText(row.createdAt, 80) || new Date().toISOString();
  const updatedAt = sanitizeText(row.updatedAt, 80) || createdAt;
  const applicantDiscordId = sanitizeText(row.applicantDiscordId, 40);
  const discordGuildId = sanitizeText(row.discordGuildId, 40);
  const callChannelId = sanitizeText(row.callChannelId, 40);

  return {
    id,
    projectId,
    applicantName: sanitizeText(row.applicantName, 120) || 'Не указан',
    applicantDiscordId: /^\d{5,30}$/.test(applicantDiscordId) ? applicantDiscordId : '',
    answers: normalizeBotFamilyApplicationAnswers(row.answers),
    status: normalizeBotFamilyApplicationStatus(row.status),
    createdAt,
    updatedAt,
    sourceSessionUserId: sanitizeText(row.sourceSessionUserId, 80),
    reviewedBy: sanitizeText(row.reviewedBy, 120),
    reviewedByUserId: sanitizeText(row.reviewedByUserId, 80),
    reviewNote: sanitizeText(row.reviewNote, 280),
    callChannelId: /^\d{5,30}$/.test(callChannelId) ? callChannelId : '',
    discordGuildId: /^\d{5,30}$/.test(discordGuildId) ? discordGuildId : '',
    discordChannelId: /^\d{5,30}$/.test(sanitizeText(row.discordChannelId, 40))
      ? sanitizeText(row.discordChannelId, 40)
      : '',
    discordMessageId: /^\d{5,30}$/.test(sanitizeText(row.discordMessageId, 40))
      ? sanitizeText(row.discordMessageId, 40)
      : '',
  };
}

function normalizeBotFamilyApplicationsStore(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
  const output = {};
  Object.entries(input).forEach(([projectIdRaw, listRaw]) => {
    const projectId = sanitizeText(projectIdRaw, 80);
    if (!projectId) return;
    const list = Array.isArray(listRaw) ? listRaw : [];
    const normalized = list
      .map((row) => normalizeBotFamilyApplication(row, projectId))
      .filter(Boolean)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .slice(0, 1000);
    output[projectId] = normalized;
  });
  return output;
}

function normalizeBotContractReportStatus(input) {
  const value = sanitizeText(input, 20).toLowerCase();
  if (['approved', 'rejected'].includes(value)) return value;
  return 'new';
}

function normalizeBotContractReport(input, projectIdFallback = '') {
  const row = input && typeof input === 'object' ? input : {};
  const projectId = sanitizeText(row.projectId, 80) || sanitizeText(projectIdFallback, 80);
  const id = sanitizeText(row.id, 80) || crypto.randomUUID();
  if (!projectId) return null;

  const createdAt = sanitizeText(row.createdAt, 80) || new Date().toISOString();
  const updatedAt = sanitizeText(row.updatedAt, 80) || createdAt;
  const applicantDiscordId = sanitizeText(row.applicantDiscordId, 40);
  const discordGuildId = sanitizeText(row.discordGuildId, 40);
  const discordChannelId = sanitizeText(row.discordChannelId, 40);
  const discordMessageId = sanitizeText(row.discordMessageId, 40);

  return {
    id,
    projectId,
    applicantName: sanitizeText(row.applicantName, 120) || 'Не указан',
    applicantDiscordId: /^\d{5,30}$/.test(applicantDiscordId) ? applicantDiscordId : '',
    contractName: sanitizeText(row.contractName, 120) || 'Не указан',
    comment: sanitizeText(row.comment, 1600),
    screenshotUrl: sanitizeText(row.screenshotUrl, 2000),
    status: normalizeBotContractReportStatus(row.status),
    sourceSessionUserId: sanitizeText(row.sourceSessionUserId, 80),
    reviewedBy: sanitizeText(row.reviewedBy, 120),
    reviewedByUserId: sanitizeText(row.reviewedByUserId, 80),
    discordGuildId: /^\d{5,30}$/.test(discordGuildId) ? discordGuildId : '',
    discordChannelId: /^\d{5,30}$/.test(discordChannelId) ? discordChannelId : '',
    discordMessageId: /^\d{5,30}$/.test(discordMessageId) ? discordMessageId : '',
    createdAt,
    updatedAt,
  };
}

function normalizeBotContractReportsStore(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
  const output = {};
  Object.entries(input).forEach(([projectIdRaw, listRaw]) => {
    const projectId = sanitizeText(projectIdRaw, 80);
    if (!projectId) return;
    const list = Array.isArray(listRaw) ? listRaw : [];
    const normalized = list
      .map((row) => normalizeBotContractReport(row, projectId))
      .filter(Boolean)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .slice(0, 2000);
    output[projectId] = normalized;
  });
  return output;
}

function normalizeBotProjectSecretsStore(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
  const output = {};

  Object.entries(input).forEach(([userIdRaw, projectsRaw]) => {
    const userId = sanitizeText(userIdRaw, 80);
    if (!/^\d{5,30}$/.test(userId)) return;
    if (!projectsRaw || typeof projectsRaw !== 'object' || Array.isArray(projectsRaw)) return;

    const byProject = {};
    Object.entries(projectsRaw).forEach(([projectIdRaw, row]) => {
      const projectId = sanitizeText(projectIdRaw, 80);
      if (!projectId || !row || typeof row !== 'object') return;
      const botTokenEnc = sanitizeText(row.botTokenEnc, 5000);
      if (!botTokenEnc) return;

      byProject[projectId] = {
        botTokenEnc,
        updatedAt: sanitizeText(row.updatedAt, 80) || new Date().toISOString(),
      };
    });

    if (Object.keys(byProject).length) {
      output[userId] = byProject;
    }
  });

  return output;
}

function getBotProjectTokenCryptoKey() {
  return crypto.createHash('sha256').update(String(SESSION_SECRET || 'davis-project-local-secret')).digest();
}

function encryptBotProjectToken(rawToken) {
  const token = sanitizeText(rawToken, 2000);
  if (!token) return '';
  try {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', getBotProjectTokenCryptoKey(), iv);
    const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return `${iv.toString('base64url')}.${authTag.toString('base64url')}.${encrypted.toString('base64url')}`;
  } catch {
    return '';
  }
}

function decryptBotProjectToken(payload) {
  const value = sanitizeText(payload, 5000);
  if (!value) return '';
  const parts = value.split('.');
  if (parts.length !== 3) return '';
  try {
    const [ivRaw, tagRaw, encryptedRaw] = parts;
    const iv = Buffer.from(ivRaw, 'base64url');
    const authTag = Buffer.from(tagRaw, 'base64url');
    const encrypted = Buffer.from(encryptedRaw, 'base64url');
    const decipher = crypto.createDecipheriv('aes-256-gcm', getBotProjectTokenCryptoKey(), iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return sanitizeText(decrypted.toString('utf8'), 2000);
  } catch {
    return '';
  }
}

function saveBotProjectSecretsStore() {
  writeJSON(BOT_PROJECT_SECRETS_FILE, botProjectSecretsStore);
}

function getBotProjectSecret(userIdInput, projectIdInput) {
  const userId = sanitizeText(userIdInput, 80);
  const projectId = sanitizeText(projectIdInput, 80);
  if (!/^\d{5,30}$/.test(userId) || !projectId) return null;
  const userRows = botProjectSecretsStore[userId];
  if (!userRows || typeof userRows !== 'object') return null;
  const row = userRows[projectId];
  if (!row || typeof row !== 'object') return null;
  return row;
}

function getBotProjectStoredToken(userIdInput, projectIdInput) {
  const row = getBotProjectSecret(userIdInput, projectIdInput);
  if (!row || !row.botTokenEnc) return '';
  return decryptBotProjectToken(row.botTokenEnc);
}

function setBotProjectStoredToken(userIdInput, projectIdInput, botTokenInput) {
  const userId = sanitizeText(userIdInput, 80);
  const projectId = sanitizeText(projectIdInput, 80);
  if (!/^\d{5,30}$/.test(userId) || !projectId) return false;
  const encrypted = encryptBotProjectToken(botTokenInput);
  if (!encrypted) return false;
  if (!botProjectSecretsStore[userId] || typeof botProjectSecretsStore[userId] !== 'object') {
    botProjectSecretsStore[userId] = {};
  }
  botProjectSecretsStore[userId][projectId] = {
    botTokenEnc: encrypted,
    updatedAt: new Date().toISOString(),
  };
  saveBotProjectSecretsStore();
  return true;
}

function removeBotProjectStoredToken(userIdInput, projectIdInput) {
  const userId = sanitizeText(userIdInput, 80);
  const projectId = sanitizeText(projectIdInput, 80);
  if (!/^\d{5,30}$/.test(userId) || !projectId) return;
  if (!botProjectSecretsStore[userId] || typeof botProjectSecretsStore[userId] !== 'object') return;
  delete botProjectSecretsStore[userId][projectId];
  if (!Object.keys(botProjectSecretsStore[userId]).length) {
    delete botProjectSecretsStore[userId];
  }
  saveBotProjectSecretsStore();
}

async function fetchDiscordBotApi(botTokenInput, url, options = {}) {
  const botToken = sanitizeText(botTokenInput, 2000);
  if (!botToken) {
    return { ok: false, status: 401, data: null, raw: '', message: 'Требуется BOT_TOKEN.' };
  }

  try {
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers: {
        Authorization: `Bot ${botToken}`,
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(options.headers || {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const raw = await response.text().catch(() => '');
    let data = null;
    if (raw) {
      try {
        data = JSON.parse(raw);
      } catch {
        data = null;
      }
    }

    return {
      ok: response.ok,
      status: response.status,
      data,
      raw,
      message: sanitizeText(data?.message || raw, 220),
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      data: null,
      raw: '',
      message: sanitizeText(error.message, 220) || 'Ошибка сети.',
    };
  }
}

function formatDiscordApiError(response) {
  if (!response) return 'Неизвестная ошибка Discord API.';
  if (response.message) return `Discord API вернул ошибку: ${response.message}`;
  if (response.status) return `Discord API вернул HTTP ${response.status}.`;
  return 'Не удалось выполнить запрос к Discord API.';
}

function findBotProjectContext(userIdInput, projectIdInput) {
  const userId = sanitizeText(userIdInput, 80);
  const projectId = sanitizeText(projectIdInput, 80);
  const projects = getBotProjectsForUser(userId);
  const index = projects.findIndex((row) => row.id === projectId);
  if (index === -1) return null;
  return {
    userId,
    projectId,
    projects,
    index,
    project: projects[index],
  };
}

function saveBotProjectContext(context, project) {
  if (!context || !project) return null;
  const normalized = normalizeBotProject(project);
  if (!normalized) return null;
  context.projects[context.index] = normalized;
  botProjectsStore[context.userId] = context.projects.slice(0, 120);
  saveBotProjectsStore();
  return normalized;
}

function findBotProjectByIdGlobal(projectIdInput) {
  const projectId = sanitizeText(projectIdInput, 80);
  if (!projectId) return null;
  const entries = Object.entries(botProjectsStore || {});
  for (const [ownerUserId, list] of entries) {
    if (!Array.isArray(list)) continue;
    const project = list.find((row) => row && row.id === projectId);
    if (project) {
      return { ownerUserId, project };
    }
  }
  return null;
}

const botProjectCloudSyncInFlight = new Map();
const botDiscordGatewaySessions = new Map();
let botDiscordGatewaySyncTimer = null;

function getBotDiscordGatewayTokenKey(botTokenInput) {
  const botToken = sanitizeText(botTokenInput, 2000);
  if (!botToken) return '';
  return crypto.createHash('sha256').update(botToken).digest('hex');
}

function collectDesiredBotDiscordGatewaySessions() {
  const desired = new Map();
  Object.entries(botProjectsStore || {}).forEach(([ownerUserIdRaw, rows]) => {
    const ownerUserId = sanitizeText(ownerUserIdRaw, 80);
    if (!/^\d{5,30}$/.test(ownerUserId) || !Array.isArray(rows)) return;
    rows.forEach((row) => {
      const project = normalizeBotProject(row);
      if (!project) return;
      const cloud = normalizeBotProjectCloud(project.cloud);
      if (!cloud.connected) return;
      const botToken = getBotProjectStoredToken(ownerUserId, project.id);
      const key = getBotDiscordGatewayTokenKey(botToken);
      if (!key) return;
      const existing = desired.get(key) || {
        key,
        botToken,
        projectRefs: [],
      };
      existing.projectRefs.push({
        ownerUserId,
        projectId: project.id,
      });
      desired.set(key, existing);
    });
  });
  return desired;
}

function getDiscordGatewayConnectUrl(session) {
  const resumeGatewayUrl = sanitizeText(session?.resumeGatewayUrl, 220);
  if (!resumeGatewayUrl) return DISCORD_GATEWAY_URL;
  const base = resumeGatewayUrl.replace(/\/+$/, '');
  return `${base}/?v=10&encoding=json`;
}

async function getGatewayMessageRaw(data) {
  if (typeof data === 'string') return data;
  if (Buffer.isBuffer(data)) return data.toString('utf8');
  if (data instanceof ArrayBuffer) return Buffer.from(data).toString('utf8');
  if (ArrayBuffer.isView(data)) return Buffer.from(data.buffer).toString('utf8');
  if (data && typeof data.text === 'function') {
    try {
      return await data.text();
    } catch {
      return '';
    }
  }
  return '';
}

function sendGatewayPayload(session, payload) {
  if (!session?.ws || session.ws.readyState !== WebSocket.OPEN) return;
  try {
    session.ws.send(JSON.stringify(payload || {}));
  } catch {
    // ignore send errors, reconnect flow handles it
  }
}

function sendGatewayHeartbeat(session) {
  const seq = Number.isFinite(session?.seq) ? session.seq : null;
  sendGatewayPayload(session, { op: 1, d: seq });
}

function clearGatewayTimers(session) {
  if (!session) return;
  if (session.heartbeatTimer) {
    clearInterval(session.heartbeatTimer);
    session.heartbeatTimer = null;
  }
  if (session.heartbeatKickoffTimer) {
    clearTimeout(session.heartbeatKickoffTimer);
    session.heartbeatKickoffTimer = null;
  }
  if (session.reconnectTimer) {
    clearTimeout(session.reconnectTimer);
    session.reconnectTimer = null;
  }
}

function scheduleGatewayReconnect(session, reason = 'close') {
  if (!session || session.stopRequested) return;
  if (session.reconnectTimer) return;
  session.reconnectAttempts = Number(session.reconnectAttempts || 0) + 1;
  const delay = Math.min(60_000, 3000 * session.reconnectAttempts);
  session.reconnectTimer = setTimeout(() => {
    session.reconnectTimer = null;
    connectBotDiscordGatewaySession(session, `reconnect:${reason}`);
  }, delay);
  if (typeof session.reconnectTimer.unref === 'function') {
    session.reconnectTimer.unref();
  }
}

function stopBotDiscordGatewaySession(session, reason = 'stop') {
  if (!session) return;
  session.stopRequested = true;
  clearGatewayTimers(session);
  if (session.ws && session.ws.readyState === WebSocket.OPEN) {
    try {
      session.ws.close(1000, reason.slice(0, 120));
    } catch {
      // ignore close errors
    }
  } else if (session.ws && session.ws.readyState === WebSocket.CONNECTING) {
    try {
      session.ws.close();
    } catch {
      // ignore close errors
    }
  }
  session.ws = null;
}

async function handleBotDiscordGatewayInteraction(session, interactionPayload) {
  const interaction = interactionPayload && typeof interactionPayload === 'object' ? interactionPayload : {};
  if (Number(interaction.type) !== 3) return;
  const customId = sanitizeText(interaction?.data?.custom_id, 120);
  const componentType = Number(interaction?.data?.component_type);
  const actionParsed = parseBotFamilyActionCustomId(customId);
  const callSelectParsed = parseBotFamilyCallSelectCustomId(customId);
  const contractActionParsed = parseBotContractActionCustomId(customId);
  if (!actionParsed && !callSelectParsed && !contractActionParsed) return;

  const interactionId = sanitizeText(interaction.id, 80);
  const interactionToken = sanitizeText(interaction.token, 240);
  const interactionAppId = sanitizeText(interaction.application_id, 80);

  const member = interaction.member && typeof interaction.member === 'object' ? interaction.member : {};
  const user = member.user && typeof member.user === 'object' ? member.user : interaction.user || {};
  const reviewerUserId = sanitizeText(user.id, 80);
  const reviewerName =
    sanitizeText(member.nick, 120) ||
    sanitizeText(user.global_name, 120) ||
    sanitizeText(user.username, 120) ||
    'Модератор Discord';
  const reviewerRoleIds = Array.isArray(member.roles) ? member.roles : [];

  if (contractActionParsed) {
    await sendDiscordInteractionCallback(interactionId, interactionToken, { type: 6 });
    const contractResult = await processBotContractReportAction({
      projectIdInput: contractActionParsed.projectId,
      reportIdInput: contractActionParsed.reportId,
      actionInput: contractActionParsed.action,
      reviewerNameInput: reviewerName,
      reviewerUserIdInput: reviewerUserId,
      reviewerRoleIdsInput: reviewerRoleIds,
      botTokenOverride: session.botToken,
    });
    const contractText = contractResult.ok
      ? `Готово: ${contractResult.statusText || 'статус обновлен'}.`
      : `Ошибка: ${sanitizeText(contractResult.message, 160) || 'не удалось обработать действие.'}`;
    await sendDiscordInteractionFollowup(interactionAppId, interactionToken, contractText);
    return;
  }

  if (actionParsed && actionParsed.action === 'call' && componentType === 2) {
    const openSelectorResponse = await sendDiscordInteractionCallback(interactionId, interactionToken, {
      type: 4,
      data: {
        content: 'Выберите голосовой канал для обзвона.',
        flags: 64,
        components: [
          {
            type: 1,
            components: [
              {
                type: 8,
                custom_id: buildBotFamilyCallSelectCustomId({
                  projectId: actionParsed.projectId,
                  applicationId: actionParsed.applicationId,
                }),
                placeholder: 'Выберите голосовой канал',
                min_values: 1,
                max_values: 1,
                channel_types: [2, 13],
              },
            ],
          },
        ],
      },
    });
    if (!openSelectorResponse.ok) {
      await sendDiscordInteractionFollowup(
        interactionAppId,
        interactionToken,
        'Не удалось открыть выбор канала. Попробуйте снова.'
      );
    }
    return;
  }

  await sendDiscordInteractionCallback(interactionId, interactionToken, { type: 6 });

  const selectedChannelId =
    callSelectParsed && componentType === 8 && Array.isArray(interaction?.data?.values)
      ? sanitizeText(interaction.data.values[0], 40)
      : '';

  const target = actionParsed
    ? {
        action: actionParsed.action,
        projectId: actionParsed.projectId,
        applicationId: actionParsed.applicationId,
      }
    : callSelectParsed
    ? {
        action: 'call',
        projectId: callSelectParsed.projectId,
        applicationId: callSelectParsed.applicationId,
      }
    : null;
  if (!target) return;

  const result = await processBotFamilyApplicationAction({
    projectIdInput: target.projectId,
    applicationIdInput: target.applicationId,
    actionInput: target.action,
    reviewerNameInput: reviewerName,
    reviewerUserIdInput: reviewerUserId,
    reviewerRoleIdsInput: reviewerRoleIds,
    selectedCallChannelIdInput: selectedChannelId,
    botTokenOverride: session.botToken,
  });

  const text = result.ok
    ? `Готово: ${result.statusText || 'статус обновлен'}.`
    : `Ошибка: ${sanitizeText(result.message, 160) || 'не удалось обработать действие.'}`;
  await sendDiscordInteractionFollowup(interactionAppId, interactionToken, text);
}

async function handleBotDiscordGatewayDispatch(session, payload) {
  const eventName = sanitizeText(payload?.t, 60);
  const data = payload?.d && typeof payload.d === 'object' ? payload.d : {};
  if (eventName === 'READY') {
    session.sessionId = sanitizeText(data.session_id, 120);
    session.resumeGatewayUrl = sanitizeText(data.resume_gateway_url, 220);
    session.reconnectAttempts = 0;
    return;
  }
  if (eventName === 'RESUMED') {
    session.reconnectAttempts = 0;
    return;
  }
  if (eventName === 'INTERACTION_CREATE') {
    await handleBotDiscordGatewayInteraction(session, data);
  }
}

async function handleBotDiscordGatewayMessage(session, raw) {
  if (!session || !raw) return;
  let payload = null;
  try {
    payload = JSON.parse(raw);
  } catch {
    return;
  }
  if (!payload || typeof payload !== 'object') return;
  if (Number.isFinite(payload.s)) {
    session.seq = payload.s;
  }

  const op = Number(payload.op);
  if (op === 10) {
    const heartbeatInterval = Math.max(5000, Number(payload?.d?.heartbeat_interval) || 45000);
    if (session.heartbeatTimer) clearInterval(session.heartbeatTimer);
    if (session.heartbeatKickoffTimer) clearTimeout(session.heartbeatKickoffTimer);
    session.heartbeatKickoffTimer = setTimeout(() => {
      sendGatewayHeartbeat(session);
      session.heartbeatTimer = setInterval(() => {
        sendGatewayHeartbeat(session);
      }, heartbeatInterval);
      if (typeof session.heartbeatTimer.unref === 'function') {
        session.heartbeatTimer.unref();
      }
    }, Math.floor(Math.random() * Math.min(heartbeatInterval, 4000)));

    if (session.sessionId && Number.isFinite(session.seq)) {
      sendGatewayPayload(session, {
        op: 6,
        d: {
          token: session.botToken,
          session_id: session.sessionId,
          seq: session.seq,
        },
      });
    } else {
      sendGatewayPayload(session, {
        op: 2,
        d: {
          token: session.botToken,
          intents: 0,
          properties: {
            os: process.platform,
            browser: 'davis-project',
            device: 'davis-project',
          },
          compress: false,
        },
      });
    }
    return;
  }

  if (op === 11) {
    session.lastHeartbeatAckAt = Date.now();
    return;
  }

  if (op === 1) {
    sendGatewayHeartbeat(session);
    return;
  }

  if (op === 7) {
    if (session.ws && session.ws.readyState === WebSocket.OPEN) {
      try {
        session.ws.close(4000, 'gateway_reconnect');
      } catch {
        // ignore close errors
      }
    }
    return;
  }

  if (op === 9) {
    session.sessionId = '';
    session.resumeGatewayUrl = '';
    setTimeout(() => {
      sendGatewayPayload(session, {
        op: 2,
        d: {
          token: session.botToken,
          intents: 0,
          properties: {
            os: process.platform,
            browser: 'davis-project',
            device: 'davis-project',
          },
          compress: false,
        },
      });
    }, 1200);
    return;
  }

  if (op === 0) {
    await handleBotDiscordGatewayDispatch(session, payload);
  }
}

function connectBotDiscordGatewaySession(session, reason = 'connect') {
  if (!session || session.stopRequested || typeof WebSocket !== 'function') return;
  if (session.ws && (session.ws.readyState === WebSocket.OPEN || session.ws.readyState === WebSocket.CONNECTING)) {
    return;
  }

  const connectUrl = getDiscordGatewayConnectUrl(session);
  session.lastConnectReason = reason;
  const ws = new WebSocket(connectUrl);
  session.ws = ws;

  ws.addEventListener('open', () => {
    session.lastError = '';
  });

  ws.addEventListener('message', (event) => {
    void (async () => {
      const raw = await getGatewayMessageRaw(event?.data);
      await handleBotDiscordGatewayMessage(session, raw);
    })();
  });

  ws.addEventListener('error', (error) => {
    session.lastError = sanitizeText(error?.message, 240) || 'Ошибка WebSocket Discord Gateway.';
  });

  ws.addEventListener('close', (event) => {
    session.ws = null;
    if (session.heartbeatTimer) {
      clearInterval(session.heartbeatTimer);
      session.heartbeatTimer = null;
    }
    if (session.heartbeatKickoffTimer) {
      clearTimeout(session.heartbeatKickoffTimer);
      session.heartbeatKickoffTimer = null;
    }
    if (session.stopRequested) return;
    const closeReason = sanitizeText(event?.reason, 120) || `code:${Number(event?.code) || 0}`;
    scheduleGatewayReconnect(session, closeReason);
  });
}

async function syncBotGatewaySessions(reason = 'sync') {
  if (typeof WebSocket !== 'function') return;
  const desired = collectDesiredBotDiscordGatewaySessions();

  for (const [key, session] of botDiscordGatewaySessions.entries()) {
    if (!desired.has(key)) {
      stopBotDiscordGatewaySession(session, `sync-remove:${reason}`);
      botDiscordGatewaySessions.delete(key);
    }
  }

  for (const [key, target] of desired.entries()) {
    const existing = botDiscordGatewaySessions.get(key);
    if (existing) {
      existing.projectRefs = target.projectRefs.slice(0, 200);
      continue;
    }

    const session = {
      key,
      botToken: target.botToken,
      projectRefs: target.projectRefs.slice(0, 200),
      ws: null,
      stopRequested: false,
      reconnectAttempts: 0,
      reconnectTimer: null,
      heartbeatTimer: null,
      heartbeatKickoffTimer: null,
      sessionId: '',
      resumeGatewayUrl: '',
      seq: null,
      lastError: '',
      lastConnectReason: reason,
      lastHeartbeatAckAt: 0,
    };
    botDiscordGatewaySessions.set(key, session);
    connectBotDiscordGatewaySession(session, `sync-add:${reason}`);
  }
}

function startBotGatewaySyncLoop() {
  if (typeof WebSocket !== 'function') return;
  void syncBotGatewaySessions('startup');
  if (botDiscordGatewaySyncTimer) clearInterval(botDiscordGatewaySyncTimer);
  botDiscordGatewaySyncTimer = setInterval(() => {
    void syncBotGatewaySessions('interval');
  }, DISCORD_GATEWAY_SYNC_INTERVAL_MS);
  if (typeof botDiscordGatewaySyncTimer.unref === 'function') {
    botDiscordGatewaySyncTimer.unref();
  }
}

async function syncBotProjectCloudNow(userIdInput, projectIdInput, reason = 'manual') {
  const context = findBotProjectContext(userIdInput, projectIdInput);
  if (!context) {
    return { ok: false, message: 'Бот не найден.' };
  }

  const project = context.project;
  const cloud = normalizeBotProjectCloud(project.cloud);
  if (!cloud.connected) {
    return { ok: false, message: 'Облачный режим не подключен.' };
  }

  const botToken = getBotProjectStoredToken(context.userId, context.projectId);
  if (!botToken) {
    const updated = saveBotProjectContext(context, {
      ...project,
      cloud: {
        ...cloud,
        connected: false,
        lastSyncError: 'Сохраненный BOT_TOKEN не найден. Подключите бота снова.',
      },
      updatedAt: new Date().toISOString(),
    });
    return {
      ok: false,
      message: 'Сохраненный BOT_TOKEN не найден. Подключите бота снова.',
      project: updated || project,
    };
  }

  const meResponse = await fetchDiscordBotApi(botToken, 'https://discord.com/api/v10/users/@me');
  if (!meResponse.ok) {
    const shouldDisconnect = meResponse.status === 401;
    const updated = saveBotProjectContext(context, {
      ...project,
      cloud: {
        ...cloud,
        connected: shouldDisconnect ? false : cloud.connected,
        lastSyncError: formatDiscordApiError(meResponse),
      },
      updatedAt: new Date().toISOString(),
    });
    return {
      ok: false,
      message: formatDiscordApiError(meResponse),
      project: updated || project,
    };
  }

  let syncError = '';
  const contracts = normalizeBotProjectContracts(project.contracts);
  const channelsToCheck = [
    {
      id: sanitizeText(project.familyApplications?.publishChannelId, 40),
      label: 'канал публикации заявок',
    },
    {
      id: sanitizeText(contracts.publishChannelId, 40),
      label: 'канал публикации контрактов',
    },
    {
      id: sanitizeText(contracts.reportChannelId, 40),
      label: 'канал отчетов по контрактам',
    },
  ].filter((row) => /^\d{5,30}$/.test(row.id));

  const checkedChannelIds = new Set();
  for (const channelRow of channelsToCheck) {
    if (checkedChannelIds.has(channelRow.id)) continue;
    checkedChannelIds.add(channelRow.id);
    const channelResponse = await fetchDiscordBotApi(
      botToken,
      `https://discord.com/api/v10/channels/${channelRow.id}`
    );
    if (!channelResponse.ok) {
      syncError = `Проверка (${channelRow.label}): ${formatDiscordApiError(channelResponse)}`;
      break;
    }
  }

  const me = meResponse.data && typeof meResponse.data === 'object' ? meResponse.data : {};
  const now = new Date().toISOString();
  const updated = saveBotProjectContext(context, {
    ...project,
    cloud: {
      ...cloud,
      connected: true,
      botUserId: /^\d{5,30}$/.test(sanitizeText(me.id, 40)) ? sanitizeText(me.id, 40) : cloud.botUserId,
      botUsername: sanitizeText(me.username, 120) || cloud.botUsername,
      connectedAt: cloud.connectedAt || now,
      lastSyncedAt: syncError ? cloud.lastSyncedAt : now,
      lastSyncError: syncError,
    },
    updatedAt: now,
  });

  if (syncError) {
    return {
      ok: false,
      message: syncError,
      project: updated || project,
      reason,
    };
  }

  return {
    ok: true,
    message: 'Синхронизация выполнена.',
    project: updated || project,
    reason,
  };
}

function queueBotProjectCloudSync(userIdInput, projectIdInput, reason = 'auto') {
  const userId = sanitizeText(userIdInput, 80);
  const projectId = sanitizeText(projectIdInput, 80);
  const key = `${userId}:${projectId}`;
  if (botProjectCloudSyncInFlight.has(key)) {
    return botProjectCloudSyncInFlight.get(key);
  }
  const task = syncBotProjectCloudNow(userId, projectId, reason).finally(() => {
    botProjectCloudSyncInFlight.delete(key);
  });
  botProjectCloudSyncInFlight.set(key, task);
  return task;
}

function mapFamilyButtonStyleToDiscordStyle(style) {
  switch (sanitizeText(style, 20).toLowerCase()) {
    case 'secondary':
      return 2;
    case 'success':
      return 3;
    case 'danger':
      return 4;
    case 'primary':
    default:
      return 1;
  }
}

function buildDiscordBotInviteUrl(clientIdInput, guildIdInput = '') {
  const clientId = sanitizeText(clientIdInput, 40);
  if (!/^\d{5,30}$/.test(clientId)) return '';
  const guildId = sanitizeText(guildIdInput, 40);
  const params = new URLSearchParams({
    client_id: clientId,
    permissions: '8',
    scope: 'bot applications.commands',
  });
  if (/^\d{5,30}$/.test(guildId)) {
    params.set('guild_id', guildId);
    params.set('disable_guild_select', 'true');
  }
  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}

function isWindowsReservedProjectName(name) {
  return /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/i.test(String(name || ''));
}

function sanitizeBotProjectFolderName(input, fallbackName = 'davis-discord-bot') {
  const source = sanitizeSlug(input).replace(/^-+|-+$/g, '').slice(0, 64);
  const fallback = sanitizeSlug(fallbackName).replace(/^-+|-+$/g, '').slice(0, 64);
  let result = source || fallback || `bot-${Date.now().toString(36)}`;
  if (isWindowsReservedProjectName(result)) {
    result = `bot-${Date.now().toString(36)}`;
  }
  return result;
}

function normalizeBotProject(input) {
  const row = input && typeof input === 'object' ? input : {};
  const id = sanitizeText(row.id, 80) || crypto.randomUUID();
  const name = sanitizeText(row.name, 80);
  if (!name) return null;

  const createdAt = sanitizeText(row.createdAt, 80) || new Date().toISOString();
  const updatedAt = sanitizeText(row.updatedAt, 80) || new Date().toISOString();
  const rawPrefix = sanitizeText(row.prefix, 8);
  const prefix = (rawPrefix || '!').slice(0, 4) || '!';

  return {
    id,
    name,
    folderName: sanitizeBotProjectFolderName(row.folderName, name),
    botType: sanitizeText(row.botType, 20) === 'faction' ? 'faction' : 'family',
    prefix,
    modules: normalizeBotBuilderModules(row.modules),
    clientId: /^\d{5,30}$/.test(sanitizeText(row.clientId, 40)) ? sanitizeText(row.clientId, 40) : '',
    guildId: /^\d{5,30}$/.test(sanitizeText(row.guildId, 40)) ? sanitizeText(row.guildId, 40) : '',
    familyApplications: normalizeBotProjectFamilyApplications(row.familyApplications),
    contracts: normalizeBotProjectContracts(row.contracts),
    cloud: normalizeBotProjectCloud(row.cloud),
    createdAt,
    updatedAt,
  };
}

function normalizeBotProjectsStore(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
  const output = {};
  Object.entries(input).forEach(([userIdRaw, listRaw]) => {
    const userId = sanitizeText(userIdRaw, 80);
    if (!/^\d{5,30}$/.test(userId)) return;
    const list = Array.isArray(listRaw) ? listRaw : [];
    const normalized = list
      .map((row) => normalizeBotProject(row))
      .filter(Boolean)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .slice(0, 120);
    output[userId] = normalized;
  });
  return output;
}

function saveBotProjectsStore() {
  writeJSON(BOT_PROJECTS_FILE, botProjectsStore);
}

function getBotProjectsForUser(userIdInput) {
  const userId = sanitizeText(userIdInput, 80);
  if (!/^\d{5,30}$/.test(userId)) return [];
  if (!Array.isArray(botProjectsStore[userId])) {
    botProjectsStore[userId] = [];
  }
  return botProjectsStore[userId];
}

function withBotProjectSecretFlags(userIdInput, projectsInput) {
  const userId = sanitizeText(userIdInput, 80);
  const list = Array.isArray(projectsInput) ? projectsInput : [];
  return list.map((project) => {
    if (!project || typeof project !== 'object') return project;
    return {
      ...project,
      hasStoredToken: Boolean(getBotProjectStoredToken(userId, project.id)),
    };
  });
}

function saveBotFamilyApplicationsStore() {
  writeJSON(BOT_FAMILY_APPLICATIONS_FILE, botFamilyApplicationsStore);
}

function getBotFamilyApplicationsForProject(projectIdInput) {
  const projectId = sanitizeText(projectIdInput, 80);
  if (!projectId) return [];
  if (!Array.isArray(botFamilyApplicationsStore[projectId])) {
    botFamilyApplicationsStore[projectId] = [];
  }
  return botFamilyApplicationsStore[projectId];
}

function upsertBotFamilyApplication(projectIdInput, applicationInput) {
  const projectId = sanitizeText(projectIdInput, 80);
  if (!projectId) return null;
  const normalized = normalizeBotFamilyApplication(applicationInput, projectId);
  if (!normalized) return null;
  const list = getBotFamilyApplicationsForProject(projectId);
  const index = list.findIndex((row) => row.id === normalized.id);
  if (index >= 0) list[index] = normalized;
  else list.unshift(normalized);
  botFamilyApplicationsStore[projectId] = list
    .map((row) => normalizeBotFamilyApplication(row, projectId))
    .filter(Boolean)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, 1000);
  saveBotFamilyApplicationsStore();
  return normalized;
}

function findBotFamilyApplication(projectIdInput, applicationIdInput) {
  const projectId = sanitizeText(projectIdInput, 80);
  const applicationId = sanitizeText(applicationIdInput, 80);
  if (!projectId || !applicationId) return null;
  const list = getBotFamilyApplicationsForProject(projectId);
  return list.find((row) => row.id === applicationId) || null;
}

function removeBotFamilyApplication(projectIdInput, applicationIdInput) {
  const projectId = sanitizeText(projectIdInput, 80);
  const applicationId = sanitizeText(applicationIdInput, 80);
  if (!projectId || !applicationId) return;
  const list = getBotFamilyApplicationsForProject(projectId).filter((row) => row.id !== applicationId);
  botFamilyApplicationsStore[projectId] = list.slice(0, 1000);
  saveBotFamilyApplicationsStore();
}

function saveBotContractReportsStore() {
  writeJSON(BOT_CONTRACT_REPORTS_FILE, botContractReportsStore);
}

function getBotContractReportsForProject(projectIdInput) {
  const projectId = sanitizeText(projectIdInput, 80);
  if (!projectId) return [];
  if (!Array.isArray(botContractReportsStore[projectId])) {
    botContractReportsStore[projectId] = [];
  }
  return botContractReportsStore[projectId];
}

function upsertBotContractReport(projectIdInput, reportInput) {
  const projectId = sanitizeText(projectIdInput, 80);
  if (!projectId) return null;
  const normalized = normalizeBotContractReport(reportInput, projectId);
  if (!normalized) return null;
  const list = getBotContractReportsForProject(projectId);
  const index = list.findIndex((row) => row.id === normalized.id);
  if (index >= 0) list[index] = normalized;
  else list.unshift(normalized);
  botContractReportsStore[projectId] = list
    .map((row) => normalizeBotContractReport(row, projectId))
    .filter(Boolean)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, 2000);
  saveBotContractReportsStore();
  return normalized;
}

function findBotContractReport(projectIdInput, reportIdInput) {
  const projectId = sanitizeText(projectIdInput, 80);
  const reportId = sanitizeText(reportIdInput, 80);
  if (!projectId || !reportId) return null;
  const list = getBotContractReportsForProject(projectId);
  return list.find((row) => row.id === reportId) || null;
}

function removeBotContractReport(projectIdInput, reportIdInput) {
  const projectId = sanitizeText(projectIdInput, 80);
  const reportId = sanitizeText(reportIdInput, 80);
  if (!projectId || !reportId) return;
  const list = getBotContractReportsForProject(projectId).filter((row) => row.id !== reportId);
  botContractReportsStore[projectId] = list.slice(0, 2000);
  saveBotContractReportsStore();
}

function mapFamilyApplicationStatusToText(statusInput) {
  const status = normalizeBotFamilyApplicationStatus(statusInput);
  if (status === 'approved') return 'Принято';
  if (status === 'rejected') return 'Отклонено';
  if (status === 'review') return 'На рассмотрении';
  if (status === 'call') return 'Вызван на обзвон';
  return 'Новая';
}

function mapBotContractReportStatusToText(statusInput) {
  const status = normalizeBotContractReportStatus(statusInput);
  if (status === 'approved') return 'Принято';
  if (status === 'rejected') return 'Отклонено';
  return 'Новый';
}

function getFamilyApplicationEmbedColor(statusInput) {
  const status = normalizeBotFamilyApplicationStatus(statusInput);
  if (status === 'approved') return 0x3ecf8e;
  if (status === 'rejected') return 0xff5f6d;
  if (status === 'review') return 0x5f8dff;
  if (status === 'call') return 0xb57dff;
  return 0x9f48ff;
}

function getContractReportEmbedColor(statusInput) {
  const status = normalizeBotContractReportStatus(statusInput);
  if (status === 'approved') return 0x3ecf8e;
  if (status === 'rejected') return 0xff5f6d;
  return 0x9f48ff;
}

function mapBotContractActionToStatus(actionInput) {
  const action = sanitizeText(actionInput, 24).toLowerCase();
  if (action === 'approve') return 'approved';
  if (action === 'reject') return 'rejected';
  return '';
}

function mapBotFamilyActionToStatus(actionInput) {
  const action = sanitizeText(actionInput, 24).toLowerCase();
  if (action === 'approve') return 'approved';
  if (action === 'reject') return 'rejected';
  if (action === 'review') return 'review';
  if (action === 'call') return 'call';
  return '';
}

function buildBotContractActionCustomId({ projectId, reportId, action }) {
  const safeAction = sanitizeText(action, 24).toLowerCase();
  const safeProjectId = sanitizeText(projectId, 80);
  const safeReportId = sanitizeText(reportId, 80);
  if (!safeAction || !safeProjectId || !safeReportId) return '';
  return `${BOT_CONTRACT_ACTION_CUSTOM_ID_PREFIX}:${safeAction}:${safeProjectId}:${safeReportId}`.slice(0, 100);
}

function parseBotContractActionCustomId(input) {
  const customId = sanitizeText(input, 120);
  const [prefix, action, projectId, reportId] = customId.split(':');
  if (prefix !== BOT_CONTRACT_ACTION_CUSTOM_ID_PREFIX) return null;
  if (!mapBotContractActionToStatus(action)) return null;
  const safeProjectId = sanitizeText(projectId, 80);
  const safeReportId = sanitizeText(reportId, 80);
  if (!safeProjectId || !safeReportId) return null;
  return {
    action: sanitizeText(action, 24).toLowerCase(),
    projectId: safeProjectId,
    reportId: safeReportId,
  };
}

function buildBotFamilyActionCustomId({ projectId, applicationId, action }) {
  const safeAction = sanitizeText(action, 24).toLowerCase();
  const safeProjectId = sanitizeText(projectId, 80);
  const safeApplicationId = sanitizeText(applicationId, 80);
  if (!safeAction || !safeProjectId || !safeApplicationId) return '';
  return `${BOT_FAMILY_ACTION_CUSTOM_ID_PREFIX}:${safeAction}:${safeProjectId}:${safeApplicationId}`.slice(0, 100);
}

function parseBotFamilyActionCustomId(input) {
  const customId = sanitizeText(input, 120);
  const [prefix, action, projectId, applicationId] = customId.split(':');
  if (prefix !== BOT_FAMILY_ACTION_CUSTOM_ID_PREFIX) return null;
  if (!mapBotFamilyActionToStatus(action)) return null;
  if (!sanitizeText(projectId, 80) || !sanitizeText(applicationId, 80)) return null;
  return {
    action: sanitizeText(action, 24).toLowerCase(),
    projectId: sanitizeText(projectId, 80),
    applicationId: sanitizeText(applicationId, 80),
  };
}

function buildBotFamilyCallSelectCustomId({ projectId, applicationId }) {
  const safeProjectId = sanitizeText(projectId, 80);
  const safeApplicationId = sanitizeText(applicationId, 80);
  if (!safeProjectId || !safeApplicationId) return '';
  return `${BOT_FAMILY_CALL_SELECT_CUSTOM_ID_PREFIX}:${safeProjectId}:${safeApplicationId}`.slice(0, 100);
}

function parseBotFamilyCallSelectCustomId(input) {
  const customId = sanitizeText(input, 120);
  const [prefix, projectId, applicationId] = customId.split(':');
  if (prefix !== BOT_FAMILY_CALL_SELECT_CUSTOM_ID_PREFIX) return null;
  const safeProjectId = sanitizeText(projectId, 80);
  const safeApplicationId = sanitizeText(applicationId, 80);
  if (!safeProjectId || !safeApplicationId) return null;
  return {
    projectId: safeProjectId,
    applicationId: safeApplicationId,
  };
}

function buildBotFamilyActionComponents(projectIdInput, applicationIdInput) {
  const projectId = sanitizeText(projectIdInput, 80);
  const applicationId = sanitizeText(applicationIdInput, 80);
  if (!projectId || !applicationId) return [];

  return [
    {
      type: 1,
      components: [
        {
          type: 2,
          style: 3,
          label: 'Принять',
          custom_id: buildBotFamilyActionCustomId({ projectId, applicationId, action: 'approve' }),
        },
        {
          type: 2,
          style: 4,
          label: 'Отклонить',
          custom_id: buildBotFamilyActionCustomId({ projectId, applicationId, action: 'reject' }),
        },
        {
          type: 2,
          style: 2,
          label: 'На рассмотрение',
          custom_id: buildBotFamilyActionCustomId({ projectId, applicationId, action: 'review' }),
        },
        {
          type: 2,
          style: 1,
          label: 'Вызвать на обзвон',
          custom_id: buildBotFamilyActionCustomId({ projectId, applicationId, action: 'call' }),
        },
      ],
    },
  ];
}

function buildBotContractActionComponents(projectIdInput, reportIdInput) {
  const projectId = sanitizeText(projectIdInput, 80);
  const reportId = sanitizeText(reportIdInput, 80);
  if (!projectId || !reportId) return [];
  return [
    {
      type: 1,
      components: [
        {
          type: 2,
          style: 3,
          label: 'Принять',
          custom_id: buildBotContractActionCustomId({ projectId, reportId, action: 'approve' }),
        },
        {
          type: 2,
          style: 4,
          label: 'Отклонить',
          custom_id: buildBotContractActionCustomId({ projectId, reportId, action: 'reject' }),
        },
      ],
    },
  ];
}

function buildBotContractReportMessagePayload({ project, report }) {
  const safeProject = normalizeBotProject(project);
  if (!safeProject) return { embeds: [], components: [] };
  const safeReport = normalizeBotContractReport(report, safeProject.id);
  if (!safeReport) return { embeds: [], components: [] };

  const applicantValue = safeReport.applicantDiscordId
    ? `<@${safeReport.applicantDiscordId}>`
    : truncateDiscordValue(safeReport.applicantName, 1024);

  const fields = [
    { name: 'Исполнитель', value: applicantValue, inline: true },
    { name: 'Контракт', value: truncateDiscordValue(safeReport.contractName, 1024), inline: true },
    { name: 'Статус', value: mapBotContractReportStatusToText(safeReport.status), inline: true },
    ...(safeReport.comment
      ? [{ name: 'Комментарий', value: truncateDiscordValue(safeReport.comment, 1024), inline: false }]
      : []),
    ...(safeReport.reviewedBy
      ? [
          {
            name: 'Проверил',
            value: truncateDiscordValue(
              safeReport.reviewedByUserId && /^\d{5,30}$/.test(safeReport.reviewedByUserId)
                ? `<@${safeReport.reviewedByUserId}> (${safeReport.reviewedBy})`
                : safeReport.reviewedBy,
              1024
            ),
            inline: false,
          },
        ]
      : []),
  ];

  return {
    embeds: [
      {
        title: 'Отчет о выполнении контракта',
        color: getContractReportEmbedColor(safeReport.status),
        fields,
        ...(safeReport.screenshotUrl ? { image: { url: safeReport.screenshotUrl } } : {}),
        timestamp: new Date().toISOString(),
      },
    ],
    components: buildBotContractActionComponents(safeProject.id, safeReport.id),
  };
}

function buildBotFamilyApplicationMessagePayload({ project, family, application, callChannelIdOverride = '' }) {
  const safeProject = normalizeBotProject(project);
  if (!safeProject) return { embeds: [], components: [] };
  const safeFamily = normalizeBotProjectFamilyApplications(family);
  const safeApplication = normalizeBotFamilyApplication(application, safeProject.id);
  if (!safeApplication) return { embeds: [], components: [] };
  const effectiveCallChannelId =
    /^\d{5,30}$/.test(sanitizeText(callChannelIdOverride, 40))
      ? sanitizeText(callChannelIdOverride, 40)
      : /^\d{5,30}$/.test(sanitizeText(safeApplication.callChannelId, 40))
      ? sanitizeText(safeApplication.callChannelId, 40)
      : '';

  const applicantValue = safeApplication.applicantDiscordId
    ? `<@${safeApplication.applicantDiscordId}>`
    : truncateDiscordValue(safeApplication.applicantName, 1024);

  const fields = [
    { name: 'Заявитель', value: applicantValue, inline: true },
    { name: 'Статус', value: mapFamilyApplicationStatusToText(safeApplication.status), inline: true },
  ];

  (safeApplication.answers || []).forEach((row) => {
    fields.push({
      name: truncateDiscordValue(row.question || 'Вопрос', 256),
      value: truncateDiscordValue(row.answer || '—', 1024),
      inline: false,
    });
  });

  if (effectiveCallChannelId) {
    fields.push({
      name: 'Канал для обзвона',
      value: `<#${effectiveCallChannelId}>`,
      inline: false,
    });
  }

  if (safeApplication.reviewedBy) {
    fields.push({
      name: 'Проверил',
      value: truncateDiscordValue(
        safeApplication.reviewedByUserId && /^\d{5,30}$/.test(safeApplication.reviewedByUserId)
          ? `<@${safeApplication.reviewedByUserId}> (${safeApplication.reviewedBy})`
          : safeApplication.reviewedBy,
        1024
      ),
      inline: false,
    });
  }

  fields.push({
    name: 'ID заявки',
    value: truncateDiscordValue(safeApplication.id, 1024),
    inline: false,
  });

  return {
    embeds: [
      {
        title: safeApplication.status === 'new' ? 'Новая заявка с сайта' : 'Заявка с сайта',
        color: getFamilyApplicationEmbedColor(safeApplication.status),
        fields,
        timestamp: new Date().toISOString(),
      },
    ],
    components: buildBotFamilyActionComponents(safeProject.id, safeApplication.id),
  };
}

function hasBotFamilyActionAccess({ family, reviewerUserId, reviewerRoleIds, ownerUserId }) {
  const safeReviewerId = sanitizeText(reviewerUserId, 80);
  const safeOwnerId = sanitizeText(ownerUserId, 80);
  if (safeReviewerId && safeOwnerId && safeReviewerId === safeOwnerId) return true;

  const requiredRoles = normalizeBotProjectIdList(family?.reviewerRoleIds, 40);
  if (!requiredRoles.length) return true;
  const safeReviewerRoles = normalizeBotProjectIdList(reviewerRoleIds, 120);
  return requiredRoles.some((roleId) => safeReviewerRoles.includes(roleId));
}

function hasBotContractActionAccess({ contracts, reviewerUserId, reviewerRoleIds, ownerUserId }) {
  const safeReviewerId = sanitizeText(reviewerUserId, 80);
  const safeOwnerId = sanitizeText(ownerUserId, 80);
  if (safeReviewerId && safeOwnerId && safeReviewerId === safeOwnerId) return true;

  const requiredRoles = normalizeBotProjectIdList(contracts?.reviewerRoleIds, 40);
  if (!requiredRoles.length) return true;
  const safeReviewerRoles = normalizeBotProjectIdList(reviewerRoleIds, 120);
  return requiredRoles.some((roleId) => safeReviewerRoles.includes(roleId));
}

async function validateBotFamilyVoiceChannelId({ botToken, guildId, channelId }) {
  const safeGuildId = sanitizeText(guildId, 40);
  const safeChannelId = sanitizeText(channelId, 40);
  if (!/^\d{5,30}$/.test(safeGuildId) || !/^\d{5,30}$/.test(safeChannelId)) return '';
  const lookup = await fetchDiscordBotApi(botToken, `https://discord.com/api/v10/channels/${safeChannelId}`);
  if (!lookup.ok) return '';
  const type = Number(lookup.data?.type);
  const sameGuild = sanitizeText(lookup.data?.guild_id, 40) === safeGuildId;
  if (!sameGuild) return '';
  if (![2, 13].includes(type)) return '';
  return safeChannelId;
}

function buildBotFamilyApplicantDmEmbed({ nextStatus, callChannelId }) {
  const status = mapFamilyApplicationStatusToText(nextStatus);
  const colorMap = {
    approved: 0x3ecf8e,
    rejected: 0xff5f6d,
    review: 0x5f8dff,
    call: 0xb57dff,
    new: 0x9f48ff,
  };
  const descriptions = {
    approved: 'Ваша заявка принята. Добро пожаловать в состав.',
    rejected: 'Ваша заявка отклонена. Позже можно подать новую заявку.',
    review: 'Ваша заявка переведена на рассмотрение.',
    call: 'Вас пригласили на обзвон. Подключитесь в указанный голосовой канал.',
    new: 'По вашей заявке есть обновление.',
  };
  const fields = [{ name: 'Статус заявки', value: status, inline: false }];
  if (nextStatus === 'call' && /^\d{5,30}$/.test(sanitizeText(callChannelId, 40))) {
    fields.push({
      name: 'Голосовой канал',
      value: `<#${sanitizeText(callChannelId, 40)}>`,
      inline: false,
    });
  }
  return {
    title: 'Davis Project • Заявки',
    description: descriptions[nextStatus] || descriptions.new,
    color: colorMap[nextStatus] || colorMap.new,
    fields,
    footer: { text: 'Davis Project' },
    timestamp: new Date().toISOString(),
  };
}

async function notifyBotFamilyApplicantDm({ botToken, applicantDiscordId, embeds, content = '' }) {
  const userId = sanitizeText(applicantDiscordId, 40);
  const safeContent = sanitizeText(content, 1800);
  const safeEmbeds = Array.isArray(embeds) ? embeds.slice(0, 3) : [];
  if (!/^\d{5,30}$/.test(userId) || (!safeContent && !safeEmbeds.length)) {
    return { ok: false, reason: 'applicant_or_payload_missing' };
  }

  const dmChannel = await fetchDiscordBotApi(botToken, 'https://discord.com/api/v10/users/@me/channels', {
    method: 'POST',
    body: { recipient_id: userId },
  });
  if (!dmChannel.ok) {
    return { ok: false, reason: formatDiscordApiError(dmChannel) };
  }

  const dmChannelId = sanitizeText(dmChannel.data?.id, 40);
  if (!/^\d{5,30}$/.test(dmChannelId)) {
    return { ok: false, reason: 'dm_channel_not_returned' };
  }

  const dmSend = await fetchDiscordBotApi(botToken, `https://discord.com/api/v10/channels/${dmChannelId}/messages`, {
    method: 'POST',
    body: {
      ...(safeContent ? { content: safeContent } : {}),
      ...(safeEmbeds.length ? { embeds: safeEmbeds } : {}),
    },
  });
  if (!dmSend.ok) {
    return { ok: false, reason: formatDiscordApiError(dmSend) };
  }
  return { ok: true };
}

function buildBotContractApplicantDmEmbed({ nextStatus, contractName }) {
  const statusText = mapBotContractReportStatusToText(nextStatus);
  const colorMap = {
    approved: 0x3ecf8e,
    rejected: 0xff5f6d,
    new: 0x9f48ff,
  };
  const descriptions = {
    approved: 'Ваш отчет по контракту принят модератором.',
    rejected: 'Ваш отчет по контракту отклонен модератором.',
    new: 'По вашему отчету есть обновление.',
  };
  return {
    title: 'Davis Project • Контракты',
    description: descriptions[nextStatus] || descriptions.new,
    color: colorMap[nextStatus] || colorMap.new,
    fields: [
      { name: 'Контракт', value: truncateDiscordValue(contractName || 'Не указан', 1024), inline: false },
      { name: 'Статус', value: statusText, inline: false },
    ],
    footer: { text: 'Davis Project' },
    timestamp: new Date().toISOString(),
  };
}

async function processBotContractReportAction(options = {}) {
  const projectId = sanitizeText(options.projectIdInput || options.projectId, 80);
  const reportId = sanitizeText(options.reportIdInput || options.reportId, 80);
  const action = sanitizeText(options.actionInput || options.action, 24).toLowerCase();
  const nextStatus = mapBotContractActionToStatus(action);
  if (!projectId || !reportId || !nextStatus) {
    return { ok: false, status: 400, message: 'Некорректные параметры действия контракта.' };
  }

  const context = findBotProjectByIdGlobal(projectId);
  if (!context) {
    return { ok: false, status: 404, message: 'Проект не найден.' };
  }
  const project = normalizeBotProject(context.project);
  if (!project) {
    return { ok: false, status: 404, message: 'Проект не найден.' };
  }
  const contracts = normalizeBotProjectContracts(project.contracts);
  const report = findBotContractReport(project.id, reportId);
  if (!report) {
    return { ok: false, status: 404, message: 'Отчет по контракту не найден.' };
  }

  const storedBotToken = getBotProjectStoredToken(context.ownerUserId, project.id);
  const botToken = sanitizeText(options.botTokenOverride, 2000) || storedBotToken;
  if (!botToken) {
    return { ok: false, status: 400, message: 'BOT_TOKEN не найден. Подключите облачный режим бота.' };
  }

  const reviewerUserId = sanitizeText(options.reviewerUserIdInput || options.reviewerUserId, 80);
  const reviewerName =
    sanitizeText(options.reviewerNameInput || options.reviewerName, 120) ||
    (reviewerUserId ? `Пользователь ${reviewerUserId}` : 'Оператор Discord');
  const reviewerRoleIds = normalizeBotProjectIdList(options.reviewerRoleIdsInput || options.reviewerRoleIds, 120);
  const skipPermissionCheck = Boolean(options.skipPermissionCheck);

  if (
    !skipPermissionCheck &&
    !hasBotContractActionAccess({
      contracts,
      reviewerUserId,
      reviewerRoleIds,
      ownerUserId: context.ownerUserId,
    })
  ) {
    return { ok: false, status: 403, message: 'Недостаточно прав для изменения статуса отчета.' };
  }

  const updatedReport = upsertBotContractReport(project.id, {
    ...report,
    status: nextStatus,
    reviewedBy: reviewerName,
    reviewedByUserId: reviewerUserId,
    updatedAt: new Date().toISOString(),
  });
  if (!updatedReport) {
    return { ok: false, status: 500, message: 'Не удалось обновить отчет по контракту.' };
  }

  let discordUpdateError = '';
  if (updatedReport.discordChannelId && updatedReport.discordMessageId) {
    const editPayload = buildBotContractReportMessagePayload({
      project,
      report: updatedReport,
    });
    const editResponse = await fetchDiscordBotApi(
      botToken,
      `https://discord.com/api/v10/channels/${updatedReport.discordChannelId}/messages/${updatedReport.discordMessageId}`,
      {
        method: 'PATCH',
        body: editPayload,
      }
    );
    if (!editResponse.ok) {
      discordUpdateError = formatDiscordApiError(editResponse);
    }
  }

  let dmError = '';
  if (updatedReport.applicantDiscordId) {
    const dmSend = await notifyBotFamilyApplicantDm({
      botToken,
      applicantDiscordId: updatedReport.applicantDiscordId,
      embeds: [
        buildBotContractApplicantDmEmbed({
          nextStatus,
          contractName: updatedReport.contractName,
        }),
      ],
    });
    if (!dmSend.ok) {
      dmError = sanitizeText(dmSend.reason, 220) || 'не удалось отправить ЛС';
    }
  } else {
    dmError = 'у исполнителя нет Discord ID для отправки ЛС';
  }

  const statusText = mapBotContractReportStatusToText(nextStatus);
  const message = [
    `Статус отчета обновлен: ${statusText}.`,
    discordUpdateError ? `Ошибка обновления сообщения в Discord: ${discordUpdateError}` : '',
    dmError ? `ЛС: ${dmError}` : '',
  ]
    .filter(Boolean)
    .join(' ');

  return {
    ok: true,
    status: 200,
    statusText,
    message: message || 'Действие выполнено.',
    project,
    report: updatedReport,
    discordUpdateError,
  };
}

async function processBotFamilyApplicationAction(options = {}) {
  const projectId = sanitizeText(options.projectIdInput || options.projectId, 80);
  const applicationId = sanitizeText(options.applicationIdInput || options.applicationId, 80);
  const action = sanitizeText(options.actionInput || options.action, 24).toLowerCase();
  const nextStatus = mapBotFamilyActionToStatus(action);
  if (!projectId || !applicationId || !nextStatus) {
    return { ok: false, status: 400, message: 'Некорректные параметры действия.' };
  }

  const context = findBotProjectByIdGlobal(projectId);
  if (!context) {
    return { ok: false, status: 404, message: 'Проект не найден.' };
  }
  const project = normalizeBotProject(context.project);
  if (!project) {
    return { ok: false, status: 404, message: 'Проект не найден.' };
  }
  const family = normalizeBotProjectFamilyApplications(project.familyApplications);
  const application = findBotFamilyApplication(project.id, applicationId);
  if (!application) {
    return { ok: false, status: 404, message: 'Заявка не найдена.' };
  }

  const storedBotToken = getBotProjectStoredToken(context.ownerUserId, project.id);
  const botToken = sanitizeText(options.botTokenOverride, 2000) || storedBotToken;
  if (!botToken) {
    return { ok: false, status: 400, message: 'BOT_TOKEN не найден. Подключите облачный режим бота.' };
  }

  const reviewerUserId = sanitizeText(options.reviewerUserIdInput || options.reviewerUserId, 80);
  const reviewerName =
    sanitizeText(options.reviewerNameInput || options.reviewerName, 120) ||
    (reviewerUserId ? `Пользователь ${reviewerUserId}` : 'Оператор Discord');
  const reviewerRoleIds = normalizeBotProjectIdList(options.reviewerRoleIdsInput || options.reviewerRoleIds, 120);
  const skipPermissionCheck = Boolean(options.skipPermissionCheck);

  if (
    !skipPermissionCheck &&
    !hasBotFamilyActionAccess({
      family,
      reviewerUserId,
      reviewerRoleIds,
      ownerUserId: context.ownerUserId,
    })
  ) {
    return { ok: false, status: 403, message: 'Недостаточно прав для изменения статуса заявки.' };
  }

  const effectiveGuildId = /^\d{5,30}$/.test(sanitizeText(project.guildId, 40))
    ? sanitizeText(project.guildId, 40)
    : sanitizeText(application.discordGuildId, 40);
  const actionWarnings = [];
  const selectedCallChannelIdInput = sanitizeText(
    options.selectedCallChannelIdInput || options.selectedCallChannelId,
    40
  );
  let selectedCallChannelId = /^\d{5,30}$/.test(sanitizeText(application.callChannelId, 40))
    ? sanitizeText(application.callChannelId, 40)
    : '';

  if (nextStatus === 'approved') {
    if (!application.applicantDiscordId) {
      actionWarnings.push('Роли не выданы: у заявителя нет Discord ID.');
    } else if (!/^\d{5,30}$/.test(effectiveGuildId)) {
      actionWarnings.push('Роли не выданы: не удалось определить GUILD_ID.');
    } else if (!Array.isArray(family.approveRoleIds) || !family.approveRoleIds.length) {
      actionWarnings.push('Роли не выданы: список ролей при одобрении пуст.');
    } else {
      const failedRoles = [];
      for (const roleId of family.approveRoleIds) {
        const role = sanitizeText(roleId, 40);
        if (!/^\d{5,30}$/.test(role)) continue;
        const grantResponse = await fetchDiscordBotApi(
          botToken,
          `https://discord.com/api/v10/guilds/${effectiveGuildId}/members/${application.applicantDiscordId}/roles/${role}`,
          { method: 'PUT' }
        );
        if (!grantResponse.ok) {
          failedRoles.push(`${role}: ${formatDiscordApiError(grantResponse)}`);
        }
      }
      if (failedRoles.length) {
        actionWarnings.push(`Часть ролей не выдана: ${failedRoles.join(' | ')}`.slice(0, 260));
      }
    }
  }

  if (nextStatus === 'call') {
    selectedCallChannelId = await validateBotFamilyVoiceChannelId({
      botToken,
      guildId: effectiveGuildId,
      channelId: selectedCallChannelIdInput,
    });
    if (!selectedCallChannelId) {
      return {
        ok: false,
        status: 400,
        message: 'Выберите голосовой канал для обзвона перед подтверждением.',
      };
    }
  }

  let updatedApplication = upsertBotFamilyApplication(project.id, {
    ...application,
    status: nextStatus,
    reviewedBy: reviewerName,
    reviewedByUserId: reviewerUserId,
    reviewNote: '',
    callChannelId: selectedCallChannelId || '',
    updatedAt: new Date().toISOString(),
  });

  if (!updatedApplication) {
    return { ok: false, status: 500, message: 'Не удалось обновить заявку.' };
  }

  let discordUpdateError = '';
  let channelDeleteError = '';
  const shouldDeleteChannel = nextStatus === 'approved' || nextStatus === 'rejected';
  let shouldPatchMessage = !shouldDeleteChannel;

  if (shouldDeleteChannel && updatedApplication.discordChannelId) {
    const deleteResponse = await fetchDiscordBotApi(
      botToken,
      `https://discord.com/api/v10/channels/${updatedApplication.discordChannelId}`,
      { method: 'DELETE' }
    );
    if (!deleteResponse.ok) {
      channelDeleteError = formatDiscordApiError(deleteResponse);
      shouldPatchMessage = true;
    } else {
      updatedApplication =
        upsertBotFamilyApplication(project.id, {
          ...updatedApplication,
          discordChannelId: '',
          discordMessageId: '',
          updatedAt: new Date().toISOString(),
        }) || updatedApplication;
    }
  }

  if (shouldPatchMessage && updatedApplication.discordChannelId && updatedApplication.discordMessageId) {
    const editPayload = buildBotFamilyApplicationMessagePayload({
      project,
      family,
      application: updatedApplication,
      callChannelIdOverride: selectedCallChannelId,
    });
    const editResponse = await fetchDiscordBotApi(
      botToken,
      `https://discord.com/api/v10/channels/${updatedApplication.discordChannelId}/messages/${updatedApplication.discordMessageId}`,
      {
        method: 'PATCH',
        body: editPayload,
      }
    );
    if (!editResponse.ok) {
      discordUpdateError = formatDiscordApiError(editResponse);
    }
  }

  if (nextStatus === 'call' && selectedCallChannelId && updatedApplication.discordChannelId) {
    const callText = updatedApplication.applicantDiscordId
      ? `<@${updatedApplication.applicantDiscordId}>, пройдите в канал для обзвона: <#${selectedCallChannelId}>`
      : `Кандидат приглашен на обзвон: <#${selectedCallChannelId}>`;
    await fetchDiscordBotApi(botToken, `https://discord.com/api/v10/channels/${updatedApplication.discordChannelId}/messages`, {
      method: 'POST',
      body: {
        content: truncateDiscordValue(callText, 1800),
        allowed_mentions: {
          parse: [],
          users: updatedApplication.applicantDiscordId ? [updatedApplication.applicantDiscordId] : [],
        },
      },
    });
  }

  let dmError = '';
  if (updatedApplication.applicantDiscordId) {
    const dmSend = await notifyBotFamilyApplicantDm({
      botToken,
      applicantDiscordId: updatedApplication.applicantDiscordId,
      embeds: [
        buildBotFamilyApplicantDmEmbed({
          nextStatus,
          callChannelId: selectedCallChannelId,
        }),
      ],
    });
    if (!dmSend.ok) {
      dmError = sanitizeText(dmSend.reason, 220) || 'не удалось отправить ЛС';
    }
  } else {
    dmError = 'у заявителя нет Discord ID для отправки ЛС';
  }

  const statusText = mapFamilyApplicationStatusToText(nextStatus);
  const message = [
    `Статус заявки обновлен: ${statusText}.`,
    actionWarnings.length ? actionWarnings.join(' | ') : '',
    discordUpdateError ? `Ошибка обновления сообщения в Discord: ${discordUpdateError}` : '',
    channelDeleteError ? `Ошибка удаления канала: ${channelDeleteError}` : '',
    dmError ? `ЛС: ${dmError}` : '',
  ]
    .filter(Boolean)
    .join(' ');

  return {
    ok: true,
    status: 200,
    statusText,
    message: message || 'Действие выполнено.',
    project,
    application: updatedApplication,
    discordUpdateError,
  };
}

async function sendDiscordInteractionCallback(interactionIdInput, interactionTokenInput, body) {
  const interactionId = sanitizeText(interactionIdInput, 80);
  const interactionToken = sanitizeText(interactionTokenInput, 240);
  if (!interactionId || !interactionToken) {
    return { ok: false, status: 400, message: 'Некорректные параметры interaction callback.' };
  }
  try {
    const response = await fetch(`https://discord.com/api/v10/interactions/${interactionId}/${interactionToken}/callback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {}),
    });
    const raw = await response.text().catch(() => '');
    return {
      ok: response.ok,
      status: response.status,
      message: sanitizeText(raw, 220),
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      message: sanitizeText(error.message, 220) || 'Ошибка сети.',
    };
  }
}

async function sendDiscordInteractionFollowup(applicationIdInput, interactionTokenInput, contentInput) {
  const applicationId = sanitizeText(applicationIdInput, 80);
  const interactionToken = sanitizeText(interactionTokenInput, 240);
  const content = sanitizeText(contentInput, 1900);
  if (!applicationId || !interactionToken || !content) {
    return { ok: false, status: 400, message: 'Некорректные параметры interaction follow-up.' };
  }
  try {
    const response = await fetch(`https://discord.com/api/v10/webhooks/${applicationId}/${interactionToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content,
        flags: 64,
      }),
    });
    const raw = await response.text().catch(() => '');
    return {
      ok: response.ok,
      status: response.status,
      message: sanitizeText(raw, 220),
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      message: sanitizeText(error.message, 220) || 'Ошибка сети.',
    };
  }
}

function buildBotFamilyActionSignature({ projectId, applicationId, action, expiresAt }) {
  const payload = [
    sanitizeText(projectId, 80),
    sanitizeText(applicationId, 80),
    sanitizeText(action, 24),
    String(Number(expiresAt) || 0),
  ].join(':');
  return crypto.createHmac('sha256', String(SESSION_SECRET || 'davis-project-local-secret')).update(payload).digest('base64url');
}

function verifyBotFamilyActionSignature({ projectId, applicationId, action, expiresAt, signature }) {
  const expected = buildBotFamilyActionSignature({ projectId, applicationId, action, expiresAt });
  const provided = String(signature || '').trim();
  if (!provided || !expected) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
  } catch {
    return false;
  }
}

function buildBotFamilyActionUrl(baseUrl, { projectId, applicationId, action }) {
  const expiresAt = Date.now() + BOT_FAMILY_ACTION_TTL_MS;
  const sig = buildBotFamilyActionSignature({ projectId, applicationId, action, expiresAt });
  const params = new URLSearchParams({
    projectId: sanitizeText(projectId, 80),
    applicationId: sanitizeText(applicationId, 80),
    action: sanitizeText(action, 24),
    expiresAt: String(expiresAt),
    sig,
  });
  return `${baseUrl}?${params.toString()}`;
}

function createNextBotProjectName(projectsList) {
  const list = Array.isArray(projectsList) ? projectsList : [];
  const used = new Set(list.map((row) => sanitizeText(row.name, 120).toLowerCase()).filter(Boolean));
  let index = list.length + 1;
  let candidate = `Новый бот ${index}`;
  while (used.has(candidate.toLowerCase())) {
    index += 1;
    candidate = `Новый бот ${index}`;
  }
  return candidate;
}

function isFactionUploadUrl(value) {
  return typeof value === 'string' && value.startsWith('/uploads/factions/');
}

function resolveFactionUploadPath(value) {
  if (!isFactionUploadUrl(value)) return '';
  const fileName = path.basename(String(value));
  if (!fileName) return '';
  const filePath = path.join(FACTIONS_UPLOAD_DIR, fileName);
  if (path.dirname(filePath) !== FACTIONS_UPLOAD_DIR) return '';
  return filePath;
}

function saveFactionImageFromDataUrl(dataUrl, prefix) {
  const raw = typeof dataUrl === 'string' ? dataUrl.trim() : '';
  if (!raw) return '';

  const match = raw.match(/^data:(image\/(?:png|jpeg|jpg|webp|gif));base64,([a-z0-9+/=]+)$/i);
  if (!match) {
    throw new Error('invalid_image_data');
  }

  const mimeType = String(match[1] || '').toLowerCase();
  const extMap = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/webp': 'webp',
    'image/gif': 'gif',
  };
  const ext = extMap[mimeType];
  if (!ext) {
    throw new Error('invalid_image_data');
  }

  const buffer = Buffer.from(match[2], 'base64');
  if (!buffer.length) {
    throw new Error('invalid_image_data');
  }
  if (buffer.byteLength > 4 * 1024 * 1024) {
    throw new Error('image_too_large');
  }

  fs.mkdirSync(FACTIONS_UPLOAD_DIR, { recursive: true });
  const safePrefix = sanitizeSlug(prefix) || 'faction';
  const fileName = `${safePrefix}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`;
  const filePath = path.join(FACTIONS_UPLOAD_DIR, fileName);
  fs.writeFileSync(filePath, buffer);
  return `/uploads/factions/${fileName}`;
}

function removeFactionImageIfExists(url) {
  const filePath = resolveFactionUploadPath(url);
  if (!filePath) return;
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch {
    // Ignore cleanup errors to keep API stable.
  }
}

function parseBotContractScreenshotDataUrl(dataUrl) {
  const raw = typeof dataUrl === 'string' ? dataUrl.trim() : '';
  if (!raw) {
    throw new Error('invalid_image_data');
  }

  const match = raw.match(/^data:(image\/(?:png|jpeg|jpg|webp));base64,([a-z0-9+/=]+)$/i);
  if (!match) {
    throw new Error('invalid_image_data');
  }

  const mimeType = String(match[1] || '').toLowerCase();
  const extMap = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/webp': 'webp',
  };
  const ext = extMap[mimeType];
  if (!ext) {
    throw new Error('invalid_image_data');
  }

  const buffer = Buffer.from(match[2], 'base64');
  if (!buffer.length) {
    throw new Error('invalid_image_data');
  }
  if (buffer.byteLength > 8 * 1024 * 1024) {
    throw new Error('image_too_large');
  }

  return {
    mimeType,
    ext,
    buffer,
  };
}

function getFactionUserNames(user) {
  if (!user) return [];
  return [String(user.username || '').toLowerCase(), String(user.global_name || '').toLowerCase()].filter(Boolean);
}

function canManageFaction(user, faction) {
  if (!user || !faction) return false;
  if (isAdminUser(user)) return true;
  if (Array.isArray(faction.managerIds) && faction.managerIds.includes(String(user.id || ''))) return true;
  const names = getFactionUserNames(user);
  const allowNames = Array.isArray(faction.managerNames) ? faction.managerNames : [];
  return names.some((name) => allowNames.includes(name));
}

function isFactionCreator(user, faction) {
  if (!user || !faction) return false;
  const userId = sanitizeText(user.id, 80);
  const creatorId = sanitizeText(faction.createdByUserId, 80);
  if (userId && creatorId && userId === creatorId) return true;
  const managerIds = Array.isArray(faction.managerIds) ? faction.managerIds : [];
  if (userId && managerIds[0] && userId === managerIds[0]) return true;
  return false;
}

async function isUserMemberOfDiscordGuild(userIdInput, guildIdInput) {
  const userId = sanitizeText(userIdInput, 40);
  const guildId = sanitizeText(guildIdInput, 40);
  if (!/^\d{5,30}$/.test(userId) || !/^\d{5,30}$/.test(guildId)) return false;

  const cacheKey = `${guildId}:${userId}`;
  const now = Date.now();
  const cached = discordGuildMemberCache.get(cacheKey);
  if (cached && cached.expiresAt > now) return cached.value;

  if (!DISCORD_BOT_TOKEN) {
    discordGuildMemberCache.set(cacheKey, { value: false, expiresAt: now + 30 * 1000 });
    return false;
  }

  if (discordGuildMemberInFlight.has(cacheKey)) {
    return discordGuildMemberInFlight.get(cacheKey);
  }

  const request = (async () => {
    try {
      const response = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${userId}`, {
        headers: {
          Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
        },
      });
      const isMember = response.ok;
      discordGuildMemberCache.set(cacheKey, {
        value: isMember,
        expiresAt: now + (isMember ? DISCORD_GUILD_MEMBER_CACHE_TTL_MS : 60 * 1000),
      });
      return isMember;
    } catch {
      discordGuildMemberCache.set(cacheKey, { value: false, expiresAt: now + 60 * 1000 });
      return false;
    } finally {
      discordGuildMemberInFlight.delete(cacheKey);
    }
  })();

  discordGuildMemberInFlight.set(cacheKey, request);
  return request;
}

async function canAccessFaction(user, faction) {
  if (!user || !faction) return false;
  if (isAdminUser(user)) return true;
  if (isFactionCreator(user, faction)) return true;

  const guildId = sanitizeText(faction?.profile?.discordServerId, 40);
  if (!/^\d{5,30}$/.test(guildId)) return false;
  return isUserMemberOfDiscordGuild(String(user.id || ''), guildId);
}

function getDiscordDefaultAvatarIndex(userId, discriminator) {
  const disc = String(discriminator || '').trim();
  if (/^\d+$/.test(disc) && disc !== '0') {
    return Number(disc) % 5;
  }
  try {
    return Number((BigInt(String(userId || '0')) >> 22n) % 6n);
  } catch {
    return 0;
  }
}

function buildDiscordAvatarUrl(userId, avatarHash, discriminator) {
  const id = sanitizeText(userId, 40);
  if (!id) return '';
  const avatar = sanitizeText(avatarHash, 200);
  if (avatar) {
    const ext = avatar.startsWith('a_') ? 'gif' : 'png';
    return `https://cdn.discordapp.com/avatars/${id}/${avatar}.${ext}?size=256`;
  }
  const fallbackIndex = getDiscordDefaultAvatarIndex(id, discriminator);
  return `https://cdn.discordapp.com/embed/avatars/${fallbackIndex}.png`;
}

function normalizeDiscordUserForClient(input) {
  const row = input && typeof input === 'object' ? input : {};
  const id = sanitizeText(row.id, 40);
  if (!/^\d{5,30}$/.test(id)) return null;
  const username = sanitizeText(row.username, 80);
  const globalName = sanitizeText(row.global_name, 120);
  const avatarHash = sanitizeText(row.avatar, 200);
  const discriminator = sanitizeText(row.discriminator, 20);
  const bannerHash = sanitizeText(row.banner, 200);
  const accentColor = Number.isFinite(Number(row.accent_color)) ? Number(row.accent_color) : null;
  const avatarUrl = buildDiscordAvatarUrl(id, avatarHash, discriminator);
  const bannerUrl = bannerHash ? `https://cdn.discordapp.com/banners/${id}/${bannerHash}.png?size=512` : '';
  return {
    id,
    username,
    globalName,
    displayName: globalName || username || id,
    avatarUrl,
    bannerUrl,
    accentColor,
    profileUrl: `https://discord.com/users/${id}`,
  };
}

async function fetchDiscordUserFromWidget(discordId, discordServerId) {
  const userId = sanitizeText(discordId, 40);
  const serverId = sanitizeText(discordServerId, 40);
  if (!/^\d{5,30}$/.test(userId) || !/^\d{5,30}$/.test(serverId)) return null;
  const cacheKey = `widget:${serverId}:${userId}`;
  const now = Date.now();
  const cached = discordUserCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return cached.value;
  }
  try {
    const response = await fetch(`https://discord.com/api/guilds/${serverId}/widget.json`);
    if (!response.ok) {
      discordUserCache.set(cacheKey, { value: null, expiresAt: now + 60 * 1000 });
      return null;
    }
    const payload = await response.json();
    const members = Array.isArray(payload?.members) ? payload.members : [];
    const member = members.find((row) => sanitizeText(row?.id, 40) === userId);
    if (!member) {
      discordUserCache.set(cacheKey, { value: null, expiresAt: now + 60 * 1000 });
      return null;
    }
    const normalized = {
      id: userId,
      username: sanitizeText(member.username, 80),
      globalName: sanitizeText(member.nick, 120),
      displayName: sanitizeText(member.nick, 120) || sanitizeText(member.username, 80) || userId,
      avatarUrl: sanitizeUrl(member.avatar_url) || buildDiscordAvatarUrl(userId, '', ''),
      bannerUrl: '',
      accentColor: null,
      profileUrl: `https://discord.com/users/${userId}`,
      status: sanitizeText(member.status, 40),
    };
    discordUserCache.set(cacheKey, { value: normalized, expiresAt: now + DISCORD_USER_CACHE_TTL_MS });
    return normalized;
  } catch {
    discordUserCache.set(cacheKey, { value: null, expiresAt: now + 60 * 1000 });
    return null;
  }
}

async function fetchDiscordUserById(discordId, discordServerId = '') {
  const id = sanitizeText(discordId, 40);
  if (!/^\d{5,30}$/.test(id)) return null;

  const now = Date.now();
  const cached = discordUserCache.get(id);
  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  if (!DISCORD_BOT_TOKEN) {
    return fetchDiscordUserFromWidget(id, discordServerId);
  }
  if (discordUserInFlight.has(id)) return discordUserInFlight.get(id);

  const request = (async () => {
    try {
      const response = await fetch(`https://discord.com/api/v10/users/${id}`, {
        headers: {
          Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
        },
      });
      if (!response.ok) {
        const fallback = await fetchDiscordUserFromWidget(id, discordServerId);
        if (fallback) return fallback;
        discordUserCache.set(id, { value: null, expiresAt: now + 60 * 1000 });
        return null;
      }
      const payload = await response.json();
      const normalized = normalizeDiscordUserForClient(payload);
      discordUserCache.set(id, { value: normalized, expiresAt: now + DISCORD_USER_CACHE_TTL_MS });
      return normalized;
    } catch {
      discordUserCache.set(id, { value: null, expiresAt: now + 60 * 1000 });
      return null;
    } finally {
      discordUserInFlight.delete(id);
    }
  })();

  discordUserInFlight.set(id, request);
  return request;
}

async function enrichFactionProfileWithDiscord(profileInput) {
  const profile = normalizeFactionProfile(profileInput);
  const leaderDiscordData = await fetchDiscordUserById(profile.leaderDiscordId, profile.discordServerId);
  const deputies = await Promise.all(
    (Array.isArray(profile.deputies) ? profile.deputies : []).map(async (row) => ({
      ...row,
      discordData: await fetchDiscordUserById(row.discordId, profile.discordServerId),
    }))
  );

  return {
    ...profile,
    leaderDiscordData,
    deputies,
  };
}

async function serializeFactionForClientAsync(faction, options = {}) {
  const base = serializeFactionForClient(faction, options);
  base.profile = await enrichFactionProfileWithDiscord(base.profile);
  return base;
}

function serializeFactionForClient(faction, options = {}) {
  const includeDetails = Boolean(options.includeDetails);
  const includePrivate = Boolean(options.includePrivate);

  const base = {
    id: faction.id,
    name: faction.name,
    avatarUrl: faction.avatarUrl || '',
    bannerUrl: faction.bannerUrl || '',
    createdAt: faction.createdAt,
    profile: faction.profile || {
      leader: '',
      leaderDiscordId: '',
      leaderDiscordProfileUrl: '',
      deputies: [],
      about: '',
      discordServerId: '',
    },
  };
  if (!includeDetails) return base;

  base.memos = Array.isArray(faction.memos) ? faction.memos : [];
  base.tests = Array.isArray(faction.tests)
    ? faction.tests.map((test) => ({
        id: test.id,
        title: test.title,
        description: test.description,
        passPercent: test.passPercent,
        questions: Array.isArray(test.questions) ? test.questions : [],
        createdAt: test.createdAt,
        updatedAt: test.updatedAt,
        ...(includePrivate
          ? { webhookUrl: test.webhookUrl || '' }
          : { webhookConfigured: Boolean(test.webhookUrl) }),
      }))
    : [];
  base.rosters = Array.isArray(faction.rosters) ? faction.rosters : [];
  base.applications = Array.isArray(faction.applications)
    ? faction.applications.map((application) => ({
        id: application.id,
        title: application.title,
        description: application.description,
        fields: Array.isArray(application.fields) ? application.fields : [],
        createdAt: application.createdAt,
        updatedAt: application.updatedAt,
        ...(includePrivate
          ? { webhookUrl: application.webhookUrl }
          : {
              webhookConfigured: Boolean(application.webhookUrl),
              webhookHint: application.webhookUrl ? '••••••••' : '',
            }),
      }))
    : [];

  if (includePrivate) {
    base.managerIds = Array.isArray(faction.managerIds) ? faction.managerIds : [];
    base.managerNames = Array.isArray(faction.managerNames) ? faction.managerNames : [];
  }

  return base;
}

function findFactionIndexById(factionId) {
  const id = sanitizeText(factionId, 80);
  return factions.findIndex((row) => row.id === id);
}

function saveFactions() {
  factions = normalizeFactions(factions);
  writeJSON(FACTIONS_FILE, factions);
}

function truncateDiscordValue(value, max) {
  const text = String(value || '');
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(1, max - 1))}…`;
}

async function sendFactionTestResultToDiscord({ webhookUrl, faction, test, respondent, score, total, percent, passed }) {
  const targetWebhook = sanitizeDiscordWebhookUrl(webhookUrl) || sanitizeDiscordWebhookUrl(DISCORD_TEST_RESULTS_WEBHOOK);
  if (!targetWebhook) {
    return { sent: false, reason: 'webhook_not_configured' };
  }

  const payload = {
    username: 'Davis Project',
    embeds: [
      {
        title: 'Результат теста фракции',
        color: passed ? 0x57f287 : 0xed4245,
        fields: [
          { name: 'Фракция', value: truncateDiscordValue(faction.name || 'Не указано', 1024), inline: true },
          { name: 'Тест', value: truncateDiscordValue(test.title || 'Без названия', 1024), inline: true },
          { name: 'Участник', value: truncateDiscordValue(respondent || 'Не указан', 1024), inline: true },
          { name: 'Результат', value: `${score}/${total} (${percent}%)`, inline: true },
          { name: 'Статус', value: passed ? 'Пройден' : 'Не пройден', inline: true },
          { name: 'Порог', value: `${test.passPercent}%`, inline: true },
        ],
        timestamp: new Date().toISOString(),
      },
    ],
  };

  const response = await fetch(targetWebhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const details = await response.text().catch(() => '');
    throw new Error(`discord_webhook_http_${response.status}${details ? `:${details.slice(0, 240)}` : ''}`);
  }

  return { sent: true };
}

async function sendFactionApplicationToDiscord({ webhookUrl, faction, application, applicant, answers }) {
  const fields = Array.isArray(application.fields) ? application.fields : [];
  const embedFields = [];
  embedFields.push({ name: 'Фракция', value: truncateDiscordValue(faction.name || 'Не указано', 1024), inline: true });
  embedFields.push({ name: 'Форма', value: truncateDiscordValue(application.title || 'Заявление', 1024), inline: true });
  embedFields.push({ name: 'Заявитель', value: truncateDiscordValue(applicant || 'Не указан', 1024), inline: true });

  fields.slice(0, 22).forEach((field) => {
    const key = String(field.id || '');
    const value = truncateDiscordValue(answers[key] || '—', 1024);
    embedFields.push({
      name: truncateDiscordValue(field.label || 'Поле', 256),
      value: value || '—',
      inline: false,
    });
  });

  const payload = {
    username: 'Davis Project',
    embeds: [
      {
        title: 'Новое заявление',
        color: 0x5865f2,
        fields: embedFields,
        timestamp: new Date().toISOString(),
      },
    ],
  };

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const details = await response.text().catch(() => '');
    throw new Error(`discord_webhook_http_${response.status}${details ? `:${details.slice(0, 240)}` : ''}`);
  }
}

function normalizeNavigatorMap(input) {
  const source = input && typeof input === 'object' ? input : {};
  const output = {};

  Object.entries(source).forEach(([rawPath, items]) => {
    const pagePath = normalizeRoutePath(rawPath);
    if (!Array.isArray(items)) return;

    const normalizedItems = items
      .map((item, idx) => {
        const id = sanitizeText(item.id, 80) || crypto.randomUUID();
        const label = sanitizeText(item.label, 60);
        const target = sanitizeUrl(item.target);
        const order = Number.isFinite(Number(item.order)) ? Number(item.order) : idx + 1;
        if (!label || !target) return null;
        return { id, label, target, order };
      })
      .filter(Boolean)
      .sort((a, b) => a.order - b.order)
      .map((item, idx) => ({ ...item, order: idx + 1 }));

    output[pagePath] = normalizedItems;
  });

  return output;
}

function normalizeLawCache(input) {
  const source = input && typeof input === 'object' ? input : {};
  const output = {};

  Object.entries(source).forEach(([server, row]) => {
    const serverName = sanitizeText(server, 80);
    if (!serverName || !row || typeof row !== 'object') return;

    const docs = Array.isArray(row.docs)
      ? row.docs
          .map((doc) => {
            const title = sanitizeText(doc.title, 200);
            const url = sanitizeUrl(doc.url);
            const text = sanitizeText(doc.text, 5000);
            if (!title || !url || !text) return null;
            return { title, url, text };
          })
          .filter(Boolean)
      : [];

    const trace = Array.isArray(row.trace)
      ? row.trace
          .map((step) => {
            const title = sanitizeText(step.title, 200);
            const url = sanitizeUrl(step.url);
            const stepName = sanitizeText(step.step, 40);
            if (!title || !url) return null;
            return { step: stepName || 'step', title, url };
          })
          .filter(Boolean)
      : [];

    output[serverName] = {
      updatedAt: sanitizeText(row.updatedAt, 80) || new Date(0).toISOString(),
      docs,
      trace,
    };
  });

  return output;
}

function sanitizeDocStyle(input) {
  const row = input && typeof input === 'object' ? input : {};
  const fontSize = clampNumber(row.fontSize, 10, 48, 16);
  const color = sanitizeText(row.color, 20);
  const backgroundColor = sanitizeText(row.backgroundColor, 20);
  const borderColor = sanitizeText(row.borderColor, 20);
  const align = sanitizeText(row.align, 10).toLowerCase();
  const weight = sanitizeText(row.fontWeight, 10).toLowerCase();
  const style = sanitizeText(row.fontStyle, 10).toLowerCase();
  const borderWidth = clampNumber(row.borderWidth, 0, 20, 0);
  const borderRadius = clampNumber(row.borderRadius, 0, 120, 6);
  const opacity = clampNumber(row.opacity, 0.1, 1, 1);
  const rotation = clampNumber(row.rotation, -180, 180, 0);
  const lineHeight = clampNumber(row.lineHeight, 0.8, 3, 1.35);
  const fontFamily = sanitizeText(row.fontFamily, 40);
  const out = {
    fontSize,
    color: /^#[0-9a-f]{3,8}$/i.test(color) ? color : '#21183f',
    backgroundColor: /^#[0-9a-f]{3,8}$/i.test(backgroundColor) ? backgroundColor : 'transparent',
    borderColor: /^#[0-9a-f]{3,8}$/i.test(borderColor) ? borderColor : '#00000000',
    align: ['left', 'center', 'right'].includes(align) ? align : 'left',
    fontWeight: ['normal', '600', '700', '800'].includes(weight) ? weight : 'normal',
    fontStyle: ['normal', 'italic'].includes(style) ? style : 'normal',
    borderWidth,
    borderRadius,
    opacity,
    rotation,
    lineHeight,
    fontFamily: ['Manrope', 'Unbounded', 'Caveat'].includes(fontFamily) ? fontFamily : 'Manrope',
  };
  return out;
}

function normalizeDocElements(input) {
  if (!Array.isArray(input)) return [];
  return input
    .map((row, idx) => {
      const type = sanitizeText(row.type, 20).toLowerCase();
      if (!['text', 'heading', 'input', 'image', 'signature', 'checkbox', 'date', 'box', 'line'].includes(type)) return null;
      const widthFallback = type === 'line' ? 760 : (type === 'text' || type === 'heading' ? 260 : 280);
      const minHeight = type === 'line' ? 1 : 24;
      const heightFallback = type === 'line' ? 1 : (type === 'image' ? 160 : 56);
      const style = sanitizeDocStyle(row.style);
      if (type === 'line') {
        style.backgroundColor = /^#[0-9a-f]{3,8}$/i.test(style.backgroundColor) ? style.backgroundColor : '#000000';
        style.borderWidth = 0;
        style.borderRadius = 0;
      }
      return {
        id: sanitizeText(row.id, 80) || crypto.randomUUID(),
        type,
        x: clampNumber(row.x, 0, 1000, 40 + idx * 12),
        y: clampNumber(row.y, 0, 1400, 40 + idx * 12),
        w: clampNumber(row.w, 40, 900, widthFallback),
        h: type === 'line' ? 1 : clampNumber(row.h, minHeight, 800, heightFallback),
        label: sanitizeText(row.label, 120),
        text: sanitizeText(row.text, 4000),
        placeholder: sanitizeText(row.placeholder, 140),
        src: sanitizeUrl(row.src),
        required: Boolean(row.required),
        zIndex: clampNumber(row.zIndex, 0, 2000, idx + 1),
        hidden: Boolean(row.hidden),
        locked: Boolean(row.locked),
        style,
      };
    })
    .filter(Boolean);
}

function normalizeDocTemplate(input) {
  const row = input && typeof input === 'object' ? input : {};
  const server = sanitizeText(row.server, 80);
  const title = sanitizeText(row.title, 120);
  const description = sanitizeText(row.description, 500);
  const createdBy = row.createdBy && typeof row.createdBy === 'object' ? row.createdBy : {};
  return {
    id: sanitizeText(row.id, 80) || crypto.randomUUID(),
    server,
    title,
    description,
    createdBy: {
      id: sanitizeText(createdBy.id, 80),
      name: sanitizeText(createdBy.name, 120),
    },
    createdAt: sanitizeText(row.createdAt, 80) || new Date().toISOString(),
    updatedAt: sanitizeText(row.updatedAt, 80) || new Date().toISOString(),
    elements: normalizeDocElements(row.elements),
  };
}

function normalizeDocTemplates(input) {
  if (!Array.isArray(input)) return [];
  return input
    .map((row) => normalizeDocTemplate(row))
    .filter((row) => row.server && row.title)
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}

function normalizeDocFills(input) {
  const source = input && typeof input === 'object' ? input : {};
  const out = {};
  Object.entries(source).forEach(([userId, row]) => {
    const safeUserId = sanitizeText(userId, 80);
    if (!safeUserId || !row || typeof row !== 'object') return;
    const templates = {};
    Object.entries(row).forEach(([templateId, fill]) => {
      const safeTemplateId = sanitizeText(templateId, 80);
      if (!safeTemplateId || !fill || typeof fill !== 'object') return;
      const valuesSource = fill.values && typeof fill.values === 'object' ? fill.values : {};
      const values = {};
      Object.entries(valuesSource).forEach(([elementId, value]) => {
        const safeElementId = sanitizeText(elementId, 80);
        if (!safeElementId) return;
        values[safeElementId] = sanitizeText(value, 5000);
      });
      templates[safeTemplateId] = {
        updatedAt: sanitizeText(fill.updatedAt, 80) || new Date().toISOString(),
        values,
      };
    });
    out[safeUserId] = templates;
  });
  return out;
}

const MAJESTIC_FORUM_ROOT = 'https://forum.majestic-rp.ru/';
const MAJESTIC_SERVERS = [
  'New York',
  'Detroit',
  'Chicago',
  'San Francisco',
  'Atlanta',
  'San Diego',
  'Los Angeles',
  'Miami',
  'Las Vegas',
  'Washington',
  'Dallas',
  'Boston',
  'Houston',
  'Seattle',
  'Phoenix',
  'Denver',
  'Portland',
  'Orlando',
];
const CONSULTANT_SYNC_ENABLED = String(process.env.CONSULTANT_FORUM_SYNC_ENABLED || 'true').toLowerCase() !== 'false';
const CONSULTANT_SYNC_INTERVAL_MINUTES = clampNumber(
  process.env.CONSULTANT_FORUM_SYNC_INTERVAL_MINUTES,
  10,
  720,
  45
);
const CONSULTANT_SYNC_PER_RUN = clampNumber(process.env.CONSULTANT_FORUM_SYNC_PER_RUN, 1, 6, 2);
const CONSULTANT_SERVER_COOLDOWN_HOURS = clampNumber(
  process.env.CONSULTANT_SERVER_SYNC_COOLDOWN_HOURS,
  1,
  168,
  12
);

function decodeHtmlEntities(text) {
  return String(text || '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function stripHtml(text) {
  return decodeHtmlEntities(String(text || '').replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-zа-я0-9\s]/gi, ' ')
    .split(/\s+/)
    .filter((word) => word.length >= 3);
}

function normalizeComparable(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-zа-я0-9]+/gi, ' ')
    .trim();
}

function slugFromName(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function fetchHtml(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome Safari',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const html = await response.text();
    const gate = html.toLowerCase();
    if (gate.includes('just a moment') || gate.includes('enable javascript') || gate.includes('cloudflare')) {
      throw new Error('Forum anti-bot protection blocked request');
    }
    return html;
  } finally {
    clearTimeout(timeout);
  }
}

function toAbsoluteUrl(base, href) {
  try {
    return new URL(href, base).toString();
  } catch {
    return '';
  }
}

function extractLinks(html, baseUrl) {
  const links = [];
  const re = /<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let match = re.exec(html);
  while (match) {
    const href = toAbsoluteUrl(baseUrl, match[1]);
    const text = stripHtml(match[2]);
    if (href && text) links.push({ href, text });
    match = re.exec(html);
  }
  return links;
}

function scoreText(text, keywords) {
  const lower = String(text || '').toLowerCase();
  let score = 0;
  keywords.forEach((kw) => {
    if (lower.includes(kw.toLowerCase())) score += kw.length > 4 ? 3 : 1;
  });
  return score;
}

function pickBestLink(links, keywords) {
  const forumLinks = links.filter((row) => row.href.startsWith(MAJESTIC_FORUM_ROOT));
  let best = null;
  let bestScore = 0;
  forumLinks.forEach((row) => {
    const score = scoreText(row.text, keywords) + scoreText(row.href, keywords);
    if (score > bestScore) {
      bestScore = score;
      best = row;
    }
  });
  return best;
}

async function findServerStart(serverName, rootHtml) {
  const rootLinks = extractLinks(rootHtml, MAJESTIC_FORUM_ROOT);
  const comparableServer = normalizeComparable(serverName);
  const serverSlug = slugFromName(serverName);

  const direct = rootLinks.find((row) => {
    const t = normalizeComparable(row.text);
    return t.includes(comparableServer) || row.href.toLowerCase().includes(serverSlug);
  });
  if (direct) return direct;

  const queryUrl = `${MAJESTIC_FORUM_ROOT}search/?q=${encodeURIComponent(serverName)}`;
  const searchHtml = await fetchHtml(queryUrl);
  const searchLinks = extractLinks(searchHtml, queryUrl).filter((row) => row.href.startsWith(MAJESTIC_FORUM_ROOT));
  const found = searchLinks.find((row) => {
    const t = normalizeComparable(row.text);
    return t.includes(comparableServer) || row.href.toLowerCase().includes(serverSlug);
  });
  if (found) return found;

  throw new Error(`Не удалось найти раздел сервера ${serverName}`);
}

async function pickStageWithFallback(baseUrl, html, stageKeywords) {
  const baseLinks = extractLinks(html, baseUrl);
  const direct = pickBestLink(baseLinks, stageKeywords);
  if (direct) return direct;

  const forumChildren = baseLinks.filter((row) => /\/forums\//i.test(row.href)).slice(0, 12);
  let best = null;
  let bestScore = 0;
  for (const child of forumChildren) {
    try {
      const childHtml = await fetchHtml(child.href);
      const childLinks = extractLinks(childHtml, child.href);
      const candidate = pickBestLink(childLinks, stageKeywords);
      if (!candidate) continue;
      const score = scoreText(candidate.text, stageKeywords) + scoreText(candidate.href, stageKeywords);
      if (score > bestScore) {
        bestScore = score;
        best = candidate;
      }
    } catch {
      // ignore child failures
    }
  }
  return best;
}

function extractTopicBody(html) {
  const blocks = [];
  const patterns = [
    /<article[\s\S]*?<\/article>/gi,
    /<div[^>]*class="[^"]*message-body[^"]*"[\s\S]*?<\/div>/gi,
    /<main[\s\S]*?<\/main>/gi,
  ];
  patterns.forEach((re) => {
    const matches = html.match(re) || [];
    matches.forEach((m) => blocks.push(stripHtml(m)));
  });
  const merged = blocks.join(' ').replace(/\s+/g, ' ').trim();
  return merged.slice(0, 2600);
}

async function crawlLawBase(serverName) {
  const trace = [];
  const rootHtml = await fetchHtml(MAJESTIC_FORUM_ROOT);
  const serverStart = await findServerStart(serverName, rootHtml);
  trace.push({ step: 'server', title: serverStart.text, url: serverStart.href });

  let currentUrl = serverStart.href;
  let currentHtml = await fetchHtml(currentUrl);

  const stages = [
    { step: 'organizations', keys: ['организац', 'organizations'] },
    { step: 'state', keys: ['государ', 'government', 'gov', 'govеrnrnt', 'govermrnt'] },
    { step: 'law', keys: ['законодатель', 'закон', 'legislation', 'база'] },
  ];

  for (const stage of stages) {
    const picked = await pickStageWithFallback(currentUrl, currentHtml, stage.keys);
    if (!picked) continue;
    trace.push({ step: stage.step, title: picked.text, url: picked.href });
    currentUrl = picked.href;
    currentHtml = await fetchHtml(currentUrl);
  }

  let topicLinks = extractLinks(currentHtml, currentUrl).filter((row) => /\/threads\//i.test(row.href));
  if (!topicLinks.length) {
    const fallbackSearch = `${MAJESTIC_FORUM_ROOT}search/?q=${encodeURIComponent(`${serverName} законодательная база`)}`;
    const searchHtml = await fetchHtml(fallbackSearch);
    topicLinks = extractLinks(searchHtml, fallbackSearch).filter((row) => /\/threads\//i.test(row.href));
  }
  topicLinks = topicLinks.slice(0, 12);

  const docs = [];
  for (const link of topicLinks) {
    try {
      const pageHtml = await fetchHtml(link.href);
      const plain = extractTopicBody(pageHtml);
      if (!plain) continue;
      docs.push({
        title: link.text,
        url: link.href,
        text: plain,
      });
    } catch {
      // skip topic failures
    }
  }

  if (!docs.length) {
    throw new Error('Не найдено ни одной темы законодательства в открытом доступе');
  }
  return { trace, docs };
}

function buildConsultantAnswer(question, server, docs) {
  const cleanQuestion = sanitizeText(question, 1200);
  const qTokens = tokenize(cleanQuestion);
  const scored = docs
    .map((doc) => {
      const combined = `${doc.title} ${doc.text}`.toLowerCase();
      const score = qTokens.reduce((sum, token) => (combined.includes(token) ? sum + 1 : sum), 0);
      return { ...doc, score };
    })
    .sort((a, b) => b.score - a.score);

  const best = scored.slice(0, 3);
  if (!best.length) {
    return {
      text: `Не удалось найти подходящие темы по серверу ${server}. Попробуйте уточнить вопрос и написать ключевые слова (например: арест, обыск, штраф, лицензия).`,
      references: [],
    };
  }

  const bullets = best
    .map((doc, idx) => `${idx + 1}. ${doc.title}: ${doc.text.slice(0, 340)}...`)
    .join('\n');

  const plain = `Сервер: ${server}\n\nВаш вопрос: ${cleanQuestion}\n\nЧто нашёл в законодательной базе:\n${bullets}\n\nПростое объяснение:\nПо вашему вопросу ориентируйтесь в первую очередь на пункты из найденных тем выше. Сверяйте формулировки буквально и проверяйте исключения/примечания в полном тексте документа.`;

  return {
    text: plain,
    references: best.map((doc) => ({ title: doc.title, url: doc.url })),
  };
}

function parseIsoDate(value) {
  const time = new Date(String(value || '')).getTime();
  return Number.isFinite(time) ? time : 0;
}

function buildPageTemplate({ title, body }) {
  const safeTitle = String(title || 'Новая страница').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const safeBody = String(body || '')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br />');

  return `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Davis Project | ${safeTitle}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Unbounded:wght@400;600;800&family=Manrope:wght@400;500;700&display=swap"
      rel="stylesheet"
    />
    <link rel="stylesheet" href="/styles.css" />
  </head>
  <body>
    <div class="bg-glow bg-glow-1"></div>
    <div class="bg-glow bg-glow-2"></div>
    <div class="noise"></div>

    <header class="header container">
      <a class="brand" href="/">
        <img class="brand-logo" src="/assets/davis-logo.png" alt="Логотип Davis Project" />
        <span class="brand-text">Davis <span>Project</span></span>
      </a>
      <nav class="nav" id="mainNav">
        <a href="/">Главная</a>
        <a href="/consultant">Консультант</a>
        <a href="/documentflow">Документооборот</a>
        <a href="/factions">Фракции</a>
        <a href="/bot-builder">Создание бота</a>
      </nav>
      <a class="discord-btn" href="/dashboard">Личный кабинет</a>
    </header>

    <main class="container" style="margin-top: 64px; margin-bottom: 32px;">
      <section class="card" style="padding: 28px;">
        <h1>${safeTitle}</h1>
        <p>${safeBody || 'Контент будет добавлен позже.'}</p>
      </section>
    </main>

    <script src="/main.js"></script>
  </body>
</html>`;
}

function isAdminUser(user) {
  if (!user) return false;
  const expected = ADMIN_DISCORD_USERNAME.toLowerCase();
  const username = String(user.username || '').toLowerCase();
  const globalName = String(user.global_name || '').toLowerCase();
  return username === expected || globalName === expected;
}

function canManageDocTemplates(user) {
  if (!user) return false;
  if (isAdminUser(user)) return true;
  const username = String(user.username || '').toLowerCase();
  const globalName = String(user.global_name || '').toLowerCase();
  return DOC_TEMPLATE_CREATOR_NAMES.includes(username) || DOC_TEMPLATE_CREATOR_NAMES.includes(globalName);
}

function getDefaultSettings(user) {
  return {
    displayName: user.global_name || user.username,
    rolePath: 'newbie',
    preferredSection: 'guides',
    notificationsEnabled: true,
  };
}

let siteContent = normalizeContent(readJSON(CONTENT_FILE, DEFAULT_CONTENT));
let layoutOverrides = normalizeLayout(readJSON(LAYOUT_FILE, {}));
let pages = normalizePages(readJSON(PAGES_FILE, []));
let tabs = normalizeTabs(readJSON(TABS_FILE, DEFAULT_TABS));
let tabBlocks = normalizeTabBlocks(readJSON(TAB_BLOCKS_FILE, {}));
let posts = normalizePosts(readJSON(POSTS_FILE, DEFAULT_POSTS));
let participants = normalizeUsers(readJSON(USERS_FILE, []));
let pageNavigators = normalizeNavigatorMap(readJSON(NAVIGATOR_FILE, {}));
let lawCacheByServer = normalizeLawCache(readJSON(LAW_CACHE_FILE, {}));
let docTemplates = normalizeDocTemplates(readJSON(DOC_TEMPLATES_FILE, []));
let docFillsByUser = normalizeDocFills(readJSON(DOC_FILLS_FILE, {}));
let factions = normalizeFactions(readJSON(FACTIONS_FILE, []));
let botProjectsStore = normalizeBotProjectsStore(readJSON(BOT_PROJECTS_FILE, {}));
let botProjectSecretsStore = normalizeBotProjectSecretsStore(readJSON(BOT_PROJECT_SECRETS_FILE, {}));
let botFamilyApplicationsStore = normalizeBotFamilyApplicationsStore(readJSON(BOT_FAMILY_APPLICATIONS_FILE, {}));
let botContractReportsStore = normalizeBotContractReportsStore(readJSON(BOT_CONTRACT_REPORTS_FILE, {}));
function createSignedOAuthState() {
  const issuedAt = Date.now().toString(36);
  const nonce = crypto.randomBytes(10).toString('hex');
  const payload = `${issuedAt}.${nonce}`;
  const signature = crypto.createHmac('sha256', SESSION_SECRET || 'dev-secret-change-me').update(payload).digest('hex');
  return `${payload}.${signature}`;
}

function verifySignedOAuthState(stateValue) {
  const raw = sanitizeText(stateValue, 400);
  if (!raw) return { ok: false, reason: 'empty' };
  const parts = raw.split('.');
  if (parts.length !== 3) return { ok: false, reason: 'format' };

  const [issuedAtBase36, nonce, signature] = parts;
  if (!issuedAtBase36 || !nonce || !signature) return { ok: false, reason: 'format' };
  if (!/^[a-z0-9]+$/i.test(issuedAtBase36)) return { ok: false, reason: 'timestamp' };
  if (!/^[a-f0-9]{20}$/i.test(nonce)) return { ok: false, reason: 'nonce' };
  if (!/^[a-f0-9]{64}$/i.test(signature)) return { ok: false, reason: 'signature' };

  const issuedAt = parseInt(issuedAtBase36, 36);
  if (!Number.isFinite(issuedAt) || issuedAt <= 0) return { ok: false, reason: 'timestamp' };
  if (Date.now() - issuedAt > OAUTH_STATE_TTL_MS) return { ok: false, reason: 'expired' };

  const payload = `${issuedAtBase36}.${nonce}`;
  const expected = crypto.createHmac('sha256', SESSION_SECRET || 'dev-secret-change-me').update(payload).digest('hex');
  const expectedBuf = Buffer.from(expected, 'hex');
  const providedBuf = Buffer.from(signature, 'hex');
  if (expectedBuf.length !== providedBuf.length) return { ok: false, reason: 'signature' };
  if (!crypto.timingSafeEqual(expectedBuf, providedBuf)) return { ok: false, reason: 'signature' };

  return { ok: true };
}
const consultantSyncState = {
  enabled: CONSULTANT_SYNC_ENABLED,
  intervalMinutes: CONSULTANT_SYNC_INTERVAL_MINUTES,
  perRun: CONSULTANT_SYNC_PER_RUN,
  serverCooldownHours: CONSULTANT_SERVER_COOLDOWN_HOURS,
  inProgress: false,
  lastRunAt: null,
  lastSuccessAt: null,
  lastError: '',
  nextRunAt: null,
  runs: 0,
  updatedServers: 0,
  failedServers: 0,
  lastRunServers: [],
};

writeJSON(CONTENT_FILE, siteContent);
writeJSON(LAYOUT_FILE, layoutOverrides);
writeJSON(PAGES_FILE, pages);
writeJSON(TABS_FILE, tabs);
writeJSON(TAB_BLOCKS_FILE, tabBlocks);
writeJSON(POSTS_FILE, posts);
writeJSON(USERS_FILE, participants);
writeJSON(NAVIGATOR_FILE, pageNavigators);
writeJSON(LAW_CACHE_FILE, lawCacheByServer);
writeJSON(DOC_TEMPLATES_FILE, docTemplates);
writeJSON(DOC_FILLS_FILE, docFillsByUser);
writeJSON(FACTIONS_FILE, factions);
writeJSON(BOT_PROJECTS_FILE, botProjectsStore);
writeJSON(BOT_PROJECT_SECRETS_FILE, botProjectSecretsStore);
writeJSON(BOT_FAMILY_APPLICATIONS_FILE, botFamilyApplicationsStore);
writeJSON(BOT_CONTRACT_REPORTS_FILE, botContractReportsStore);
fs.mkdirSync(PAGES_DIR, { recursive: true });
fs.mkdirSync(FACTIONS_UPLOAD_DIR, { recursive: true });

function upsertParticipant(user) {
  if (!user || !user.id) return;

  const now = new Date().toISOString();
  const index = participants.findIndex((row) => row.id === user.id);

  if (index === -1) {
    participants.push({
      id: user.id,
      username: sanitizeText(user.username, 80),
      global_name: sanitizeText(user.global_name, 80),
      avatar: sanitizeText(user.avatar, 120),
      email: sanitizeText(user.email, 120),
      firstSeenAt: now,
      lastSeenAt: now,
      loginCount: 1,
    });
  } else {
    const current = participants[index];
    participants[index] = {
      ...current,
      username: sanitizeText(user.username, 80),
      global_name: sanitizeText(user.global_name, 80),
      avatar: sanitizeText(user.avatar, 120),
      email: sanitizeText(user.email, 120),
      lastSeenAt: now,
      loginCount: (current.loginCount || 0) + 1,
    };
  }

  writeJSON(USERS_FILE, participants);
}

async function refreshServerLawCache(serverName, reason = 'background') {
  try {
    const { trace, docs } = await crawlLawBase(serverName);
    const nowIso = new Date().toISOString();
    lawCacheByServer[serverName] = {
      updatedAt: nowIso,
      docs,
      trace,
    };
    writeJSON(LAW_CACHE_FILE, lawCacheByServer);
    consultantSyncState.lastSuccessAt = nowIso;
    consultantSyncState.lastError = '';
    console.log(`[consultant-sync] updated "${serverName}" (${reason}), docs: ${docs.length}`);
    return { ok: true, server: serverName, docsCount: docs.length };
  } catch (error) {
    const message = String(error.message || error);
    console.warn(`[consultant-sync] failed "${serverName}" (${reason}): ${message}`);
    return { ok: false, server: serverName, error: message };
  }
}

function getServersForSync(limit, cooldownMs) {
  const now = Date.now();
  return [...MAJESTIC_SERVERS]
    .map((serverName) => {
      const cached = lawCacheByServer[serverName];
      const updatedAtMs = parseIsoDate(cached?.updatedAt);
      const ageMs = updatedAtMs ? now - updatedAtMs : Number.MAX_SAFE_INTEGER;
      return {
        serverName,
        stale: !updatedAtMs || ageMs >= cooldownMs,
        ageMs,
      };
    })
    .sort((a, b) => b.ageMs - a.ageMs)
    .filter((row) => row.stale)
    .slice(0, limit)
    .map((row) => row.serverName);
}

async function runConsultantBackgroundSync(trigger = 'timer') {
  if (!consultantSyncState.enabled || consultantSyncState.inProgress) return;

  consultantSyncState.inProgress = true;
  consultantSyncState.lastRunAt = new Date().toISOString();
  consultantSyncState.runs += 1;
  consultantSyncState.lastRunServers = [];
  consultantSyncState.lastError = '';

  const cooldownMs = consultantSyncState.serverCooldownHours * 60 * 60 * 1000;
  const pickedServers = getServersForSync(consultantSyncState.perRun, cooldownMs);
  let updated = 0;
  let failed = 0;

  for (const serverName of pickedServers) {
    const result = await refreshServerLawCache(serverName, trigger);
    consultantSyncState.lastRunServers.push(serverName);
    if (result.ok) {
      updated += 1;
    } else {
      failed += 1;
      consultantSyncState.lastError = result.error;
    }
  }

  consultantSyncState.updatedServers = updated;
  consultantSyncState.failedServers = failed;
  consultantSyncState.inProgress = false;
  consultantSyncState.nextRunAt = new Date(
    Date.now() + consultantSyncState.intervalMinutes * 60 * 1000
  ).toISOString();
}

function startConsultantBackgroundSync() {
  if (!consultantSyncState.enabled) {
    console.log('[consultant-sync] disabled by env');
    return;
  }

  const intervalMs = consultantSyncState.intervalMinutes * 60 * 1000;
  consultantSyncState.nextRunAt = new Date(Date.now() + Math.min(intervalMs, 10_000)).toISOString();

  setTimeout(() => {
    runConsultantBackgroundSync('startup').catch((error) => {
      consultantSyncState.lastError = String(error.message || error);
      consultantSyncState.inProgress = false;
    });
  }, 3000);

  const timer = setInterval(() => {
    runConsultantBackgroundSync('interval').catch((error) => {
      consultantSyncState.lastError = String(error.message || error);
      consultantSyncState.inProgress = false;
    });
  }, intervalMs);

  if (typeof timer.unref === 'function') {
    timer.unref();
  }
}

app.set('trust proxy', 1);

app.use(
  session({
    secret: SESSION_SECRET || 'dev-secret-change-me',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: 'auto',
      maxAge: 1000 * 60 * 60 * 24,
    },
  })
);

app.use(express.json({ limit: '20mb' }));
app.use(express.static('public', { redirect: false }));

app.use((req, res, next) => {
  if (req.session?.user?.id) return next();
  const cookies = parseCookieHeader(req.headers?.cookie || '');
  const authCookie = cookies[AUTH_COOKIE_NAME];
  const restoredUser = verifySignedAuthCookieValue(authCookie);
  if (restoredUser && req.session) {
    req.session.user = restoredUser;
    if (!req.session.settings) {
      req.session.settings = getDefaultSettings(restoredUser);
    }
    upsertParticipant(restoredUser);
  }
  return next();
});

function resolveAuthenticatedUser(req) {
  const sessionUser = req.session?.user;
  if (sessionUser?.id) return sessionUser;
  const cookies = parseCookieHeader(req.headers?.cookie || '');
  const restoredUser = verifySignedAuthCookieValue(cookies[AUTH_COOKIE_NAME]);
  if (restoredUser && req.session) {
    req.session.user = restoredUser;
    if (!req.session.settings) {
      req.session.settings = getDefaultSettings(restoredUser);
    }
  }
  return restoredUser || null;
}

function requireAuth(req, res, next) {
  const authUser = resolveAuthenticatedUser(req);
  if (!authUser) {
    return res.status(401).json({ error: 'not_authenticated' });
  }

  return next();
}

function requireAdmin(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ error: 'not_authenticated' });
  }

  if (!isAdminUser(req.session.user)) {
    return res.status(403).json({ error: 'forbidden' });
  }

  return next();
}

function requireDocTemplateManager(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ error: 'not_authenticated' });
  }
  if (!canManageDocTemplates(req.session.user)) {
    return res.status(403).json({ error: 'forbidden' });
  }
  return next();
}

function getFactionAccessDeniedMessage() {
  return 'Фракция доступна только участникам указанного Discord-сервера или создателю фракции.';
}

async function requireFactionAccess(req, res) {
  const factionIndex = findFactionIndexById(req.params.id);
  if (factionIndex === -1) {
    res.status(404).json({ error: 'faction_not_found' });
    return null;
  }
  const faction = factions[factionIndex];
  if (!req.session.user) {
    res.status(401).json({ error: 'not_authenticated', message: 'Для доступа к фракциям войдите через Discord.' });
    return null;
  }
  const canAccess = await canAccessFaction(req.session.user, faction);
  if (!canAccess) {
    res.status(403).json({ error: 'forbidden', message: getFactionAccessDeniedMessage() });
    return null;
  }
  const canManage = canManageFaction(req.session.user, faction);
  return { factionIndex, faction, canManage };
}

async function requireFactionManage(req, res) {
  const context = await requireFactionAccess(req, res);
  if (!context) return null;
  if (!context.canManage) {
    res.status(403).json({ error: 'forbidden' });
    return null;
  }
  return context;
}

app.get('/api/me', (req, res) => {
  const authUser = resolveAuthenticatedUser(req);
  if (!authUser) {
    return res.json({ authenticated: false });
  }

  return res.json({
    authenticated: true,
    isAdmin: isAdminUser(authUser),
    canManageDocTemplates: canManageDocTemplates(authUser),
    user: authUser,
  });
});

app.get('/api/bot-builder/projects', requireAuth, (req, res) => {
  const userId = sanitizeText(req.session.user.id, 80);
  const projects = getBotProjectsForUser(userId);
  return res.json({ projects: withBotProjectSecretFlags(userId, projects) });
});

app.post('/api/bot-builder/projects', requireAuth, (req, res) => {
  const userId = sanitizeText(req.session.user.id, 80);
  const projects = getBotProjectsForUser(userId);
  const now = new Date().toISOString();
  const name = sanitizeText(req.body?.name, 80) || createNextBotProjectName(projects);

  const project = normalizeBotProject({
    ...req.body,
    id: crypto.randomUUID(),
    name,
    createdAt: now,
    updatedAt: now,
  });

  if (!project) {
    return res.status(400).json({ error: 'invalid_payload', message: 'Не удалось создать бота: проверьте поля.' });
  }

  projects.unshift(project);
  botProjectsStore[userId] = projects.slice(0, 120);
  saveBotProjectsStore();

  const draftToken = sanitizeText(req.body?.botToken, 2000);
  if (draftToken && !setBotProjectStoredToken(userId, project.id, draftToken)) {
    return res.status(500).json({
      error: 'token_store_failed',
      message: 'Не удалось сохранить BOT_TOKEN на сервере.',
    });
  }

  void syncBotGatewaySessions('project-create');
  const responseProjects = withBotProjectSecretFlags(userId, botProjectsStore[userId]);
  const responseProject = responseProjects.find((row) => row.id === project.id) || project;
  return res.status(201).json({ ok: true, project: responseProject, projects: responseProjects });
});

app.put('/api/bot-builder/projects/:id', requireAuth, (req, res) => {
  const userId = sanitizeText(req.session.user.id, 80);
  const projects = getBotProjectsForUser(userId);
  const id = sanitizeText(req.params.id, 80);
  const index = projects.findIndex((row) => row.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'not_found', message: 'Бот не найден.' });
  }

  const current = projects[index];
  const currentCloud = normalizeBotProjectCloud(current.cloud);
  const requestedCloud = req.body?.cloud && typeof req.body.cloud === 'object' ? req.body.cloud : {};
  const nextCloud = normalizeBotProjectCloud({
    ...currentCloud,
    autoSync:
      typeof requestedCloud.autoSync === 'boolean' ? requestedCloud.autoSync : currentCloud.autoSync,
  });
  const merged = normalizeBotProject({
    ...current,
    ...req.body,
    cloud: nextCloud,
    id: current.id,
    name: sanitizeText(req.body?.name, 80) || current.name,
    createdAt: current.createdAt,
    updatedAt: new Date().toISOString(),
  });

  if (!merged) {
    return res.status(400).json({ error: 'invalid_payload', message: 'Не удалось сохранить бота: проверьте поля.' });
  }

  projects[index] = merged;
  botProjectsStore[userId] = projects.slice(0, 120);
  saveBotProjectsStore();

  const draftToken = sanitizeText(req.body?.botToken, 2000);
  if (draftToken && !setBotProjectStoredToken(userId, merged.id, draftToken)) {
    return res.status(500).json({
      error: 'token_store_failed',
      message: 'Не удалось сохранить BOT_TOKEN на сервере.',
    });
  }

  if (merged.cloud?.connected && merged.cloud?.autoSync) {
    void queueBotProjectCloudSync(userId, merged.id, 'auto-save');
  }

  void syncBotGatewaySessions('project-update');
  const responseProjects = withBotProjectSecretFlags(userId, botProjectsStore[userId]);
  const responseProject = responseProjects.find((row) => row.id === merged.id) || merged;
  return res.json({ ok: true, project: responseProject, projects: responseProjects });
});

app.post('/api/bot-builder/projects/:id/cloud/connect', requireAuth, async (req, res) => {
  const userId = sanitizeText(req.session.user.id, 80);
  const projectId = sanitizeText(req.params.id, 80);
  const context = findBotProjectContext(userId, projectId);
  if (!context) {
    return res.status(404).json({ error: 'not_found', message: 'Бот не найден.' });
  }

  const tokenFromBody = sanitizeText(req.body?.botToken, 2000);
  const storedToken = getBotProjectStoredToken(userId, projectId);
  const botToken = tokenFromBody || storedToken;
  if (!botToken) {
    return res.status(400).json({ error: 'token_required', message: 'Укажите BOT_TOKEN для облачного подключения.' });
  }

  const meResponse = await fetchDiscordBotApi(botToken, 'https://discord.com/api/v10/users/@me');
  if (!meResponse.ok) {
    return res.status(400).json({
      error: 'discord_auth_failed',
      message: formatDiscordApiError(meResponse),
    });
  }

  if (tokenFromBody && !setBotProjectStoredToken(userId, projectId, tokenFromBody)) {
    return res.status(500).json({
      error: 'token_store_failed',
      message: 'Не удалось сохранить BOT_TOKEN на сервере.',
    });
  }

  const me = meResponse.data && typeof meResponse.data === 'object' ? meResponse.data : {};
  const now = new Date().toISOString();
  const currentCloud = normalizeBotProjectCloud(context.project.cloud);
  const nextCloud = normalizeBotProjectCloud({
    ...currentCloud,
    connected: true,
    autoSync: req.body?.autoSync !== false,
    connectedAt: currentCloud.connectedAt || now,
    lastSyncedAt: now,
    lastSyncError: '',
    botUserId: sanitizeText(me.id, 40),
    botUsername: sanitizeText(me.username, 120),
  });

  const merged = saveBotProjectContext(context, {
    ...context.project,
    clientId: /^\d{5,30}$/.test(sanitizeText(req.body?.clientId, 40))
      ? sanitizeText(req.body?.clientId, 40)
      : context.project.clientId,
    guildId: /^\d{5,30}$/.test(sanitizeText(req.body?.guildId, 40))
      ? sanitizeText(req.body?.guildId, 40)
      : context.project.guildId,
    cloud: nextCloud,
    updatedAt: now,
  });

  if (!merged) {
    return res.status(500).json({ error: 'save_failed', message: 'Не удалось сохранить облачное подключение.' });
  }

  let sync = { ok: true, message: 'Подключение сохранено.' };
  if (merged.cloud?.autoSync) {
    sync = await queueBotProjectCloudSync(userId, projectId, 'connect');
  }

  const finalProject = sync.project || merged;
  const inviteUrl = buildDiscordBotInviteUrl(
    finalProject?.clientId || merged.clientId || context.project.clientId,
    finalProject?.guildId || merged.guildId || context.project.guildId
  );

  void syncBotGatewaySessions('cloud-connect');
  return res.json({
    ok: true,
    message: sync.ok ? 'Бот подключен в облачном режиме.' : sync.message,
    project: withBotProjectSecretFlags(userId, [finalProject]).find(Boolean) || finalProject,
    inviteUrl,
  });
});

app.post('/api/bot-builder/projects/:id/cloud/disconnect', requireAuth, (req, res) => {
  const userId = sanitizeText(req.session.user.id, 80);
  const projectId = sanitizeText(req.params.id, 80);
  const context = findBotProjectContext(userId, projectId);
  if (!context) {
    return res.status(404).json({ error: 'not_found', message: 'Бот не найден.' });
  }

  removeBotProjectStoredToken(userId, projectId);
  const currentCloud = normalizeBotProjectCloud(context.project.cloud);
  const merged = saveBotProjectContext(context, {
    ...context.project,
    cloud: normalizeBotProjectCloud({
      ...currentCloud,
      connected: false,
      connectedAt: '',
      botUserId: '',
      botUsername: '',
      lastSyncError: '',
    }),
    updatedAt: new Date().toISOString(),
  });

  void syncBotGatewaySessions('cloud-disconnect');
  return res.json({
    ok: true,
    message: 'Облачное подключение отключено.',
    project:
      withBotProjectSecretFlags(userId, [merged || context.project]).find(Boolean) || (merged || context.project),
  });
});

app.post('/api/bot-builder/projects/:id/cloud/sync', requireAuth, async (req, res) => {
  const userId = sanitizeText(req.session.user.id, 80);
  const projectId = sanitizeText(req.params.id, 80);
  const result = await queueBotProjectCloudSync(userId, projectId, 'manual');
  void syncBotGatewaySessions('cloud-sync');
  if (!result.ok) {
    return res.status(400).json({
      error: 'sync_failed',
      message: result.message || 'Синхронизация завершилась с ошибкой.',
      project:
        withBotProjectSecretFlags(userId, [result.project || null]).find(Boolean) || (result.project || null),
    });
  }
  return res.json({
    ok: true,
    message: result.message || 'Синхронизация выполнена.',
    project:
      withBotProjectSecretFlags(userId, [result.project || null]).find(Boolean) || (result.project || null),
  });
});

app.get('/api/bot-builder/projects/:id/cloud/status', requireAuth, async (req, res) => {
  const userId = sanitizeText(req.session.user.id, 80);
  const projectId = sanitizeText(req.params.id, 80);
  const context = findBotProjectContext(userId, projectId);
  if (!context) {
    return res.status(404).json({ error: 'not_found', message: 'Бот не найден.' });
  }

  const project = normalizeBotProject(context.project);
  const cloud = normalizeBotProjectCloud(context.project.cloud);
  const hasStoredToken = Boolean(getBotProjectStoredToken(userId, projectId));
  const diagnostics = {
    inGuild: null,
    publishChannelAccess: null,
    contractsPublishChannelAccess: null,
    contractsReportChannelAccess: null,
    hints: [],
  };
  const inviteUrl = buildDiscordBotInviteUrl(project?.clientId, project?.guildId);

  if (hasStoredToken) {
    const botToken = getBotProjectStoredToken(userId, projectId);
    const guildId = sanitizeText(project?.guildId, 40);
    const botUserId = sanitizeText(cloud.botUserId, 40);
    const publishChannelId = sanitizeText(project?.familyApplications?.publishChannelId, 40);
    const contracts = normalizeBotProjectContracts(project?.contracts);
    const contractsPublishChannelId = sanitizeText(contracts.publishChannelId, 40);
    const contractsReportChannelId = sanitizeText(contracts.reportChannelId, 40);

    if (/^\d{5,30}$/.test(guildId) && /^\d{5,30}$/.test(botUserId)) {
      const memberResponse = await fetchDiscordBotApi(
        botToken,
        `https://discord.com/api/v10/guilds/${guildId}/members/${botUserId}`
      );
      diagnostics.inGuild = memberResponse.ok;
      if (!memberResponse.ok) {
        diagnostics.hints.push(
          memberResponse.status === 404
            ? 'Бот не найден на сервере. Пригласите его по ссылке ниже.'
            : `Проверка членства бота: ${formatDiscordApiError(memberResponse)}`
        );
      }
    }

    if (/^\d{5,30}$/.test(publishChannelId)) {
      const channelResponse = await fetchDiscordBotApi(
        botToken,
        `https://discord.com/api/v10/channels/${publishChannelId}`
      );
      diagnostics.publishChannelAccess = channelResponse.ok;
      if (!channelResponse.ok) {
        diagnostics.hints.push(`Доступ к каналу для эмбеда: ${formatDiscordApiError(channelResponse)}`);
      }
    }

    if (/^\d{5,30}$/.test(contractsPublishChannelId)) {
      const channelResponse = await fetchDiscordBotApi(
        botToken,
        `https://discord.com/api/v10/channels/${contractsPublishChannelId}`
      );
      diagnostics.contractsPublishChannelAccess = channelResponse.ok;
      if (!channelResponse.ok) {
        diagnostics.hints.push(`Доступ к каналу эмбеда контрактов: ${formatDiscordApiError(channelResponse)}`);
      }
    }

    if (/^\d{5,30}$/.test(contractsReportChannelId)) {
      const channelResponse = await fetchDiscordBotApi(
        botToken,
        `https://discord.com/api/v10/channels/${contractsReportChannelId}`
      );
      diagnostics.contractsReportChannelAccess = channelResponse.ok;
      if (!channelResponse.ok) {
        diagnostics.hints.push(`Доступ к каналу отчетов контрактов: ${formatDiscordApiError(channelResponse)}`);
      }
    }
  } else {
    diagnostics.hints.push('BOT_TOKEN не сохранен. Введите токен и сохраните настройки.');
  }

  return res.json({
    ok: true,
    cloud,
    hasStoredToken,
    inviteUrl,
    diagnostics,
  });
});

app.get('/api/bot-builder/public/:id', (req, res) => {
  const projectId = sanitizeText(req.params.id, 80);
  const context = findBotProjectByIdGlobal(projectId);
  if (!context) {
    return res.status(404).json({ error: 'not_found', message: 'Бот не найден.' });
  }

  const project = normalizeBotProject(context.project);
  if (!project) {
    return res.status(404).json({ error: 'not_found', message: 'Бот не найден.' });
  }

  const family = normalizeBotProjectFamilyApplications(project.familyApplications);
  const contracts = normalizeBotProjectContracts(project.contracts);
  return res.json({
    ok: true,
    project: {
      id: project.id,
      name: project.name,
      guildId: project.guildId,
      cloudConnected: Boolean(normalizeBotProjectCloud(project.cloud).connected),
      familyApplications: {
        embedTitle: family.embedTitle,
        openButtonLabel: family.openButtonLabel,
        questions: family.questions,
        publishChannelId: family.publishChannelId,
      },
      contracts: {
        embedTitle: contracts.embedTitle,
        openButtonLabel: contracts.openButtonLabel,
        selectedContracts: contracts.selectedContracts,
        publishChannelId: contracts.publishChannelId,
        reportChannelId: contracts.reportChannelId,
      },
    },
  });
});

app.post('/api/bot-builder/public/:id/apply', async (req, res) => {
  const projectId = sanitizeText(req.params.id, 80);
  const context = findBotProjectByIdGlobal(projectId);
  if (!context) {
    return res.status(404).json({ error: 'not_found', message: 'Бот не найден.' });
  }

  const project = normalizeBotProject(context.project);
  if (!project) {
    return res.status(404).json({ error: 'not_found', message: 'Бот не найден.' });
  }

  const family = normalizeBotProjectFamilyApplications(project.familyApplications);
  const botToken = getBotProjectStoredToken(context.ownerUserId, project.id);
  if (!botToken) {
    return res.status(400).json({
      error: 'cloud_not_connected',
      message: 'Для отправки заявки администратор должен подключить облачный режим бота.',
    });
  }

  if (!family.ticketCategoryId) {
    return res.status(400).json({
      error: 'ticket_category_required',
      message: 'В проекте не указан ID категории для каналов заявок.',
    });
  }

  let guildId = sanitizeText(project.guildId, 40);
  const resolveGuildByChannelId = async (channelIdInput) => {
    const channelId = sanitizeText(channelIdInput, 40);
    if (!/^\d{5,30}$/.test(channelId)) return '';
    const lookup = await fetchDiscordBotApi(botToken, `https://discord.com/api/v10/channels/${channelId}`);
    if (!lookup.ok) return '';
    return sanitizeText(lookup.data?.guild_id, 40);
  };
  if (!/^\d{5,30}$/.test(guildId)) {
    guildId =
      (await resolveGuildByChannelId(family.ticketCategoryId)) ||
      (await resolveGuildByChannelId(family.publishChannelId)) ||
      (await resolveGuildByChannelId(family.callChannelId));
  }
  if (!/^\d{5,30}$/.test(guildId)) {
    return res.status(400).json({
      error: 'guild_required',
      message:
        'Не удалось определить Discord-сервер. Укажите GUILD_ID в настройках бота или заполните ID категории/канала из нужного сервера.',
    });
  }

  const categoryLookup = await fetchDiscordBotApi(
    botToken,
    `https://discord.com/api/v10/channels/${family.ticketCategoryId}`
  );
  if (!categoryLookup.ok) {
    return res.status(400).json({
      error: 'ticket_category_unavailable',
      message: `Категория заявок недоступна: ${formatDiscordApiError(categoryLookup)}`,
    });
  }
  const categoryType = Number(categoryLookup.data?.type);
  if (categoryType !== 4) {
    return res.status(400).json({
      error: 'ticket_category_invalid',
      message: 'ID категории заявок указывает не на категорию Discord.',
    });
  }
  const categoryGuildId = sanitizeText(categoryLookup.data?.guild_id, 40);
  if (/^\d{5,30}$/.test(categoryGuildId)) {
    guildId = categoryGuildId;
  }

  const applicantFallback = req.session?.user
    ? sanitizeText(req.session.user.global_name || req.session.user.username, 120)
    : '';
  const applicantName = sanitizeText(req.body?.applicantName, 120) || applicantFallback || 'Не указан';
  const applicantDiscordIdRaw = sanitizeText(req.session?.user?.id, 40);
  const applicantDiscordId = /^\d{5,30}$/.test(applicantDiscordIdRaw) ? applicantDiscordIdRaw : '';

  const rawAnswers = Array.isArray(req.body?.answers) ? req.body.answers : [];
  const answers = family.questions.map((question, index) => ({
    question,
    answer: sanitizeText(rawAnswers[index], 1000) || '—',
  }));

  const application = upsertBotFamilyApplication(project.id, {
    id: crypto.randomUUID(),
    projectId: project.id,
    applicantName,
    applicantDiscordId,
    answers,
    status: 'new',
    sourceSessionUserId: sanitizeText(req.session?.user?.id, 80),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    reviewedBy: '',
    reviewedByUserId: '',
    reviewNote: '',
    callChannelId: '',
    discordGuildId: guildId,
    discordChannelId: '',
    discordMessageId: '',
  });
  if (!application) {
    return res.status(500).json({
      error: 'application_save_failed',
      message: 'Не удалось сохранить заявку на сайте.',
    });
  }

  const ticketPayload = buildBotFamilyApplicationMessagePayload({
    project,
    family,
    application,
  });

  const applicantSlug = sanitizeSlug(applicantName) || (applicantDiscordId ? `user-${applicantDiscordId.slice(-4)}` : 'user');
  const channelSuffix = String(application.id || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(-4) || Date.now().toString(36).slice(-4);
  const channelName = `zayavka-${applicantSlug}-${channelSuffix}`.slice(0, 90);
  const allowBasic = String(1024 + 2048 + 65536);
  const denyView = String(1024);
  const permissionOverwrites = [{ id: guildId, type: 0, allow: '0', deny: denyView }];
  if (applicantDiscordId) {
    permissionOverwrites.push({
      id: applicantDiscordId,
      type: 1,
      allow: allowBasic,
      deny: '0',
    });
  }
  Array.from(new Set(Array.isArray(family.reviewerRoleIds) ? family.reviewerRoleIds : [])).forEach((roleId) => {
    if (!/^\d{5,30}$/.test(String(roleId || ''))) return;
    permissionOverwrites.push({
      id: String(roleId),
      type: 0,
      allow: allowBasic,
      deny: '0',
    });
  });

  const channelResponse = await fetchDiscordBotApi(
    botToken,
    `https://discord.com/api/v10/guilds/${guildId}/channels`,
    {
      method: 'POST',
      body: {
        name: channelName,
        type: 0,
        parent_id: family.ticketCategoryId,
        topic: truncateDiscordValue(`Заявка ${application.id} | ${project.name}`, 1024),
        permission_overwrites: permissionOverwrites,
      },
    }
  );
  if (!channelResponse.ok) {
    removeBotFamilyApplication(project.id, application.id);
    return res.status(400).json({
      error: 'discord_channel_create_failed',
      message: `Не удалось создать канал заявки: ${formatDiscordApiError(channelResponse)}`,
    });
  }
  const ticketChannelId = sanitizeText(channelResponse.data?.id, 40);
  if (!/^\d{5,30}$/.test(ticketChannelId)) {
    removeBotFamilyApplication(project.id, application.id);
    return res.status(400).json({
      error: 'discord_channel_create_failed',
      message: 'Discord не вернул ID созданного канала заявки.',
    });
  }

  const reviewerMentions = Array.isArray(family.reviewerRoleIds)
    ? family.reviewerRoleIds.map((id) => `<@&${id}>`).join(' ')
    : '';
  const notifyParts = [];
  if (reviewerMentions) notifyParts.push(reviewerMentions);
  if (applicantDiscordId) notifyParts.push(`<@${applicantDiscordId}>`);
  const notifyContent = notifyParts.join(' ').trim();

  const sendResponse = await fetchDiscordBotApi(
    botToken,
    `https://discord.com/api/v10/channels/${ticketChannelId}/messages`,
    {
      method: 'POST',
      body: {
        ...(notifyContent ? { content: notifyContent } : {}),
        allowed_mentions: {
          parse: [],
          roles: Array.isArray(family.reviewerRoleIds) ? family.reviewerRoleIds.slice(0, 30) : [],
          users: applicantDiscordId ? [applicantDiscordId] : [],
        },
        embeds: ticketPayload.embeds,
        components: ticketPayload.components,
      },
    }
  );

  if (!sendResponse.ok) {
    await fetchDiscordBotApi(botToken, `https://discord.com/api/v10/channels/${ticketChannelId}`, {
      method: 'DELETE',
    });
    removeBotFamilyApplication(project.id, application.id);
    return res.status(400).json({
      error: 'discord_publish_failed',
      message: formatDiscordApiError(sendResponse),
    });
  }

  const messageId = sanitizeText(sendResponse.data?.id, 40);
  if (/^\d{5,30}$/.test(messageId)) {
    upsertBotFamilyApplication(project.id, {
      ...application,
      discordGuildId: guildId,
      discordChannelId: ticketChannelId,
      discordMessageId: messageId,
      updatedAt: new Date().toISOString(),
    });
  }

  return res.json({
    ok: true,
    message: 'Заявка отправлена в Discord. Создан отдельный канал с кнопками действий.',
    channelId: ticketChannelId,
  });
});

app.get('/bot-builder/application-action', async (req, res) => {
  const projectId = sanitizeText(req.query?.projectId, 80);
  const applicationId = sanitizeText(req.query?.applicationId, 80);
  const action = sanitizeText(req.query?.action, 24).toLowerCase();
  const expiresAt = Number(req.query?.expiresAt || 0);
  const sig = sanitizeText(req.query?.sig, 240);

  const sendResultPage = (ok, title, details) => {
    const safeTitle = escapeHtml(sanitizeText(title, 180));
    const safeDetails = escapeHtml(sanitizeText(details, 800));
    const stateText = ok ? 'Успешно' : 'Ошибка';
    const stateColor = ok ? '#75f1b4' : '#ff9ab9';
    return res.status(ok ? 200 : 400).send(`<!doctype html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Davis Project | Действие по заявке</title>
    <style>
      body { margin:0; font-family: Manrope, Arial, sans-serif; background:#11081f; color:#f2e9ff; }
      .wrap { max-width:760px; margin:40px auto; padding:0 16px; }
      .card { border:1px solid rgba(204,160,255,.28); border-radius:16px; padding:20px; background:rgba(255,255,255,.04); }
      h1 { margin:0 0 10px; font-size:1.4rem; }
      p { margin:0 0 10px; line-height:1.55; }
      .state { display:inline-block; padding:6px 10px; border-radius:999px; border:1px solid ${stateColor}; color:${stateColor}; margin-bottom:12px; font-weight:700; }
      .hint { opacity:.86; font-size:.94rem; }
    </style>
  </head>
  <body>
    <main class="wrap">
      <section class="card">
        <div class="state">${stateText}</div>
        <h1>${safeTitle}</h1>
        <p>${safeDetails}</p>
        <p class="hint">Можете закрыть вкладку и вернуться в Discord.</p>
      </section>
    </main>
  </body>
</html>`);
  };

  if (!projectId || !applicationId || !action || !expiresAt || !sig) {
    return sendResultPage(false, 'Некорректная ссылка действия.', 'Проверьте кнопку в Discord и попробуйте снова.');
  }

  if (Number.isNaN(expiresAt) || expiresAt < Date.now()) {
    return sendResultPage(false, 'Ссылка истекла.', 'Нажмите кнопку еще раз в актуальном сообщении Discord.');
  }

  if (!verifyBotFamilyActionSignature({ projectId, applicationId, action, expiresAt, signature: sig })) {
    return sendResultPage(false, 'Подпись действия не прошла проверку.', 'Используйте кнопку из сообщения Discord.');
  }

  const result = await processBotFamilyApplicationAction({
    projectIdInput: projectId,
    applicationIdInput: applicationId,
    actionInput: action,
    reviewerNameInput: sanitizeText(req.session?.user?.global_name || req.session?.user?.username, 120) || 'Оператор сайта',
    reviewerUserIdInput: sanitizeText(req.session?.user?.id, 80),
    reviewerRoleIdsInput: [],
    skipPermissionCheck: true,
  });

  if (!result.ok) {
    return sendResultPage(false, 'Ошибка действия', result.message || 'Не удалось выполнить действие.');
  }
  return sendResultPage(
    true,
    `Готово: ${sanitizeText(result.statusText, 120) || 'статус обновлен'}`,
    sanitizeText(result.message, 800) || 'Действие выполнено.'
  );
});

app.get('/api/bot-builder/public/:id/contracts', (req, res) => {
  const projectId = sanitizeText(req.params.id, 80);
  const context = findBotProjectByIdGlobal(projectId);
  if (!context) {
    return res.status(404).json({ error: 'not_found', message: 'Бот не найден.' });
  }

  const project = normalizeBotProject(context.project);
  if (!project) {
    return res.status(404).json({ error: 'not_found', message: 'Бот не найден.' });
  }

  const contracts = normalizeBotProjectContracts(project.contracts);
  return res.json({
    ok: true,
    project: {
      id: project.id,
      name: project.name,
      cloudConnected: Boolean(normalizeBotProjectCloud(project.cloud).connected),
      contracts: {
        embedTitle: contracts.embedTitle,
        openButtonLabel: contracts.openButtonLabel,
        selectedContracts: contracts.selectedContracts,
        reportChannelId: contracts.reportChannelId,
      },
    },
  });
});

app.post('/api/bot-builder/public/:id/contracts/report', async (req, res) => {
  const projectId = sanitizeText(req.params.id, 80);
  const context = findBotProjectByIdGlobal(projectId);
  if (!context) {
    return res.status(404).json({ error: 'not_found', message: 'Бот не найден.' });
  }

  const project = normalizeBotProject(context.project);
  if (!project) {
    return res.status(404).json({ error: 'not_found', message: 'Бот не найден.' });
  }

  const contracts = normalizeBotProjectContracts(project.contracts);
  const botToken = getBotProjectStoredToken(context.ownerUserId, project.id);
  if (!botToken) {
    return res.status(400).json({
      error: 'cloud_not_connected',
      message: 'Для отправки отчета администратор должен подключить облачный режим бота.',
    });
  }

  if (!contracts.reportChannelId) {
    return res.status(400).json({
      error: 'report_channel_required',
      message: 'В проекте не указан ID канала для отчетов по контрактам.',
    });
  }

  const selectedContracts = normalizeBotProjectContractNames(contracts.selectedContracts);
  const contractName = sanitizeText(req.body?.contractName, 120);
  if (!selectedContracts.includes(contractName)) {
    return res.status(400).json({
      error: 'invalid_contract',
      message: 'Выберите контракт из списка, настроенного в боте.',
    });
  }

  const applicantFallback = req.session?.user
    ? sanitizeText(req.session.user.global_name || req.session.user.username, 120)
    : '';
  const applicantDiscordIdRaw = sanitizeText(req.session?.user?.id, 40);
  const applicantDiscordId = /^\d{5,30}$/.test(applicantDiscordIdRaw) ? applicantDiscordIdRaw : '';
  const applicantName = sanitizeText(req.body?.applicantName, 120) || applicantFallback || 'Не указан';
  const comment = sanitizeText(req.body?.comment, 1600);

  let screenshot = null;
  try {
    screenshot = parseBotContractScreenshotDataUrl(sanitizeText(req.body?.screenshotDataUrl, 15 * 1024 * 1024));
  } catch (error) {
    if (error?.message === 'image_too_large') {
      return res.status(400).json({
        error: 'image_too_large',
        message: 'Скриншот слишком большой. Максимум 8MB.',
      });
    }
    return res.status(400).json({
      error: 'invalid_image_data',
      message: 'Прикрепите корректный скриншот (PNG/JPG/WEBP).',
    });
  }

  if (!screenshot || !Buffer.isBuffer(screenshot.buffer) || !screenshot.buffer.length) {
    return res.status(400).json({
      error: 'screenshot_required',
      message: 'Прикрепите скриншот выполнения контракта.',
    });
  }

  const screenshotName = `${sanitizeSlug(project.name || 'contract') || 'contract'}-${Date.now().toString(36)}.${
    screenshot.ext || 'png'
  }`;
  let discordGuildId = sanitizeText(project.guildId, 40);
  if (!/^\d{5,30}$/.test(discordGuildId)) {
    const reportChannelLookup = await fetchDiscordBotApi(
      botToken,
      `https://discord.com/api/v10/channels/${contracts.reportChannelId}`
    );
    if (reportChannelLookup.ok) {
      discordGuildId = sanitizeText(reportChannelLookup.data?.guild_id, 40);
    }
  }

  const report = upsertBotContractReport(project.id, {
    id: crypto.randomUUID(),
    projectId: project.id,
    applicantName,
    applicantDiscordId,
    contractName,
    comment,
    screenshotUrl: '',
    status: 'new',
    sourceSessionUserId: sanitizeText(req.session?.user?.id, 80),
    reviewedBy: '',
    reviewedByUserId: '',
    discordGuildId: /^\d{5,30}$/.test(discordGuildId) ? discordGuildId : '',
    discordChannelId: sanitizeText(contracts.reportChannelId, 40),
    discordMessageId: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  if (!report) {
    return res.status(500).json({
      error: 'report_save_failed',
      message: 'Не удалось сохранить отчет на сайте.',
    });
  }

  const roleMentions = Array.isArray(contracts.reviewerRoleIds)
    ? contracts.reviewerRoleIds.map((id) => `<@&${id}>`).join(' ')
    : '';

  const messagePayload = buildBotContractReportMessagePayload({
    project,
    report,
  });
  if (messagePayload.embeds[0] && typeof messagePayload.embeds[0] === 'object') {
    messagePayload.embeds[0].image = { url: `attachment://${screenshotName}` };
  }

  const payload = {
    ...(roleMentions ? { content: roleMentions } : {}),
    embeds: messagePayload.embeds,
    components: messagePayload.components,
  };

  const formData = new FormData();
  const screenshotBlob = new Blob([screenshot.buffer], { type: screenshot.mimeType || 'image/png' });
  formData.set('payload_json', JSON.stringify(payload));
  formData.set('files[0]', screenshotBlob, screenshotName);

  let response;
  try {
    response = await fetch(`https://discord.com/api/v10/channels/${contracts.reportChannelId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bot ${botToken}`,
      },
      body: formData,
    });
  } catch (error) {
    return res.status(500).json({
      error: 'discord_publish_failed',
      message: `Не удалось отправить отчет в Discord: ${sanitizeText(error.message, 200) || 'ошибка сети'}.`,
    });
  }

  const raw = await response.text().catch(() => '');
  let parsed = null;
  if (raw) {
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = null;
    }
  }

  if (!response.ok) {
    removeBotContractReport(project.id, report.id);
    const details = sanitizeText(parsed?.message || raw, 220);
    return res.status(400).json({
      error: 'discord_publish_failed',
      message: details ? `Discord API вернул ошибку: ${details}` : `Discord API вернул HTTP ${response.status}.`,
    });
  }

  const messageId = sanitizeText(parsed?.id, 80);
  const screenshotUrl = sanitizeText(parsed?.attachments?.[0]?.url, 2000);
  if (/^\d{5,30}$/.test(messageId)) {
    upsertBotContractReport(project.id, {
      ...report,
      discordMessageId: messageId,
      screenshotUrl,
      updatedAt: new Date().toISOString(),
    });
  }

  return res.json({
    ok: true,
    message: 'Отчет отправлен в Discord.',
    messageId,
  });
});

app.post('/api/bot-builder/projects/:id/publish-contracts-embed', requireAuth, async (req, res) => {
  const userId = sanitizeText(req.session.user.id, 80);
  const projects = getBotProjectsForUser(userId);
  const id = sanitizeText(req.params.id, 80);
  const project = projects.find((row) => row.id === id);

  if (!project) {
    return res.status(404).json({ error: 'not_found', message: 'Бот не найден.' });
  }

  const tokenFromBody = sanitizeText(req.body?.botToken, 2000);
  const botToken = tokenFromBody || getBotProjectStoredToken(userId, project.id);
  if (!botToken) {
    return res.status(400).json({
      error: 'token_required',
      message: 'Укажите BOT_TOKEN или подключите облачный режим для публикации embed.',
    });
  }

  if (tokenFromBody && !setBotProjectStoredToken(userId, project.id, tokenFromBody)) {
    return res.status(500).json({
      error: 'token_store_failed',
      message: 'Не удалось сохранить BOT_TOKEN на сервере.',
    });
  }

  const contracts = normalizeBotProjectContracts(
    req.body?.contracts && typeof req.body.contracts === 'object' ? req.body.contracts : project.contracts
  );

  if (!contracts.publishChannelId) {
    return res.status(400).json({
      error: 'publish_channel_required',
      message: 'Укажите ID канала для публикации эмбеда контрактов.',
    });
  }

  if (!contracts.reportChannelId) {
    return res.status(400).json({
      error: 'report_channel_required',
      message: 'Укажите ID канала для отчетов по контрактам.',
    });
  }

  if (!Array.isArray(contracts.selectedContracts) || !contracts.selectedContracts.length) {
    return res.status(400).json({
      error: 'contracts_required',
      message: 'Выберите хотя бы один контракт для формы отчета.',
    });
  }

  const meResponse = await fetchDiscordBotApi(botToken, 'https://discord.com/api/v10/users/@me');
  if (!meResponse.ok) {
    return res.status(400).json({
      error: 'discord_publish_failed',
      message: formatDiscordApiError(meResponse),
    });
  }

  const botUsername = sanitizeText(meResponse.data?.username, 120) || '';
  const origin = `${req.protocol}://${req.get('host')}`;
  const reportUrl = `${origin}/bot-builder/contracts/${encodeURIComponent(project.id)}`;
  const inviteUrl = buildDiscordBotInviteUrl(project.clientId, project.guildId);
  const descriptionParts = String(contracts.embedDescription || '').trim().slice(0, 4000);

  const payload = {
    embeds: [
      {
        title: contracts.embedTitle || 'Отчеты по контрактам',
        description: descriptionParts,
        color: 0x9f48ff,
        ...(contracts.embedFooter ? { footer: { text: contracts.embedFooter } } : {}),
        timestamp: new Date().toISOString(),
      },
    ],
    components: [
      {
        type: 1,
        components: [
          {
            type: 2,
            style: 5,
            url: reportUrl,
            label: contracts.openButtonLabel || 'Отправить отчет',
          },
        ],
      },
    ],
  };

  try {
    const response = await fetch(`https://discord.com/api/v10/channels/${contracts.publishChannelId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bot ${botToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const raw = await response.text().catch(() => '');
    let parsed = null;
    if (raw) {
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = null;
      }
    }

    if (!response.ok) {
      const discordMessage = sanitizeText(parsed?.message || raw, 220);
      const isAccessError =
        /missing access|missing permissions|forbidden/i.test(discordMessage) || response.status === 403;
      const hint = isAccessError
        ? inviteUrl
          ? ` Проверьте права бота на канал. Ссылка приглашения: ${inviteUrl}`
          : ' Проверьте права бота на канал.'
        : '';
      return res.status(400).json({
        error: 'discord_publish_failed',
        message: discordMessage
          ? `Discord API вернул ошибку: ${discordMessage}.${hint}`
          : `Discord API вернул HTTP ${response.status}.`,
      });
    }

    return res.json({
      ok: true,
      channelId: contracts.publishChannelId,
      messageId: sanitizeText(parsed?.id, 80),
      reportUrl,
      botUsername,
      inviteUrl,
    });
  } catch (error) {
    return res.status(500).json({
      error: 'discord_publish_failed',
      message: `Не удалось отправить embed в Discord: ${sanitizeText(error.message, 200) || 'неизвестная ошибка'}.`,
    });
  }
});

app.post('/api/bot-builder/projects/:id/publish-embed', requireAuth, async (req, res) => {
  const userId = sanitizeText(req.session.user.id, 80);
  const projects = getBotProjectsForUser(userId);
  const id = sanitizeText(req.params.id, 80);
  const project = projects.find((row) => row.id === id);

  if (!project) {
    return res.status(404).json({ error: 'not_found', message: 'Бот не найден.' });
  }

  const tokenFromBody = sanitizeText(req.body?.botToken, 2000);
  const botToken = tokenFromBody || getBotProjectStoredToken(userId, project.id);
  if (!botToken) {
    return res.status(400).json({
      error: 'token_required',
      message: 'Укажите BOT_TOKEN или подключите облачный режим для публикации embed.',
    });
  }

  if (tokenFromBody && !setBotProjectStoredToken(userId, project.id, tokenFromBody)) {
    return res.status(500).json({
      error: 'token_store_failed',
      message: 'Не удалось сохранить BOT_TOKEN на сервере.',
    });
  }

  const familyApplications = normalizeBotProjectFamilyApplications(
    req.body?.familyApplications && typeof req.body.familyApplications === 'object'
      ? req.body.familyApplications
      : project.familyApplications
  );

  if (!familyApplications.publishChannelId) {
    return res.status(400).json({
      error: 'publish_channel_required',
      message: 'Укажите ID канала для публикации embed.',
    });
  }

  const meResponse = await fetchDiscordBotApi(botToken, 'https://discord.com/api/v10/users/@me');
  if (!meResponse.ok) {
    return res.status(400).json({
      error: 'discord_publish_failed',
      message: formatDiscordApiError(meResponse),
    });
  }
  const botUsername = sanitizeText(meResponse.data?.username, 120) || '';
  const origin = `${req.protocol}://${req.get('host')}`;
  const applyUrl = `${origin}/bot-builder/apply/${encodeURIComponent(project.id)}`;
  const inviteUrl = buildDiscordBotInviteUrl(project.clientId, project.guildId);

  const payload = {
    embeds: [
      {
        title: familyApplications.embedTitle || 'Заявки в семью',
        description: familyApplications.embedDescription || 'Нажмите кнопку ниже и заполните форму заявки.',
        color: 0x9f48ff,
        ...(familyApplications.embedFooter ? { footer: { text: familyApplications.embedFooter } } : {}),
        timestamp: new Date().toISOString(),
      },
    ],
    components: [
      {
        type: 1,
        components: [
          {
            type: 2,
            style: 5,
            url: applyUrl,
            label: familyApplications.openButtonLabel || 'Открыть форму',
          },
        ],
      },
    ],
  };

  try {
    const response = await fetch(`https://discord.com/api/v10/channels/${familyApplications.publishChannelId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bot ${botToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const raw = await response.text().catch(() => '');
    let parsed = null;
    if (raw) {
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = null;
      }
    }

    if (!response.ok) {
      const discordMessage = sanitizeText(parsed?.message || raw, 220);
      const isAccessError =
        /missing access|missing permissions|forbidden/i.test(discordMessage) || response.status === 403;
      const hint = isAccessError
        ? inviteUrl
          ? ` Проверьте, что бот добавлен на сервер и имеет права на канал. Ссылка приглашения: ${inviteUrl}`
          : ' Проверьте, что бот добавлен на сервер и имеет права на канал.'
        : '';
      return res.status(400).json({
        error: 'discord_publish_failed',
        message: discordMessage
          ? `Discord API вернул ошибку: ${discordMessage}.${hint}`
          : `Discord API вернул HTTP ${response.status}.`,
      });
    }

    return res.json({
      ok: true,
      channelId: familyApplications.publishChannelId,
      messageId: sanitizeText(parsed?.id, 80),
      applyUrl,
      botUsername,
      inviteUrl,
    });
  } catch (error) {
    return res.status(500).json({
      error: 'discord_publish_failed',
      message: `Не удалось отправить embed в Discord: ${sanitizeText(error.message, 200) || 'неизвестная ошибка'}.`,
    });
  }
});

app.delete('/api/bot-builder/projects/:id', requireAuth, (req, res) => {
  const userId = sanitizeText(req.session.user.id, 80);
  const projects = getBotProjectsForUser(userId);
  const id = sanitizeText(req.params.id, 80);
  const index = projects.findIndex((row) => row.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'not_found', message: 'Бот не найден.' });
  }

  projects.splice(index, 1);
  removeBotProjectStoredToken(userId, id);
  if (botFamilyApplicationsStore[id]) {
    delete botFamilyApplicationsStore[id];
    saveBotFamilyApplicationsStore();
  }
  if (botContractReportsStore[id]) {
    delete botContractReportsStore[id];
    saveBotContractReportsStore();
  }
  botProjectsStore[userId] = projects.slice(0, 120);
  saveBotProjectsStore();
  void syncBotGatewaySessions('project-delete');
  return res.json({ ok: true, projects: withBotProjectSecretFlags(userId, botProjectsStore[userId]) });
});

app.get('/api/content', (req, res) => {
  return res.json({ content: siteContent });
});

app.get('/api/layout', (req, res) => {
  return res.json({ layout: layoutOverrides });
});

app.get('/api/pages', (req, res) => {
  return res.json({ pages });
});

app.get('/api/tabs', (req, res) => {
  return res.json({ tabs });
});

app.get('/api/tab-blocks/:tabId', (req, res) => {
  const tabId = sanitizeText(req.params.tabId, 80);
  return res.json({ blocks: tabBlocks[tabId] || [] });
});

app.get('/api/posts', (req, res) => {
  return res.json({ posts: posts.filter((row) => row.published) });
});

app.get('/api/factions', async (req, res) => {
  if (!req.session.user) {
    return res.json({ factions: [] });
  }

  const checks = await Promise.all(
    factions.map(async (faction) => ({
      faction,
      canAccess: await canAccessFaction(req.session.user, faction),
    }))
  );

  return res.json({
    factions: checks
      .filter((row) => row.canAccess)
      .map((row) => ({
        ...serializeFactionForClient(row.faction, { includeDetails: false, includePrivate: false }),
        canManage: canManageFaction(req.session.user, row.faction),
      })),
  });
});

app.get('/api/factions/:id', async (req, res) => {
  const context = await requireFactionAccess(req, res);
  if (!context) return;
  const { faction, canManage } = context;
  const factionPayload = await serializeFactionForClientAsync(faction, {
    includeDetails: true,
    includePrivate: canManage,
  });
  return res.json({
    canManage,
    faction: factionPayload,
  });
});

app.post('/api/factions', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'not_authenticated', message: 'Для создания фракции нужно войти через Discord.' });
  }

  const name = sanitizeText(req.body?.name, 80);
  const avatarDataUrl = sanitizeText(req.body?.avatarDataUrl, 20 * 1024 * 1024);
  const bannerDataUrl = sanitizeText(req.body?.bannerDataUrl, 20 * 1024 * 1024);

  if (!name) {
    return res.status(400).json({
      error: 'name_required',
      message: 'Укажите название фракции.',
    });
  }

  let avatarUrl = '';
  let bannerUrl = '';
  try {
    avatarUrl = saveFactionImageFromDataUrl(avatarDataUrl, `${name}-avatar`);
    bannerUrl = saveFactionImageFromDataUrl(bannerDataUrl, `${name}-banner`);

    const faction = {
      id: crypto.randomUUID(),
      name,
      avatarUrl,
      bannerUrl,
      createdAt: new Date().toISOString(),
      createdByUserId: String(req.session.user.id || ''),
      managerIds: [String(req.session.user.id || '')].filter(Boolean),
      managerNames: normalizeFactionManagerNames([
        req.session.user.username,
        req.session.user.global_name,
        ADMIN_DISCORD_USERNAME,
      ]),
      profile: {
        leader: '',
        leaderDiscordId: '',
        leaderDiscordProfileUrl: '',
        deputies: [],
        about: '',
        discordServerId: '',
      },
      memos: [],
      tests: [],
      rosters: [],
      applications: [],
    };

    factions = normalizeFactions([faction, ...factions]).slice(0, 300);
    saveFactions();
    const factionPayload = await serializeFactionForClientAsync(faction, { includeDetails: true, includePrivate: true });
    const checks = await Promise.all(
      factions.map(async (row) => ({
        faction: row,
        canAccess: await canAccessFaction(req.session.user, row),
      }))
    );
    return res.status(201).json({
      ok: true,
      faction: factionPayload,
      factions: checks
        .filter((row) => row.canAccess)
        .map((row) => serializeFactionForClient(row.faction, { includeDetails: false })),
    });
  } catch (error) {
    removeFactionImageIfExists(avatarUrl);
    removeFactionImageIfExists(bannerUrl);

    if (error.message === 'invalid_image_data') {
      return res.status(400).json({
        error: 'invalid_image_data',
        message: 'Неверный формат изображения. Поддерживаются PNG, JPG, WEBP, GIF.',
      });
    }
    if (error.message === 'image_too_large') {
      return res.status(413).json({
        error: 'image_too_large',
        message: 'Изображение слишком большое (максимум 4 МБ).',
      });
    }

    return res.status(500).json({
      error: 'create_failed',
      message: 'Не удалось создать фракцию.',
    });
  }
});

app.delete('/api/factions/:id', async (req, res) => {
  const context = await requireFactionManage(req, res);
  if (!context) return;

  const [removed] = factions.splice(context.factionIndex, 1);
  removeFactionImageIfExists(removed?.avatarUrl);
  removeFactionImageIfExists(removed?.bannerUrl);
  saveFactions();
  const checks = await Promise.all(
    factions.map(async (faction) => ({
      faction,
      canAccess: await canAccessFaction(req.session.user, faction),
    }))
  );
  return res.json({
    ok: true,
    factions: checks
      .filter((row) => row.canAccess)
      .map((row) => serializeFactionForClient(row.faction, { includeDetails: false })),
  });
});

app.put('/api/factions/:id/profile', async (req, res) => {
  const context = await requireFactionManage(req, res);
  if (!context) return;
  const { factionIndex, faction: current } = context;

  const avatarDataUrl = sanitizeText(req.body?.avatarDataUrl, 20 * 1024 * 1024);
  const bannerDataUrl = sanitizeText(req.body?.bannerDataUrl, 20 * 1024 * 1024);

  let newAvatar = '';
  let newBanner = '';
  try {
    if (avatarDataUrl) newAvatar = saveFactionImageFromDataUrl(avatarDataUrl, `${current.name}-avatar`);
    if (bannerDataUrl) newBanner = saveFactionImageFromDataUrl(bannerDataUrl, `${current.name}-banner`);

    const nextProfile = normalizeFactionProfile({
      leader: req.body?.leader,
      leaderDiscordId: req.body?.leaderDiscordId,
      leaderDiscordProfileUrl: req.body?.leaderDiscordProfileUrl,
      deputies: Array.isArray(req.body?.deputies)
        ? req.body.deputies
        : String(req.body?.deputiesText || '')
            .split('\n')
            .map((row) => row.trim())
            .filter(Boolean),
      about: req.body?.about,
      discordServerId: req.body?.discordServerId,
    });

    const previousAvatar = current.avatarUrl;
    const previousBanner = current.bannerUrl;
    current.profile = nextProfile;
    if (newAvatar) current.avatarUrl = newAvatar;
    if (newBanner) current.bannerUrl = newBanner;
    if (isAdminUser(req.session.user) && typeof req.body?.managerNamesText === 'string') {
      const parsed = parseManagerNamesText(req.body.managerNamesText);
      current.managerNames = parsed.length ? parsed : [ADMIN_DISCORD_USERNAME.toLowerCase()];
    }
    current.managerIds = normalizeFactionManagerIds(current.managerIds);
    saveFactions();

    if (newAvatar && previousAvatar && previousAvatar !== newAvatar) removeFactionImageIfExists(previousAvatar);
    if (newBanner && previousBanner && previousBanner !== newBanner) removeFactionImageIfExists(previousBanner);

    const factionPayload = await serializeFactionForClientAsync(factions[factionIndex], {
      includeDetails: true,
      includePrivate: true,
    });
    return res.json({
      ok: true,
      faction: factionPayload,
    });
  } catch (error) {
    removeFactionImageIfExists(newAvatar);
    removeFactionImageIfExists(newBanner);
    return res.status(500).json({
      error: 'profile_update_failed',
      message: String(error.message || 'Не удалось обновить профиль фракции.'),
    });
  }
});

app.post('/api/factions/:id/memos', async (req, res) => {
  const context = await requireFactionManage(req, res);
  if (!context) return;
  const { factionIndex, faction: current } = context;

  const memo = normalizeFactionMemo({
    title: req.body?.title,
    content: req.body?.content,
    checklist: req.body?.checklist,
    category: req.body?.category,
    tags: req.body?.tags,
    pinned: req.body?.pinned,
  });
  if (!memo) return res.status(400).json({ error: 'invalid_payload', message: 'Заполните заголовок или текст памятки.' });
  current.memos = [memo, ...(current.memos || [])].slice(0, 120);
  saveFactions();
  const factionPayload = await serializeFactionForClientAsync(factions[factionIndex], {
    includeDetails: true,
    includePrivate: true,
  });
  return res.status(201).json({
    ok: true,
    memo,
    faction: factionPayload,
  });
});

app.delete('/api/factions/:id/memos/:memoId', async (req, res) => {
  const context = await requireFactionManage(req, res);
  if (!context) return;
  const { factionIndex, faction: current } = context;

  const memoId = sanitizeText(req.params.memoId, 80);
  const nextMemos = (current.memos || []).filter((row) => row.id !== memoId);
  if (nextMemos.length === (current.memos || []).length) return res.status(404).json({ error: 'memo_not_found' });
  current.memos = nextMemos;
  saveFactions();
  const factionPayload = await serializeFactionForClientAsync(factions[factionIndex], {
    includeDetails: true,
    includePrivate: true,
  });
  return res.json({
    ok: true,
    faction: factionPayload,
  });
});

app.put('/api/factions/:id/memos/:memoId', async (req, res) => {
  const context = await requireFactionManage(req, res);
  if (!context) return;
  const { factionIndex, faction: current } = context;

  const memoId = sanitizeText(req.params.memoId, 80);
  const memoIndex = (current.memos || []).findIndex((row) => row.id === memoId);
  if (memoIndex === -1) return res.status(404).json({ error: 'memo_not_found' });

  const currentMemo = current.memos[memoIndex];
  const nextMemo = normalizeFactionMemo({
    ...currentMemo,
    title: req.body?.title,
    content: req.body?.content,
    checklist: req.body?.checklist,
    category: req.body?.category,
    pinned: req.body?.pinned,
    tags: req.body?.tags,
    updatedAt: new Date().toISOString(),
  });
  if (!nextMemo) {
    return res.status(400).json({
      error: 'invalid_payload',
      message: 'Памятка должна содержать заголовок, текст или пункты чек-листа.',
    });
  }
  nextMemo.createdAt = currentMemo.createdAt || nextMemo.createdAt;
  current.memos[memoIndex] = nextMemo;
  saveFactions();
  const factionPayload = await serializeFactionForClientAsync(factions[factionIndex], {
    includeDetails: true,
    includePrivate: true,
  });
  return res.json({
    ok: true,
    memo: nextMemo,
    faction: factionPayload,
  });
});

app.post('/api/factions/:id/tests', async (req, res) => {
  const context = await requireFactionManage(req, res);
  if (!context) return;
  const { factionIndex, faction: current } = context;

  const rawWebhookUrl = sanitizeText(req.body?.webhookUrl, 2048);
  if (rawWebhookUrl && !sanitizeDiscordWebhookUrl(rawWebhookUrl)) {
    return res.status(400).json({
      error: 'invalid_webhook',
      message: 'Некорректный Discord webhook для теста.',
    });
  }

  const test = normalizeFactionTest({
    title: req.body?.title,
    description: req.body?.description,
    passPercent: req.body?.passPercent,
    webhookUrl: req.body?.webhookUrl,
    questions: req.body?.questions,
  });
  if (!test) {
    return res.status(400).json({ error: 'invalid_payload', message: 'Укажите название теста и минимум 1 корректный вопрос.' });
  }

  current.tests = [test, ...(current.tests || [])].slice(0, 80);
  saveFactions();
  const factionPayload = await serializeFactionForClientAsync(factions[factionIndex], {
    includeDetails: true,
    includePrivate: true,
  });
  return res.status(201).json({
    ok: true,
    test,
    faction: factionPayload,
  });
});

app.delete('/api/factions/:id/tests/:testId', async (req, res) => {
  const context = await requireFactionManage(req, res);
  if (!context) return;
  const { factionIndex, faction: current } = context;

  const testId = sanitizeText(req.params.testId, 80);
  const nextTests = (current.tests || []).filter((row) => row.id !== testId);
  if (nextTests.length === (current.tests || []).length) return res.status(404).json({ error: 'test_not_found' });
  current.tests = nextTests;
  saveFactions();
  const factionPayload = await serializeFactionForClientAsync(factions[factionIndex], {
    includeDetails: true,
    includePrivate: true,
  });
  return res.json({
    ok: true,
    faction: factionPayload,
  });
});

app.post('/api/factions/:id/tests/:testId/submit', async (req, res) => {
  const context = await requireFactionAccess(req, res);
  if (!context) return;
  const { faction } = context;
  const testId = sanitizeText(req.params.testId, 80);
  const test = (faction.tests || []).find((row) => row.id === testId);
  if (!test) return res.status(404).json({ error: 'test_not_found' });

  const respondent = sanitizeText(req.body?.respondent, 80) || 'Участник';
  const answersRaw = Array.isArray(req.body?.answers) ? req.body.answers : [];
  const total = test.questions.length;
  const correct = test.questions.reduce((sum, question, index) => {
    const selected = clampNumber(answersRaw[index], 0, question.options.length - 1, -1);
    return sum + (selected === question.correctIndex ? 1 : 0);
  }, 0);
  const percent = total ? Math.round((correct / total) * 100) : 0;
  const passed = percent >= test.passPercent;

  let webhook = { sent: false, reason: 'not_attempted' };
  try {
    webhook = await sendFactionTestResultToDiscord({
      webhookUrl: test.webhookUrl,
      faction,
      test,
      respondent,
      score: correct,
      total,
      percent,
      passed,
    });
  } catch (error) {
    webhook = { sent: false, reason: String(error.message || error) };
  }

  return res.json({
    ok: true,
    result: {
      respondent,
      score: correct,
      total,
      percent,
      passed,
      passPercent: test.passPercent,
    },
    webhook,
  });
});

app.post('/api/factions/:id/rosters', async (req, res) => {
  const context = await requireFactionManage(req, res);
  if (!context) return;
  const { factionIndex, faction: current } = context;

  const roster = normalizeFactionRoster({ title: req.body?.title, members: [] });
  if (!roster) return res.status(400).json({ error: 'invalid_payload', message: 'Укажите название состава.' });
  current.rosters = [roster, ...(current.rosters || [])].slice(0, 80);
  saveFactions();
  const factionPayload = await serializeFactionForClientAsync(factions[factionIndex], {
    includeDetails: true,
    includePrivate: true,
  });
  return res.status(201).json({
    ok: true,
    roster,
    faction: factionPayload,
  });
});

app.delete('/api/factions/:id/rosters/:rosterId', async (req, res) => {
  const context = await requireFactionManage(req, res);
  if (!context) return;
  const { factionIndex, faction: current } = context;

  const rosterId = sanitizeText(req.params.rosterId, 80);
  const nextRosters = (current.rosters || []).filter((row) => row.id !== rosterId);
  if (nextRosters.length === (current.rosters || []).length) return res.status(404).json({ error: 'roster_not_found' });
  current.rosters = nextRosters;
  saveFactions();
  const factionPayload = await serializeFactionForClientAsync(factions[factionIndex], {
    includeDetails: true,
    includePrivate: true,
  });
  return res.json({
    ok: true,
    faction: factionPayload,
  });
});

app.post('/api/factions/:id/rosters/:rosterId/members', async (req, res) => {
  const context = await requireFactionManage(req, res);
  if (!context) return;
  const { factionIndex, faction: current } = context;

  const rosterId = sanitizeText(req.params.rosterId, 80);
  const rosterIndex = (current.rosters || []).findIndex((row) => row.id === rosterId);
  if (rosterIndex === -1) return res.status(404).json({ error: 'roster_not_found' });

  const member = normalizeFactionMember({
    name: req.body?.name,
    role: req.body?.role,
    note: req.body?.note,
  });
  if (!member) return res.status(400).json({ error: 'invalid_payload', message: 'Укажите имя участника.' });

  current.rosters[rosterIndex].members = [member, ...(current.rosters[rosterIndex].members || [])].slice(0, 200);
  current.rosters[rosterIndex].updatedAt = new Date().toISOString();
  saveFactions();
  const factionPayload = await serializeFactionForClientAsync(factions[factionIndex], {
    includeDetails: true,
    includePrivate: true,
  });
  return res.status(201).json({
    ok: true,
    member,
    faction: factionPayload,
  });
});

app.delete('/api/factions/:id/rosters/:rosterId/members/:memberId', async (req, res) => {
  const context = await requireFactionManage(req, res);
  if (!context) return;
  const { factionIndex, faction: current } = context;

  const rosterId = sanitizeText(req.params.rosterId, 80);
  const memberId = sanitizeText(req.params.memberId, 80);
  const rosterIndex = (current.rosters || []).findIndex((row) => row.id === rosterId);
  if (rosterIndex === -1) return res.status(404).json({ error: 'roster_not_found' });

  const members = current.rosters[rosterIndex].members || [];
  const nextMembers = members.filter((row) => row.id !== memberId);
  if (nextMembers.length === members.length) return res.status(404).json({ error: 'member_not_found' });
  current.rosters[rosterIndex].members = nextMembers;
  current.rosters[rosterIndex].updatedAt = new Date().toISOString();
  saveFactions();
  const factionPayload = await serializeFactionForClientAsync(factions[factionIndex], {
    includeDetails: true,
    includePrivate: true,
  });
  return res.json({
    ok: true,
    faction: factionPayload,
  });
});

app.post('/api/factions/:id/applications', async (req, res) => {
  const context = await requireFactionManage(req, res);
  if (!context) return;
  const { factionIndex, faction: current } = context;

  const application = normalizeFactionApplication({
    title: req.body?.title,
    description: req.body?.description,
    webhookUrl: req.body?.webhookUrl,
    fields: req.body?.fields,
  });
  if (!application) {
    return res.status(400).json({
      error: 'invalid_payload',
      message: 'Заполните название, webhook и хотя бы одно поле заявления.',
    });
  }

  current.applications = [application, ...(current.applications || [])].slice(0, 80);
  saveFactions();
  const factionPayload = await serializeFactionForClientAsync(factions[factionIndex], {
    includeDetails: true,
    includePrivate: true,
  });
  return res.status(201).json({
    ok: true,
    application: {
      ...application,
      webhookConfigured: true,
    },
    faction: factionPayload,
  });
});

app.delete('/api/factions/:id/applications/:applicationId', async (req, res) => {
  const context = await requireFactionManage(req, res);
  if (!context) return;
  const { factionIndex, faction: current } = context;

  const applicationId = sanitizeText(req.params.applicationId, 80);
  const next = (current.applications || []).filter((row) => row.id !== applicationId);
  if (next.length === (current.applications || []).length) return res.status(404).json({ error: 'application_not_found' });
  current.applications = next;
  saveFactions();
  const factionPayload = await serializeFactionForClientAsync(factions[factionIndex], {
    includeDetails: true,
    includePrivate: true,
  });
  return res.json({
    ok: true,
    faction: factionPayload,
  });
});

app.post('/api/factions/:id/applications/:applicationId/submit', async (req, res) => {
  const context = await requireFactionAccess(req, res);
  if (!context) return;
  const { faction: current } = context;
  const applicationId = sanitizeText(req.params.applicationId, 80);
  const application = (current.applications || []).find((row) => row.id === applicationId);
  if (!application) return res.status(404).json({ error: 'application_not_found' });

  const answersRaw = req.body?.answers && typeof req.body.answers === 'object' ? req.body.answers : {};
  const answers = {};
  const errors = [];
  (application.fields || []).forEach((field) => {
    const key = String(field.id || '');
    const value = sanitizeText(answersRaw[key], field.maxLength || 240);
    if (field.required && !value) {
      errors.push(`Поле "${field.label}" обязательно.`);
    }
    answers[key] = value;
  });
  if (errors.length) {
    return res.status(400).json({ error: 'validation_failed', message: errors[0], errors });
  }

  const fallbackApplicant = req.session.user
    ? req.session.user.global_name || req.session.user.username
    : '';
  const applicant = sanitizeText(req.body?.applicant, 120) || sanitizeText(fallbackApplicant, 120) || 'Аноним';

  try {
    await sendFactionApplicationToDiscord({
      webhookUrl: application.webhookUrl,
      faction: current,
      application,
      applicant,
      answers,
    });
    return res.json({ ok: true, message: 'Заявление отправлено в Discord.' });
  } catch (error) {
    return res.status(502).json({
      error: 'discord_webhook_failed',
      message: String(error.message || 'Не удалось отправить заявление в Discord.'),
    });
  }
});

app.get('/api/navigator', (req, res) => {
  const pathValue = normalizeRoutePath(req.query.path || '/');
  return res.json({ path: pathValue, items: pageNavigators[pathValue] || [] });
});

app.get('/api/consultant/servers', (req, res) => {
  return res.json({ servers: MAJESTIC_SERVERS });
});

app.get('/api/consultant/status', (req, res) => {
  const servers = MAJESTIC_SERVERS.map((serverName) => {
    const row = lawCacheByServer[serverName];
    return {
      name: serverName,
      cached: Boolean(row && Array.isArray(row.docs) && row.docs.length),
      updatedAt: row?.updatedAt || null,
      docsCount: Array.isArray(row?.docs) ? row.docs.length : 0,
    };
  });

  return res.json({
    sync: consultantSyncState,
    servers,
  });
});

app.post('/api/consultant/ask', async (req, res) => {
  const server = sanitizeText(req.body?.server, 60);
  const question = sanitizeText(req.body?.question, 1200);

  if (!server || !question) {
    return res.status(400).json({ error: 'invalid_payload' });
  }
  if (!MAJESTIC_SERVERS.includes(server)) {
    return res.status(400).json({ error: 'invalid_server' });
  }

  try {
    const syncResult = await refreshServerLawCache(server, 'manual-question');
    if (!syncResult.ok) {
      throw new Error(syncResult.error || 'sync_failed');
    }
    const trace = lawCacheByServer[server]?.trace || [];
    const docs = lawCacheByServer[server]?.docs || [];
    const answer = buildConsultantAnswer(question, server, docs);
    return res.json({
      ok: true,
      server,
      mode: 'live',
      cacheUpdatedAt: lawCacheByServer[server].updatedAt,
      trace,
      answer: answer.text,
      references: answer.references,
    });
  } catch (error) {
    const cached = lawCacheByServer[server];
    if (cached && Array.isArray(cached.docs) && cached.docs.length) {
      const answer = buildConsultantAnswer(question, server, cached.docs);
      return res.json({
        ok: true,
        server,
        mode: 'cache',
        cacheUpdatedAt: cached.updatedAt,
        trace: cached.trace || [],
        answer: answer.text,
        references: answer.references,
        warning:
          'Форум сейчас недоступен для авто-парсинга. Ответ построен по сохранённой локальной базе законодательства.',
      });
    }

    return res.status(502).json({
      error: 'forum_unavailable',
      message:
        'Не удалось автоматически получить законодательную базу с форума, и локальная база для этого сервера пока пустая. Повтори позже, чтобы заполнить кэш.',
      details: String(error.message || error),
    });
  }
});

app.use('/api/documentflow', (req, res) => {
  const suffix = req.originalUrl.replace(/^\/api\/documentflow/, '');
  return res.redirect(307, `/api/docflow${suffix}`);
});

function extractFirstJSONObject(raw) {
  const text = String(raw || '').trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  const chunk = text.slice(start, end + 1);
  try {
    return JSON.parse(chunk);
  } catch {
    return null;
  }
}

function sanitizeSvgPathValue(value) {
  return String(value || '')
    .replace(/[^MmLlHhVvCcSsQqTtAaZz0-9,.\- ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 3000);
}

function buildSignatureSvgDataUrl(paths, width, height) {
  const list = Array.isArray(paths) ? paths.map((row) => sanitizeSvgPathValue(row)).filter(Boolean) : [];
  if (!list.length) return '';
  const w = clampNumber(width, 160, 1400, 520);
  const h = clampNumber(height, 60, 520, 140);
  const svgPaths = list
    .slice(0, 6)
    .map((row, idx) => {
      const strokeWidth = idx === 0 ? 5.2 : idx === 1 ? 4.2 : 3.4;
      return `<path d="${row}" fill="none" stroke="#0b0b0b" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>`;
    })
    .join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${svgPaths}</svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

app.get('/api/docflow/meta', (req, res) => {
  return res.json({
    servers: MAJESTIC_SERVERS,
    authenticated: Boolean(req.session.user),
    canManageTemplates: canManageDocTemplates(req.session.user),
    aiSignatureEnabled: Boolean(OPENAI_API_KEY),
  });
});

app.post('/api/docflow/signature', async (req, res) => {
  if (!OPENAI_API_KEY) {
    return res.status(503).json({
      error: 'ai_signature_disabled',
      message: 'ИИ-генерация подписи не настроена на сервере.',
    });
  }

  const name = sanitizeText(req.body?.name, 120).replace(/\s+/g, ' ').trim();
  const width = clampNumber(req.body?.width, 160, 1400, 520);
  const height = clampNumber(req.body?.height, 60, 520, 140);

  if (!name) {
    return res.status(400).json({ error: 'name_required' });
  }
  const parts = name.split(' ').filter(Boolean);
  const firstName = parts[0] || '';
  const lastName = parts.slice(1).join(' ') || '';

  const prompt = [
    `Тебе даны имя и фамилия: "${name}".`,
    'Сгенерируй личную подпись исходя из них.',
    firstName ? `Имя: "${firstName}".` : '',
    lastName ? `Фамилия: "${lastName}".` : '',
    'Только подпись черной ручкой, без печатного текста, без фона и без лишних элементов.',
    'Стиль: реалистичный рукописный росчерк для официального документа.',
  ]
    .filter(Boolean)
    .join(' ');

  let imageError = null;
  try {
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_SIGNATURE_MODEL || 'gpt-image-1',
        prompt,
        size: '1024x1024',
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message =
        (payload &&
          payload.error &&
          (payload.error.message || payload.error.code || payload.error.type)) ||
        `HTTP ${response.status}`;
      throw new Error(message);
    }

    const b64 = payload?.data?.[0]?.b64_json;
    const imageUrl = payload?.data?.[0]?.url;
    if (!b64 && !imageUrl) {
      throw new Error('empty_image');
    }

    return res.json({
      ok: true,
      source: 'image',
      imageDataUrl: b64 ? `data:image/png;base64,${b64}` : '',
      imageUrl: imageUrl || '',
      width,
      height,
      name,
      parsed: {
        firstName,
        lastName,
        hasSurname: parts.length >= 2,
      },
    });
  } catch (error) {
    imageError = String(error.message || error);
  }

  try {
    const completion = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_SIGNATURE_TEXT_MODEL || 'gpt-4.1-mini',
        temperature: 0.8,
        max_tokens: 700,
        messages: [
          {
            role: 'system',
            content:
              'Ты создаешь путь подписи. Верни строго JSON без Markdown: {"paths":["M ...","M ..."]}. Только команды SVG path, 2-4 path.',
          },
          {
            role: 'user',
            content:
              `Имя и фамилия: "${name}". Холст ширина ${Math.round(width)} высота ${Math.round(height)}.` +
              ' Сгенерируй реалистичный росчерк подписи как SVG path(ы), черный цвет, без текста.',
          },
        ],
      }),
    });
    const payload = await completion.json().catch(() => ({}));
    if (!completion.ok) {
      const message =
        (payload &&
          payload.error &&
          (payload.error.message || payload.error.code || payload.error.type)) ||
        `HTTP ${completion.status}`;
      throw new Error(message);
    }
    const text = payload?.choices?.[0]?.message?.content || '';
    const parsed = extractFirstJSONObject(text);
    const svgDataUrl = buildSignatureSvgDataUrl(parsed && parsed.paths, width, height);
    if (!svgDataUrl) {
      throw new Error('svg_fallback_empty');
    }

    return res.json({
      ok: true,
      source: 'svg_fallback',
      imageDataUrl: svgDataUrl,
      imageUrl: '',
      width,
      height,
      name,
      parsed: {
        firstName,
        lastName,
        hasSurname: parts.length >= 2,
      },
    });
  } catch (textError) {
    return res.status(502).json({
      error: 'ai_signature_failed',
      message: `image_model: ${imageError || 'unknown'}; text_fallback: ${String(textError.message || textError)}`,
    });
  }
});

app.get('/api/docflow/templates', (req, res) => {
  const server = sanitizeText(req.query.server, 80);
  const templates = docTemplates
    .filter((row) => (!server ? true : row.server === server))
    .map((row) => ({
      id: row.id,
      server: row.server,
      title: row.title,
      description: row.description,
      createdBy: row.createdBy,
      updatedAt: row.updatedAt,
      elementsCount: Array.isArray(row.elements) ? row.elements.length : 0,
    }));
  return res.json({ templates });
});

app.get('/api/docflow/templates/:id', (req, res) => {
  const id = sanitizeText(req.params.id, 80);
  const template = docTemplates.find((row) => row.id === id);
  if (!template) {
    return res.status(404).json({ error: 'not_found' });
  }

  const userId = sanitizeText(req.session?.user?.id, 80);
  const userFill = userId && docFillsByUser[userId] ? docFillsByUser[userId][id] : null;
  return res.json({
    template,
    myFill: userFill || { values: {}, updatedAt: null },
    canManageTemplates: canManageDocTemplates(req.session.user),
  });
});

app.post('/api/docflow/templates', requireDocTemplateManager, (req, res) => {
  const normalized = normalizeDocTemplate({
    ...req.body,
    createdBy: {
      id: req.session.user.id,
      name: req.session.user.global_name || req.session.user.username,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  if (!normalized.server || !normalized.title) {
    return res.status(400).json({ error: 'invalid_payload' });
  }

  docTemplates = normalizeDocTemplates([normalized, ...docTemplates]);
  writeJSON(DOC_TEMPLATES_FILE, docTemplates);
  return res.json({ ok: true, template: normalized });
});

app.put('/api/docflow/templates/:id', requireDocTemplateManager, (req, res) => {
  const id = sanitizeText(req.params.id, 80);
  const index = docTemplates.findIndex((row) => row.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'not_found' });
  }

  const current = docTemplates[index];
  const merged = normalizeDocTemplate({
    ...current,
    ...req.body,
    id: current.id,
    createdAt: current.createdAt,
    createdBy: current.createdBy,
    updatedAt: new Date().toISOString(),
  });

  if (!merged.server || !merged.title) {
    return res.status(400).json({ error: 'invalid_payload' });
  }

  docTemplates[index] = merged;
  docTemplates = normalizeDocTemplates(docTemplates);
  writeJSON(DOC_TEMPLATES_FILE, docTemplates);
  return res.json({ ok: true, template: merged });
});

app.delete('/api/docflow/templates/:id', requireDocTemplateManager, (req, res) => {
  const id = sanitizeText(req.params.id, 80);
  const exists = docTemplates.some((row) => row.id === id);
  if (!exists) {
    return res.status(404).json({ error: 'not_found' });
  }

  docTemplates = normalizeDocTemplates(docTemplates.filter((row) => row.id !== id));
  Object.keys(docFillsByUser).forEach((userId) => {
    if (docFillsByUser[userId] && docFillsByUser[userId][id]) {
      delete docFillsByUser[userId][id];
    }
  });
  writeJSON(DOC_TEMPLATES_FILE, docTemplates);
  writeJSON(DOC_FILLS_FILE, docFillsByUser);
  return res.json({ ok: true });
});

app.get('/api/docflow/templates/:id/my-fill', requireAuth, (req, res) => {
  const id = sanitizeText(req.params.id, 80);
  const template = docTemplates.find((row) => row.id === id);
  if (!template) {
    return res.status(404).json({ error: 'not_found' });
  }
  const userId = sanitizeText(req.session.user.id, 80);
  const fill = (docFillsByUser[userId] && docFillsByUser[userId][id]) || { values: {}, updatedAt: null };
  return res.json({ fill });
});

app.put('/api/docflow/templates/:id/my-fill', requireAuth, (req, res) => {
  const id = sanitizeText(req.params.id, 80);
  const template = docTemplates.find((row) => row.id === id);
  if (!template) {
    return res.status(404).json({ error: 'not_found' });
  }

  const valuesRaw = req.body?.values && typeof req.body.values === 'object' ? req.body.values : {};
  const values = {};
  const allowedIds = new Set((template.elements || []).map((row) => row.id));
  Object.entries(valuesRaw).forEach(([elementId, value]) => {
    const safeElementId = sanitizeText(elementId, 80);
    if (!allowedIds.has(safeElementId)) return;
    values[safeElementId] = sanitizeText(value, 5000);
  });

  const userId = sanitizeText(req.session.user.id, 80);
  if (!docFillsByUser[userId]) {
    docFillsByUser[userId] = {};
  }
  docFillsByUser[userId][id] = {
    updatedAt: new Date().toISOString(),
    values,
  };
  writeJSON(DOC_FILLS_FILE, docFillsByUser);
  return res.json({ ok: true, fill: docFillsByUser[userId][id] });
});

app.get('/documentflow', (req, res) => {
  return res.sendFile(path.join(__dirname, 'public', 'documentflow.html'));
});

app.get('/consultant', (req, res) => {
  return res.sendFile(path.join(__dirname, 'public', 'consultant.html'));
});

app.get('/factions', (req, res) => {
  return res.sendFile(path.join(__dirname, 'public', 'factions.html'));
});

app.get('/factions/:id', (req, res) => {
  return res.sendFile(path.join(__dirname, 'public', 'factions.html'));
});

app.get('/bot-builder', (req, res) => {
  return res.sendFile(path.join(__dirname, 'public', 'bot-builder.html'));
});

app.get('/bot-builder/apply/:id', (req, res) => {
  return res.sendFile(path.join(__dirname, 'public', 'bot-apply.html'));
});

app.get('/bot-builder/contracts/:id', (req, res) => {
  return res.sendFile(path.join(__dirname, 'public', 'bot-contract-report.html'));
});

app.get('/dashboard', (req, res) => {
  const authUser = resolveAuthenticatedUser(req);
  if (!authUser) {
    return res.redirect('/');
  }

  return res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/api/settings', requireAuth, (req, res) => {
  const authUser = resolveAuthenticatedUser(req);
  if (!authUser) {
    return res.status(401).json({ error: 'not_authenticated' });
  }
  if (!req.session.settings) {
    req.session.settings = getDefaultSettings(authUser);
  }

  return res.json({ settings: req.session.settings });
});

app.post('/api/settings', requireAuth, (req, res) => {
  const authUser = resolveAuthenticatedUser(req);
  if (!authUser) {
    return res.status(401).json({ error: 'not_authenticated' });
  }
  const { displayName, rolePath, preferredSection, notificationsEnabled } = req.body || {};
  const validRolePath = ['newbie', 'state', 'crime'];
  const validSection = ['guides', 'jobs', 'discord'];

  const nextSettings = {
    displayName:
      typeof displayName === 'string' && displayName.trim()
        ? displayName.trim().slice(0, 50)
        : getDefaultSettings(authUser).displayName,
    rolePath: validRolePath.includes(rolePath) ? rolePath : 'newbie',
    preferredSection: validSection.includes(preferredSection) ? preferredSection : 'guides',
    notificationsEnabled: Boolean(notificationsEnabled),
  };

  req.session.settings = nextSettings;
  return res.json({ ok: true, settings: nextSettings });
});

app.use('/api/admin', (req, res) => {
  return res.status(410).json({ error: 'admin_panel_disabled' });
});

app.get('/api/admin/content', requireAdmin, (req, res) => {
  return res.json({ content: siteContent });
});

app.post('/api/admin/content', requireAdmin, (req, res) => {
  const nextContent = normalizeContent(req.body || {});
  siteContent = nextContent;

  try {
    writeJSON(CONTENT_FILE, siteContent);
    return res.json({ ok: true, content: siteContent });
  } catch (error) {
    return res.status(500).json({ error: 'write_failed' });
  }
});

app.get('/api/admin/layout', requireAdmin, (req, res) => {
  return res.json({ layout: layoutOverrides });
});

app.post('/api/admin/layout', requireAdmin, (req, res) => {
  const nextLayout = normalizeLayout(req.body || {});
  layoutOverrides = nextLayout;

  try {
    writeJSON(LAYOUT_FILE, layoutOverrides);
    return res.json({ ok: true, layout: layoutOverrides });
  } catch (error) {
    return res.status(500).json({ error: 'write_failed' });
  }
});

app.get('/api/admin/tabs', requireAdmin, (req, res) => {
  return res.json({ tabs });
});

app.post('/api/admin/tabs', requireAdmin, (req, res) => {
  const label = sanitizeText(req.body?.label, 40);
  const type = sanitizeText(req.body?.type, 10).toLowerCase();
  const target = sanitizeUrl(req.body?.target);

  if (!label || !TAB_TYPES.includes(type) || !target) {
    return res.status(400).json({ error: 'invalid_payload' });
  }

  const tab = {
    id: crypto.randomUUID(),
    label,
    type,
    target,
    order: tabs.length + 1,
  };

  tabs = normalizeTabs([...tabs, tab]);
  writeJSON(TABS_FILE, tabs);
  tabBlocks[tab.id] = [];
  writeJSON(TAB_BLOCKS_FILE, tabBlocks);
  return res.json({ ok: true, tab, tabs });
});

app.delete('/api/admin/tabs/:id', requireAdmin, (req, res) => {
  const id = sanitizeText(req.params.id, 80);
  const nextTabs = tabs.filter((row) => row.id !== id);

  if (nextTabs.length === tabs.length) {
    return res.status(404).json({ error: 'not_found' });
  }

  tabs = normalizeTabs(nextTabs);
  writeJSON(TABS_FILE, tabs);
  delete tabBlocks[id];
  writeJSON(TAB_BLOCKS_FILE, tabBlocks);
  return res.json({ ok: true, tabs });
});

app.get('/api/admin/tab-blocks/:tabId', requireAdmin, (req, res) => {
  const tabId = sanitizeText(req.params.tabId, 80);
  return res.json({ blocks: tabBlocks[tabId] || [] });
});

app.post('/api/admin/tab-blocks/:tabId', requireAdmin, (req, res) => {
  const tabId = sanitizeText(req.params.tabId, 80);
  const tabExists = tabs.some((row) => row.id === tabId);
  if (!tabExists) {
    return res.status(404).json({ error: 'tab_not_found' });
  }

  const type = sanitizeText(req.body?.type, 20).toLowerCase();
  const title = sanitizeText(req.body?.title, 100);
  const text = sanitizeText(req.body?.text, 4000);
  const imageUrl = sanitizeUrl(req.body?.imageUrl);
  if (!TAB_BLOCK_TYPES.includes(type)) {
    return res.status(400).json({ error: 'invalid_type' });
  }
  if ((type === 'text' || type === 'combo') && !text && !title) {
    return res.status(400).json({ error: 'text_required' });
  }
  if ((type === 'image' || type === 'combo') && !imageUrl) {
    return res.status(400).json({ error: 'image_required' });
  }

  const block = {
    id: crypto.randomUUID(),
    type,
    title,
    text,
    imageUrl,
    x: clampNumber(req.body?.x, 0, 95, 0),
    y: clampNumber(req.body?.y, 0, 2000, 0),
    width: clampNumber(req.body?.width, 180, 1200, 320),
    height: clampNumber(req.body?.height, 120, 1200, 220),
  };

  const list = tabBlocks[tabId] || [];
  tabBlocks[tabId] = normalizeTabBlocks({ [tabId]: [block, ...list] })[tabId] || [];
  writeJSON(TAB_BLOCKS_FILE, tabBlocks);
  return res.json({ ok: true, block, blocks: tabBlocks[tabId] });
});

app.put('/api/admin/tab-blocks/:tabId/:blockId', requireAdmin, (req, res) => {
  const tabId = sanitizeText(req.params.tabId, 80);
  const blockId = sanitizeText(req.params.blockId, 80);
  const list = tabBlocks[tabId] || [];
  const index = list.findIndex((row) => row.id === blockId);
  if (index === -1) {
    return res.status(404).json({ error: 'not_found' });
  }

  const current = list[index];
  const nextType = sanitizeText(req.body?.type, 20).toLowerCase() || current.type;
  const next = {
    ...current,
    type: TAB_BLOCK_TYPES.includes(nextType) ? nextType : current.type,
    title: sanitizeText(req.body?.title, 100),
    text: sanitizeText(req.body?.text, 4000),
    imageUrl: sanitizeUrl(req.body?.imageUrl),
    x: clampNumber(req.body?.x, 0, 95, current.x),
    y: clampNumber(req.body?.y, 0, 2000, current.y),
    width: clampNumber(req.body?.width, 180, 1200, current.width),
    height: clampNumber(req.body?.height, 120, 1200, current.height),
  };

  if ((next.type === 'text' || next.type === 'combo') && !next.text && !next.title) {
    return res.status(400).json({ error: 'text_required' });
  }
  if ((next.type === 'image' || next.type === 'combo') && !next.imageUrl) {
    return res.status(400).json({ error: 'image_required' });
  }

  list[index] = next;
  tabBlocks[tabId] = normalizeTabBlocks({ [tabId]: list })[tabId] || [];
  writeJSON(TAB_BLOCKS_FILE, tabBlocks);
  return res.json({ ok: true, block: next, blocks: tabBlocks[tabId] });
});

app.delete('/api/admin/tab-blocks/:tabId/:blockId', requireAdmin, (req, res) => {
  const tabId = sanitizeText(req.params.tabId, 80);
  const blockId = sanitizeText(req.params.blockId, 80);
  const list = tabBlocks[tabId] || [];
  const next = list.filter((row) => row.id !== blockId);
  if (next.length === list.length) {
    return res.status(404).json({ error: 'not_found' });
  }

  tabBlocks[tabId] = normalizeTabBlocks({ [tabId]: next })[tabId] || [];
  writeJSON(TAB_BLOCKS_FILE, tabBlocks);
  return res.json({ ok: true, blocks: tabBlocks[tabId] });
});

app.get('/api/admin/posts', requireAdmin, (req, res) => {
  return res.json({ posts });
});

app.post('/api/admin/posts', requireAdmin, (req, res) => {
  const title = sanitizeText(req.body?.title, 100);
  const text = sanitizeText(req.body?.text, 4000);
  const imageUrl = sanitizeUrl(req.body?.imageUrl);
  const buttonText = sanitizeText(req.body?.buttonText, 40);
  const buttonUrl = sanitizeUrl(req.body?.buttonUrl);
  const published = Boolean(req.body?.published);

  if (!title || !text) {
    return res.status(400).json({ error: 'invalid_payload' });
  }

  const now = new Date().toISOString();
  const post = {
    id: crypto.randomUUID(),
    title,
    text,
    imageUrl,
    buttonText,
    buttonUrl,
    published,
    createdAt: now,
    updatedAt: now,
  };

  posts = normalizePosts([post, ...posts]);
  writeJSON(POSTS_FILE, posts);
  return res.json({ ok: true, post, posts });
});

app.put('/api/admin/posts/:id', requireAdmin, (req, res) => {
  const id = sanitizeText(req.params.id, 80);
  const index = posts.findIndex((row) => row.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'not_found' });
  }

  const current = posts[index];
  const next = {
    ...current,
    title: sanitizeText(req.body?.title, 100) || current.title,
    text: sanitizeText(req.body?.text, 4000) || current.text,
    imageUrl: sanitizeUrl(req.body?.imageUrl),
    buttonText: sanitizeText(req.body?.buttonText, 40),
    buttonUrl: sanitizeUrl(req.body?.buttonUrl),
    published: Boolean(req.body?.published),
    updatedAt: new Date().toISOString(),
  };

  posts[index] = next;
  posts = normalizePosts(posts);
  writeJSON(POSTS_FILE, posts);
  return res.json({ ok: true, post: next, posts });
});

app.delete('/api/admin/posts/:id', requireAdmin, (req, res) => {
  const id = sanitizeText(req.params.id, 80);
  const nextPosts = posts.filter((row) => row.id !== id);

  if (nextPosts.length === posts.length) {
    return res.status(404).json({ error: 'not_found' });
  }

  posts = normalizePosts(nextPosts);
  writeJSON(POSTS_FILE, posts);
  return res.json({ ok: true, posts });
});

app.get('/api/admin/users', requireAdmin, (req, res) => {
  const sorted = [...participants].sort((a, b) => (a.lastSeenAt < b.lastSeenAt ? 1 : -1));
  return res.json({ users: sorted });
});

app.get('/api/admin/navigator', requireAdmin, (req, res) => {
  const pathValue = normalizeRoutePath(req.query.path || '/');
  return res.json({ path: pathValue, items: pageNavigators[pathValue] || [] });
});

app.post('/api/admin/navigator', requireAdmin, (req, res) => {
  const pathValue = normalizeRoutePath(req.query.path || '/');
  const label = sanitizeText(req.body?.label, 60);
  const target = sanitizeUrl(req.body?.target);
  if (!label || !target) {
    return res.status(400).json({ error: 'invalid_payload' });
  }

  const list = pageNavigators[pathValue] || [];
  const item = {
    id: crypto.randomUUID(),
    label,
    target,
    order: list.length + 1,
  };

  pageNavigators[pathValue] = normalizeNavigatorMap({
    ...pageNavigators,
    [pathValue]: [...list, item],
  })[pathValue];
  writeJSON(NAVIGATOR_FILE, pageNavigators);
  return res.json({ ok: true, path: pathValue, item, items: pageNavigators[pathValue] || [] });
});

app.put('/api/admin/navigator', requireAdmin, (req, res) => {
  const pathValue = normalizeRoutePath(req.query.path || '/');
  const id = sanitizeText(req.query.id, 80);
  const list = pageNavigators[pathValue] || [];
  const index = list.findIndex((row) => row.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'not_found' });
  }

  const label = sanitizeText(req.body?.label, 60);
  const target = sanitizeUrl(req.body?.target);
  if (!label || !target) {
    return res.status(400).json({ error: 'invalid_payload' });
  }

  list[index] = {
    ...list[index],
    label,
    target,
  };
  pageNavigators[pathValue] = normalizeNavigatorMap({
    ...pageNavigators,
    [pathValue]: list,
  })[pathValue];
  writeJSON(NAVIGATOR_FILE, pageNavigators);
  return res.json({ ok: true, path: pathValue, items: pageNavigators[pathValue] || [] });
});

app.delete('/api/admin/navigator', requireAdmin, (req, res) => {
  const pathValue = normalizeRoutePath(req.query.path || '/');
  const id = sanitizeText(req.query.id, 80);
  const list = pageNavigators[pathValue] || [];
  const next = list.filter((row) => row.id !== id);
  if (next.length === list.length) {
    return res.status(404).json({ error: 'not_found' });
  }

  pageNavigators[pathValue] = normalizeNavigatorMap({
    ...pageNavigators,
    [pathValue]: next,
  })[pathValue];
  writeJSON(NAVIGATOR_FILE, pageNavigators);
  return res.json({ ok: true, path: pathValue, items: pageNavigators[pathValue] || [] });
});

app.post('/api/admin/pages', requireAdmin, (req, res) => {
  const cleanedTitle = sanitizeText(req.body?.title, 80);
  const cleanedSlug = sanitizeSlug(req.body?.slug);
  const cleanedBody = sanitizeText(req.body?.body, 5000);

  if (!cleanedTitle || !cleanedSlug) {
    return res.status(400).json({ error: 'invalid_payload' });
  }

  if (pages.some((row) => row.slug === cleanedSlug)) {
    return res.status(409).json({ error: 'slug_exists' });
  }

  const relativePath = `/pages/${cleanedSlug}.html`;
  const fullPath = path.join(PAGES_DIR, `${cleanedSlug}.html`);

  try {
    fs.writeFileSync(fullPath, buildPageTemplate({ title: cleanedTitle, body: cleanedBody }), 'utf8');

    const page = {
      slug: cleanedSlug,
      title: cleanedTitle,
      path: relativePath,
    };

    pages = normalizePages([...pages, page]);
    writeJSON(PAGES_FILE, pages);

    tabs = normalizeTabs([
      ...tabs,
      {
        id: crypto.randomUUID(),
        label: cleanedTitle,
        type: 'page',
        target: relativePath,
        order: tabs.length + 1,
      },
    ]);
    writeJSON(TABS_FILE, tabs);

    return res.json({ ok: true, page, pages, tabs });
  } catch (error) {
    return res.status(500).json({ error: 'page_create_failed' });
  }
});

app.delete('/api/admin/pages/:slug', requireAdmin, (req, res) => {
  const slug = sanitizeSlug(req.params.slug);
  const page = pages.find((row) => row.slug === slug);

  if (!page) {
    return res.status(404).json({ error: 'not_found' });
  }

  const fullPath = path.join(PAGES_DIR, `${slug}.html`);
  try {
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }

    pages = normalizePages(pages.filter((row) => row.slug !== slug));
    writeJSON(PAGES_FILE, pages);

    const removedTabIds = tabs.filter((row) => row.target === page.path).map((row) => row.id);
    tabs = normalizeTabs(tabs.filter((row) => row.target !== page.path));
    writeJSON(TABS_FILE, tabs);
    removedTabIds.forEach((tabId) => {
      delete tabBlocks[tabId];
    });
    writeJSON(TAB_BLOCKS_FILE, tabBlocks);

    return res.json({ ok: true, pages, tabs });
  } catch (error) {
    return res.status(500).json({ error: 'page_delete_failed' });
  }
});

app.get('/auth/discord', (req, res) => {
  if (resolveAuthenticatedUser(req)) {
    return res.redirect('/dashboard');
  }
  if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET || !DISCORD_REDIRECT_URI) {
    return res.status(500).send('Discord OAuth не настроен. Проверьте .env');
  }

  const state = createSignedOAuthState();

  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    response_type: 'code',
    redirect_uri: DISCORD_REDIRECT_URI,
    scope: 'identify email',
    state,
    prompt: 'consent',
  });

  return res.redirect(`https://discord.com/oauth2/authorize?${params.toString()}`);
});

app.get('/auth/discord/callback', async (req, res) => {
  const { code, state } = req.query;

  if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET || !DISCORD_REDIRECT_URI) {
    return res.status(500).send('Discord OAuth не настроен. Проверьте .env');
  }

  const stateCheck = verifySignedOAuthState(typeof state === 'string' ? state : '');
  if (!code || !state || !stateCheck.ok) {
    return res.status(400).send('Невалидный OAuth state. Попробуйте снова.');
  }

  try {
    const tokenParams = new URLSearchParams({
      client_id: DISCORD_CLIENT_ID,
      client_secret: DISCORD_CLIENT_SECRET,
      grant_type: 'authorization_code',
      code,
      redirect_uri: DISCORD_REDIRECT_URI,
    });

    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenParams,
    });

    if (!tokenResponse.ok) {
      throw new Error(`Token request failed: ${tokenResponse.status}`);
    }

    const tokenData = await tokenResponse.json();

    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: {
        Authorization: `${tokenData.token_type} ${tokenData.access_token}`,
      },
    });

    if (!userResponse.ok) {
      throw new Error(`User request failed: ${userResponse.status}`);
    }

    const profile = await userResponse.json();

    const nextUser = sanitizeSessionUser({
      id: profile.id,
      username: profile.username,
      global_name: profile.global_name,
      avatar: profile.avatar,
      email: profile.email,
    });
    const authCookieValue = createSignedAuthCookieValue(nextUser);

    return req.session.regenerate((regenError) => {
      if (regenError) {
        return res.status(500).send('Ошибка авторизации Discord: не удалось подготовить сессию.');
      }

      req.session.user = nextUser;
      req.session.settings = getDefaultSettings(nextUser);
      upsertParticipant(nextUser);

      return req.session.save((saveError) => {
        if (saveError) {
          return res.status(500).send('Ошибка авторизации Discord: не удалось сохранить сессию.');
        }
        if (authCookieValue) {
          res.cookie(AUTH_COOKIE_NAME, authCookieValue, {
            httpOnly: true,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
            maxAge: AUTH_COOKIE_TTL_MS,
            path: '/',
          });
        }
        return res.redirect('/dashboard');
      });
    });
  } catch (error) {
    return res.status(500).send(`Ошибка авторизации Discord: ${error.message}`);
  }
});

app.get('/auth/logout', (req, res) => {
  res.clearCookie(AUTH_COOKIE_NAME, { path: '/' });
  req.session.destroy(() => {
    res.redirect('/');
  });
});

startConsultantBackgroundSync();
startBotGatewaySyncLoop();

app.listen(port, () => {
  console.log(`Davis Project server started on http://localhost:${port}`);
});
