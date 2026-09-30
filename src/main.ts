import { publicApi, PublicApiError } from './publicApi';
import type { BlogBlock, BlogChrome, BlogPost, BrandingContent, FooterContent, Lang, Localized, NavbarContent } from './types';
import './style.css';

const root = document.getElementById('app')!;
const site = 'https://blogs.tsuru.jcampos.dev';
const savedLanguage = localStorage.getItem('language') || localStorage.getItem('tsuru-blog-language');
let language: Lang = savedLanguage === 'en' || savedLanguage === 'es'
  ? savedLanguage : navigator.language.toLowerCase().startsWith('es') ? 'es' : 'en';
let branding: BrandingContent | undefined;
let navbar: NavbarContent | undefined;
let footerContent: FooterContent | undefined;
let blogChrome: BlogChrome | undefined;
let renderVersion = 0;
const pick = (value: Localized) => value[language] || value.es;
const el = <K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};
const link = (text: string, href: string, className = '') => {
  const node = el('a', className, text);
  node.href = href;
  return node;
};

function themeIsDark() {
  const choice = localStorage.getItem('theme');
  return choice === 'dark' || (choice !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);
}

function applyTheme() {
  const dark = themeIsDark();
  document.documentElement.classList.toggle('dark', dark);
  document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.setAttribute('content', dark ? '#191614' : '#f8f8f2');
  if (branding) {
    const icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]') || el('link');
    icon.rel = 'icon';
    icon.href = dark ? branding.faviconUrlDark : branding.faviconUrl;
    if (!icon.parentElement) document.head.append(icon);
  }
}

function icon(name: 'sun' | 'moon' | 'menu' | 'close' | 'chevron') {
  const paths = {
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/>',
    moon: '<path d="M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    close: '<path d="M5 5l14 14M19 5 5 19"/>',
    chevron: '<path d="m6 9 6 6 6-6"/>',
  };
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.8');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = paths[name];
  return svg;
}

function logo(label: string) {
  const anchor = link('', 'https://tsuru.jcampos.dev/', 'brand-logo');
  anchor.setAttribute('aria-label', label);
  if (branding?.logoUrl) {
    const light = el('img', 'logo-light');
    light.src = branding.logoUrl;
    light.alt = label;
    const dark = el('img', 'logo-dark');
    dark.src = branding.logoUrlDark || branding.logoUrl;
    dark.alt = '';
    anchor.append(light, dark);
  } else anchor.append(el('span', 'wordmark', label));
  return anchor;
}

function languageButton() {
  const button = el('button', 'icon-button language-toggle');
  button.type = 'button';
  button.setAttribute('aria-label', language === 'es' ? 'Read in English' : 'Leer en español');
  const flag = el('img');
  flag.src = language === 'es' ? 'https://flagcdn.com/w20/cr.png' : 'https://flagcdn.com/w20/us.png';
  flag.alt = language === 'es' ? 'Costa Rica' : 'United States';
  button.append(flag);
  button.onclick = () => {
    language = language === 'es' ? 'en' : 'es';
    localStorage.setItem('language', language);
    void render('language');
  };
  return button;
}

function themeButton() {
  const button = el('button', 'icon-button theme-toggle');
  button.type = 'button';
  button.setAttribute('aria-label', language === 'es' ? 'Cambiar tema' : 'Toggle theme');
  const sun = icon('sun');
  sun.classList.add('sun');
  const moon = icon('moon');
  moon.classList.add('moon');
  button.append(sun, moon);
  button.onclick = () => {
    document.body.classList.add('theme-transitioning');
    localStorage.setItem('theme', themeIsDark() ? 'light' : 'dark');
    applyTheme();
    window.setTimeout(() => document.body.classList.remove('theme-transitioning'), 800);
  };
  return button;
}

function navLinks() {
  const nav = el('nav', 'header-nav');
  nav.setAttribute('aria-label', language === 'es' ? 'Navegación principal' : 'Main navigation');
  if (!navbar) return nav;
  const links: [keyof NavbarContent['links'], string][] = [
    ['features', '/funcionalidades'], ['plans', '/planes'], ['fairs', '/ferias'],
    ['community', '/comunidad'], ['examples', '/ejemplos'],
  ];
  for (const [key, path] of links) nav.append(link(pick(navbar.links[key]), `https://tsuru.jcampos.dev${path}`));
  const about = el('details', 'nav-dropdown');
  const summary = el('summary', '', pick(navbar.links.nosotros));
  summary.append(icon('chevron'));
  about.append(summary, el('div', 'dropdown-menu'));
  about.lastElementChild!.append(
    link(pick(navbar.links.about), 'https://tsuru.jcampos.dev/quienes-somos'),
    link(pick(navbar.links.contact), 'https://tsuru.jcampos.dev/contacto'),
  );
  nav.append(about, link(pick(navbar.links.blog), '/', 'current'));
  return nav;
}

