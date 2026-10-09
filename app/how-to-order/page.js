import Link from 'next/link';
import { waLink, absUrl } from '@/lib/config';
import { pageMeta, breadcrumbJsonLd } from '@/lib/seo';
import { PageHead, Prose } from '@/components/Prose';
import JsonLd from '@/components/JsonLd';

export const metadata = pageMeta({
  title: 'How to Order, Cash on Delivery or WhatsApp',
  description: 'A simple guide to ordering from Mizanora: choose a product, fill one short form, pay on delivery. Or order directly on WhatsApp.',
  path: '/how-to-order',
});

const howTo = {
  '@context': 'https://schema.org', '@type': 'HowTo', name: 'How to order from Mizanora',
  step: [
    { '@type': 'HowToStep', name: 'Choose a product', text: 'Open the products page and pick your product and size.' },
    { '@type': 'HowToStep', name: 'Fill the checkout form', text: 'Enter your name, mobile number, address, city and province. No account needed.' },
    { '@type': 'HowToStep', name: 'Confirm on WhatsApp', text: 'Mizanora confirms your order with you on WhatsApp before dispatch.' },
    { '@type': 'HowToStep', name: 'Pay on delivery', text: 'Pay the rider in cash when your parcel arrives.' },
  ],
  url: absUrl('/how-to-order'),
};

export default function HowToOrder() {
  return (
    <>
      <PageHead title="How to order" intro="Two easy ways to order. Both are cash on delivery." crumbs={[['/', 'Home'], [null, 'How to order']]} />
      <Prose>
        <h2>Way 1: order on the website</h2>
        <ol>
          <li><strong>Choose a product</strong> from the <Link href="/products">products page</Link> and select your size.</li>
          <li><strong>Tap "Order now"</strong> and fill the short form: name, mobile number, address, nearest landmark, city and province.</li>
          <li><strong>Verify on WhatsApp.</strong> After you order, tap "Verify via WhatsApp" so we can confirm quickly.</li>
          <li><strong>Pay on delivery.</strong> Pay the rider in cash when the parcel arrives.</li>
        </ol>
        <h2>Way 2: order on WhatsApp</h2>
        <p>Message us at <a href={waLink('Assalam o Alaikum, I want to order: (product, size, city)')} target="_blank" rel="noopener noreferrer">+92 306 2015326</a> with the product name, size and your city. We reply with the price and delivery details.</p>
        <div className="callout"><p>Tip: give a complete address with a nearby landmark. It helps the rider find you the first time.</p></div>
        <h2>Stay safe</h2>
        <ul>
          <li>Only use the links and the WhatsApp number on this website.</li>
          <li>We never ask you to send money in advance.</li>
        </ul>
        <p>More tips: <Link href="/blog/how-to-spot-fake-online-shops-pakistan">how to spot fake online shops in Pakistan</Link>.</p>
      </Prose>
      <JsonLd data={[howTo, breadcrumbJsonLd([['/', 'Home'], ['/how-to-order', 'How to order']])]} />
    </>
  );
}
