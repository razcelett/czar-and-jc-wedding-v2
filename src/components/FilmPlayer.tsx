'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { PRENUP_DRIVE_URL } from '@/data/event';
import { popBubble } from '@/lib/pop';

/** Turns any Google Drive share link into its embeddable player URL. */
function drivePreview(url: string): string | null {
  const m = url.match(/\/file\/d\/([\w-]+)/) || url.match(/[?&]id=([\w-]+)/);
  return m ? `https://drive.google.com/file/d/${m[1]}/preview` : null;
}

/** Featured film: a poster that becomes an embedded Google Drive player on tap,
 *  with an Enlarge button that opens it in a near-full-screen viewer (the player's own full-screen button works too). */
export default function FilmPlayer() {
  const src = drivePreview(PRENUP_DRIVE_URL);
  const [playing, setPlaying] = useState(false);
  const [big, setBig] = useState(false);
  const [closing, setClosing] = useState(false);
  const close = () => {
    if (closing) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const frame = document.querySelector('.film-modal .pop-body');
    if (!reduce && frame) popBubble(frame);
    setClosing(true);
    window.setTimeout(() => { setBig(false); setClosing(false); }, reduce ? 0 : 700);
  };
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!big) return;
    const music = document.getElementById('bg-music') as HTMLAudioElement | null;
    const wasPlaying = !!music && !music.paused;
    music?.pause();
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    document.documentElement.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.documentElement.style.overflow = '';
      if (wasPlaying && music && !music.muted) music.play().catch(() => { });
    };
  }, [big]);

  // pause the background music while the film plays inline
  useEffect(() => {
    if (!playing) return;
    (document.getElementById('bg-music') as HTMLAudioElement | null)?.pause();
  }, [playing]);

  if (!src) return null;
  const player = (autoplay: boolean) => (
    <iframe
      src={src + (autoplay ? '?autoplay=1' : '')}
      title="Czar & JC pre-nup film"
      allow="autoplay; fullscreen; picture-in-picture"
      allowFullScreen
    />
  );

  return (
    <>
      <div className="film">
        {playing && !big ? (
          <>
            {player(true)}
            <button type="button" className="film-enlarge" onClick={() => setBig(true)} aria-label="Enlarge the film">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /></svg>
              <span>Enlarge</span>
            </button>
          </>
        ) : (
          <button type="button" className="film-poster" onClick={() => setPlaying(true)} aria-label="Play our pre-nup film">
            <img src="/assets/images/cover-poster.jpg" alt="" />
            <span className="pill">Featured film</span>
            <span className="play"><svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg></span>
            <span className="cap">Watch our pre-nup film</span>
          </button>
        )}
      </div>

      {big && createPortal(
        <div className={`film-modal pop-overlay${closing ? ' closing' : ''}`} role="dialog" aria-modal="true" aria-label="Pre-nup film" onClick={e => { if (e.target === e.currentTarget) close(); }}>
          <span className="pop-ripple" aria-hidden="true"></span>
          <button type="button" ref={closeRef} className="lb-close" onClick={close}>Close ✕</button>
          <div className="film-modal-frame pop-body">{player(true)}</div>
        </div>,
        document.body,
      )}
    </>
  );
}
