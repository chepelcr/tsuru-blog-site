# Tsuru public blog

Separate GitHub Pages site for `blogs.tsuru.jcampos.dev`. It reads approved posts and
blog chrome from the Tsuru public API with temporary Cognito guest credentials and
SigV4. It contains no author or admin route and no checked-in editorial JSON.

The Pages workflow requires repository variables `PUBLIC_API_URL`,
`PUBLIC_IDENTITY_POOL_ID`, and `AWS_REGION`. CI builds code only; all posts and
blog chrome are fetched from the public API when the visitor opens the site.
Article links use `/?post=<slug>` so GitHub Pages returns HTTP 200 for direct
visits without build-time content generation. Set the custom domain in Pages settings and a DNS CNAME to
`chepelcr.github.io` after the backend is deployed and the three team posts are
imported. Publishing or unpublishing a post changes the API response directly;
Pages does not copy editorial data into its CI artifacts.
