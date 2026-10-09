import type { Metadata, Viewport } from 'next';
import { Great_Vibes, Karla, Marcellus } from 'next/font/google';
import './globals.css';

const marcellus = Marcellus({ weight: '400', subsets: ['latin'], variable: '--font-marcellus', display: 'swap' });
const greatVibes = Great_Vibes({ weight: '400', subsets: ['latin'], variable: '--font-great-vibes', display: 'swap' });
const karla = Karla({ weight: ['300', '400', '500', '600'], style: ['normal', 'italic'], subsets: ['latin'], variable: '--font-karla', display: 'swap' });

/* The site's public address, used to build full links for the link preview.
   On Vercel it is filled in automatically; set NEXT_PUBLIC_SITE_URL if you add your own domain. */
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:3000');

const TITLE = 'Czar & JC · September 18, 2027';
const DESCRIPTION = "You're invited to dive in with us. Puerto Princesa, Palawan. Find the details and send your RSVP.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    type: 'website',
    url: '/',
    siteName: 'Czar & JC',
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: '/og.jpg', width: 1200, height: 630, alt: 'Czar & JC monogram · September 18, 2027 · Puerto Princesa, Palawan' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['/og.jpg'],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${marcellus.variable} ${greatVibes.variable} ${karla.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: "try{history.scrollRestoration='manual'}catch(e){}" }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
