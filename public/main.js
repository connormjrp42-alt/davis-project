const revealItems = document.querySelectorAll('.reveal');
const currentPath = normalizePath(window.location.pathname || '/');
const LITE_MOTION_ENABLED = true;

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  },
  {
    threshold: 0.15,
  }
);

revealItems.forEach((el) => observer.observe(el));

function enhanceRevealStagger() {
  const list = Array.from(document.querySelectorAll('.reveal'));
  list.forEach((el, index) => {
    const delay = Math.min(index * 70, 560);
    el.style.setProperty('--reveal-delay', `${delay}ms`);
  });
}

function initHeaderState() {
  const header = document.querySelector('.header');
  if (!header) return;

  const onScroll = () => {
    const active = (window.scrollY || 0) > 10;
    header.classList.toggle('is-scrolled', active);
    document.body.classList.toggle('is-scrolled', active);
  };

  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
}

function initTiltMotion() {
  if (document.body.classList.contains('motion-lite')) return;
  if (!window.matchMedia('(pointer: fine)').matches) return;

  const targets = Array.from(
    document.querySelectorAll('.hero-logo-stage, .post-card, .faction-card, .bot-project-card, .role, .help-wrap')
  );
  if (!targets.length) return;

  targets.forEach((el) => {
    el.classList.add('ui-tilt');
    let raf = 0;

    const reset = () => {
      el.style.setProperty('--tilt-x', '0deg');
      el.style.setProperty('--tilt-y', '0deg');
      el.style.setProperty('--tilt-tx', '0px');
      el.style.setProperty('--tilt-ty', '0px');
    };

    const onMove = (event) => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        const rect = el.getBoundingClientRect();
        const px = (event.clientX - rect.left) / Math.max(1, rect.width);
        const py = (event.clientY - rect.top) / Math.max(1, rect.height);
        const rx = (0.5 - py) * 4.4;
        const ry = (px - 0.5) * 6.2;
        const tx = (px - 0.5) * 5;
        const ty = (py - 0.5) * 4;
        el.style.setProperty('--tilt-x', `${rx.toFixed(2)}deg`);
        el.style.setProperty('--tilt-y', `${ry.toFixed(2)}deg`);
        el.style.setProperty('--tilt-tx', `${tx.toFixed(2)}px`);
        el.style.setProperty('--tilt-ty', `${ty.toFixed(2)}px`);
      });
    };

    const onLeave = () => {
      if (raf) {
        window.cancelAnimationFrame(raf);
        raf = 0;
      }
      reset();
    };

    reset();
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);
    el.addEventListener('pointercancel', onLeave);
  });
}

function initMotionPreset() {
  if (LITE_MOTION_ENABLED) {
    document.body.classList.add('motion-lite');
  }
}

function normalizePath(value) {
  if (!value || typeof value !== 'string') return '/';
  const trimmed = value.split('#')[0].split('?')[0] || '/';
  if (!trimmed.startsWith('/')) return '/';
  if (trimmed.length > 1 && trimmed.endsWith('/')) return trimmed.slice(0, -1);
  return trimmed;
}

function markActivePageLink() {
  const links = Array.from(document.querySelectorAll('#mainNav a'));
  if (!links.length) return;
  links.forEach((link) => {
    const href = link.getAttribute('href') || '/';
    link.classList.toggle('active', normalizePath(href) === currentPath);
  });
}

const orb = document.querySelector('.hero-orb');
window.addEventListener('mousemove', (event) => {
  if (!orb) return;

  const x = (event.clientX / window.innerWidth - 0.5) * 10;
  const y = (event.clientY / window.innerHeight - 0.5) * 10;
  orb.style.transform = `translate(${x}px, ${y}px)`;
});

function applyLayout(layout) {
  Object.entries(layout || {}).forEach(([id, entry]) => {
    let el = document.querySelector(`[data-edit-id="${id}"]`);
    if (!el || !entry || typeof entry.text !== 'string') return;

    if (entry.tag && entry.tag.toUpperCase() !== el.tagName.toUpperCase()) {
      const replacement = document.createElement(entry.tag.toLowerCase());
      replacement.setAttribute('data-edit-id', id);
      replacement.className = el.className;
      replacement.id = el.id;
      replacement.textContent = entry.text;
      el.replaceWith(replacement);
      el = replacement;
    } else {
      el.textContent = entry.text;
    }
  });
}

