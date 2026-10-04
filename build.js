// MIZANORA static site generator. Usage: node build.js   (no npm install needed)
const fs = require('fs'), path = require('path');
const C = require('./config');
const OUT = path.join(__dirname, 'public');
const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const url = p => C.siteUrl.replace(/\/$/,'') + p;
const wa = msg => `https://wa.me/${C.whatsappNumber}?text=${encodeURIComponent(msg)}`;
const ORDER_MSG = 'Assalam o Alaikum, I saw Mizanora online. I want to order: (product name, size/colour, city)';

/* ---------- icons ---------- */
const S = (d, extra='') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${d}</svg>`;
const ICON = {
  whatsapp: S('<path d="M3 21l1.6-4.6A8.5 8.5 0 1 1 8 19.6L3 21z"/><path d="M9 8.5c0 3.5 3 6.5 6.5 6.5l1.2-1.4-2.2-1.1-.9.7a4.5 4.5 0 0 1-2.2-2.2l.7-.9L10.9 8 9 8.5z"/>'),
  instagram: S('<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r=".6" fill="currentColor"/>'),
  facebook: S('<path d="M14 8h3V4h-3a4 4 0 0 0-4 4v3H7v4h3v6h4v-6h3l1-4h-4V8z"/>'),
  tiktok: S('<path d="M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5"/><path d="M14 3c.4 2.6 2 4.2 5 4.5"/>'),
  youtube: S('<rect x="2.5" y="5.5" width="19" height="13" rx="4"/><path d="M10.5 9.5v5l4.2-2.5-4.2-2.5z"/>'),
  telegram: S('<path d="M21 4L3 11l5 2 2 6 3-4 5 4 3-15z"/><path d="M8 13l9-6"/>')
};

/* ---------- shared content ---------- */
const FAQ = [
  ['How do I order from Mizanora?', 'Open WhatsApp from any button on this site, send the product name, size or colour and your city, and we confirm price and delivery details with you in the chat. You can also browse the WhatsApp catalog first.'],
  ['Do I need to create an account or pay on the website?', 'No. The website is a guide to Mizanora. There is no cart and no online payment form here. Every order is arranged by talking to us on WhatsApp.'],
  ['Is cash on delivery available?', 'Cash on delivery is available in many areas of Pakistan. Because it depends on your city, please confirm it with us on WhatsApp before you order.'],
  ['What does "halal shopping" mean at Mizanora?', 'It means honest dealing. We describe products as they are, we tell you the price before you commit, and we avoid anything that is clearly haram. Read our guide on halal shopping for the full idea.'],
  ['How do I choose the right size?', 'Send us your usual shoe or clothing size and, if you like, your foot length in centimetres. We will tell you which size fits best. Our boots buying guide explains how to measure at home.'],
  ['How long does delivery take?', 'Delivery time depends on your city. We share the expected time with you in WhatsApp before you confirm the order.'],
  ['What if the product is not right for me?', 'Message us on WhatsApp with your order details and a photo as soon as you notice a problem. We look at every case and help you find a fair solution. See the Returns page for details.'],
  ['Where is Mizanora based?', 'Mizanora is based in Kasur, Punjab, Pakistan, and serves customers online across Pakistan.'],
  ['How can I be sure this is the real Mizanora?', 'Only trust the links on this website. Our WhatsApp number is +92 306 2015326, and our verified social accounts are listed on the Connect page. We never ask you to send money before you have confirmed the order details with us.'],
  ['Which social media accounts does Mizanora have?', 'We are on WhatsApp, Instagram, TikTok and YouTube, and on Facebook as Mezanora. All links are on the Connect page.']
];

const NAV = [['/', 'Home'], ['/products', 'Products'], ['/how-to-order', 'How to order'], ['/blog', 'Blog'], ['/about', 'About'], ['/contact', 'Contact']];

/* ---------- blog loading ---------- */
function inline(t){
  return esc(t).replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g,(m,a,b)=>`<a href="${b.replace(/&amp;/g,'&')}">${a}</a>`);
}
function md(src){
  const lines = src.split('\n'); let html = '', list = null, para = [];
  const flushP = () => { if(para.length){ html += `<p>${inline(para.join(' '))}</p>\n`; para = []; } };
  const flushL = () => { if(list){ html += `</${list}>\n`; list = null; } };
  const heads = [];
  for (const raw of lines){
    const l = raw.trimEnd();
    if (!l.trim()){ flushP(); flushL(); continue; }
    if (l.trim() === '{{cta}}'){ flushP(); flushL(); html += '@@CTA@@\n'; continue; }
    let m;
    if ((m = l.match(/^## (.+)/))){ flushP(); flushL(); const id = m[1].toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''); heads.push([id, m[1]]); html += `<h2 id="${id}">${inline(m[1])}</h2>\n`; }
    else if ((m = l.match(/^### (.+)/))){ flushP(); flushL(); html += `<h3>${inline(m[1])}</h3>\n`; }
    else if ((m = l.match(/^> (.+)/))){ flushP(); flushL(); html += `<div class="callout"><p>${inline(m[1])}</p></div>\n`; }
    else if ((m = l.match(/^- (.+)/))){ flushP(); if(list !== 'ul'){ flushL(); html += '<ul>\n'; list = 'ul'; } html += `<li>${inline(m[1])}</li>\n`; }
    else if ((m = l.match(/^\d+\. (.+)/))){ flushP(); if(list !== 'ol'){ flushL(); html += '<ol>\n'; list = 'ol'; } html += `<li>${inline(m[1])}</li>\n`; }
    else para.push(l.trim());
  }
  flushP(); flushL();
  return { html, heads };
}
function loadPosts(){
  const dir = path.join(__dirname, 'content/blog');
  return fs.readdirSync(dir).filter(f => f.endsWith('.md')).map(f => {
    const raw = fs.readFileSync(path.join(dir, f), 'utf8');
    const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!m) throw new Error('Bad front matter in ' + f);
    const meta = {}; m[1].split('\n').forEach(x => { const i = x.indexOf(':'); meta[x.slice(0,i).trim()] = x.slice(i+1).trim(); });
    const body = md(m[2]);
    const words = m[2].split(/\s+/).length;
    return { ...meta, slug: meta.slug || f.replace(/\.md$/,''), ...body, words, mins: Math.max(2, Math.round(words/200)) };
  }).sort((a,b) => b.date.localeCompare(a.date));
}

/* ---------- layout ---------- */
function layout({ path: p, title, desc, body, schema = [], type = 'website', image = '/assets/img/hero-banner.jpg', noindex = false, published, crumbs }){
  const full = url(p === '/' ? '/' : p);
  const sameAs = C.social.filter(s => s.url).map(s => s.url);
  const org = { '@context':'https://schema.org', '@type':'OnlineStore', '@id': url('/#org'), name: C.name, url: url('/'), logo: url('/assets/icons/logo-mark-512.png'), image: url('/assets/img/hero-banner.jpg'),
    description: 'Mizanora is a Pakistani online shop built on honest dealing. Browse products and order on WhatsApp.', telephone: '+92-306-2015326', email: C.email,
    address: { '@type':'PostalAddress', addressLocality:'Kasur', addressRegion:'Punjab', addressCountry:'PK' }, areaServed: 'PK', sameAs,
    contactPoint: { '@type':'ContactPoint', contactType:'customer service', telephone:'+92-306-2015326', availableLanguage:['en','ur'] } };
  const site = { '@context':'https://schema.org', '@type':'WebSite', name: C.name, url: url('/'), inLanguage: 'en' };
  const crumbLd = crumbs && { '@context':'https://schema.org', '@type':'BreadcrumbList', itemListElement: crumbs.map((c,i) => ({ '@type':'ListItem', position:i+1, name:c[1], item:url(c[0]) })) };
  const ld = [org, site, ...schema, crumbLd].filter(Boolean).map(o => `<script type="application/ld+json">${JSON.stringify(o)}</script>`).join('\n');
  const nav = NAV.map(([h,l]) => `<a href="${h}"${h === p ? ' aria-current="page"' : ''}>${l}</a>`).join('');
  const soc = C.social.filter(s => s.url).map(s => `<a href="${esc(s.url)}" rel="noopener" target="_blank">${s.label}</a>`).join('');
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${full}">
${noindex ? '<meta name="robots" content="noindex,follow">' : '<meta name="robots" content="index,follow,max-image-preview:large">'}
<meta property="og:site_name" content="${C.name}">
<meta property="og:type" content="${type}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${full}">
<meta property="og:image" content="${url(image)}">
${published ? `<meta property="article:published_time" content="${published}">` : ''}
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/assets/icons/logo-mark.png">
<link rel="apple-touch-icon" href="/assets/icons/logo-mark.png">
<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="#0A0A0A">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/css/site.css">
${ld}
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header class="hdr"><div class="wrap">
  <a class="brand" href="/"><img src="/assets/icons/logo-mark.png" alt="" width="34" height="34">MIZANORA</a>
  <button class="menu-btn" aria-expanded="false" aria-controls="nav" onclick="var n=document.getElementById('nav');var o=n.classList.toggle('open');this.setAttribute('aria-expanded',o)">Menu</button>
  <nav class="nav" id="nav" aria-label="Main">${nav}</nav>
</div></header>
<main id="main">
${body}
</main>
<footer class="ftr"><div class="wrap">
  <div class="cols">
    <div><a class="brand" href="/" style="padding:0"><img src="/assets/icons/logo-mark.png" alt="" width="34" height="34">MIZANORA</a>
      <p style="margin-top:.8rem">${C.tagline} A Pakistani online shop built on honest dealing. Orders are taken on WhatsApp.</p></div>
    <div><h4>Shop</h4><a href="/products">Products</a><a href="/how-to-order">How to order</a><a href="${C.whatsappCatalog}" rel="noopener" target="_blank">WhatsApp catalog</a><a href="/faq">FAQ</a></div>
    <div><h4>Learn</h4><a href="/blog">Blog</a><a href="/about">About</a><a href="/contact">Contact</a><a href="/returns">Returns</a></div>
    <div><h4>Follow</h4>${soc}<a href="/connect">All links</a></div>
  </div>
  <div class="legal">© 2026 Mizanora, ${C.city}. <a style="display:inline" href="/privacy-policy">Privacy</a> · <a style="display:inline" href="/terms">Terms</a></div>
</div></footer>
<a class="fab" href="${wa(ORDER_MSG)}" rel="noopener" target="_blank" aria-label="Order on WhatsApp">${ICON.whatsapp}<span>Order on WhatsApp</span></a>
</body>
</html>`;
}

