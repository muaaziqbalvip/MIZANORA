import { NextResponse } from 'next/server';
import { adminReady } from '@/lib/firebase-admin';
import { restReady } from '@/lib/firestore-rest';
import { getProducts } from '@/lib/products';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Public setup check. Returns only yes/no flags and counts, never secret values.
export async function GET() {
  const products = await getProducts();
  return NextResponse.json({
    firebaseWebConfig: restReady(),
    firebaseAdminKey: adminReady(),
    imgbbKey: Boolean(process.env.IMGBB_API_KEY),
    metaPixel: Boolean(process.env.NEXT_PUBLIC_META_PIXEL_ID),
    metaCapiToken: Boolean(process.env.META_CAPI_TOKEN),
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL || null,
    productsVisibleOnSite: products.length,
  }, { headers: { 'Cache-Control': 'no-store' } });
}