async function hydrateLayout() {
  try {
    const response = await fetch('/api/layout');
    const data = await response.json();
    applyLayout(data.layout || {});
  } catch (error) {
    console.error('Layout hydration error:', error);
  }
}

async function hydratePublicContent() {
  const map = {
    serverTitle: document.getElementById('serverTitle'),
    serverAnnouncement: document.getElementById('serverAnnouncement'),
    serverHowToStart: document.getElementById('serverHowToStart'),
    serverContacts: document.getElementById('serverContacts'),
    roleNewbie: document.getElementById('roleNewbie'),
    roleState: document.getElementById('roleState'),
    roleCrime: document.getElementById('roleCrime'),
  };

  try {
    const response = await fetch('/api/content');
    const data = await response.json();
    const content = data.content || {};

    Object.entries(map).forEach(([key, el]) => {
      if (!el) return;
      if (typeof content[key] === 'string' && content[key].trim()) {
        el.textContent = content[key];
      }
    });
  } catch (error) {
    console.error('Content hydration error:', error);
  }
}

function buildTabBlock(block) {
  const card = document.createElement('article');
  card.className = 'tab-block';
  card.style.left = `${block.x}%`;
  card.style.top = `${block.y}px`;
  card.style.width = `${block.width}px`;
  card.style.minHeight = `${block.height}px`;

  if ((block.type === 'image' || block.type === 'combo') && block.imageUrl) {
    const image = document.createElement('img');
    image.src = block.imageUrl;
    image.alt = block.title || 'tab image';
    image.loading = 'lazy';
    image.className = 'tab-block-image';
    card.append(image);
  }

  if ((block.type === 'text' || block.type === 'combo') && block.title) {
    const title = document.createElement('h3');
    title.textContent = block.title;
    card.append(title);
  }

  if ((block.type === 'text' || block.type === 'combo') && block.text) {
    const text = document.createElement('p');
    text.textContent = block.text;
    card.append(text);
  }

  return card;
}

async function hydrateTabs() {
  const dynamicRoot = document.getElementById('dynamicTabsRoot');
  if (!dynamicRoot) return;

  try {
    const response = await fetch('/api/tabs');
    const data = await response.json();
    const tabs = data.tabs || [];

    if (!tabs.length) return;

    dynamicRoot.innerHTML = '';

    for (const tab of tabs) {
      if (!tab || !tab.label || !tab.target || !tab.id) continue;

      if (tab.type !== 'section' || !tab.target.startsWith('#')) continue;

      const sectionId = tab.target.slice(1);
      const existing = document.getElementById(sectionId);
      if (existing) continue;

      const section = document.createElement('section');
      section.id = sectionId;
      section.className = 'section container reveal';
      section.innerHTML = `<h2>${tab.label}</h2><div class="tab-canvas" id="tabCanvas-${tab.id}"></div>`;
      dynamicRoot.append(section);
      observer.observe(section);

      try {
        const blocksResp = await fetch(`/api/tab-blocks/${tab.id}`);
        const blocksData = await blocksResp.json();
        const blocks = blocksData.blocks || [];
        const canvas = section.querySelector(`#tabCanvas-${tab.id}`);

        if (!canvas) continue;
        if (!blocks.length) {
          const empty = document.createElement('article');
          empty.className = 'tab-block';
          empty.style.left = '0%';
          empty.style.top = '0px';
          empty.style.width = '320px';
          empty.style.minHeight = '120px';
          empty.innerHTML = '<h3>Пустая вкладка</h3><p>Администратор может добавить сюда контент-блоки.</p>';
          canvas.append(empty);
          continue;
        }

        blocks.forEach((block) => {
          canvas.append(buildTabBlock(block));
        });
      } catch (error) {
        console.error('Tab blocks hydration error:', error);
      }
    }
  } catch (error) {
    console.error('Tabs hydration error:', error);
  }
}

function createPostCard(post) {
  const card = document.createElement('article');
  card.className = 'post-card';

  if (post.imageUrl) {
    const image = document.createElement('img');
    image.src = post.imageUrl;
    image.alt = post.title || 'post image';
    image.loading = 'lazy';
    image.className = 'post-image';
    card.append(image);
  }

  const title = document.createElement('h3');
  title.textContent = post.title;
  card.append(title);

  const text = document.createElement('p');
  text.textContent = post.text;
  card.append(text);

  if (post.buttonText && post.buttonUrl) {
    const button = document.createElement('a');
    button.className = 'cta cta-ghost';
    button.textContent = post.buttonText;
    button.href = post.buttonUrl;
    card.append(button);
  }

  return card;
}

