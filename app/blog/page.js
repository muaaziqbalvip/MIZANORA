import Link from 'next/link';
import { getPosts } from '@/lib/blog';
import { pageMeta, breadcrumbJsonLd } from '@/lib/seo';
import { PageHead } from '@/components/Prose';
import JsonLd from '@/components/JsonLd';

export const metadata = pageMeta({
  title: 'Blog: Online Shopping Guides for Pakistan',
  description: 'Practical guides on shopping online in Pakistan: staying safe, halal shopping, cash on delivery, tactical boots and boot care.',
  path: '/blog',
});

export default function BlogIndex() {
  const posts = getPosts();
  return (
    <>
      <PageHead title="The Mizanora Blog" intro="Practical guides for shopping smart and shopping halal in Pakistan." crumbs={[['/', 'Home'], [null, 'Blog']]} />
      <div className="mx-auto grid max-w-6xl gap-4 px-4 py-8 md:grid-cols-2">
        {posts.map((p) => (
          <article key={p.slug} className="card">
            <h2 className="text-2xl font-semibold"><Link href={`/blog/${p.slug}`}>{p.title}</Link></h2>
            <p className="mt-2 text-dim">{p.description}</p>
            <p className="mt-3 text-xs text-faint">{p.date} · {p.mins} min read</p>
            <Link href={`/blog/${p.slug}`} className="mt-2 inline-block text-sm font-semibold text-gold">Read the guide</Link>
          </article>
        ))}
      </div>
      <JsonLd data={breadcrumbJsonLd([['/', 'Home'], ['/blog', 'Blog']])} />
    </>
  );
}
