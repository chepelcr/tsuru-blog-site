"""Render API-approved posts into GitHub Pages HTML. A failed API read fails the release."""
from __future__ import annotations

import html
import json
import os
from pathlib import Path
from urllib.parse import quote
from urllib.request import Request, urlopen

from botocore.auth import SigV4Auth
from botocore.awsrequest import AWSRequest
from botocore.credentials import Credentials

DIST = Path(__file__).resolve().parents[1] / "dist"
API = os.environ["VITE_PUBLIC_API_URL"].rstrip("/")
POOL = os.environ["VITE_PUBLIC_IDENTITY_POOL_ID"]
REGION = os.getenv("VITE_AWS_REGION") or POOL.split(":", 1)[0]
SITE = "https://blogs.tsuru.jcampos.dev"


def identity_call(target: str, body: dict) -> dict:
    payload = json.dumps(body).encode()
    request = Request(f"https://cognito-identity.{REGION}.amazonaws.com/", payload, {
        "Content-Type": "application/x-amz-json-1.1",
        "X-Amz-Target": f"AWSCognitoIdentityService.{target}",
    })
    with urlopen(request, timeout=20) as response:
        return json.load(response)


credentials: Credentials | None = None


def public_get(path: str) -> dict:
    global credentials
    if credentials is None:
        identity = identity_call("GetId", {"IdentityPoolId": POOL})["IdentityId"]
        keys = identity_call("GetCredentialsForIdentity", {"IdentityId": identity})["Credentials"]
        credentials = Credentials(keys["AccessKeyId"], keys["SecretKey"], keys["SessionToken"])
    url = f"{API}{path}"
    signed = AWSRequest(method="GET", url=url)
    SigV4Auth(credentials, "execute-api", REGION).add_auth(signed)
    request = Request(url, headers=dict(signed.headers.items()))
    with urlopen(request, timeout=30) as response:
        return json.load(response)


def esc(value: object) -> str:
    return html.escape(str(value or ""), quote=True)


def pick(value: dict, lang: str = "es") -> str:
    return str(value.get(lang) or value.get("es") or "")


def image(post: dict, block: dict, lang: str = "es") -> str:
    src = post.get("media", {}).get(block.get("mediaId"))
    if not src:
        return ""
    caption = pick(block.get("caption") or {}, lang)
    layout = block.get("layout", "wide")
    if layout not in {"wide", "full", "left", "right"}:
        layout = "wide"
    picture = f'<div class="figure-image"><img src="{esc(src)}" alt="{esc(pick(block.get("alt") or {}, lang))}" loading="lazy">'
    if caption:
        picture += f"<figcaption>{esc(caption)}</figcaption>"
    picture += "</div>"
    if block.get("type") == "image_text":
        picture += f'<p class="figure-text">{esc(pick(block.get("text") or {}, lang))}</p>'
    extra = ' with-text' if block.get('type') == 'image_text' else ''
    return f'<figure class="story-figure layout-{layout}{extra}">{picture}</figure>'


def block_html(post: dict, block: dict) -> str:
    kind = block.get("type")
    if kind in {"image", "image_text"}:
        return image(post, block)
    if kind == "divider":
        return '<hr class="story-divider">'
    if kind == "embed":
        from urllib.parse import urlparse
        url = block.get("url", "")
        parsed = urlparse(url)
        if parsed.scheme == "https" and parsed.hostname in {"www.youtube.com", "youtube.com", "www.youtube-nocookie.com", "player.vimeo.com"}:
            return f'<iframe class="story-embed" src="{esc(url)}" title="Video del artículo" loading="lazy"></iframe>'
        return ""
    tag = {"heading": "h2", "quote": "blockquote", "list": "div"}.get(kind, "p")
    return f'<{tag} class="story-{esc(kind)}">{esc(pick(block.get("text") or {}))}</{tag}>'


