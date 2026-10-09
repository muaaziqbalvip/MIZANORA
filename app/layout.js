import './globals.css';
import { Plus_Jakarta_Sans, Inter } from 'next/font/google';
import { SITE } from '@/lib/config';
import { getCategories } from '@/lib/products';
import { orgJsonLd, websiteJsonLd } from '@/lib/seo';
import { CartProvider } from '@/components/CartProvider';
import { InstallProvider } from '@/components/InstallProvider';
import AnnouncementBar from '@/components/AnnouncementBar';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import WhatsAppFab from '@/components/WhatsAppFab';
import InstallBanner from '@/components/InstallBanner';
import BottomNav from '@/components/BottomNav';
import PwaRegister from '@/components/PwaRegister';
import MetaPixel from '@/components/MetaPixel';
import JsonLd from '@/components/JsonLd';

const display = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['600', '700', '800'], variable: '--font-display', display: 'swap' });
const body = Inter({ subsets: ['latin'], variable: '--font-body', display: 'swap' });

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0B6B45',
};

export const metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: 'Mizanora | Online Shopping in Pakistan, Cash on Delivery', template: '%s | Mizanora' },
  description: SITE.description,
  applicationName: 'Mizanora',
  keywords: ['Mizanora', 'online shopping Pakistan', 'online market Pakistan', 'cash on delivery Pakistan', 'buy online Pakistan', 'halal shopping', 'shopping blog Pakistan'],
  authors: [{ name: 'Mizanora' }],
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 } },
  verification: process.env.NEXT_PUBLIC_GSC_VERIFICATION ? { google: process.env.NEXT_PUBLIC_GSC_VERIFICATION } : undefined,
  appleWebApp: { capable: true, title: 'Mizanora', statusBarStyle: 'default' },
  formatDetection: { telephone: false },
};

export default async function RootLayout({ children }) {
  const categories = await getCategories();
  return (
    <html lang="en-PK" className={`${display.variable} ${body.variable}`}>
      <body>
        <CartProvider>
          <InstallProvider>
            <AnnouncementBar />
            <Header categories={categories} />
            <main id="main">{children}</main>
            <Footer categories={categories} />
            <WhatsAppFab />
            <BottomNav />
            <InstallBanner />
          </InstallProvider>
        </CartProvider>
        <MetaPixel />
        <PwaRegister />
        <JsonLd data={[orgJsonLd(), websiteJsonLd()]} />
      </body>
    </html>
  );
}
