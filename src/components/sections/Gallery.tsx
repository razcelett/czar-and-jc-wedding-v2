import FilmPlayer from '../FilmPlayer';
export default function Gallery() {
  return (
    <>
      <section id="gallery" data-depth="2500" data-label="Midnight">
        <div className="wrap split rev gallery-top">
          <div className="head" style={{ margin: '0' }}><div className="kicker">2,500 metres</div><h2 className="script">Gallery</h2><p className="sec-sub">Moments beneath the surface</p><p className="lede">Before the vows, there was this. A short film from the road that led us here, from our first breath-hold together to the day we said yes.</p></div>
          <FilmPlayer />
        </div>
        <div className="strip" id="strip" aria-label="Photo gallery, drag or swipe to browse">
          <div className="strip-track" id="strip-track"></div>
        </div>
        <div className="strip-ctrl">
          <button type="button" className="strip-btn" id="strip-prev" aria-label="Scroll photos left"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg></button>
          <p className="strip-note">Drag, swipe, or tap a photo to open it.</p>
          <button type="button" className="strip-btn" id="strip-next" aria-label="Scroll photos right"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg></button>
        </div>
      </section>
    </>
  );
}
