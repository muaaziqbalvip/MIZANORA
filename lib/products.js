import { cache } from 'react';
import { adminDb, adminReady } from './firebase-admin';
import { slugify } from './format';

function shape(d) {
  const x = d.data();
  return {
    id: d.id,
    slug: d.id,
    name: x.name || '',
    price: Number(x.price) || 0,
    comparePrice: Number(x.comparePrice) || 0,
    description: x.description || '',
    images: Array.isArray(x.images) ? x.images.filter(Boolean) : [],
    sizes: Array.isArray(x.sizes) ? x.sizes.filter(Boolean) : [],
    category: x.category || '',
    inStock: x.inStock !== false,
    featured: Boolean(x.featured),
    active: x.active !== false,
    createdAt: Number(x.createdAt) || 0,
    updatedAt: Number(x.updatedAt) || 0,
  };
}

// Never throws: if Firebase is not configured yet, the site still builds with an empty catalog.
export const getProducts = cache(async function getProducts() {
  if (!adminReady()) return [];
  try {
    const snap = await adminDb().collection('products').get();
    return snap.docs.map(shape).filter((p) => p.active && p.name).sort((a, b) => b.createdAt - a.createdAt);
  } catch (e) {
    console.error('getProducts failed:', e.message);
    return [];
  }
});

export async function getProduct(slug) {
  if (!adminReady() || !slug) return null;
  try {
    const d = await adminDb().collection('products').doc(slug).get();
    if (!d.exists) return null;
    const p = shape(d);
    return p.active ? p : null;
  } catch (e) {
    console.error('getProduct failed:', e.message);
    return null;
  }
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
  if (!adminReady()) return [];
  try {
    const snap = await adminDb().collection('banners').get();
    return snap.docs
      .map((d) => {
        const x = d.data();
        return { id: d.id, image: x.image || '', title: x.title || '', subtitle: x.subtitle || '', link: x.link || '/products', cta: x.cta || 'Shop now', order: Number(x.order) || 0, active: x.active !== false };
      })
      .filter((b) => b.active && b.image)
      .sort((a, b) => a.order - b.order);
  } catch (e) {
    console.error('getBanners failed:', e.message);
    return [];
  }
});
