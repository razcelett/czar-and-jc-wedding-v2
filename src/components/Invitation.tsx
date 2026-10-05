'use client';

import { useEffect } from 'react';
import { GALLERY } from '@/data/gallery';
import { RSVP_API, WEDDING_DATE } from '@/data/event';
import { startScene } from '@/lib/scene';
import Overlays from './Overlays';
import Menu from './Menu';
import DiverLine from './DiverLine';
import Hero from './sections/Hero';
import Entourage from './sections/Entourage';
import Details from './sections/Details';
import Gallery from './sections/Gallery';
import Rsvp from './sections/Rsvp';
import Faqs from './sections/Faqs';
import TrenchFloor from './sections/TrenchFloor';

/** The whole invitation. The markup renders on the server; the ocean, diver, gallery, countdown,
 *  music and RSVP come alive in the browser once the page has mounted. */
export default function Invitation() {
  useEffect(() => startScene({ gallery: GALLERY, weddingDate: WEDDING_DATE, rsvpEndpoint: RSVP_API }), []);

  return (
    <>
      <Overlays />
      <Menu />
      <DiverLine />
      <main>
        <Hero />
        <Entourage />
        <Details />
        <Gallery />
        <Rsvp />
        <Faqs />
        <TrenchFloor />
      </main>
    </>
  );
}
