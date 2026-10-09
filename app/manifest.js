export default function manifest() {
  return {
    id: '/',
    name: 'MIZANORA - Shop Smart. Shop Halal.',
    short_name: 'Mizanora',
    description: 'Pakistani online store. Cash on delivery across Pakistan.',
    start_url: '/?source=pwa',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#F2F4EF',
    theme_color: '#0B6B45',
    lang: 'en',
    categories: ['shopping'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Shop products', short_name: 'Shop', url: '/products?source=shortcut' },
      { name: 'My cart', short_name: 'Cart', url: '/cart?source=shortcut' },
    ],
  };
}
