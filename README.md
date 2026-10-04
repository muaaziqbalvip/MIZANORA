# MIZANORA website (brand + WhatsApp ordering)

Static site. No Firebase, no cart, no admin, no API keys.

## Update the site
1. Edit `config.js` (social links, WhatsApp number, products, domain).
2. Add blog posts as `.md` files in `content/blog/` (copy an existing one).
3. Run `node build.js` (needs only Node, no npm install). Output goes to `public/`.
4. Push to GitHub. Vercel serves the `public/` folder.

## After deploy (Google Search Console)
- Submit `https://YOUR-DOMAIN/sitemap.xml` under Sitemaps.
- URL Inspection > Request indexing for: /, /products, /how-to-order, /blog and each blog post.
- Add the Facebook page link in `config.js` (social list) and rebuild.

## Security
Old `public/js/env.js` held an ImgBB API key and the old store used Firebase.
Delete the old repo files, and rotate the ImgBB key and review Firebase rules/keys.