/* ---------- reusable blocks ---------- */
const waBtn = (label = 'Order on WhatsApp', msg = ORDER_MSG, cls = 'btn wa') => `<a class="${cls}" href="${wa(msg)}" rel="noopener" target="_blank">${ICON.whatsapp}${label}</a>`;
const ctaBlock = `<div class="post-cta"><h3>Ready to order?</h3><p>Send us a message on WhatsApp with the product, size and your city. We reply with price and delivery details.</p>${waBtn()}</div>`;
const faqHtml = (items) => items.map(([q,a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('\n');
const faqLd = (items) => ({ '@context':'https://schema.org', '@type':'FAQPage', mainEntity: items.map(([q,a]) => ({ '@type':'Question', name:q, acceptedAnswer:{ '@type':'Answer', text:a } })) });
const head = (h1, p, crumbs) => `<div class="page-head"><div class="wrap">${crumbs ? `<div class="crumbs">${crumbs}</div>` : ''}<h1>${h1}</h1>${p ? `<p>${p}</p>` : ''}</div></div>`;
const socialCards = () => C.social.filter(s => s.url).map(s => `<a class="soc" href="${esc(s.url)}" rel="noopener" target="_blank"><span class="ico">${ICON[s.id]}</span><span><b>${s.label}</b><span>${esc(s.note)}</span></span></a>`).join('\n');
const postCard = p => `<article class="card"><h3><a href="/blog/${p.slug}" style="text-decoration:none">${esc(p.title)}</a></h3><p>${esc(p.description)}</p><a class="more" href="/blog/${p.slug}">Read the guide (${p.mins} min)</a></article>`;

/* ---------- build ---------- */
const pages = []; // {path, lastmod, priority}
function write(p, html, priority = 0.6, lastmod = C.buildDate){
  const file = p === '/' ? 'index.html' : p === '/404' ? '404.html' : p.replace(/^\//,'') + '.html';
  const fp = path.join(OUT, file); fs.mkdirSync(path.dirname(fp), { recursive: true }); fs.writeFileSync(fp, html);
  if (p !== '/404') pages.push({ path: p, lastmod, priority });
}
fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });
fs.cpSync(path.join(__dirname, 'static'), OUT, { recursive: true });
const posts = loadPosts();

/* home */
write('/', layout({ path:'/', title:'Mizanora | Online Shopping in Pakistan, Order on WhatsApp',
  desc:'Mizanora is a Pakistani online shop built on honest dealing. Browse tactical boots and more, then order on WhatsApp in minutes. Shop smart. Shop halal.',
  schema: [faqLd(FAQ.slice(0,6))],
  body: `
<section class="hero"><div class="wrap">
  <div>
    <h1>Shop smart.<br>Shop halal.<br>Order on WhatsApp.</h1>
    <p class="lead">Mizanora is a Pakistani online shop built on honest dealing. Pick a product, send us one message, and we confirm price and delivery with you directly.</p>
    <div class="actions">${waBtn()}<a class="btn ghost" href="${C.whatsappCatalog}" rel="noopener" target="_blank">Open WhatsApp catalog</a></div>
    <p class="fine">No account. No cart. No online payment form. Just a conversation with us.</p>
  </div>
  <div class="chat" aria-label="Example WhatsApp order message">
    <div class="chat-top"><img src="/assets/icons/logo-mark.png" alt="" width="38" height="38"><div><b>MIZANORA</b><span>Example order message</span></div></div>
    <div class="bubble me">Assalam o Alaikum, I want to order Tactical Boots. Size 43, city Lahore.</div>
    <div class="bubble them">Walaikum Assalam! Yes, we have it. Here are the price and delivery details for Lahore.</div>
    <a class="btn wa" href="${wa('Assalam o Alaikum, I want to order Tactical Boots. Size: , City: ')}" rel="noopener" target="_blank">${ICON.whatsapp}Send your own message</a>
  </div>
</div></section>

<section class="alt"><div class="wrap">
  <div class="sec-head"><h2>Ordering takes three steps</h2><p>The whole order happens in one chat, so you can ask questions before you decide.</p></div>
  <ol class="steps">
    <li><b>Choose a product</b><span>Look at the products page or the WhatsApp catalog.</span></li>
    <li><b>Message us</b><span>Send the product, size or colour, and your city.</span></li>
    <li><b>Confirm and receive</b><span>We confirm price and delivery in the chat. Then it is on its way.</span></li>
  </ol>
  <p style="margin-top:1.4rem"><a class="btn ghost" href="/how-to-order">Read the full ordering guide</a></p>
</div></section>

<section><div class="wrap">
  <div class="sec-head"><h2>What we sell</h2><p>Our full range lives in the WhatsApp catalog. Here is what you can order today.</p></div>
  <div class="grid g3">
    ${C.products.map(pr => `<article class="card"><h3>${esc(pr.name)}</h3><p>${esc(pr.blurb)}</p>${waBtn('Ask about this', pr.msg, 'btn wa').replace('class="btn wa"','class="btn wa" style="margin-top:1rem"')}</article>`).join('')}
    <article class="card"><h3>More in the catalog</h3><p>New products are added to our WhatsApp catalog first. Open it to see everything available right now.</p><a class="more" href="${C.whatsappCatalog}" rel="noopener" target="_blank">Open the catalog</a></article>
  </div>
</div></section>

<section class="alt"><div class="wrap">
  <div class="sec-head"><h2>Why people shop with Mizanora</h2></div>
  <div class="grid g3">
    <div class="card"><h3>Honest dealing</h3><p>We describe products as they are and tell you the price before you commit. That is what halal shopping means to us.</p></div>
    <div class="card"><h3>A real person replies</h3><p>You talk to us directly on WhatsApp, so questions about size, colour or delivery get a real answer.</p></div>
    <div class="card"><h3>Clear before you pay</h3><p>Price, delivery time and payment method are agreed in the chat first. Nothing is hidden at checkout, because there is no checkout.</p></div>
  </div>
</div></section>

<section><div class="wrap">
  <div class="sec-head"><h2>Guides from the Mizanora blog</h2><p>Practical advice on shopping online in Pakistan, choosing boots, and avoiding fake shops.</p></div>
  <div class="grid g3">${posts.slice(0,3).map(postCard).join('')}</div>
  <p style="margin-top:1.4rem"><a class="btn ghost" href="/blog">See all guides</a></p>
</div></section>

<section class="alt"><div class="wrap">
  <div class="sec-head"><h2>Find Mizanora everywhere</h2><p>Follow us for new products, videos and offers. Every link here is official.</p></div>
  <div class="grid g3">${socialCards()}</div>
</div></section>

<section><div class="wrap" style="max-width:780px">
  <div class="sec-head"><h2>Questions people ask</h2></div>
  ${faqHtml(FAQ.slice(0,6))}
  <p style="margin-top:1rem"><a class="btn ghost" href="/faq">More answers</a></p>
</div></section>`
}), 1.0);

/* products */
write('/products', layout({ path:'/products', title:'Products | Tactical Boots and More | Mizanora Pakistan',
  desc:'See what Mizanora sells, including tactical boots, and order any product on WhatsApp. The full range is in our WhatsApp catalog.',
  crumbs:[['/', 'Home'],['/products','Products']],
  body: head('Products', 'Everything Mizanora sells is ordered on WhatsApp. Open the catalog for the full range, or ask us about a product below.', `<a href="/">Home</a> / Products`) +
  `<section><div class="wrap"><div class="grid g3">
    ${C.products.map(pr => `<article class="card"><h3>${esc(pr.name)}</h3><p>${esc(pr.blurb)}</p><p style="margin-top:.6rem;color:var(--text)">${pr.price ? 'Price: ' + esc(pr.price) : 'Price and sizes: ask on WhatsApp'}</p>${waBtn('Order on WhatsApp', pr.msg).replace('class="btn wa"','class="btn wa" style="margin-top:1rem"')}</article>`).join('')}
    <article class="card"><h3>The full catalog</h3><p>Our WhatsApp catalog is updated first, so it always shows what is available now.</p><a class="more" href="${C.whatsappCatalog}" rel="noopener" target="_blank">Open the catalog</a></article>
  </div>
  <div class="callout" style="margin-top:2rem"><p>Looking for something specific? Send us a message and we will tell you if we have it or can get it.</p></div>
  <p style="margin-top:1.5rem">Not sure how to pick? Read our <a href="/blog/tactical-boots-buying-guide" style="color:var(--gold)">tactical boots buying guide</a> before you order.</p>
  </div></section>`
}), 0.9);

/* how to order */
write('/how-to-order', layout({ path:'/how-to-order', title:'How to Order on WhatsApp | Mizanora',
  desc:'A simple step-by-step guide to ordering from Mizanora on WhatsApp: what to send, how pricing and delivery are confirmed, and how to stay safe.',
  crumbs:[['/', 'Home'],['/how-to-order','How to order']],
  schema:[{ '@context':'https://schema.org', '@type':'HowTo', name:'How to order from Mizanora on WhatsApp', step:[
    { '@type':'HowToStep', name:'Choose a product', text:'Look at the Mizanora products page or the WhatsApp catalog.' },
    { '@type':'HowToStep', name:'Send a WhatsApp message', text:'Message +92 306 2015326 with the product name, size or colour, and your city.' },
    { '@type':'HowToStep', name:'Confirm price and delivery', text:'We reply with the price and delivery details. Confirm only when you are happy.' },
    { '@type':'HowToStep', name:'Receive your order', text:'We arrange delivery to your address in Pakistan.' }] }],
  body: head('How to order on WhatsApp', 'Four steps, one chat. This is the safest way to order from Mizanora.', `<a href="/">Home</a> / How to order`) +
  `<div class="prose">
  <h2>Step by step</h2>
  <ol>
  <li><strong>Choose a product.</strong> Browse the <a href="/products">products page</a> or open the <a href="${C.whatsappCatalog}" rel="noopener" target="_blank">WhatsApp catalog</a>.</li>
  <li><strong>Send us a message.</strong> Tap any green WhatsApp button on this site. A message is already written for you. Add the product name, size or colour, and your city.</li>
  <li><strong>Confirm the details.</strong> We reply with the price and the expected delivery time for your city. Ask anything you like. Confirm only when you are comfortable.</li>
  <li><strong>Receive your order.</strong> We arrange delivery to your address. Payment is agreed in the chat, and cash on delivery is available in many areas.</li>
  </ol>
  <div class="callout"><p>Tip: send your full name, phone number and complete address in one message. It avoids delays.</p></div>
  <h2>A message you can copy</h2>
  <p>Assalam o Alaikum. I want to order [product name]. Size or colour: [your choice]. City: [your city].</p>
  <h2>Stay safe when you shop online</h2>
  <ul><li>Only use the WhatsApp number on this website: <strong>+92 306 2015326</strong>.</li><li>Check the price and delivery time in the chat before you agree.</li><li>Be careful with anyone who asks for money before the order details are confirmed.</li></ul>
  <p>For more, read <a href="/blog/how-to-spot-fake-online-shops-pakistan">how to spot fake online shops in Pakistan</a>.</p>
  ${ctaBlock}
  </div>`.replace('@@CTA@@', ctaBlock)
}), 0.9);

/* connect */
write('/connect', layout({ path:'/connect', title:'Connect with Mizanora | WhatsApp, Instagram, TikTok, YouTube',
  desc:'All official Mizanora links in one place: WhatsApp catalog, Instagram, Facebook, TikTok and YouTube.',
  crumbs:[['/', 'Home'],['/connect','Connect']],
  body: head('Connect with Mizanora', 'Our official accounts. If a link is not listed here, it is not ours.', `<a href="/">Home</a> / Connect`) +
  `<section><div class="wrap"><div class="grid g2">${socialCards()}</div></div></section>`
}), 0.6);

/* blog index */
write('/blog', layout({ path:'/blog', title:'Mizanora Blog | Online Shopping Guides for Pakistan',
  desc:'Practical guides on shopping online in Pakistan: staying safe, halal shopping, cash on delivery, tactical boots and boot care.',
  crumbs:[['/', 'Home'],['/blog','Blog']],
  body: head('The Mizanora Blog', 'Practical guides for shopping smart and shopping halal in Pakistan.', `<a href="/">Home</a> / Blog`) +
  `<section><div class="wrap"><div class="grid g2">${posts.map(postCard).join('')}</div></div></section>`
}), 0.8);

/* blog posts */
for (const p of posts){
  const toc = p.heads.length > 2 ? `<nav class="toc" aria-label="In this guide"><b>In this guide</b><ol>${p.heads.map(h => `<li><a href="#${h[0]}">${esc(h[1])}</a></li>`).join('')}</ol></nav>` : '';
  const related = posts.filter(x => x.slug !== p.slug).slice(0,2);
  write('/blog/' + p.slug, layout({ path:'/blog/' + p.slug, title: p.title + ' | Mizanora', desc: p.description, type:'article', published: p.date,
    crumbs:[['/', 'Home'],['/blog','Blog'],['/blog/' + p.slug, p.title]],
    schema:[{ '@context':'https://schema.org', '@type':'BlogPosting', headline: p.title, description: p.description, datePublished: p.date, dateModified: p.date,
      image: url('/assets/img/hero-banner.jpg'), mainEntityOfPage: url('/blog/' + p.slug), wordCount: p.words,
      author: { '@type':'Organization', name: C.name, url: url('/') }, publisher: { '@type':'Organization', name: C.name, logo: { '@type':'ImageObject', url: url('/assets/icons/logo-mark-512.png') } } }],
    body: head(esc(p.title), esc(p.description), `<a href="/">Home</a> / <a href="/blog">Blog</a> / Guide`) +
    `<article class="prose"><p class="meta">Published ${p.date} · ${p.mins} min read · By the Mizanora team</p>${toc}${p.html.replace('@@CTA@@', ctaBlock)}
    ${p.html.includes('@@CTA@@') ? '' : ctaBlock}
    <h2>Keep reading</h2><div class="grid">${related.map(postCard).join('')}</div></article>`
  }), 0.8, p.date);
}

/* about */
write('/about', layout({ path:'/about', title:'About Mizanora | A Halal-Minded Online Shop in Pakistan',
  desc:'Mizanora is a Pakistani online shop built on honest dealing, clear prices and direct WhatsApp service. Learn what we stand for.',
  crumbs:[['/', 'Home'],['/about','About']],
  body: head('About Mizanora', 'Quality products, honest dealing, and a real conversation before every order.', `<a href="/">Home</a> / About`) +
  `<div class="prose">
  <h2>Who we are</h2>
  <p>Mizanora is a Pakistani online shop based in ${C.city}. We sell quality products and serve customers across Pakistan. Our name is our promise: <em>mizan</em> means balance and fairness.</p>
  <h2>How we work</h2>
  <p>We do not run a checkout page. Instead, every order starts with a WhatsApp message. You tell us what you want, we tell you the price and delivery details, and you decide. This keeps shopping personal, clear and fair.</p>
  <h2>What we stand for</h2>
  <ul><li><strong>Honest descriptions.</strong> Products are described as they are.</li><li><strong>Price before commitment.</strong> You always know the cost first.</li><li><strong>Respect for your time.</strong> Real replies, not automated runarounds.</li><li><strong>Halal-minded trade.</strong> We avoid anything clearly haram and deal fairly. Read more in our <a href="/blog/what-is-halal-shopping">halal shopping guide</a>.</li></ul>
  <h2>Find us</h2>
  <p>Message us on <a href="${wa(ORDER_MSG)}" rel="noopener" target="_blank">WhatsApp</a>, or follow us on our <a href="/connect">official accounts</a>.</p>
  </div>`
}), 0.5);

/* contact */
write('/contact', layout({ path:'/contact', title:'Contact Mizanora | WhatsApp +92 306 2015326',
  desc:'Contact Mizanora on WhatsApp at +92 306 2015326 or by email. We are based in Kasur, Punjab, Pakistan and serve customers across Pakistan.',
  crumbs:[['/', 'Home'],['/contact','Contact']],
  schema:[{ '@context':'https://schema.org', '@type':'ContactPage', name:'Contact Mizanora', url: url('/contact') }],
  body: head('Contact us', 'WhatsApp is the fastest way to reach us.', `<a href="/">Home</a> / Contact`) +
  `<div class="prose">
  <div class="grid g2" style="margin-bottom:1.5rem"><div class="card"><h3>WhatsApp</h3><p>+92 306 2015326</p>${waBtn('Message us').replace('class="btn wa"','class="btn wa" style="margin-top:1rem"')}</div>
  <div class="card"><h3>Email</h3><p><a href="mailto:${C.email}">${C.email}</a></p></div></div>
  <p><strong>Location:</strong> ${C.city}. We deliver across Pakistan.</p>
  <p>Follow us on <a href="/connect">Instagram, TikTok, YouTube and more</a>.</p>
  </div>`
}), 0.5);

/* faq */
write('/faq', layout({ path:'/faq', title:'FAQ | Ordering, Delivery and Payment | Mizanora',
  desc:'Answers to common questions about ordering from Mizanora on WhatsApp, cash on delivery, sizes, delivery and returns.',
  crumbs:[['/', 'Home'],['/faq','FAQ']], schema:[faqLd(FAQ)],
  body: head('Frequently asked questions', 'Quick answers about ordering, delivery and trust.', `<a href="/">Home</a> / FAQ`) +
  `<section><div class="wrap" style="max-width:780px">${faqHtml(FAQ)}<p style="margin-top:1.4rem">Still have a question? ${waBtn('Ask on WhatsApp')}</p></div></section>`
}), 0.6);

/* policies */
const policy = (p, title, desc, inner) => write(p, layout({ path:p, title: title + ' | Mizanora', desc, crumbs:[['/', 'Home'],[p, title]], body: head(title, '', `<a href="/">Home</a> / ${title}`) + `<div class="prose">${inner}<p class="meta">Last updated ${C.buildDate}</p></div>` }), 0.3);
policy('/returns', 'Returns and exchanges', 'How Mizanora handles size problems, damaged items and other order issues.',
  `<p>We want you to be happy with what you receive. Because every order is arranged on WhatsApp, we handle each problem the same way: in a conversation.</p>
  <h2>If something is wrong</h2>
  <p>Message us on <a href="${wa('Assalam o Alaikum, I have a problem with my order: ')}" rel="noopener" target="_blank">WhatsApp</a> as soon as you notice the problem. Send your order details and a clear photo. We will look at your case and tell you the options.</p>
  <h2>Before you order</h2>
  <p>Most problems come from the wrong size. Send us your size or foot length first and we will help you choose.</p>`);
policy('/privacy-policy', 'Privacy policy', 'How Mizanora handles your information.',
  `<p>This website does not have accounts, carts or payment forms, and it does not ask you to enter personal data.</p>
  <h2>What we receive</h2>
  <p>When you message us on WhatsApp, we receive what you choose to send, such as your name, phone number, address and order details. We use it only to process your order and answer your questions.</p>
  <h2>Third-party services</h2>
  <p>This site loads fonts from Google Fonts. WhatsApp, Instagram, TikTok and YouTube links open those services, which have their own privacy policies.</p>
  <h2>Contact</h2><p>Questions about your data? Email <a href="mailto:${C.email}">${C.email}</a>.</p>`);
policy('/terms', 'Terms of use', 'Terms for using the Mizanora website.',
  `<p>By using this website you agree to these simple terms.</p>
  <h2>Information on this site</h2>
  <p>We try to keep product information accurate. Prices, availability and delivery times are confirmed with you on WhatsApp before any order is final.</p>
  <h2>Orders</h2>
  <p>An order is final only when both you and Mizanora have confirmed the product, price and delivery details in the chat.</p>
  <h2>Links</h2>
  <p>This site links to third-party services. We are not responsible for their content.</p>`);

/* 404 */
write('/404', layout({ path:'/404', title:'Page not found | Mizanora', desc:'This page could not be found.', noindex:true,
  body: head('Page not found', 'That page does not exist or has moved. Our old online store has been replaced by a WhatsApp ordering guide.') + `<div class="prose"><p><a class="btn" href="/">Go to the homepage</a></p></div>` }));

/* sitemap, robots, manifest, service worker, vercel */
const sm = pages.sort((a,b)=>b.priority-a.priority).map(x => `  <url><loc>${url(x.path === '/' ? '/' : x.path)}</loc><lastmod>${x.lastmod}</lastmod><priority>${x.priority.toFixed(1)}</priority></url>`).join('\n');
fs.writeFileSync(path.join(OUT,'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sm}\n</urlset>\n`);
fs.writeFileSync(path.join(OUT,'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${url('/sitemap.xml')}\n`);
fs.writeFileSync(path.join(OUT,'manifest.json'), JSON.stringify({ name:'MIZANORA', short_name:'MIZANORA', description:'Shop smart. Shop halal. Order on WhatsApp.', start_url:'/', display:'standalone', background_color:'#0A0A0A', theme_color:'#0A0A0A',
  icons:[{src:'/assets/icons/logo-mark-192.png',sizes:'192x192',type:'image/png'},{src:'/assets/icons/logo-mark-512.png',sizes:'512x512',type:'image/png'}] }, null, 2));
// The old store registered a service worker that caches the old site. This replacement removes it from visitors' browsers.
fs.writeFileSync(path.join(OUT,'service-worker.js'), `self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil((async()=>{for(const k of await caches.keys())await caches.delete(k);await self.registration.unregister();for(const c of await self.clients.matchAll())c.navigate(c.url);})()));\n`);
const redirects = ['shop','cart','checkout','order-success','track-order','account','search','categories','new-arrivals','best-sellers','offers','wishlist','admin'].map(s => ({ source:'/' + s, destination: s === 'track-order' || s === 'order-success' ? '/how-to-order' : '/products', permanent:true }))
  .concat([{ source:'/product/:slug*', destination:'/products', permanent:true },{ source:'/category/:slug*', destination:'/products', permanent:true },{ source:'/admin/:path*', destination:'/', permanent:true }]);
fs.writeFileSync(path.join(__dirname,'vercel.json'), JSON.stringify({ cleanUrls:true, trailingSlash:false, outputDirectory:'public', redirects,
  headers:[{ source:'/service-worker.js', headers:[{key:'Cache-Control',value:'no-cache'}] },{ source:'/(.*)\\.(jpg|png|webp|svg)', headers:[{key:'Cache-Control',value:'public, max-age=604800'}] }] }, null, 2));
console.log(`Built ${pages.length} pages, ${posts.length} blog posts -> public/`);
