# Tsuru public blog

Separate GitHub Pages site for `blogs.tsuru.jcampos.dev`. It reads approved posts and
blog chrome from the Tsuru public API with temporary Cognito guest credentials and
SigV4. It contains no author or admin route and no checked-in editorial JSON.

The Pages workflow requires repository variables `PUBLIC_API_URL`,
`PUBLIC_IDENTITY_POOL_ID`, and `AWS_REGION`. CI builds code only; all posts and
blog chrome, navigation, and brand settings are fetched from the public API
when the visitor opens the site. Article links use `/blog/<post-id>` with the
published post UUID. GitHub Pages serves `public/404.html` for direct article
requests; its code-only redirect restores the original path once the app loads.
Old `?post=<slug>` links resolve through the legacy public endpoint and are
replaced with the post's ID path. Publishing or unpublishing a post changes the
API response directly; Pages does not copy editorial data into its CI artifacts.
