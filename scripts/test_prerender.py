import importlib.util
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch


class PrerenderTest(unittest.TestCase):
    def test_api_posts_become_index_article_and_sitemap(self):
        with patch.dict(os.environ, {
            'VITE_PUBLIC_API_URL': 'https://public-api.example',
            'VITE_PUBLIC_IDENTITY_POOL_ID': 'us-east-1:example',
        }):
            spec = importlib.util.spec_from_file_location('blog_prerender', Path(__file__).with_name('prerender.py'))
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
        document = {'title': {'es': 'Historia & Tsuru', 'en': 'A story'},
                    'excerpt': {'es': 'Resumen', 'en': 'Summary'},
                    'blocks': [{'type': 'paragraph', 'text': {'es': 'Contenido', 'en': 'Content'}}]}
        post = {'slug': 'historia-tsuru', 'authorName': 'Equipo Tsuru', 'media': {},
                'revision': {'document': document}}
        chrome = {'title': {'es': 'Blog de Tsuru', 'en': 'Tsuru blog'},
                  'subtitle': {'es': 'Historias', 'en': 'Stories'},
                  'badge': {'es': 'Blog', 'en': 'Blog'},
                  'backToBlog': {'es': 'Volver', 'en': 'Back'}}

        def api(path):
            if 'blog-chrome' in path:
                return {'data': chrome}
            if path.endswith('/historia-tsuru'):
                return post
            if path.endswith('page=1&page_size=50'):
                return {'data': [post]}
            raise AssertionError(path)

        with tempfile.TemporaryDirectory() as directory:
            module.DIST = Path(directory)
            module.DIST.joinpath('index.html').write_text(
                '<html><head><title>Blog | Tsuru</title></head><body>'
                '<div id="app" aria-live="polite"></div></body></html>')
            module.public_get = api
            module.main()
            index = module.DIST.joinpath('index.html').read_text()
            article = module.DIST.joinpath('historia-tsuru', 'index.html').read_text()
            sitemap = module.DIST.joinpath('sitemap.xml').read_text()
            self.assertIn('Blog de Tsuru', index)
            self.assertIn('Historia &amp; Tsuru', article)
            self.assertIn('Contenido', article)
            self.assertIn('rel="canonical"', article)
            self.assertIn('/historia-tsuru/', sitemap)


if __name__ == '__main__':
    unittest.main()
