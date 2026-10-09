import Link from 'next/link';
import Image from 'next/image';
import { ShieldCheck, Truck, Headphones, Banknote } from 'lucide-react';
import { SITE } from '@/lib/config';
import { getProducts, getBanners, buildCategories } from '@/lib/products';
import { getPosts } from '@/lib/blog';
import { FAQ } from '@/lib/faq';
import { pageMeta, faqJsonLd } from '@/lib/seo';
import { discountPct, formatPKR } from '@/lib/format';
import ProductCard from '@/components/ProductCard';
import BannerCarousel from '@/components/BannerCarousel';
import ReorderBanner from '@/components/ReorderBanner';
import InstallButton from '@/components/InstallButton';
import JsonLd from '@/components/JsonLd';
import { SOCIAL_ICONS } from '@/components/Icons';

export const revalidate = 300;

export const metadata = pageMeta({
  title: { absolute: 'Mizanora | Online Shopping in Pakistan, Cash on Delivery' },
  description: 'Shop quality products online in Pakistan with cash on delivery. Tactical boots and more. Shop smart. Shop halal. WhatsApp support when you need help.',
  path: '/',
});

function Shelf({ id, title, href, products, priorityFirst = false }) {
  if (!products.length) return null;
  return (
    <section className="mx-auto max-w-7xl px-3 pt-10 sm:px-4" aria-labelledby={id}>
      <div className="mb-4 flex items-end justify-between gap-4">
        <h2 id={id} className="section-title">{title}</h2>
        {href && <Link href={href} className="whitespace-nowrap text-sm font-semibold text-gold">View all</Link>}
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:gap-4 md:grid-cols-4 lg:grid-cols-5">
        {products.map((p, i) => <ProductCard key={p.id} p={p} priority={priorityFirst && i < 4} />)}
      </div>
    </section>
  );
}

