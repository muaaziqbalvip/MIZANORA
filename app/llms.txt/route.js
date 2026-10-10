import { getProducts, buildCategories } from '@/lib/products';
import { getPosts } from '@/lib/blog';
import { SITE, absUrl } from '@/lib/config';

export const revalidate = 3600;

// llms.txt: a plain-text summary of the shop for AI assistants and AI search (Google AI Overviews, ChatGPT, Gemini, Perplexity ...).
export async function GET() {
  const [products, posts] = [await getProducts(), getPosts()];
  const cats = buildCategories(products);
  const lines = [
    `# ${SITE.name}`,
    `> ${SITE.description}`,
    '',
    `${SITE.name} is an online market in Pakistan (based in ${SITE.city}). Payment is cash on delivery across Pakistan. Prices are in Pakistani rupees (PKR). Support is on WhatsApp; orders are placed on the website.`,
    '',
    '## Main pages',
    `- [All products](${absUrl('/products')})`,
    `- [Reels: watch and shop](${absUrl('/reels')})`,
    `- [How to order](${absUrl('/how-to-order')})`,
    `- [Track an order](${absUrl('/track')})`,
    `- [Returns](${absUrl('/returns')})`,
    `- [FAQ](${absUrl('/faq')})`,
    `- [Contact](${absUrl('/contact')})`,
    '',
    '## Categories',
    ...cats.map((c) => `- [${c.name}](${absUrl(`/category/${c.slug}`)}) (${c.count} products)`),
    '',
    '## Products',
    ...products.slice(0, 80).map((p) => `- [${p.name}](${absUrl(`/product/${p.slug}`)}): PKR ${p.price}${p.category ? `, ${p.category}` : ''}${p.inStock ? '' : ', out of stock'}`),
    '',
    '## Shopping guides',
    ...posts.slice(0, 30).map((p) => `- [${p.title}](${absUrl(`/blog/${p.slug}`)}): ${p.description}`),
    '',
    '## Product feeds',
    `- Google Merchant Center feed: ${absUrl('/api/feed/google')}`,
    `- Meta catalog feed: ${absUrl('/api/feed')}`,
    '',
  ];
  return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, s-maxage=3600' } });
}
