import { publicApi, PublicApiError } from './publicApi';
import type { BlogBlock, BlogChrome, BlogPost, Lang, Localized } from './types';
import './style.css';

const root = document.getElementById('app')!;
const site = 'https://blogs.tsuru.jcampos.dev';
const first = localStorage.getItem('tsuru-blog-language');
let language: Lang = first === 'en' ? 'en' : 'es';
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

function header() {
  const shell = el('header', 'site-header');
  const inner = el('div', 'frame header-inner');
  inner.append(link('Tsuru', 'https://tsuru.jcampos.dev', 'wordmark'));
  const nav = el('nav', 'header-nav');
  nav.setAttribute('aria-label', language === 'es' ? 'Navegación' : 'Navigation');
  nav.append(link('Blog', '/', 'current'), link(language === 'es' ? 'Sitio principal' : 'Main site', 'https://tsuru.jcampos.dev'));
  const toggle = el('button', 'language-toggle', language === 'es' ? 'EN' : 'ES');
  toggle.type = 'button';
  toggle.setAttribute('aria-label', language === 'es' ? 'Read in English' : 'Leer en español');
  toggle.onclick = () => { language = language === 'es' ? 'en' : 'es'; localStorage.setItem('tsuru-blog-language', language); void render(); };
  inner.append(nav, toggle);
  shell.append(inner);
  return shell;
}

function footer() {
  const node = el('footer', 'site-footer');
  const inner = el('div', 'frame footer-inner');
  inner.append(el('span', 'wordmark', 'Tsuru'), link(language === 'es' ? 'Volver a Tsuru' : 'Back to Tsuru', 'https://tsuru.jcampos.dev'));
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
  const url = `/?post=${encodeURIComponent(post.slug)}`;
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
  updateCanonical(`/?post=${encodeURIComponent(post.slug)}`);
  const main = el('main', 'article-page');
  const lead = el('div', 'reading-column article-lead');
  lead.append(link(`← ${pick(chrome.backToBlog)}`, '/', 'back-link'),
    el('p', 'eyebrow article-meta', `${formatDate(post.publishedAt)} · ${post.authorName}`),
    el('h1', 'article-title', pick(doc.title)), el('p', 'article-deck', pick(doc.excerpt)));
  main.append(lead);
  const story = el('article', 'story reading-column');
  doc.blocks.forEach((block) => story.append(blockNode(block, post.media)));
  main.append(story);
  const end = el('div', 'reading-column article-end');
  end.append(link(`← ${pick(chrome.backToBlog)}`, '/', 'back-link'));
  main.append(end);
  return main;
}

function updateCanonical(path: string) {
  let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!canonical) { canonical = el('link'); canonical.rel = 'canonical'; document.head.append(canonical); }
  canonical.href = `${site}${path}`;
}

async function render() {
  document.documentElement.lang = language;
  root.replaceChildren(header(), el('main', 'loading', language === 'es' ? 'Cargando artículos…' : 'Loading articles…'), footer());
  try {
    const slug = new URLSearchParams(location.search).get('post') ||
      decodeURIComponent(location.pathname.replace(/^\/+|\/+$/g, ''));
    const chromePromise = publicApi.chrome();
    let page: HTMLElement;
    if (slug) {
      const [post, chrome] = await Promise.all([publicApi.article(slug), chromePromise]);
      page = articlePage(post, chrome);
    } else {
      const [posts, chrome] = await Promise.all([publicApi.list(), chromePromise]);
      page = listPage(posts, chrome);
    }
    root.replaceChildren(header(), page, footer());
  } catch (error) {
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
  }
}

void render();