def shell(template: str, body: str, title: str, description: str, path: str) -> str:
    page = template.replace('<div id="app" aria-live="polite"></div>', f'<div id="app" aria-live="polite">{body}</div>')
    page = page.replace('<title>Blog | Tsuru</title>', f'<title>{esc(title)} | Tsuru</title>')
    metadata = (f'<link rel="canonical" href="{SITE}{path}">'
                f'<meta name="description" content="{esc(description)}">'
                f'<meta property="og:title" content="{esc(title)}">'
                f'<meta property="og:description" content="{esc(description)}">'
                f'<meta property="og:url" content="{SITE}{path}">')
    return page.replace('</head>', f'{metadata}</head>')


def frame(content: str) -> str:
    return ('<header class="site-header"><div class="frame header-inner">'
            '<a class="wordmark" href="https://tsuru.jcampos.dev">Tsuru</a>'
            '<nav class="header-nav" aria-label="Navegación"><a class="current" href="/">Blog</a>'
            '<a href="https://tsuru.jcampos.dev">Sitio principal</a></nav></div></header>'
            f'{content}<footer class="site-footer"><div class="frame footer-inner">'
            '<span class="wordmark">Tsuru</span><a href="https://tsuru.jcampos.dev">Volver a Tsuru</a>'
            '</div></footer>')


def card(post: dict) -> str:
    doc = post["revision"]["document"]
    url = f'/{quote(post["slug"])}/'
    title = esc(pick(doc["title"]))
    return (f'<article class="post-card"><div class="card-content">'
            f'<p class="eyebrow">{esc(post.get("authorName"))}</p>'
            f'<h2 class="card-title"><a href="{url}">{title}</a></h2>'
            f'<p class="card-deck">{esc(pick(doc["excerpt"]))}</p>'
            f'<a class="text-link" href="{url}">Leer artículo →</a></div></article>')


def main() -> None:
    chrome = public_get('/api/public/content/landing/blog-chrome')["data"]
    posts = []
    for page in range(1, 101):
        batch = public_get(f'/api/public/blog/posts?page={page}&page_size=50')["data"]
        posts.extend(batch)
        if len(batch) < 50:
            break
    else:
        raise RuntimeError("Blog has more than 5000 published posts")
    template = (DIST / 'index.html').read_text()
    title = pick(chrome["title"])
    lead = (f'<main><section class="blog-hero"><div class="frame hero-inner">'
            f'<p class="eyebrow hero-eyebrow">{esc(pick(chrome["badge"]))}</p>'
            f'<h1 class="hero-title">{esc(title)}</h1>'
            f'<p class="hero-deck">{esc(pick(chrome["subtitle"]))}</p>'
            '</div></section><section class="frame listing"><div class="post-grid">'
            + ''.join(card(post) for post in posts)
            + '</div></section></main>')
    (DIST / 'index.html').write_text(shell(template, frame(lead), title, pick(chrome["subtitle"]), '/'))
    urls = [SITE + '/']
    for summary in posts:
        slug = summary["slug"]
        if not slug or '/' in slug or slug.startswith('.'):
            raise ValueError(f'Unsafe slug: {slug}')
        post = public_get(f'/api/public/blog/posts/{quote(slug)}')
        doc = post["revision"]["document"]
        path = f'/{quote(slug)}/'
        content = (f'<main class="article-page"><div class="reading-column article-lead">'
                   f'<a class="back-link" href="/">← {esc(pick(chrome["backToBlog"]))}</a>'
                   f'<p class="eyebrow article-meta">{esc(post.get("authorName"))}</p>'
                   f'<h1 class="article-title">{esc(pick(doc["title"]))}</h1>'
                   f'<p class="article-deck">{esc(pick(doc["excerpt"]))}</p></div>'
                   '<article class="story reading-column">'
                   + ''.join(block_html(post, block) for block in doc['blocks'])
                   + '</article></main>')
        directory = DIST / slug
        directory.mkdir(parents=True, exist_ok=True)
        (directory / 'index.html').write_text(shell(template, frame(content), pick(doc['title']), pick(doc['excerpt']), path))
        urls.append(SITE + path)
    (DIST / 'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
                                       + ''.join(f'<url><loc>{esc(url)}</loc></url>' for url in urls) + '</urlset>')
    print(f'Prerendered {len(posts)} approved posts from the public API')


if __name__ == '__main__':
    main()
