/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    formats: ['image/avif', 'image/webp'],
    // Product images can come from ImgBB, Cloudinary, etc.
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
  async redirects() {
    // Old store URLs -> new pages (keeps Google rankings and old links alive)
    const toProducts = ['shop', 'account', 'wishlist', 'categories', 'new-arrivals', 'best-sellers', 'offers', 'search'];
    return [
      ...toProducts.map((s) => ({ source: `/${s}`, destination: '/products', permanent: true })),
      { source: '/category/:slug*', destination: '/products', permanent: true },
      { source: '/order-success', destination: '/thank-you', permanent: true },
      { source: '/track-order', destination: '/how-to-order', permanent: true },
    ];
  },
  async headers() {
    return [
      { source: '/sw.js', headers: [
        { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
        { key: 'Service-Worker-Allowed', value: '/' },
      ] },
      { source: '/service-worker.js', headers: [{ key: 'Cache-Control', value: 'no-cache' }] },
      { source: '/(.*)', headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      ] },
    ];
  },
};
module.exports = nextConfig;
