import type { Metadata, Viewport } from 'next';
import { Great_Vibes, Karla, Marcellus } from 'next/font/google';
import './globals.css';

const marcellus = Marcellus({ weight: '400', subsets: ['latin'], variable: '--font-marcellus', display: 'swap' });
const greatVibes = Great_Vibes({ weight: '400', subsets: ['latin'], variable: '--font-great-vibes', display: 'swap' });
const karla = Karla({ weight: ['300', '400', '500', '600'], style: ['normal', 'italic'], subsets: ['latin'], variable: '--font-karla', display: 'swap' });

export const metadata: Metadata = {
  title: 'Czar & JC · September 18, 2027',
  description: 'Czar & JC · September 18, 2027 · Puerto Princesa, Palawan. Dive in for the details and RSVP.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${marcellus.variable} ${greatVibes.variable} ${karla.variable}`}>
      <body>{children}</body>
    </html>
  );
}
