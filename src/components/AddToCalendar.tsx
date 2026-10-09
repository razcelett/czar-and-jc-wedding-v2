'use client';

import { useEffect, useRef, useState } from 'react';
import { googleCalendarUrl, ICS_PATH } from '@/data/calendar';

/** "Save the date" pill under the countdown: opens a small menu with Google Calendar and Apple / Outlook. */
export default function AddToCalendar() {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => { if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('pointerdown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  return (
    <div className="cal" ref={wrap}>
      <button type="button" className="cal-btn" aria-expanded={open} aria-haspopup="true" onClick={() => setOpen(o => !o)}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" /><path d="M3.5 10h17M8 3v4M16 3v4" />
        </svg>
        <span>Save the date</span>
      </button>
      {open && (
        <div className="cal-menu" role="menu">
          <a role="menuitem" href={googleCalendarUrl()} target="_blank" rel="noopener" onClick={() => setOpen(false)}>Google Calendar</a>
          <a role="menuitem" href={ICS_PATH} download="czar-jc-wedding.ics" onClick={() => setOpen(false)}>Apple / Outlook</a>
        </div>
      )}
    </div>
  );
}
