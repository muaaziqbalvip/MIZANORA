import { getProducts } from '@/lib/products';
import { absUrl } from '@/lib/config';
import { pageMeta, breadcrumbJsonLd } from '@/lib/seo';
import { PageHead } from '@/components/Prose';
import ProductGrid from '@/components/ProductGrid';
import JsonLd from '@/components/JsonLd';

export const revalidate = 300;
export const metadata = pageMeta({
  title: 'Products, Cash on Delivery in Pakistan',
  description: 'Browse all Mizanora products. Order online in Pakistan with cash on delivery, or order on WhatsApp.',
  path: '/products',
});

export default async function ProductsPage() {
  const products = await getProducts();
  const crumbs = [['/', 'Home'], ['/products', 'Products']];
  const list = {
    '@context': 'https://schema.org', '@type': 'ItemList',
    itemListElement: products.map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: absUrl(`/product/${p.slug}`), name: p.name })),
  };
  return (
    <>
      <PageHead title="Products" intro="Pay cash on delivery anywhere in Pakistan. Tap a product to see sizes and details." crumbs={[['/', 'Home'], [null, 'Products']]} />
      <div className="mx-auto max-w-6xl px-4 py-8">
        <ProductGrid products={products} />
      </div>
      <JsonLd data={[breadcrumbJsonLd(crumbs), list]} />
    </>
  );
}
