# MIZANORA Store: Setup Guide (Next.js + Firebase + Vercel)

## 0. Replace the old site in GitHub
1. In your GitHub repo, delete the OLD files: `public/`, `static/`, `content/`, `build.js`, `config.js`, `vercel.json`, `README.md` and the files inside `.github/workflows/` (the old bot workflows).
2. Upload ALL files from this zip to the repo root (use a PC or GitHub Desktop; the phone browser skips hidden files like `.gitignore`).
   You should see `app/`, `components/`, `lib/`, `public/`, `content/`, `package.json`, `next.config.js`, `vercel.json`, `firestore.rules` at the top level.

## 1. Firebase (free Spark plan)
1. console.firebase.google.com > Add project (turn Google Analytics off).
2. **Firestore Database** > Create database > Production mode > pick a region (asia-south1 Mumbai is closest to Pakistan).
3. **Authentication** > Get started > Sign-in method > enable **Email/Password** AND **Google** (choose a support email, Save).
4. Authentication > Users > **Add user**: your admin email + a strong password (for the email login). Copy the **User UID**. If you only want Google login you can skip this user.
5. Authentication > Settings > User actions > **turn OFF "Enable create (sign-up)"** so nobody else can register.
6. Firestore > Rules: paste the contents of `firestore.rules`, replace `PASTE_ADMIN_UID_HERE` with your UID and `PASTE_ADMIN_EMAIL_HERE@gmail.com` with your Google admin email, click **Publish**. (Google login works through the email line, email login works through the UID line.)
6b. Authentication > Settings > **Authorized domains** > Add `mizanora.vercel.app` (and later `mizanora.store`). Google login fails without this.
7. Project settings (gear) > General > Your apps > Web (`</>`) > register app > copy `apiKey`, `authDomain`, `projectId`, `appId`.
8. Project settings > **Service accounts** > Generate new private key. Open the JSON: you need `client_email` and `private_key`.

## 2. Vercel
1. vercel.com > your project > Settings > Build and Development Settings: Framework Preset **Next.js**. **Turn OFF every override** (Build Command, Output Directory, Install Command must show the defaults).
2. Settings > Environment Variables. Add (see `.env.example`):

| Name | Value |
|---|---|
| NEXT_PUBLIC_SITE_URL | https://mizanora.vercel.app (later https://mizanora.store) |
| NEXT_PUBLIC_WHATSAPP_NUMBER | 923062015326 |
| NEXT_PUBLIC_SHIPPING_FEE | 0 (free delivery) or e.g. 250 |
| NEXT_PUBLIC_FIREBASE_API_KEY / _AUTH_DOMAIN / _PROJECT_ID / _APP_ID | from step 1.7 |
| NEXT_PUBLIC_ADMIN_EMAIL | your admin email(s), separated by commas, same as in the rules |
| FIREBASE_CLIENT_EMAIL | `client_email` from the JSON |
| FIREBASE_PRIVATE_KEY | `private_key` from the JSON, in double quotes, keep the `\n` |
| ADMIN_UID | the admin User UID (only needed for the email login) |
| IMGBB_API_KEY | your ImgBB API key (secret, Vercel only). Lets /admin upload photos from your gallery |
| NEXT_PUBLIC_ANNOUNCEMENT | optional text for the gold bar at the top of every page |
| NEXT_PUBLIC_META_PIXEL_ID | your Pixel ID |
| META_CAPI_TOKEN | Events Manager > Settings > Conversions API > Generate access token |
| NEXT_PUBLIC_GSC_VERIFICATION | Search Console HTML-tag code (only the content value) |
| NEXT_PUBLIC_FACEBOOK_URL | your Facebook page link |

3. Deployments > Redeploy. Any `NEXT_PUBLIC_*` change needs a redeploy.

