# Tsuru public blog

Separate GitHub Pages site for `blogs.tsuru.jcampos.dev`. It reads approved posts and
blog chrome from the Tsuru public API with temporary Cognito guest credentials and
SigV4. It contains no author or admin route and no checked-in editorial JSON.

The Pages workflow requires repository variables `PUBLIC_API_URL`,
`PUBLIC_IDENTITY_POOL_ID`, and `AWS_REGION`. Its build fetches every approved post,
generates index/article HTML and a sitemap, and fails when the API cannot serve
them. Set the custom domain in Pages settings and a DNS CNAME to
`chepelcr.github.io` after the backend is deployed and the three team posts are
imported. Publishing or unpublishing a post must trigger `workflow_dispatch` to
refresh the static HTML; until then, the runtime API reflects the new state but
the old static HTML remains available to non-JavaScript clients.
