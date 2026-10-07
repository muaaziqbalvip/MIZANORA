import Link from 'next/link';
import { SITE } from '@/lib/config';
import { SOCIAL_ICONS } from './Icons';

export default function Footer() {
  const socials = SITE.social.filter((s) => s.url);
  return (
    <footer className="mt-16 border-t border-line bg-surface pb-24 pt-10">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="font-display text-2xl font-bold tracking-[0.14em]">MIZANORA</p>
          <p className="mt-3 max-w-xs text-sm text-dim">{SITE.tagline} A Pakistani online store built on honest dealing. Cash on delivery across Pakistan.</p>
          <div className="mt-4 flex gap-3">
            {socials.map((s) => {
              const Icon = SOCIAL_ICONS[s.id];
              return <a key={s.id} href={s.url} target="_blank" rel="noopener noreferrer" aria-label={s.label} className="grid h-10 w-10 place-items-center rounded-full bg-raised text-gold hover:bg-line"><Icon size={20} /></a>;
            })}
          </div>
        </div>
        <FooterCol title="Shop" links={[['/products', 'All products'], ['/cart', 'Cart'], ['/how-to-order', 'How to order'], ['/faq', 'FAQ']]} />
        <FooterCol title="Learn" links={[['/blog', 'Blog'], ['/about', 'About us'], ['/contact', 'Contact'], ['/returns', 'Returns']]} />
        <FooterCol title="Legal" links={[['/privacy-policy', 'Privacy policy'], ['/terms', 'Terms of use'], ['/connect', 'Official accounts']]} />
      </div>
      <p className="mx-auto mt-8 max-w-6xl border-t border-line px-4 pt-5 text-xs text-faint">© {new Date().getFullYear()} Mizanora, {SITE.city}.</p>
    </footer>
  );
}

function FooterCol({ title, links }) {
  return (
    <div>
      <h2 className="mb-3 font-sans text-sm font-semibold text-cream">{title}</h2>
      <ul className="space-y-2">
        {links.map(([href, label]) => <li key={href}><Link href={href} className="text-sm text-dim hover:text-gold">{label}</Link></li>)}
      </ul>
    </div>
  );
}
