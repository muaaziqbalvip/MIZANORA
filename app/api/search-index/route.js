import { NextResponse } from 'next/server';
import { getProducts } from '@/lib/products';

export const revalidate = 300;

// Small public product list used by the search suggestions and "recently viewed" (no secrets, same data as the shop pages).
export async function GET() {
  const all = await getProducts();
  return NextResponse.json(all.map((p) => ({ id: p.id, slug: p.slug, name: p.name, category: p.category, price: p.price, image: p.images[0] || '' })), {
    headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
  });
}
