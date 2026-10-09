import { restQuery, restReady } from './firestore-rest';

// Approved reviews for one product (public). Never throws.
export async function getReviews(productId) {
  if (!restReady()) return [];
  try {
    const docs = await restQuery('reviews', [['productId', productId], ['approved', true]]);
    return docs.map(({ id, data: x }) => ({ id, name: x.name || 'Customer', rating: Number(x.rating) || 5, text: x.text || '', createdAtMs: Number(x.createdAtMs) || 0 }))
      .sort((a, b) => b.createdAtMs - a.createdAtMs);
  } catch (e) { console.error(e.message); return []; }
}