async function hydratePosts() {
  const grid = document.getElementById('postsGrid');
  if (!grid) return;

  try {
    const response = await fetch('/api/posts');
    const data = await response.json();
    const posts = data.posts || [];

    grid.innerHTML = '';

    if (!posts.length) {
      const empty = document.createElement('article');
      empty.className = 'post-card';
      empty.innerHTML = '<h3>Постов пока нет</h3><p>Администратор скоро добавит новые материалы.</p>';
      grid.append(empty);
      return;
    }

    posts.forEach((post) => {
      grid.append(createPostCard(post));
    });
  } catch (error) {
    console.error('Posts hydration error:', error);
  }
}

function ensureEdgeNavigator() {
  let nav = document.getElementById('dpEdgeNavigator');
  if (nav) return nav;
  nav = document.createElement('aside');
  nav.id = 'dpEdgeNavigator';
  nav.className = 'edge-nav';
  nav.innerHTML = `
    <div class="edge-nav-title">Навигатор</div>
    <nav id="dpEdgeNavigatorList" class="edge-nav-list"></nav>
  `;
  document.body.append(nav);
  return nav;
}

function bindEdgeSpy(items) {
  const links = Array.from(document.querySelectorAll('#dpEdgeNavigatorList a'));
  if (!links.length || !items.length) return;

  const setActive = (target) => {
    links.forEach((link) => {
      link.classList.toggle('active', link.getAttribute('href') === target);
    });
  };

  const hashItems = items.filter((item) => item.target.startsWith('#'));
  if (!hashItems.length) return;

  setActive(hashItems[0].target);

  const io = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible?.target?.id) return;
      setActive(`#${visible.target.id}`);
    },
    { rootMargin: '-20% 0px -65% 0px', threshold: [0.15, 0.35, 0.55] }
  );

  hashItems.forEach((item) => {
    const section = document.getElementById(item.target.slice(1));
    if (section) io.observe(section);
  });
}

async function hydrateEdgeNavigator() {
  const nav = ensureEdgeNavigator();
  const list = nav.querySelector('#dpEdgeNavigatorList');
  if (!list) return;

  try {
    const response = await fetch(`/api/navigator?path=${encodeURIComponent(currentPath)}`);
    const data = await response.json();
    const items = data.items || [];

    list.innerHTML = '';
    if (!items.length) {
      nav.style.display = 'none';
      return;
    }

    nav.style.display = '';
    items.forEach((item) => {
      const link = document.createElement('a');
      link.href = item.target;
      link.textContent = item.label;
      list.append(link);
    });

    bindEdgeSpy(items);
  } catch (error) {
    nav.style.display = 'none';
    console.error('Navigator hydration error:', error);
  }
}

async function hydrateAuthState() {
  const authButtons = document.querySelectorAll('a[href="/auth/discord"]');
  const helpWrap = document.querySelector('.help-wrap');

  try {
    const response = await fetch('/api/me');
    const data = await response.json();

    if (!data.authenticated) return;

    authButtons.forEach((button) => {
      button.textContent = 'Личный кабинет';
      button.href = '/dashboard';
    });

    if (helpWrap && data.user) {
      const name = data.user.global_name || data.user.username;
      const userInfo = document.createElement('p');
      userInfo.append('Вы вошли как ');
      const strong = document.createElement('strong');
      strong.textContent = name;
      userInfo.append(strong);
      userInfo.append('. ');
      const logoutLink = document.createElement('a');
      logoutLink.href = '/auth/logout';
      logoutLink.textContent = 'Выйти';
      userInfo.append(logoutLink);
      helpWrap.appendChild(userInfo);
    }
  } catch (error) {
    console.error('Auth hydration error:', error);
  }
}

async function initPage() {
  initMotionPreset();
  enhanceRevealStagger();
  initHeaderState();
  initTiltMotion();
  markActivePageLink();
  await hydratePublicContent();
  await hydrateLayout();
  await hydrateTabs();
  await hydratePosts();
  await hydrateEdgeNavigator();
  await hydrateAuthState();
}

initPage();
