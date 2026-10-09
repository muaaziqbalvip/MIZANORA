import { cache } from 'react';
import { adminDb, adminReady } from './firebase-admin';
import { restList, restGet, restReady } from './firestore-rest';
import { slugify } from './format';

function shape(d) {
  const x = d.data;
  return {
    id: d.id,
    slug: d.id,
    name: x.name || '',
    price: Number(x.price) || 0,
    comparePrice: Number(x.comparePrice) || 0,
    description: x.description || '',
    images: Array.isArray(x.images) ? x.images.filter(Boolean) : [],
    sizes: Array.isArray(x.sizes) ? x.sizes.filter(Boolean) : [],
    videos: Array.isArray(x.videos) ? x.videos.filter(Boolean) : [],
    category: x.category || '',
    inStock: x.inStock !== false,
    featured: Boolean(x.featured),
    active: x.active !== false,
    createdAt: Number(x.createdAt) || 0,
    updatedAt: Number(x.updatedAt) || 0,
  };
}

// Reads a collection with the Admin SDK when it works, otherwise through the public Firestore REST API.
// Never throws: on failure the site still builds (with an empty list) and the reason is logged.
async function listDocs(name) {
  if (adminReady()) {
    try {
      const snap = await adminDb().collection(name).get();
      return snap.docs.map((d) => ({ id: d.id, data: d.data() }));
    } catch (e) { console.error(`Admin SDK read of ${name} failed (${e.message}); trying public REST.`); }
  }
  if (restReady()) {
    try { return await restList(name); } catch (e) { console.error(e.message); }
  }
  return [];
}

export const getProducts = cache(async function getProducts() {
  const docs = await listDocs('products');
  return docs.map(shape).filter((p) => p.active && p.name).sort((a, b) => b.createdAt - a.createdAt);
});

export async function getProduct(slug) {
  if (!slug) return null;
  let d = null;
  if (adminReady()) {
    try {
      const snap = await adminDb().collection('products').doc(slug).get();
      d = snap.exists ? { id: snap.id, data: snap.data() } : null;
    } catch (e) { console.error('getProduct admin failed:', e.message); d = undefined; }
  } else d = undefined;
  if (d === undefined && restReady()) {
    try { d = await restGet('products', slug); } catch (e) { console.error(e.message); d = null; }
  }
  if (!d) return null;
  const p = shape(d);
  return p.active ? p : null;
}

// Categories are built from the products' category field (so there is nothing extra to manage).
export function buildCategories(products) {
  const map = new Map();
  for (const p of products) {
    const name = (p.category || '').trim();
    if (!name) continue;
    const slug = slugify(name);
    if (!slug) continue;
    const c = map.get(slug) || { name, slug, count: 0, image: '' };
    c.count += 1;
    if (!c.image && p.images[0]) c.image = p.images[0];
    map.set(slug, c);
  }
  return [...map.values()].sort((a, b) => b.count - a.count);
}

export const getCategories = cache(async function getCategories() {
  return buildCategories(await getProducts());
});

export const getBanners = cache(async function getBanners() {
  const docs = await listDocs('banners');
  return docs
    .map(({ id, data: x }) => ({ id, image: x.image || '', title: x.title || '', subtitle: x.subtitle || '', link: x.link || '/products', cta: x.cta || 'Shop now', order: Number(x.order) || 0, active: x.active !== false }))
    .filter((b) => b.active && b.image)
    .sort((a, b) => a.order - b.order);
});
