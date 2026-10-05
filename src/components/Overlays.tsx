export default function Overlays() {
  return (
    <>
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true"><defs><clipPath id="waveGentle" clipPathUnits="objectBoundingBox">
        <path d="M0.05,0 L0.075,0.0007 L0.1,0.0026 L0.125,0.0055 L0.15,0.0091 L0.175,0.0129 L0.2,0.0165 L0.225,0.0194 L0.25,0.0213 L0.275,0.022 L0.3,0.0213 L0.325,0.0194 L0.35,0.0165 L0.375,0.0129 L0.4,0.0091 L0.425,0.0055 L0.45,0.0026 L0.475,0.0007 L0.5,0 L0.525,0.0007 L0.55,0.0026 L0.575,0.0055 L0.6,0.0091 L0.625,0.0129 L0.65,0.0165 L0.675,0.0194 L0.7,0.0213 L0.725,0.022 L0.75,0.0213 L0.775,0.0194 L0.8,0.0165 L0.825,0.0129 L0.85,0.0091 L0.875,0.0055 L0.9,0.0026 L0.925,0.0007 L0.95,0 A0.05,0.05 0 0 1 1,0.05 L0.9993,0.075 L0.9974,0.1 L0.9945,0.125 L0.9909,0.15 L0.9871,0.175 L0.9835,0.2 L0.9806,0.225 L0.9787,0.25 L0.978,0.275 L0.9787,0.3 L0.9806,0.325 L0.9835,0.35 L0.9871,0.375 L0.9909,0.4 L0.9945,0.425 L0.9974,0.45 L0.9993,0.475 L1,0.5 L0.9993,0.525 L0.9974,0.55 L0.9945,0.575 L0.9909,0.6 L0.9871,0.625 L0.9835,0.65 L0.9806,0.675 L0.9787,0.7 L0.978,0.725 L0.9787,0.75 L0.9806,0.775 L0.9835,0.8 L0.9871,0.825 L0.9909,0.85 L0.9945,0.875 L0.9974,0.9 L0.9993,0.925 L1,0.95 A0.05,0.05 0 0 1 0.95,1 L0.925,0.9993 L0.9,0.9974 L0.875,0.9945 L0.85,0.9909 L0.825,0.9871 L0.8,0.9835 L0.775,0.9806 L0.75,0.9787 L0.725,0.978 L0.7,0.9787 L0.675,0.9806 L0.65,0.9835 L0.625,0.9871 L0.6,0.9909 L0.575,0.9945 L0.55,0.9974 L0.525,0.9993 L0.5,1 L0.475,0.9993 L0.45,0.9974 L0.425,0.9945 L0.4,0.9909 L0.375,0.9871 L0.35,0.9835 L0.325,0.9806 L0.3,0.9787 L0.275,0.978 L0.25,0.9787 L0.225,0.9806 L0.2,0.9835 L0.175,0.9871 L0.15,0.9909 L0.125,0.9945 L0.1,0.9974 L0.075,0.9993 L0.05,1 A0.05,0.05 0 0 1 0,0.95 L0.0007,0.925 L0.0026,0.9 L0.0055,0.875 L0.0091,0.85 L0.0129,0.825 L0.0165,0.8 L0.0194,0.775 L0.0213,0.75 L0.022,0.725 L0.0213,0.7 L0.0194,0.675 L0.0165,0.65 L0.0129,0.625 L0.0091,0.6 L0.0055,0.575 L0.0026,0.55 L0.0007,0.525 L0,0.5 L0.0007,0.475 L0.0026,0.45 L0.0055,0.425 L0.0091,0.4 L0.0129,0.375 L0.0165,0.35 L0.0194,0.325 L0.0213,0.3 L0.022,0.275 L0.0213,0.25 L0.0194,0.225 L0.0165,0.2 L0.0129,0.175 L0.0091,0.15 L0.0055,0.125 L0.0026,0.1 L0.0007,0.075 L0,0.05 A0.05,0.05 0 0 1 0.05,0 Z" />
      </clipPath></defs></svg>
      <canvas id="sea" aria-hidden="true"></canvas>
      <div id="cover" role="button" tabIndex={0} aria-label="Open the invitation">
        <video autoPlay muted loop playsInline poster="/assets/images/cover-poster.jpg"><source src="/assets/video/cover.mp4" type="video/mp4" /></video>
        <div className="shade"></div>
        <div id="mono-wrap">
          <div className="shock"></div><div className="shock r2"></div><div className="tap-ring"></div>
          <img src="/assets/images/monogram.png" alt="Czar & JC monogram" />
          <div className="ring"></div>
        </div>
        <div className="cover-text"><span className="nm">Czar &amp; JC</span>Take a deep breath, then tap to dive in</div>
      </div>
      <div id="flash"></div>
      <div className="lightbox pop-overlay" id="lightbox" role="dialog" aria-modal="true" aria-label="Photo viewer" hidden>
        <span className="pop-ripple" aria-hidden="true"></span>
        <button className="lb-close" id="lb-close" type="button">Close ✕</button>
        <button className="lb-nav lb-prev" id="lb-prev" type="button" aria-label="Previous photo"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg></button>
        <figure className="lb-frame pop-body"><img id="lb-img" alt="" /><video id="lb-video" controls playsInline loop hidden></video><figcaption id="lb-cap"></figcaption></figure>
        <button className="lb-nav lb-next" id="lb-next" type="button" aria-label="Next photo"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg></button>
      </div>
      <audio id="bg-music" src="/assets/audio/background-music.mp3" loop preload="auto"></audio>
      <button id="music-toggle" type="button" aria-label="Mute music" aria-pressed="false" hidden>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M11 5 6 9H2v6h4l5 4V5Z" /><path className="mt-wave" d="M15.5 8.5a5 5 0 0 1 0 7" /><path className="mt-wave" d="M18.5 5.5a9 9 0 0 1 0 13" /><path className="mt-mute" d="M23 9 17 15M17 9l6 6" /></svg>
      </button>
    </>
  );
}
