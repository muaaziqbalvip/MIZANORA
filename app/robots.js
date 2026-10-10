import { absUrl } from '@/lib/config';

const BLOCK = ['/admin', '/api/', '/checkout', '/thank-you', '/cart', '/offline', '/account', '/wishlist', '/track'];
// Search engines and AI search crawlers are welcome on the public shop pages (this helps Google AI Overviews and AI assistants find you).
const BOTS = ['Googlebot', 'Googlebot-Image', 'Google-Extended', 'Bingbot', 'GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'PerplexityBot', 'Applebot', 'Applebot-Extended', 'facebookexternalhit', 'Twitterbot'];

export default function robots() {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: BLOCK },
      ...BOTS.map((userAgent) => ({ userAgent, allow: ['/', '/api/feed', '/llms.txt'], disallow: BLOCK.filter((b) => b !== '/api/') .concat(['/api/orders', '/api/upload', '/api/track', '/api/coupon', '/api/health', '/api/search-log', '/api/revalidate', '/api/ai-search', '/api/meta']) })),
    ],
    sitemap: absUrl('/sitemap.xml'),
    host: absUrl('/'),
  };
}