## 3. Test the whole flow (do this before ads)
1. Open `/admin`, sign in, go to **Products**, click "Add a sample product" or add your own (price, photo links, sizes).
2. Open the product on the site > Order now > fill the form > Place order. You land on the thank-you page.
3. In `/admin/orders` the order appears live. Change status, tap "WhatsApp customer", tap "Export CSV".
4. Product photos: in /admin/products tap **Upload photos**, pick pictures from your gallery, then Save. Photos are shrunk automatically and stored on ImgBB. You can still paste image links instead.

## 3b. Make it look like a market (banners, categories, deals)
- **Categories** appear automatically from the "Category" field of your products (menu bar, home page circles and `/category/...` pages). Use the same spelling for products in one category.
- **Hot deals** show products that have an "Old price" higher than the price. **Top picks** show products with "Featured on home" ticked.
- **Banners:** `/admin/banners` > paste a wide image link (about 1600 x 640 px) > Save. Several banners slide automatically.
- **WhatsApp is support only:** customers order on the website. The green Support button, Contact page and "Chat with support" links open your WhatsApp number. In `/admin/orders` the "WhatsApp customer" button is for you to message customers.

## 4. Meta Pixel and Conversions API
1. Events Manager > your Pixel > **Test events**. Copy the test code into `META_TEST_EVENT_CODE`, redeploy, browse the shop, place a test order.
2. You should see PageView, ViewContent, AddToCart, InitiateCheckout and Purchase. Purchase and the others appear twice (Browser + Server) and show as **Deduplicated**.
3. Remove `META_TEST_EVENT_CODE` when done, and redeploy.
4. Install the "Meta Pixel Helper" Chrome extension to double check.

## 5. Domain (mizanora.store from Namecheap)
1. Vercel > Settings > Domains > Add `mizanora.store` (and `www`). Vercel shows the exact DNS records.
2. Namecheap > Domain List > Manage > Advanced DNS: add the records Vercel shows (usually an A record for `@` and a CNAME for `www`). Wait for "Valid configuration".
3. Set `NEXT_PUBLIC_SITE_URL=https://mizanora.store` and redeploy. Make `mizanora.store` the primary domain.

## 6. Google Search Console
1. Add the property (URL prefix with your final domain). Verify with the HTML tag (`NEXT_PUBLIC_GSC_VERIFICATION`) or DNS.
2. Sitemaps > submit `sitemap.xml`.
3. URL Inspection > Request indexing for `/`, `/products`, each product page, `/blog` and each blog post.
4. Test a product page in the Rich Results Test (search "Google Rich Results Test"). It should show a valid **Product** item.
5. Check "Pages" (indexing) weekly. `/cart`, `/checkout`, `/thank-you`, `/admin` are intentionally `noindex`.
6. When you move to a new domain, add the new property and keep the old one for a while.

## 7. App install (PWA)
- Android Chrome, Edge, Samsung Internet and desktop Chrome: after about 7 seconds the site shows an "Install the Mizanora app" banner. Install buttons also appear in the menu, after Add to cart and on the thank-you page. If someone closes the banner, it asks again after 3 days.
- iPhone: browsers do not allow an install button. The banner shows "Share > Add to Home Screen" instructions.
- A website cannot force an install. Browsers only allow the install window after a user tap.
- Test: Chrome DevTools > Application > Manifest, and Lighthouse > PWA.

## 8. Things to know
- **HHC / courier CSV:** column names are in `lib/csv.js` (`CSV_COLUMNS`). Compare with the sample upload sheet from HHC, Trax or Leopard and rename or reorder columns there.
- **Vercel Hobby plan:** Vercel's rules limit Hobby to personal, non-commercial use. A real store is commercial, so check their current fair-use policy; you may need Vercel Pro, or host on another provider.
- **Orders are protected:** browsers cannot create, read or change orders. The server creates them and calculates prices from your database, so nobody can edit prices in the browser.
- Firebase Storage is not used (it needs a paid plan now), so images are links.
- Local run: `npm install`, copy `.env.example` to `.env.local`, then `npm run dev`.
