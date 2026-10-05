import type { CSSProperties } from 'react';
import { PALETTE } from '@/data/palette';
import { TIMELINE } from '@/data/timeline';
import SectionLabel from '../SectionLabel';

function Palette() {
  return (
    <div className="palette-card">
      <div className="pc-head"><p className="pc-title">Colours of the Deep</p><p className="pc-note">Gathered on the way down, from sunlit coral and open blue water to the soft sand of the seabed. Wear any shade from your group.</p></div>
      <div className="palette">
        {PALETTE.map(g => (
          <div className="pg" key={g.group}>
            <h4>{g.group}</h4>
            <ul>{g.colors.map(c => <li key={c.name}><i style={{ '--c': c.hex } as CSSProperties}></i>{c.name}</li>)}</ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function Timeline() {
  return (
    <div className="timeline">
      {TIMELINE.map(t => (
        <div className="tl" key={t.label}><img src={t.icon} alt="" /><i></i><b>{t.time}</b><span>{t.label}</span></div>
      ))}
    </div>
  );
}

export default function Details() {
  return (
    <section id="details" data-depth="600" data-label="Twilight">
      <div className="wrap">
        <div className="head"><div className="kicker">600 metres</div><h2 className="script">Details</h2><p className="sec-sub">Everything you need before we descend</p></div>
        <div className="venues">
          <article className="venue-card">
            <figure className="arch"><img src="/assets/images/church.jpg" alt="Watercolour painting of San Miguel Arkanghel Parish, the ceremony venue" style={{ objectPosition: '52% 50%' }} /></figure>
            <div className="when">2:00 PM · Ceremony</div>
            <h3>San Miguel Arkanghel Parish</h3>
            <p>Bgy. San Miguel, Puerto Princesa City. Please be seated by 1:45 PM; we take the plunge at 2:00.</p>
            <a href="https://www.google.com/maps/place/San+Miguel+Arkanghel+Parish/@9.7479634,118.7440001,17z" target="_blank" rel="noopener">Map &amp; directions</a>
          </article>
          <div className="venue-link" aria-hidden="true"><span></span><em>about 2 km</em><span></span></div>
          <article className="venue-card">
            <figure className="arch"><img src="/assets/images/hotel.webp" alt="Watercolour painting of Citystate Asturias Hotel Palawan, the reception venue" style={{ objectPosition: '50% 60%' }} /></figure>
            <div className="when">4:00 PM · Reception</div>
            <h3>Citystate Asturias Hotel Palawan</h3>
            <p>South National Highway, Tiniguban, Puerto Princesa City. Where we come up for air, dinner and dancing.</p>
            <a href="https://www.google.com/maps/place/Citystate+Asturias+Hotel+Palawan/@9.7656791,118.7428855,17z" target="_blank" rel="noopener">Map &amp; directions</a>
          </article>
        </div>
        <SectionLabel>The Timeline</SectionLabel>
        <Timeline />
        <SectionLabel>The Dress · Formal / Semi-formal</SectionLabel>
        <div className="dress">
          <figure className="attire-visual"><img src="/assets/images/attire.webp" alt="Illustrated guide to entourage and family attire colours" /></figure>
          <div className="attire-text">
            <div className="dress-copy">
              <p>Dress for a formal, church-appropriate day, in colours borrowed from the sea.</p>
              <dl className="dress-rules">
                <dt>Ladies</dt><dd>A formal dress or gown in any shade from our palette.</dd>
                <dt>Gentlemen</dt><dd>Black suit with a palette-colored tie or bow tie, or a palette-colored long-sleeve polo.</dd>
                <dt>Please avoid</dt><dd>White and gray, the two shades we're saving for the Bride &amp; Groom.</dd>
              </dl>
            </div>
            <Palette />
          </div>
        </div>
        <div className="grid g3 notes-row" style={{ marginTop: 'clamp(30px,5vh,48px)' }}>
          <div className="note place"><h3>Notes on Gifts</h3><p>Having you on this dive with us is gift enough. Your presence and prayers are all we ask. If you wish to give, a contribution to our future fund, for the life we're building together, would be deeply appreciated.</p></div>
          <div className="note place"><h3>Adults-Only Event</h3><p>Our wedding will be an adults-only celebration, except for our little ones in the wedding entourage. We hope you understand and look forward to celebrating with you!</p></div>
          <div className="note place"><h3>Snap &amp; share</h3><p>Catch every angle, from the first splash to the last dance. Tag your photos <strong style={{ color: 'var(--ink)' }}>#CzarAndJC2027</strong> and we'll be raiding your camera roll once we resurface.</p></div>
        </div>
      </div>
    </section>
  );
}
