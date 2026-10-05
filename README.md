# Czar & JC · Next.js (App Router, TypeScript)

The freediving wedding invitation and RSVP, as a Next.js app. It looks and behaves exactly like the standalone site: opening cover, animated monogram, live ocean scene, diver line, gallery, countdown, music and RSVP.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm start
```

Deploys as-is to Vercel (or any Node host).

## Folder structure

```
src/
  app/
    layout.tsx            fonts (next/font: Marcellus, Great Vibes, Karla) + page metadata
    page.tsx              renders <Invitation />
    globals.css           all styling
  components/
    FilmPlayer.tsx        Google Drive pre-nup film: inline player + Enlarge viewer
    Invitation.tsx        client component; starts the scene after mount and cleans it up on unmount
    Overlays.tsx          ocean canvas, opening cover, photo viewer, music player
    Menu.tsx              burger menu (built from data/sections.ts)
    DiverLine.tsx         the rope, buoy marker and diver
    Wave.tsx, SectionLabel.tsx   the gold ~ title ~ waves
    sections/             Hero, Entourage, Details, Gallery, Rsvp, Faqs, TrenchFloor
  data/                   ← edit content here
    entourage.ts          parents, officiant, sponsors, attendants, bearers, flower girls
    palette.ts            dress-code colours
    timeline.ts           schedule
    faqs.ts               questions and answers
    gallery.ts            photos and clips in the gallery strip
    sections.ts           menu items (zones and depths)
    event.ts              wedding date, RSVP route path, pre-nup film link (read from env)
  lib/
    scene.ts              ocean, diver, creatures, gallery, lightbox, countdown, music and RSVP logic
    pop.ts                the bubble-pop effect when closing the photo viewer and film
public/assets/
  images/  video/  audio/
```

## How it works

The markup is ordinary React and renders on the server. `Invitation.tsx` is a client component that calls `startScene()` from `lib/scene.ts` once the page has mounted. That function runs the canvas animation and all the interactions, and returns a cleanup function, so leaving the page stops every animation loop, timer, listener and the music.

## Pre-nup film (Google Drive)

1. In Google Drive, right-click the video → **Share** → set General access to **Anyone with the link** → **Copy link**.
2. Paste it as `NEXT_PUBLIC_PRENUP_DRIVE_URL` in `.env.local` (on your computer) and in Vercel → Settings → Environment Variables (live site), then redeploy.

Guests tap the poster to play it right on the page. **Enlarge** opens it in a large viewer (Esc or Close returns), and the player's own full-screen button works too. The background music pauses while the film is open. If the link is left empty, the film card is hidden.

## RSVP

Guests search their party, then answer for each person. The browser talks only to the site's own route `/api/rsvp` (`src/app/api/rsvp/route.ts`), which reads the guest list from, and sends replies to, your Google Apps Script. The script address is the server-only `RSVP_ENDPOINT` environment variable, so guests never see it, and replies for parties not on the guest list are rejected. Set it in `.env.local` locally and in Vercel → Settings → Environment Variables. See `.env.example`.

## Notes

- Images use plain `<img>` tags so they match the original exactly. Next will show a lint suggestion to use `next/image`; it is safe to ignore or switch later.
- If you add this to an existing project, copy `src/components/`, `src/data/`, `src/lib/`, `public/assets/`, the fonts in `src/app/layout.tsx`, and `src/app/globals.css` (or import it only on this page).
