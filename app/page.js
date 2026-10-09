import Link from 'next/link';
import Image from 'next/image';
import { ShieldCheck, Truck, MessageCircle, Banknote } from 'lucide-react';
import { SITE, waLink } from '@/lib/config';
import { getProducts } from '@/lib/products';
import { getPosts } from '@/lib/blog';
import { FAQ } from '@/lib/faq';
import { pageMeta, faqJsonLd } from '@/lib/seo';
import ProductCard from '@/components/ProductCard';
import ReorderBanner from '@/components/ReorderBanner';
import InstallButton from '@/components/InstallButton';
import JsonLd from '@/components/JsonLd';
import { SOCIAL_ICONS } from '@/components/Icons';
import { formatPKR } from '@/lib/format';

export const revalidate = 300;

export const metadata = pageMeta({
  title: { absolute: 'Mizanora | Online Shopping in Pakistan, Cash on Delivery' },
  description: 'Shop quality products online in Pakistan with cash on delivery. Tactical boots and more. Order on the website or on WhatsApp. Shop smart. Shop halal.',
  path: '/',
});

export default async function Home() {
  const all = await getProducts();
  const featured = (all.filter((p) => p.featured).length ? all.filter((p) => p.featured) : all).slice(0, 8);
  const posts = getPosts().slice(0, 3);
  const socials = SITE.social.filter((s) => s.url);
  const delivery = SITE.shippingFee > 0 ? `Delivery ${formatPKR(SITE.shippingFee)}` : 'Free delivery';

  return (
    <>
      <section className="relative overflow-hidden border-b border-line">
        <Image src="/img/hero-banner.jpg" alt="" fill priority sizes="100vw" className="object-cover opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-b from-ink/60 via-ink/70 to-ink" />
        <div className="relative mx-auto max-w-6xl px-4 py-14 sm:py-20">
          <h1 className="max-w-3xl text-5xl font-bold leading-[1.05] sm:text-7xl">Shop smart.<br />Shop halal.<br />Pay on delivery.</h1>
          <p className="mt-5 max-w-xl text-lg text-dim">Mizanora is a Pakistani online store built on honest dealing. Choose your product, fill one short form, and pay the rider when it arrives.</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/products" className="btn-gold">Shop now</Link>
            <a className="btn-ghost" href={waLink('Assalam o Alaikum, I want to order from Mizanora.')} target="_blank" rel="noopener noreferrer">Order on WhatsApp</a>
            <InstallButton />
          </div>
        </div>
      </section>

      <ReorderBanner />

      <section className="mx-auto max-w-6xl px-4 pt-8">
        <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[[Banknote, 'Cash on delivery', 'Pay when you receive'], [Truck, delivery, 'Across Pakistan'], [MessageCircle, 'WhatsApp support', 'Real replies'], [ShieldCheck, 'Honest dealing', 'Price shown upfront']].map(([Icon, t, s]) => (
            <li key={t} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3.5">
              <Icon className="shrink-0 text-gold" size={26} />
              <div><p className="text-sm font-semibold text-cream">{t}</p><p className="text-xs text-dim">{s}</p></div>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-12" aria-labelledby="feat">
        <div className="mb-5 flex items-end justify-between gap-4">
          <h2 id="feat" className="section-title">Our products</h2>
          <Link href="/products" className="text-sm font-semibold text-gold">View all</Link>
        </div>
        {featured.length ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {featured.map((p, i) => <ProductCard key={p.id} p={p} priority={i < 4} />)}
          </div>
        ) : (
          <div className="card text-center">
            <p className="text-dim">New products are being added. Message us on WhatsApp to order right now.</p>
            <a className="btn-wa mt-4" href={waLink('Assalam o Alaikum, I want to see your products.')} target="_blank" rel="noopener noreferrer">Order on WhatsApp</a>
          </div>
        )}
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-14" aria-labelledby="how">
        <h2 id="how" className="section-title mb-5">Ordering takes one minute</h2>
        <ol className="grid gap-3 md:grid-cols-3">
          {[['Choose', 'Pick your product and size.'], ['Fill the form', 'Your name, mobile number and address. No account needed.'], ['Pay on delivery', 'We confirm on WhatsApp, then the rider brings it to your door.']].map(([t, s], i) => (
            <li key={t} className="card flex gap-4"><span className="font-display text-4xl text-gold">{i + 1}</span><div><p className="font-semibold">{t}</p><p className="text-sm text-dim">{s}</p></div></li>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-14" aria-labelledby="guides">
        <h2 id="guides" className="section-title mb-5">Guides from the Mizanora blog</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {posts.map((p) => (
            <article key={p.slug} className="card">
              <h3 className="text-xl font-semibold"><Link href={`/blog/${p.slug}`}>{p.title}</Link></h3>
              <p className="mt-2 text-sm text-dim">{p.description}</p>
              <Link href={`/blog/${p.slug}`} className="mt-3 inline-block text-sm font-semibold text-gold">Read the guide ({p.mins} min)</Link>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-14" aria-labelledby="soc">
        <h2 id="soc" className="section-title mb-5">Find Mizanora everywhere</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {socials.map((s) => {
            const Icon = SOCIAL_ICONS[s.id];
            return (
              <a key={s.id} href={s.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-4 hover:border-gold">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-raised text-gold"><Icon /></span>
                <span><b className="block">{s.label}</b><span className="text-sm text-dim">{s.note}</span></span>
              </a>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 pt-14" aria-labelledby="faq">
        <h2 id="faq" className="section-title mb-5">Questions people ask</h2>
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