export default async function Home() {
  const [all, banners] = await Promise.all([getProducts(), getBanners()]);
  const categories = buildCategories(all);
  const deals = all.filter((p) => discountPct(p.price, p.comparePrice) > 0)
    .sort((a, b) => discountPct(b.price, b.comparePrice) - discountPct(a.price, a.comparePrice)).slice(0, 5);
  const picks = all.filter((p) => p.featured).slice(0, 5);
  const fresh = all.slice(0, 10);
  const shelves = categories.slice(0, 3).map((c) => ({ c, items: all.filter((p) => p.category === c.name).slice(0, 5) }));
  const posts = getPosts().slice(0, 3);
  const socials = SITE.social.filter((s) => s.url);
  const delivery = SITE.shippingFee > 0 ? `Delivery ${formatPKR(SITE.shippingFee)}` : 'Free delivery';

  return (
    <>
      <div className="mx-auto max-w-7xl px-3 pt-4 sm:px-4">
        {banners.length > 0 ? (
          <BannerCarousel banners={banners} />
        ) : (
          <section className="relative overflow-hidden rounded-2xl border border-line">
            <Image src="/img/hero-banner.jpg" alt="" fill priority sizes="100vw" className="object-cover opacity-30" />
            <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/80 to-transparent" />
            <div className="relative px-5 py-10 sm:px-10 sm:py-16">
              <h1 className="max-w-2xl text-4xl font-bold leading-[1.05] sm:text-6xl">Shop smart.<br />Shop halal.<br />Pay on delivery.</h1>
              <p className="mt-4 max-w-lg text-dim sm:text-lg">Pakistani online store built on honest dealing. Pick a product, fill one short form, pay the rider when it arrives.</p>
              <div className="mt-6 flex flex-wrap gap-3"><Link href="/products" className="btn-gold">Shop now</Link><InstallButton /></div>
            </div>
          </section>
        )}
        {banners.length > 0 && <h1 className="sr-only">Mizanora: online shopping in Pakistan with cash on delivery</h1>}
      </div>

      <ReorderBanner />

      <section className="mx-auto max-w-7xl px-3 pt-5 sm:px-4" aria-label="Why shop with us">
        <ul className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          {[[Banknote, 'Cash on delivery', 'Pay when you receive'], [Truck, delivery, 'Across Pakistan'], [Headphones, 'WhatsApp support', 'Help when you need it'], [ShieldCheck, 'Honest dealing', 'Price shown upfront']].map(([Icon, t, s]) => (
            <li key={t} className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3">
              <Icon className="shrink-0 text-gold" size={24} />
              <div><p className="text-sm font-semibold text-cream">{t}</p><p className="text-xs text-dim">{s}</p></div>
            </li>
          ))}
        </ul>
      </section>

      {categories.length > 0 && (
        <section className="mx-auto max-w-7xl px-3 pt-10 sm:px-4" aria-labelledby="cats">
          <h2 id="cats" className="section-title mb-4">Shop by category</h2>
          <ul className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {categories.map((c) => (
              <li key={c.slug} className="shrink-0">
                <Link href={`/category/${c.slug}`} className="block w-24 text-center sm:w-28">
                  <span className="relative mx-auto block h-20 w-20 overflow-hidden rounded-full border-2 border-line bg-raised sm:h-24 sm:w-24">
                    {c.image ? <Image src={c.image} alt="" fill sizes="96px" className="object-cover" /> : <span className="grid h-full place-items-center font-display text-3xl text-gold">{c.name[0]}</span>}
                  </span>
                  <span className="mt-2 block text-sm font-medium text-cream">{c.name}</span>
                  <span className="block text-xs text-faint">{c.count} item{c.count > 1 ? 's' : ''}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Shelf id="deals" title="Hot deals" href="/products" products={deals} priorityFirst />
      <Shelf id="picks" title="Top picks" href="/products" products={picks} />
      <Shelf id="new" title="New arrivals" href="/products" products={fresh} priorityFirst={deals.length === 0 && picks.length === 0} />
      {shelves.map(({ c, items }) => <Shelf key={c.slug} id={`cat-${c.slug}`} title={c.name} href={`/category/${c.slug}`} products={items} />)}

      {all.length === 0 && (
        <section className="mx-auto max-w-3xl px-4 pt-10">
          <div className="card text-center"><p className="text-dim">New products are being added. Please check back soon.</p>
            <Link href="/contact" className="btn-ghost mt-4">Contact support</Link></div>
        </section>
      )}

      <section className="mx-auto max-w-7xl px-3 pt-14 sm:px-4" aria-labelledby="how">
        <h2 id="how" className="section-title mb-4">Ordering takes one minute</h2>
        <ol className="grid gap-3 md:grid-cols-3">
          {[['Choose', 'Pick your product and size.'], ['Fill the form', 'Name, mobile number and address. No account needed.'], ['Pay on delivery', 'We confirm your order, then the rider brings it to your door.']].map(([t, s], i) => (
            <li key={t} className="card flex gap-4"><span className="font-display text-4xl text-gold">{i + 1}</span><div><p className="font-semibold">{t}</p><p className="text-sm text-dim">{s}</p></div></li>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-7xl px-3 pt-14 sm:px-4" aria-labelledby="guides">
        <h2 id="guides" className="section-title mb-4">Guides from the Mizanora blog</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {posts.map((p) => (
            <article key={p.slug} className="card">
              <h3 className="text-xl font-semibold"><Link href={`/blog/${p.slug}`}>{p.title}</Link></h3>
              <p className="mt-2 text-sm text-dim">{p.description}</p>
              <Link href={`/blog/${p.slug}`} className="mt-3 inline-block text-sm font-semibold text-gold">Read the guide ({p.mins} min)</Link>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-3 pt-14 sm:px-4" aria-labelledby="soc">
        <h2 id="soc" className="section-title mb-4">Find Mizanora everywhere</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {socials.map((s) => {
            const Icon = SOCIAL_ICONS[s.id];
            return (
              <a key={s.id} href={s.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 rounded-xl border border-line bg-surface p-4 hover:border-gold">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-raised text-gold"><Icon /></span>
                <span><b className="block">{s.label}</b><span className="text-sm text-dim">{s.note}</span></span>
              </a>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 pt-14" aria-labelledby="faq">
        <h2 id="faq" className="section-title mb-4">Questions people ask</h2>
        {FAQ.slice(0, 6).map(([q, a]) => (
          <details key={q} className="mb-2.5 rounded-xl border border-line bg-surface px-4">
            <summary className="cursor-pointer py-3.5 font-semibold">{q}</summary>
            <p className="pb-4 text-dim">{a}</p>
          </details>
        ))}
        <Link href="/faq" className="mt-3 inline-block text-sm font-semibold text-gold">More answers</Link>
      </section>
      <JsonLd data={faqJsonLd(FAQ.slice(0, 6))} />
    </>
  );
}
