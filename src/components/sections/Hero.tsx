export default function Hero() {
  return (
    <>
      <section id="surface" data-depth="0" data-label="Surface">
        <div className="sky-part">
          <div className="eyebrow-note">You are invited to witness a single breath, held together, for the rest of our lives.</div>
          <div className="hero-mono" id="hero-mono">
            <video id="mono-video" muted loop playsInline preload="auto"><source src="/assets/video/monogram.mp4" type="video/mp4" /></video>
            <canvas id="mono-canvas" width="752" height="304" aria-label="Czar & JC monogram" role="img" hidden></canvas>
            <img id="mono-still" src="/assets/images/monogram.png" alt="Czar & JC monogram" />
          </div>
        </div>
        <div className="sea-part">
          <div className="countdown" aria-label="Countdown to the wedding">
            <div className="cd-unit"><span className="cd-num" id="cd-d">00</span><span className="cd-label">Days</span></div>
            <div className="cd-unit"><span className="cd-num" id="cd-h">00</span><span className="cd-label">Hours</span></div>
            <div className="cd-unit"><span className="cd-num" id="cd-m">00</span><span className="cd-label">Min</span></div>
            <div className="cd-unit"><span className="cd-num" id="cd-s">00</span><span className="cd-label">Sec</span></div>
          </div>
          <div className="scroll-cue">descend<div className="chevrons"><span></span><span></span><span></span></div></div>
        </div>
      </section>
    </>
  );
}
