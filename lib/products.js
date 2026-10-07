import { adminDb, adminReady } from './firebase-admin';

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
export async function getProducts() {
  if (!adminReady()) return [];
  try {
    const snap = await adminDb().collection('products').get();
    return snap.docs.map(shape).filter((p) => p.active && p.name).sort((a, b) => b.createdAt - a.createdAt);
  } catch (e) {
    console.error('getProducts failed:', e.message);
    return [];
  }
}

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