function accountLinks() {
  const box = el('div', 'account-links');
  if (navbar && branding) box.append(
    link(pick(navbar.login), branding.adminLoginUrl, 'login-link'),
    link(pick(navbar.register), branding.adminRegisterUrl, 'register-link'),
  );
  return box;
}

function header() {
  const shell = el('header', 'site-header');
  const inner = el('div', 'frame header-inner');
  inner.append(logo(navbar ? pick(navbar.brand) : 'Tsuru'));
  const desktop = el('div', 'desktop-header');
  const actions = el('div', 'header-actions');
  actions.append(languageButton(), themeButton());
  desktop.append(navLinks(), actions, accountLinks());
  inner.append(desktop);
  const mobileControls = el('div', 'mobile-controls');
  const menuButton = el('button', 'icon-button menu-toggle');
  menuButton.type = 'button';
  menuButton.setAttribute('aria-label', language === 'es' ? 'Abrir menú' : 'Open menu');
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.append(icon('menu'));
  const mobile = el('div', 'mobile-menu');
  mobile.append(navLinks(), accountLinks());
  menuButton.onclick = () => {
    const open = mobile.classList.toggle('open');
    menuButton.replaceChildren(icon(open ? 'close' : 'menu'));
    menuButton.setAttribute('aria-expanded', String(open));
  };
  mobileControls.append(languageButton(), themeButton(), menuButton);
  inner.append(mobileControls);
  shell.append(inner, mobile);
  return shell;
}

function footer() {
  const node = el('footer', 'site-footer');
  if (!footerContent) return node;
  const inner = el('div', 'frame footer-inner');
  if (blogChrome) {
    const back = el('div', 'footer-back');
    back.append(link(`← ${pick(blogChrome.backToBlog)}`, '/', 'back-link'));
    inner.append(back);
  }
  const columns = el('div', 'footer-columns');
  const brand = el('div', 'footer-brand');
  brand.append(logo(pick(footerContent.brand)), el('p', '', pick(footerContent.description)));
  columns.append(brand);
  const groups: { name: 'product' | 'company' | 'legal'; links: [keyof FooterContent['links'], string][] }[] = [
    { name: 'product', links: [['features', '/funcionalidades'], ['plans', '/planes'], ['fairs', '/ferias'], ['community', '/comunidad'], ['examples', '/ejemplos']] },
    { name: 'company', links: [['about', '/quienes-somos'], ['blog', '/'], ['contact', '/contacto']] },
    { name: 'legal', links: [['terms', '/terminos'], ['privacy', '/privacidad'], ['cookies', '/cookies']] },
  ];
  for (const group of groups) {
    const column = el('div', 'footer-group');
    column.append(el('h2', '', pick(footerContent.groups[group.name])));
    for (const [key, path] of group.links) column.append(link(pick(footerContent.links[key]), path === '/' ? '/' : `https://tsuru.jcampos.dev${path}`));
    columns.append(column);
  }
  inner.append(columns);
  const lower = el('div', 'footer-lower');
  lower.append(el('p', '', pick(footerContent.copyright).replace(/©\s*\d{4}/, `© ${new Date().getFullYear()}`)));
  const studio = link('', footerContent.madeBy.url, 'footer-studio');
  studio.target = '_blank';
  studio.rel = 'noopener noreferrer';
  studio.append(el('span', '', pick(footerContent.madeBy.label)));
  if (footerContent.madeBy.logoUrl) {
    const image = el('img');
    image.src = new URL(footerContent.madeBy.logoUrl, 'https://tsuru.jcampos.dev').href;
    image.alt = footerContent.madeBy.name;
    image.loading = 'lazy';
    studio.append(image);
  }
  studio.append(el('span', 'studio-name', footerContent.madeBy.name));
  lower.append(studio);
  inner.append(lower);
  node.append(inner);
  return node;
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat(language === 'es' ? 'es-CR' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(iso));
}

function cover(post: BlogPost) {
  const doc = post.revision.document;
  const id = doc.coverMediaId || doc.blocks.find((block) => block.mediaId)?.mediaId;
  return id ? post.media[id] : undefined;
}

