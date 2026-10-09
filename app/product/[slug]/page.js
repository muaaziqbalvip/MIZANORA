import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Banknote, Headphones, ShieldCheck, Truck } from 'lucide-react';
import { SITE, absUrl } from '@/lib/config';
import { getProduct, getProducts } from '@/lib/products';
import { formatPKR, discountPct, slugify } from '@/lib/format';
import { pageMeta, breadcrumbJsonLd } from '@/lib/seo';
import Gallery from '@/components/Gallery';
import ProductActions from '@/components/ProductActions';
import ProductCard from '@/components/ProductCard';
import TrackView from '@/components/TrackView';
import JsonLd from '@/components/JsonLd';

export const revalidate = 300;
export const dynamicParams = true; // new products work immediately, without a redeploy

export async function generateStaticParams() {
  const all = await getProducts();
  return all.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const p = await getProduct(slug);
  if (!p) return { title: 'Product not found', robots: { index: false } };
  const desc = (p.description || `Buy ${p.name} online in Pakistan.`).replace(/\s+/g, ' ').slice(0, 155);
  return pageMeta({
    title: `Buy ${p.name} Online in Pakistan`,
    description: `${p.name} for ${formatPKR(p.price)}. ${desc} Cash on delivery across Pakistan.`.slice(0, 300),
    path: `/product/${p.slug}`,
    image: p.images[0] || '/img/hero-banner.jpg',
    type: 'website',
  });
}

export default async function ProductPage({ params }) {
  const { slug } = await params;
  const p = await getProduct(slug);
  if (!p) notFound();

  const all = await getProducts();
  const related = all.filter((x) => x.slug !== p.slug).slice(0, 4);
  const off = discountPct(p.price, p.comparePrice);
  const url = absUrl(`/product/${p.slug}`);

  const productLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${url}#product`,
    name: p.name,
    description: p.description || p.name,
    image: p.images.length ? p.images : [absUrl('/img/hero-banner.jpg')],
    sku: p.slug,
    category: p.category || undefined,
    brand: { '@type': 'Brand', name: SITE.name },
    offers: {
      '@type': 'Offer',
      url,
      priceCurrency: 'PKR',
      price: String(p.price),
      availability: p.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@type': 'Organization', name: SITE.name },
    },
  };

  return (
    <>
      <div className="mx-auto max-w-7xl px-3 pt-6 sm:px-4">
        <nav aria-label="Breadcrumb" className="mb-4 text-xs text-faint">
          <Link href="/" className="hover:text-gold">Home</Link> / <Link href="/products" className="hover:text-gold">Products</Link> / {p.category && <><Link href={`/category/${slugify(p.category)}`} className="hover:text-gold">{p.category}</Link> / </>}{p.name}
        </nav>
        <div className="grid gap-8 lg:grid-cols-2">
          <Gallery images={p.images} name={p.name} />
          <div>
            <h1 className="text-3xl font-bold leading-tight sm:text-4xl">{p.name}</h1>
            <p className="mt-4 flex flex-wrap items-baseline gap-3">
              <span className="text-3xl font-bold text-gold">{formatPKR(p.price)}</span>
              {p.comparePrice > p.price && <span className="text-lg text-faint line-through">{formatPKR(p.comparePrice)}</span>}
              {off > 0 && <span className="rounded-full bg-gold px-2.5 py-1 text-xs font-bold text-ink">Save {off}%</span>}
            </p>
            <p className="mt-1 text-sm text-dim">{SITE.shippingFee > 0 ? `Delivery ${formatPKR(SITE.shippingFee)}` : 'Free delivery'} · Cash on delivery</p>
            <ProductActions product={p} />
            <ul className="mt-6 grid gap-2.5 rounded-2xl border border-line bg-surface p-4 text-sm text-dim">
              <li className="flex items-center gap-2.5"><Banknote size={18} className="text-gold" /> Pay cash when the parcel arrives</li>
              <li className="flex items-center gap-2.5"><Truck size={18} className="text-gold" /> Delivery across Pakistan</li>
              <li className="flex items-center gap-2.5"><ShieldCheck size={18} className="text-gold" /> We confirm your order by phone or message before dispatch</li>
              <li className="flex items-center gap-2.5"><Headphones size={18} className="text-gold" /> <span>Questions? <Link href="/contact" className="text-gold underline underline-offset-4">WhatsApp support</Link> and <Link href="/returns" className="text-gold underline underline-offset-4">returns info</Link></span></li>
            </ul>
          </div>
        </div>

        {p.description && (
          <section className="mt-10 max-w-3xl" aria-labelledby="desc">
            <h2 id="desc" className="section-title mb-3">Product details</h2>
            <div className="space-y-3 whitespace-pre-line leading-8 text-[#DDD7CC]">{p.description}</div>
          </section>
        )}

        {related.length > 0 && (
          <section className="mt-12" aria-labelledby="rel">
            <h2 id="rel" className="section-title mb-5">You may also like</h2>
            <div className="grid grid-cols-2 gap-2.5 sm:gap-4 md:grid-cols-4">{related.map((r) => <ProductCard key={r.id} p={r} />)}</div>
          </section>
        )}
        <p className="mt-10 text-sm text-dim">
          Not sure about the size? Read our <Link href="/blog/tactical-boots-buying-guide" className="text-gold underline underline-offset-4">tactical boots buying guide</Link>.
        </p>
      </div>
      <TrackView product={p} />
      <JsonLd data={[productLd, breadcrumbJsonLd([['/', 'Home'], ['/products', 'Products'], [`/product/${p.slug}`, p.name]])]} />
    </>
  );
}
