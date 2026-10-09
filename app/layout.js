import './globals.css';
import { Cormorant_Garamond, Inter } from 'next/font/google';
import { SITE } from '@/lib/config';
import { orgJsonLd, websiteJsonLd } from '@/lib/seo';
import { CartProvider } from '@/components/CartProvider';
import { InstallProvider } from '@/components/InstallProvider';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import WhatsAppFab from '@/components/WhatsAppFab';
import InstallBanner from '@/components/InstallBanner';
import PwaRegister from '@/components/PwaRegister';
import MetaPixel from '@/components/MetaPixel';
import JsonLd from '@/components/JsonLd';

const display = Cormorant_Garamond({ subsets: ['latin'], weight: ['600', '700'], variable: '--font-display', display: 'swap' });
const body = Inter({ subsets: ['latin'], variable: '--font-body', display: 'swap' });

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0A0A0A',
};

export const metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: 'Mizanora | Online Shopping in Pakistan, Cash on Delivery', template: '%s | Mizanora' },
  description: SITE.description,
  applicationName: 'Mizanora',
  keywords: ['Mizanora', 'online shopping Pakistan', 'cash on delivery Pakistan', 'tactical boots Pakistan', 'halal shopping'],
  authors: [{ name: 'Mizanora' }],
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 } },
  verification: process.env.NEXT_PUBLIC_GSC_VERIFICATION ? { google: process.env.NEXT_PUBLIC_GSC_VERIFICATION } : undefined,
  appleWebApp: { capable: true, title: 'Mizanora', statusBarStyle: 'black-translucent' },
  formatDetection: { telephone: false },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en-PK" className={`${display.variable} ${body.variable}`}>
      <body>
        <CartProvider>
          <InstallProvider>
            <Header />
            <main id="main">{children}</main>
            <Footer />
            <WhatsAppFab />
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