function card(post: BlogPost, featured = false) {
  const node = el('article', featured ? 'post-card featured' : 'post-card');
  const url = `/blog/${encodeURIComponent(post.id)}`;
  const picture = cover(post);
  if (picture) {
    const imageLink = link('', url, 'card-image-link');
    const image = el('img', 'card-image');
    image.src = picture;
    image.alt = pick(post.revision.document.title);
    image.loading = 'lazy';
    imageLink.append(image);
    node.append(imageLink);
  }
  const content = el('div', 'card-content');
  content.append(el('p', 'eyebrow', `${formatDate(post.publishedAt)} · ${post.authorName}`));
  const heading = el(featured ? 'h2' : 'h3', 'card-title');
  heading.append(link(pick(post.revision.document.title), url));
  content.append(heading, el('p', 'card-deck', pick(post.revision.document.excerpt)),
    link(language === 'es' ? 'Leer artículo →' : 'Read article →', url, 'text-link'));
  node.append(content);
  return node;
}

function blockNode(block: BlogBlock, media: Record<string, string>) {
  if (block.type === 'divider') return el('hr', 'story-divider');
  if (block.type === 'heading') return el('h2', 'story-heading', block.text ? pick(block.text) : '');
  if (block.type === 'quote') return el('blockquote', 'story-quote', block.text ? pick(block.text) : '');
  if (block.type === 'paragraph' || block.type === 'list' || block.type === 'callout') {
    const node = el(block.type === 'list' ? 'div' : 'p', `story-${block.type}`, block.text ? pick(block.text) : '');
    return node;
  }
  if (block.type === 'embed') {
    const url = new URL(block.url || '', location.origin);
    if (url.protocol !== 'https:' || !['www.youtube.com', 'youtube.com', 'www.youtube-nocookie.com', 'player.vimeo.com'].includes(url.hostname)) return el('div');
    const frame = el('iframe', 'story-embed');
    frame.src = url.href;
    frame.title = language === 'es' ? 'Video del artículo' : 'Article video';
    frame.loading = 'lazy';
    frame.allow = 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture';
    return frame;
  }
  const node = el('figure', `story-figure ${block.type === 'image_text' ? 'with-text' : ''} layout-${block.layout || 'wide'}`);
  const imageWrap = el('div', 'figure-image');
  if (block.mediaId && media[block.mediaId]) {
    const image = el('img');
    image.src = media[block.mediaId];
    image.alt = block.alt ? pick(block.alt) : '';
    image.loading = 'lazy';
    imageWrap.append(image);
  }
  if (block.caption && pick(block.caption)) imageWrap.append(el('figcaption', '', pick(block.caption)));
  node.append(imageWrap);
  if (block.type === 'image_text' && block.text) node.append(el('p', 'figure-text', pick(block.text)));
  return node;
}

function listPage(posts: BlogPost[], chrome: BlogChrome) {
  document.title = `${pick(chrome.title)} | Tsuru`;
  updateCanonical('/');
  const main = el('main');
  const hero = el('section', 'blog-hero');
  const heroInner = el('div', 'frame hero-inner');
  heroInner.append(el('p', 'eyebrow hero-eyebrow', pick(chrome.badge)), el('h1', 'hero-title', pick(chrome.title)),
    el('p', 'hero-deck', pick(chrome.subtitle)));
  hero.append(heroInner);
  main.append(hero);
  const body = el('section', 'frame listing');
  if (posts.length === 0) body.append(el('p', 'empty', language === 'es' ? 'Todavía no hay artículos publicados.' : 'No articles have been published yet.'));
  else {
    const [firstPost, ...rest] = posts;
    body.append(card(firstPost, true));
    const grid = el('div', 'post-grid');
    rest.forEach((post) => grid.append(card(post)));
    body.append(grid);
  }
  main.append(body);
  return main;
}

function articlePage(post: BlogPost, chrome: BlogChrome) {
  const doc = post.revision.document;
  document.title = `${pick(doc.title)} | Tsuru`;
  updateCanonical(`/blog/${encodeURIComponent(post.id)}`);
  const main = el('main', 'article-page');
  const lead = el('div', 'reading-column article-lead');
  lead.append(link(`← ${pick(chrome.backToBlog)}`, '/', 'back-link'),
    el('p', 'eyebrow article-meta', `${formatDate(post.publishedAt)} · ${post.authorName}`),
    el('h1', 'article-title', pick(doc.title)), el('p', 'article-deck', pick(doc.excerpt)));
  main.append(lead);
  const story = el('article', 'story reading-column');
  doc.blocks.forEach((block) => story.append(blockNode(block, post.media)));
  main.append(story);
  return main;
}

function updateCanonical(path: string) {
  let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!canonical) { canonical = el('link'); canonical.rel = 'canonical'; document.head.append(canonical); }
  canonical.href = `${site}${path}`;
}

