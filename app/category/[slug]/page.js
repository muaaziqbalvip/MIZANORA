import { Suspense } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { absUrl } from '@/lib/config';
import { getProducts, buildCategories } from '@/lib/products';
import { pageMeta, breadcrumbJsonLd } from '@/lib/seo';
import { PageHead } from '@/components/Prose';
import ProductGrid from '@/components/ProductGrid';
import JsonLd from '@/components/JsonLd';

export const revalidate = 300;
export const dynamicParams = true;

export async function generateStaticParams() {
  return buildCategories(await getProducts()).map((c) => ({ slug: c.slug }));
}

async function load(params) {
  const { slug } = await params;
  const all = await getProducts();
  const cat = buildCategories(all).find((c) => c.slug === slug);
  return { cat, items: cat ? all.filter((p) => p.category === cat.name) : [] };
}

export async function generateMetadata({ params }) {
  const { cat } = await load(params);
  if (!cat) return { title: 'Category not found', robots: { index: false } };
  return pageMeta({
    title: `Buy ${cat.name} Online in Pakistan`,
    description: `Shop ${cat.name} online in Pakistan at Mizanora. ${cat.count} product${cat.count > 1 ? 's' : ''}, cash on delivery across Pakistan, honest prices.`,
    path: `/category/${cat.slug}`,
    image: cat.image || '/img/hero-banner.jpg',
  });
}

export default async function CategoryPage({ params }) {
  const { cat, items } = await load(params);
  if (!cat) notFound();
  const list = {
    '@context': 'https://schema.org', '@type': 'CollectionPage', name: cat.name, url: absUrl(`/category/${cat.slug}`),
    mainEntity: { '@type': 'ItemList', itemListElement: items.map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: absUrl(`/product/${p.slug}`), name: p.name })) },
  };
  return (
    <>
      <PageHead title={cat.name} intro={`${cat.count} product${cat.count > 1 ? 's' : ''}. Pay cash on delivery anywhere in Pakistan.`} crumbs={[['/', 'Home'], ['/products', 'Products'], [null, cat.name]]} />
      <div className="mx-auto max-w-7xl px-3 py-8 sm:px-4">
        <Suspense fallback={null}><ProductGrid products={items} /></Suspense>
        <p className="mt-8 text-sm text-dim">Looking for something else? <Link href="/products" className="text-gold underline underline-offset-4">See all products</Link>.</p>
      </div>
      <JsonLd data={[list, breadcrumbJsonLd([['/', 'Home'], ['/products', 'Products'], [`/category/${cat.slug}`, cat.name]])]} />
    </>
  );
}