async function showPage(page: HTMLElement, version: number, transition: 'none' | 'page' | 'language') {
  const animate = transition !== 'none' && !matchMedia('(prefers-reduced-motion: reduce)').matches;
  const outgoing = transition === 'language' ? root : root.querySelector('main');
  if (animate && outgoing) {
    outgoing.classList.add(transition === 'language' ? 'language-transitioning' : 'page-exit');
    await new Promise((resolve) => window.setTimeout(resolve, transition === 'language' ? 300 : 280));
    if (version !== renderVersion) return;
  }
  root.classList.remove('language-transitioning');
  root.replaceChildren(header(), page, footer());
  root.removeAttribute('aria-busy');
  if (animate) {
    const incoming = transition === 'language' ? root : page;
    const className = transition === 'language' ? 'slide-in' : 'page-enter';
    incoming.classList.add(className);
    window.setTimeout(() => incoming.classList.remove(className), 560);
  }
}

async function render(transition: 'none' | 'page' | 'language' = 'none') {
  const version = ++renderVersion;
  document.documentElement.lang = language;
  root.setAttribute('aria-busy', 'true');
  if (!root.hasChildNodes()) root.replaceChildren(header(), el('main', 'loading', language === 'es' ? 'Cargando artículos…' : 'Loading articles…'));
  try {
    const path = location.pathname.match(/^\/blog\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/?$/i);
    const legacy = new URLSearchParams(location.search).get('post');
    const chromePromise = publicApi.chrome();
    const navPromise = publicApi.navbar();
    const brandPromise = publicApi.branding();
    const footerPromise = publicApi.footer();
    let page: HTMLElement;
    if (path || legacy) {
      const [post, chrome, nav, brand, siteFooter] = await Promise.all([
        path ? publicApi.articleById(path[1]) : publicApi.legacyArticle(legacy!),
        chromePromise, navPromise, brandPromise, footerPromise,
      ]);
      if (version !== renderVersion) return;
      navbar = nav;
      branding = brand;
      footerContent = siteFooter;
      blogChrome = chrome;
      if (legacy || location.pathname !== `/blog/${post.id}`) history.replaceState({}, '', `/blog/${post.id}`);
      page = articlePage(post, chrome);
    } else if (location.pathname === '/') {
      const [posts, chrome, nav, brand, siteFooter] = await Promise.all([publicApi.list(), chromePromise, navPromise, brandPromise, footerPromise]);
      if (version !== renderVersion) return;
      navbar = nav;
      branding = brand;
      footerContent = siteFooter;
      blogChrome = chrome;
      page = listPage(posts, chrome);
    } else {
      throw new PublicApiError(404);
    }
    applyTheme();
    await showPage(page, version, transition);
  } catch (error) {
    if (version !== renderVersion) return;
    const missing = error instanceof PublicApiError && error.status === 404;
    const main = el('main', 'state-page');
    main.append(el('h1', '', missing
      ? (language === 'es' ? 'Artículo no encontrado' : 'Article not found')
      : (language === 'es' ? 'No pudimos cargar el blog' : 'Could not load the blog')));
    main.append(el('p', '', missing
      ? (language === 'es' ? 'Este artículo ya no está disponible.' : 'This article is no longer available.')
      : (language === 'es' ? 'Comprueba tu conexión e inténtalo de nuevo.' : 'Check your connection and try again.')));
    const retry = el('button', 'button', language === 'es' ? 'Reintentar' : 'Retry');
    retry.onclick = () => void render();
    main.append(missing ? link(language === 'es' ? 'Ver artículos' : 'See articles', '/', 'button') : retry);
    root.replaceChildren(header(), main, footer());
    root.removeAttribute('aria-busy');
  }
}

const recoveredRoute = new URLSearchParams(location.search).get('route');
if (recoveredRoute?.startsWith('/') && !recoveredRoute.startsWith('//')) {
  history.replaceState({}, '', recoveredRoute);
}
applyTheme();
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (!localStorage.getItem('theme') || localStorage.getItem('theme') === 'system') applyTheme();
});
document.addEventListener('click', (event) => {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const target = event.target;
  const anchor = target instanceof Element ? target.closest('a') : null;
  if (!(anchor instanceof HTMLAnchorElement) || anchor.origin !== location.origin || anchor.target || anchor.hasAttribute('download')) return;
  event.preventDefault();
  if (anchor.pathname + anchor.search !== location.pathname + location.search) {
    history.pushState({}, '', anchor.pathname + anchor.search + anchor.hash);
    window.scrollTo(0, 0);
    void render('page');
  }
});
window.addEventListener('popstate', () => void render('page'));
void render();
