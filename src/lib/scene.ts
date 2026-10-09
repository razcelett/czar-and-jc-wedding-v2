// @ts-nocheck
/* The ocean scene and every interactive behaviour of the invitation, run on the rendered markup.
   startScene() is called once from <Invitation> after mount and returns a cleanup function that stops
   every animation loop, timer, listener and the music when the page unmounts. */
import type { GalleryItem } from '@/data/gallery';
import { popBubble } from './pop';
import { googleCalendarUrl, ICS_PATH } from '@/data/calendar';

export type SceneOptions = { gallery: GalleryItem[]; weddingDate: string; rsvpEndpoint: string };

export function startScene(opts: SceneOptions): () => void {
  let alive = true;
  const offs: (() => void)[] = [];
  const intervals: number[] = [];
  const observers: ResizeObserver[] = [];
  // scoped stand-ins so everything below is tracked and torn down with the page
  const addEventListener = (t, f, o?) => { window.addEventListener(t, f, o); offs.push(() => window.removeEventListener(t, f, o)); };
  const docOn = (t, f, o?) => { document.addEventListener(t, f, o); offs.push(() => document.removeEventListener(t, f, o)); };
  const requestAnimationFrame = (cb) => (alive ? window.requestAnimationFrame(cb) : 0);
  const setInterval = (fn, ms) => { const id = window.setInterval(fn, ms); intervals.push(id); return id; };
  const ResizeObserver = class extends window.ResizeObserver { constructor(cb) { super(cb); observers.push(this); } };
  const on = (el, t, f, o?) => { el.addEventListener(t, f, o); offs.push(() => el.removeEventListener(t, f, o)); };

  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = id => document.getElementById(id);
  /* LAYERS. Nothing that depends on the scroll position is drawn in JavaScript any more, so scrolling is handled
     entirely by the browser's compositor and can't lag or flicker:
       #world  one page-sized layer behind the content (scrolls natively):
                 - the depth gradient (a static CSS gradient laid out in page coordinates)
                 - the sky canvas (top of the page)
                 - one small canvas per creature / school / the trench floor, parked at its depth
       #sea    a fixed, screen-sized canvas for marine snow, bubbles and sparks (no scroll dependence)
     Canvases only repaint on a ~30fps timer, and only while they are on screen. */
  const cv = $('sea'), mainCtx = cv.getContext('2d');
  let ctx = mainCtx; // every draw helper paints into `ctx`; each pass points it at the canvas it is drawing
  const body = document.body, bodyPos = body.style.position;
  body.style.position = 'relative'; offs.push(() => { body.style.position = bodyPos; });
  const world = document.createElement('div');
  world.id = 'world'; world.setAttribute('aria-hidden', 'true');
  world.style.cssText = 'position:absolute;inset:0;z-index:0;pointer-events:none;overflow:hidden';
  cv.before(world); offs.push(() => world.remove());
  const skyCv = document.createElement('canvas'), skyCtx = skyCv.getContext('2d');
  skyCv.id = 'sky'; skyCv._vis = true;
  skyCv.style.cssText = 'position:absolute;top:0;left:0;width:100%;display:block;pointer-events:none';
  world.appendChild(skyCv);
  let SKY_H = 0, drawAcc = 0;
  const actors = [];
  const io = new IntersectionObserver(es => { for (const e of es) e.target._vis = e.isIntersecting; }, { rootMargin: '240px 0px' });
  offs.push(() => io.disconnect()); io.observe(skyCv);
  /* ---------- scroll reveal: details fade/rise in as they enter the screen ---------- */
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const targets = [...document.querySelectorAll(
      'main > section:not(#surface) :is(.head, .venue-card, .timeline .tl, .dress-copy, .dress-rules, .palette-card, .attire-visual, .ent, .faq-item, .rsvp-box, .rsvp-text, .gallery-top > *, .strip, .contact)'
    )] as HTMLElement[];
    const rio = new IntersectionObserver(es => {
      for (const e of es) if (e.isIntersecting) { e.target.classList.add('rv-in'); rio.unobserve(e.target); }
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    const seen = new Map<Element, number>();
    for (const el of targets) {
      const par = el.parentElement!, n = seen.get(par) || 0; seen.set(par, n + 1);
      el.style.setProperty('--rd', Math.min(n, 5) * 0.09 + 's');
      el.classList.add('rv'); rio.observe(el);
    }
    offs.push(() => { rio.disconnect(); targets.forEach(el => el.classList.remove('rv', 'rv-in')); });
  }
  const sections = [...document.querySelectorAll('main > section')];
  let W = 0, H = 0, DPR = 1, maxScroll = 1, anchors = [];
  let SURF = 0.5; // waterline height: set from the hero's content so the sky never has dead space
  const lerp = (a, b, t) => a + (b - a) * t, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const R = (a, b) => a + Math.random() * (b - a);

  /* ---------- depth model: each section is pinned to a depth ---------- */
  function depthAt(s) {
    if (s <= 0) return s;
    for (let i = 0; i < anchors.length - 1; i++) {
      const a = anchors[i], b = anchors[i + 1];
      if (s <= b.s) return a.d + (b.d - a.d) * (s - a.s) / (b.s - a.s);
    }
    const l = anchors[anchors.length - 1]; return l.d;  // nothing is deeper than the trench floor
  }
  function sAt(m) {
    for (let i = 0; i < anchors.length - 1; i++) {
      const a = anchors[i], b = anchors[i + 1];
      if (m <= b.d) return a.s + (b.s - a.s) * (m - a.d) / (b.d - a.d);
    }
    const l = anchors[anchors.length - 1]; return l.s + (m - l.d) / 2;
  }
  const WATER = [[0,[92,186,204]],[15,[58,154,184]],[50,[32,112,148]],[120,[18,76,110]],[200,[12,56,88]],[400,[7,34,58]],[1000,[3,14,28]],[2500,[2,9,18]],[4000,[1,6,12]],[11000,[1,3,7]]];
  function waterRGB(m) {
    m = Math.max(0, m);
    for (let i = 0; i < WATER.length - 1; i++) {
      const [d0, c0] = WATER[i], [d1, c1] = WATER[i + 1];
      if (m <= d1) { const t = (Math.log1p(m) - Math.log1p(d0)) / (Math.log1p(d1) - Math.log1p(d0)); return c0.map((c, k) => Math.round(lerp(c, c1[k], t))); }
    }
    return WATER[WATER.length - 1][1];
  }
  const rgb = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

  /* ---------- world ---------- */
  let cirrus = [], lantern = [], angler = null, snow = [], schools = [], jellies = [], mtn = null, bubbles = [], sparks = [], clouds = [], floorImg = null;
  function build() {
    snow = Array.from({ length: W < 640 ? 70 : 130 }, () => ({ x: R(0, W), y: R(0, H + 40), z: R(.25, 1), r: R(.5, 1.7), ph: R(0, 6.28) }));
    schools = [[10, 1], [35, -1], [80, 1], [140, -1]].map(([m, dir]) => {
      const n = Math.round(R(12, 24)), spread = R(60, 130);
      return { m, dir, x: R(0, W), v: R(16, 30), size: R(11, 16), fish: Array.from({ length: n }, () => ({ ox: R(-spread, spread), oy: R(-spread * .35, spread * .35), ph: R(0, 6.28), k: R(.8, 1.15) })) };
    });
    jellies = Array.from({ length: 7 }, (_, i) => ({ m: R(320, 3200), x: R(.12, .9) * W, r: R(12, 24), ph: R(0, 6.28), hue: [[255, 160, 200], [150, 225, 255], [200, 180, 255]][i % 3] }));
    lantern = Array.from({ length: 3 }, (_, i) => ({ m: [380, 600, 850][i], dir: i % 2 ? -1 : 1, x: R(0, W), v: R(10, 18), fish: Array.from({ length: 14 }, () => ({ ox: R(-110, 110), oy: R(-40, 40), ph: R(0, 6.28) })) }));
    angler = { m: 2200, x: W * .7, v: 6, dir: -1 };
    // cumulus: far ones small, flat and hazy near the horizon; near ones big and high
    const big = Math.min(1, W / 1100);
    clouds = [
      ...Array.from({ length: Math.round(3 + W / 700) }, () => ({ img: makeCloud(R(220, 420) * big, R(16, 24) * big, .25), x: R(0, W), y: R(-.02, .04), v: R(.8, 1.6), a: .55 })),
      ...Array.from({ length: 5 }, () => ({ img: makeCloud(R(90, 150) * big, R(26, 36) * big, .4), x: R(0, W), y: R(.06, .16), v: R(1.5, 3), a: .75 })),
      ...Array.from({ length: 3 }, () => ({ img: makeCloud(R(120, 190) * big, R(44, 66) * big, .7), x: R(0, W), y: R(.24, .42), v: R(3, 5), a: .9 })),
      ...Array.from({ length: 2 }, () => ({ img: makeCloud(R(180, 260) * big, R(70, 95) * big, .85), x: R(0, W), y: R(.5, .68), v: R(5, 7), a: 1 })),
    ];
    cirrus = Array.from({ length: 3 }, () => ({ x: R(0, W), y: R(.62, .85), w: R(180, 360) * big, v: R(2, 4), r: R(-.08, .08) }));
    buildFloor(); buildMountains(); if (!seaTex) buildSeaTex();
    buildActors();
  }
  /* each creature gets a small canvas parked at its depth; it scrolls with the page like any other element */
  function addActor(a) {
    const c = document.createElement('canvas');
    c.style.cssText = 'position:absolute;left:0;width:100%;display:block;pointer-events:none';
    a.cv = c; a.cx = c.getContext('2d'); c._vis = false; actors.push(a);
    const d = Math.min(devicePixelRatio || 1, matchMedia('(pointer:coarse)').matches ? 1.25 : 1.5);
    c.width = Math.round(W * d); c.height = Math.round(a.bandH * d); c.style.height = a.bandH + 'px'; a.cx.setTransform(d, 0, 0, d, 0, 0);
    world.appendChild(c); io.observe(c);
  }
  function buildActors() {
    for (const a of actors) { io.unobserve(a.cv); a.cv.remove(); }
    actors.length = 0;
    for (const sc of schools) addActor({ m: sc.m, bandH: 240, render(y, t, step) {
      if (!RM) { sc.x += sc.v * sc.dir * step; if (sc.x > W + 250) sc.x = -250; if (sc.x < -250) sc.x = W + 250; }
      const c = waterRGB(sc.m * 1.6).map(v => v * .42), hl = clamp(.4 - sc.m / 260, 0, .4);
      for (const f of sc.fish) drawFish(sc.x + f.ox + Math.sin(t * .9 + f.ph) * 5, y + f.oy + Math.cos(t * 1.2 + f.ph) * 4, sc.size * f.k, sc.dir, rgb(c, .85), hl, t, f.ph);
    } });
    for (const sc of lantern) addActor({ m: sc.m, bandH: 200, render(y, t, step) {
      if (!RM) { sc.x += sc.v * sc.dir * step; if (sc.x > W + 150) sc.x = -150; if (sc.x < -150) sc.x = W + 150; }
      drawLantern(sc, y, t);
    } });
    addActor({ m: angler.m, bandH: 300, render(y, t, step) {
      if (!RM) { angler.x += angler.v * angler.dir * step; if (angler.x < -80) angler.x = W + 80; }
      drawAngler(angler, y, t);
    } });
    for (const j of jellies) addActor({ m: j.m, bandH: 260, render(y, t) { drawJelly(j, y, t); } });
    // the trench floor sits at the very bottom of the page; its cone of light reaches up above the seabed
    if (floorImg) addActor({ floor: true, bandH: Math.ceil(H * .55 + floorImg.fh), render(y, t) { drawFloor(H * .55 + floorImg.hz0, t); } });
  }
  function placeActors() {
    for (const a of actors) {
      const y = a.floor ? maxScroll + H - clamp(H * .34, 190, floorImg.fh - floorImg.hz0 - 6) - floorImg.hz0 - H * .55 : sAt(a.m) + H * SURF - a.bandH / 2;
      a.cv.style.top = Math.round(y) + 'px';
    }
  }
  /* the water colour for every depth, as a static gradient in page coordinates (what drawWater painted each frame) */
  function buildWorld() {
    const total = Math.max(document.documentElement.scrollHeight, H), stops = [];
    for (let p = 0; p <= total + 36; p += 36) { const c = waterRGB(Math.max(0, depthAt(p - H * SURF))); stops.push(`rgb(${c[0]},${c[1]},${c[2]}) ${p}px`); }
    world.style.background = `linear-gradient(180deg,${stops.join(',')})`;
    placeActors();
  }
  /* one cumulus cloud, painted at half size from many soft puffs, then shaded: bright sunlit tops, flat grey-blue base */
  /* value noise + fbm, used to paint clouds and canopy texture */
  const NP = Array.from({ length: 512 }, () => Math.random());
  const nHash = (x, y) => NP[((x * 73856093) ^ (y * 19349663)) & 511];
  function vnoise(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = nHash(xi, yi), b = nHash(xi + 1, yi), c = nHash(xi, yi + 1), d = nHash(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  function fbm(x, y, o = 5) { let s = 0, a = .5, f = 1; for (let i = 0; i < o; i++) { s += a * vnoise(x * f, y * f); f *= 2.03; a *= .5; } return s; }
  /* tileable sea-surface texture: stretched noise gives the glint-and-shadow pattern of small waves */
  let seaTex = null;
  function buildSeaTex() {
    const tw = 512, th = 96, c = document.createElement('canvas'); c.width = tw; c.height = th; const g = c.getContext('2d');
    const img = g.createImageData(tw, th), d = img.data, P = 16;
    const tn = (x, y) => { // tile in x by blending across the seam
      const u = x / tw; return fbm(x / 34, y / 6, 4) * (1 - u) + fbm((x - tw) / 34, y / 6, 4) * u;
    };
    for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) {
      const n = tn(x, y), i = (y * tw + x) * 4;
      if (n > .55) { d[i] = 255; d[i + 1] = 255; d[i + 2] = 250; d[i + 3] = Math.min(255, (n - .55) * 900); }
      else if (n < .42) { d[i] = 6; d[i + 1] = 50; d[i + 2] = 72; d[i + 3] = Math.min(255, (.42 - n) * 700); }
    }
    g.putImageData(img, 0, 0); seaTex = c;
  }
  /* open-sea surface, shaded per pixel in perspective: a few directional swells give each point a slope;
     steep faces turned toward you show deep water, faces turned up mirror the bright sky (more so toward the horizon),
     and slopes that catch the sun light up as a glitter path beneath it */
  const seaCv = document.createElement('canvas'), seaCtx = seaCv.getContext('2d');
  let seaImg = null, seaTick = 0;
  const SWELL = [[.98, .2, .9, .26, 1.0], [.6, .8, 1.7, .14, 1.45], [-.45, .89, 2.9, .09, 1.9], [.85, -.53, 4.6, .055, 2.5], [-.2, .98, 7.5, .03, 3.3], [.7, .71, 12, .016, 4.2]];
  function drawSeaSurface(hz, wl, t, sx) {
    const bandTop = Math.floor(hz), bandH = Math.ceil(wl + 16 - hz); if (bandH < 2) return;
    const q = .4, w = Math.max(2, Math.round(W * q)), h = bandH;
    const resized = seaCv.width !== w || seaCv.height !== h;
    if (resized) { seaCv.width = w; seaCv.height = h; seaImg = seaCtx.createImageData(w, h); }
    if (!resized && (seaTick++ & 1)) { ctx.imageSmoothingEnabled = true; ctx.drawImage(seaCv, 0, bandTop, W, h); return; }   // shade at half the frame rate
    const d = seaImg.data, span = Math.max(1, wl - hz), sxq = sx * q, aspect = W / Math.max(1, span) * .02;
    for (let y = 0; y < h; y++) {
      const v = clamp((y + .5) / span, 0, 1.4), z = 1 / (v * .96 + .04);             // distance from viewer
      const fres = .18 + .72 * Math.pow(1 - Math.min(v, 1), 2.2);                      // grazing angle mirrors the sky
      const sig = w * (.035 + .11 * Math.min(v, 1)), haze = Math.pow(1 - Math.min(v, 1), 6);
      for (let x = 0; x < w; x++) {
        const wx = (x / w - .5) * z * aspect * 6, wz = z * 2.2;
        let gx = 0, gz = 0;
        for (const [dx, dz, k, a, sp] of SWELL) { const c = a * k * Math.cos(k * (dx * wx + dz * wz) - sp * t); gx += dx * c; gz += dz * c; }
        const tilt = clamp(gz * 1.4, -1, 1);                                         // >0 faces the sky, <0 faces you
        const F = clamp(fres + tilt * .38 * (1 - fres * .5), 0, 1);
        let r = 18 + (176 - 18) * F, g = 104 + (216 - 104) * F, b = 140 + (232 - 140) * F;
        // sun glitter: a column under the sun, sparkling where slopes catch the light
        const col = Math.exp(-((x - sxq) * (x - sxq)) / (2 * sig * sig)), sl = gz * 1.6 + gx * (x - sxq) / w * 2;
        const sp = col * Math.max(0, (sl - .55) * 3.2); const spk = Math.min(1, sp * sp);
        r += (255 - r) * spk; g += (253 - g) * spk; b += (240 - b) * spk;
        r += (206 - r) * haze * .6; g += (228 - g) * haze * .6; b += (232 - b) * haze * .6;   // distant haze
        const i = (y * w + x) * 4; d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255;
      }
    }
    seaCtx.putImageData(seaImg, 0, 0);
    ctx.imageSmoothingEnabled = true; ctx.drawImage(seaCv, 0, bandTop, W, h);
  }
  /* caustics: the dancing net of light that waves focus onto the water just below the surface */
  const causCv = document.createElement('canvas'), causCtx = causCv.getContext('2d');
  let causImg = null, causTick = 0;
  function drawCaustics(wl, t) {
    const depthPx = Math.min(H * .38, 300); if (wl < -depthPx || wl > H) return;
    const q = .2, w = Math.max(2, Math.round(W * q)), h = Math.max(2, Math.round(depthPx * q));
    const resized = causCv.width !== w || causCv.height !== h;
    if (resized) { causCv.width = w; causCv.height = h; causImg = causCtx.createImageData(w, h); }
    if (resized || !(causTick++ & 1)) {
    const d = causImg.data;
    for (let y = 0; y < h; y++) {
      const fy = y / h, fade = Math.min(1, fy * 6) * Math.pow(1 - fy, 1.6), py = y / q;
      for (let x = 0; x < w; x++) {
        const px = x / q * .022, pz = py * .05;
        const a1 = Math.sin(px * 1.0 + pz * .6 + t * .9 + Math.sin(pz * .7 + t * .4) * 1.2);
        const a2 = Math.sin(px * -.7 + pz * 1.1 - t * .7 + Math.sin(px * .9 - t * .3) * 1.1);
        const a3 = Math.sin(px * .4 - pz * .9 + t * .6 + Math.sin((px + pz) * .5 + t * .5));
        const v = Math.abs(a1 + a2 + a3) / 3, c = Math.pow(Math.max(0, 1 - v * 2.6), 4) * fade;
        const i = (y * w + x) * 4; d[i] = 210; d[i + 1] = 245; d[i + 2] = 240; d[i + 3] = c * 255;
      }
    }
    causCtx.putImageData(causImg, 0, 0);
    }
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .18; ctx.imageSmoothingEnabled = true;
    ctx.drawImage(causCv, 0, wl + 4, W, depthPx); ctx.restore();
  }
  /* one cumulus: domain-warped noise density inside a dome with a flat base, lit by marching toward the sun
     (upper right) so the tops glow and the undersides and inner folds fall into soft grey-blue shadow */
  function makeCloud(w, h, detail) {
    const k = .8, cw = Math.max(8, Math.ceil(w * k)), ch = Math.max(8, Math.ceil(h * k * 1.6));
    const c = document.createElement('canvas'); c.width = cw; c.height = ch; const g = c.getContext('2d');
    const img = g.createImageData(cw, ch), d = img.data, base = ch * .8, ox = Math.random() * 100, oy = Math.random() * 100, sc = 4.2 / cw;
    const lobes = Array.from({ length: 3 + Math.round(detail * 3) }, () => ({ x: R(.28, .72) * cw, r: R(.22, .4) * ch, h: R(.6, 1) }));
    const dens = (x, y, o = 5) => {
      if (y > base + 2) return -1;
      let dome = 0; for (const L of lobes) { const dx = (x - L.x) / (L.r * 1.5), dy = (y - (base - L.r * .5 * L.h)) / (L.r * L.h * 1.2); dome = Math.max(dome, 1 - dx * dx - dy * dy); }
      const px = x * sc + ox, py = y * sc * 1.2 + oy, wq = fbm(px * .7, py * .7, 3);
      const n = fbm(px + wq * 1.6, py + wq * 1.2, o + 1);
      const flat = clamp((base - y) / 6, 0, 1);                       // crisp, flat underside
      const edge = clamp(Math.min(x, cw - x) / (cw * .14), 0, 1) * clamp(y / (ch * .16), 0, 1);   // fade before the canvas edge
      return (dome * 1.15 + (n - .5) * (1.3 + detail * .4) * clamp(dome + .65, 0, 1) - .1) * flat * edge - (1 - edge) * .3;
    };
    for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
      const dn = dens(x, y); if (dn <= 0) continue;
      const e = clamp(dn / .38, 0, 1), a = e * e * (3 - 2 * e);                  // soft, wispy edges
      let sh = 0; for (let s2 = 1; s2 <= 4; s2++) { const v = dens(x + s2 * 2.5, y - s2 * 3.5, 3); if (v > 0) sh += v; }
      const light = Math.exp(-sh * .55), under = clamp((y - base * .55) / (base * .45), 0, 1);
      const L = clamp(.6 + .5 * light - under * .3, .42, 1.06);
      const i = (y * cw + x) * 4;
      // shadows pick up the blue of the sky; lit tops are warm white
      const warm = clamp((L - .9) * 4, 0, 1);                               // sun-facing tops pick up a warm tint
      d[i] = Math.min(255, 128 + 130 * L + warm * 4); d[i + 1] = Math.min(255, 146 + 112 * L + warm * 2); d[i + 2] = Math.min(255, 176 + 82 * L - warm * 8); d[i + 3] = a * 255;
    }
    g.putImageData(img, 0, 0);
    return { c, w: cw / k, h: ch / k };
  }
  /* layered island ranges on the horizon, painted small and scaled up so their edges stay soft */
  function buildMountains() {
    // tropical island ranges: hazy blue far away, deep green and sunlit up close, with shaded slopes and forest texture
    const k = .65, w = Math.max(4, Math.round(W * k)), mh = Math.round(Math.min(H * .15, 130)), h = Math.max(4, Math.round(mh * k));
    // ravine texture shared by all ranges: vertical streaks of light and shadow
    const gul = document.createElement('canvas'); gul.width = w; gul.height = h; const gq = gul.getContext('2d'), gi = gq.createImageData(w, h), gd = gi.data, gs = Math.random() * 40;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const n = fbm(x * .06 + gs, y * .018 + gs, 4), i = (y * w + x) * 4; if (n > .5) { gd[i] = 255; gd[i + 1] = 246; gd[i + 2] = 210; gd[i + 3] = (n - .5) * 260; } else { gd[i] = 8; gd[i + 1] = 30; gd[i + 2] = 26; gd[i + 3] = (.5 - n) * 300; } }
    gq.putImageData(gi, 0, 0);
    const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
    const ridge = (n, sharp) => {
      const bumps = Array.from({ length: n }, () => ({ c: Math.random() * 1.2 - .1, w: (.05 + Math.random() * .1) / sharp, h: .62 + Math.random() * .2 }));
      const p1 = Math.random() * 6.28, p2 = Math.random() * 6.28;
      return x => { let v = 0; for (const b of bumps) v = Math.max(v, b.h * Math.exp(-Math.pow((x - b.c) / b.w, 2))); return Math.max(0, v * .9 + .025 * Math.sin(x * 11 + p1) + .015 * Math.sin(x * 37 + p2) + .02 * (fbm(x * 18, p1) - .5)); };
    };
    const ranges = [
      { col: [168, 198, 208], amp: .66, n: 8, sharp: 1, tex: 0, shade: .05 },
      { col: [124, 166, 166], amp: .58, n: 9, sharp: 1.1, tex: .25, shade: .1 },
      { col: [82, 132, 112], amp: .48, n: 10, sharp: 1.25, tex: .6, shade: .16 },
      { col: [52, 104, 72], amp: .36, n: 12, sharp: 1.45, tex: 1, shade: .22 },
    ];
    ranges.forEach(r => {
      const f = ridge(r.n, r.sharp), L = document.createElement('canvas'); L.width = w; L.height = h; const q = L.getContext('2d');
      const top = x => h - f(x / w) * r.amp * h * .95;
      q.fillStyle = rgb(r.col); q.beginPath(); q.moveTo(0, h);
      for (let x = 0; x <= w; x += 1) q.lineTo(x, top(x)); q.lineTo(w, h); q.closePath(); q.fill();
      q.globalCompositeOperation = 'source-atop';
      // light on slopes facing the sun (right), shadow on the others
      for (let x = 0; x <= w; x++) {
        const sl = top(x + 1.5) - top(x - 1.5), t0 = top(x);
        q.fillStyle = sl > 0 ? `rgba(255,248,214,${Math.min(.3, sl * .08) * (r.shade * 4)})` : `rgba(10,30,30,${Math.min(.35, -sl * .1) * (r.shade * 4)})`;
        q.fillRect(x, t0, 1, h - t0);
      }
      // forest canopy texture on the nearer ranges
      if (r.tex) for (let i = 0; i < w * h * .06 * r.tex; i++) {
        const x = Math.random() * w, y = Math.random() * h; if (y < top(x)) continue;
        const lt = Math.random() < .5; q.fillStyle = lt ? `rgba(170,210,140,${.12 * r.tex})` : `rgba(10,40,25,${.18 * r.tex})`;
        q.beginPath(); q.arc(x, y, .6 + Math.random() * 1.1, 0, 6.29); q.fill();
      }
      q.globalAlpha = .25 + r.tex * .45; q.drawImage(gul, 0, 0); q.globalAlpha = 1;
      // sunlit rim along ridges that face the sun
      for (let x = 0; x <= w; x++) { const sl = top(x + 1.5) - top(x - 1.5); if (sl > .15) { q.fillStyle = `rgba(255,250,225,${Math.min(.35, sl * .12) * (.4 + r.tex)})`; q.fillRect(x, top(x), 1, 2); } }
      // atmospheric haze pooling low on each range
      const mist = q.createLinearGradient(0, h * .35, 0, h); mist.addColorStop(0, 'rgba(225,240,244,0)'); mist.addColorStop(1, 'rgba(225,240,244,.5)');
      q.fillStyle = mist; q.fillRect(0, 0, w, h);
      g.drawImage(L, 0, 0);
    });
    mtn = { c, mh };
  }
  /* hadal seabed (Galathea Depth): fine grey sediment in perspective, boulders, sea pigs, brittle stars,
     xenophyophores and glass sponges, revealed only by one pool of light — everything else fades to black */
  function buildFloor() {
    const fh = 520, hz0 = 110, c = document.createElement('canvas'); c.width = Math.round(W * DPR); c.height = Math.round(fh * DPR);
    const g = c.getContext('2d'); g.scale(DPR, DPR);
    const depthK = y => clamp((y - hz0) / (fh - hz0), 0, 1), sc = y => .22 + .78 * depthK(y);
    const lx = W * .58, ly = fh * .62, lr = Math.max(W * .62, 520);
    // sediment plane
    const base = g.createLinearGradient(0, hz0, 0, fh);
    base.addColorStop(0, '#15191b'); base.addColorStop(.35, '#3a3c38'); base.addColorStop(1, '#5c5a52');
    g.fillStyle = base; g.beginPath(); g.moveTo(0, fh);
    for (let x = 0; x <= W + 10; x += 10) g.lineTo(x, hz0 + Math.sin(x * .0035 + 1) * 6 + Math.sin(x * .011) * 2.5);
    g.lineTo(W, fh); g.closePath(); g.fill();
    g.save(); g.clip();
    // mottling: soft darker/lighter patches, flattened by perspective
    for (let i = 0; i < 160; i++) {
      const y = hz0 + Math.pow(Math.random(), .7) * (fh - hz0), k = sc(y), x = R(-40, W + 40), r = R(20, 90) * k;
      const light = Math.random() < .5, gg = g.createRadialGradient(x, y, 0, x, y, r);
      gg.addColorStop(0, light ? 'rgba(150,145,128,.10)' : 'rgba(10,12,12,.16)'); gg.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gg; g.save(); g.translate(x, y); g.scale(1, .32); g.translate(-x, -y); g.beginPath(); g.arc(x, y, r, 0, 6.29); g.fill(); g.restore();
    }
    // tracks left by grazing animals
    for (let i = 0; i < 3; i++) {
      let x = R(0, W), y = R(hz0 + 60, fh - 20), a = R(0, 6.28);
      for (let j = 0; j < 40; j++) { const k = sc(y); g.fillStyle = `rgba(20,20,18,${.25 * k})`; g.beginPath(); g.ellipse(x, y, 1.6 * k, .8 * k, 0, 0, 6.29); g.fill(); a += R(-.25, .25); x += Math.cos(a) * 6 * k; y += Math.sin(a) * 2 * k; }
    }
    const items = [];
    for (let i = 0; i < Math.max(6, W / 140); i++) items.push({ t: 'rock', y: R(hz0 + 10, fh - 10), x: R(0, W) });
    for (let i = 0; i < Math.max(10, W / 90); i++) items.push({ t: 'xeno', y: R(hz0 + 8, fh - 6), x: R(0, W) });
    for (let i = 0; i < Math.max(3, W / 330); i++) items.push({ t: 'pig', y: R(hz0 + 40, fh - 24), x: R(0, W) });
    for (let i = 0; i < Math.max(3, W / 360); i++) items.push({ t: 'star', y: R(hz0 + 40, fh - 14), x: R(0, W) });
    for (let i = 0; i < Math.max(2, W / 500); i++) items.push({ t: 'sponge', y: R(hz0 + 20, hz0 + 120), x: R(0, W) });
    items.sort((p, q) => p.y - q.y);
    for (const it of items) {
      const { x, y } = it, k = sc(y);
      g.save(); g.translate(x, y);
      if (it.t === 'rock') {
        const w = R(18, 70) * k, h = w * R(.35, .6);
        const sh = g.createRadialGradient(w * .2, h * .1, 0, w * .2, h * .1, w * .8); sh.addColorStop(0, 'rgba(0,0,0,.45)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = sh; g.beginPath(); g.ellipse(w * .2, h * .12, w * .8, h * .35, 0, 0, 6.29); g.fill();
        const rg = g.createLinearGradient(0, -h, 0, h * .2); rg.addColorStop(0, '#6b665c'); rg.addColorStop(.5, '#3b3933'); rg.addColorStop(1, '#1c1b18');
        g.fillStyle = rg; g.beginPath(); g.moveTo(-w / 2, 0);
        for (let a = Math.PI; a <= 2 * Math.PI + .01; a += .3) g.lineTo(Math.cos(a) * w / 2 * R(.92, 1.05), Math.sin(a) * h * R(.85, 1.08));
        g.closePath(); g.fill();
      } else if (it.t === 'xeno') {
        const r = R(2, 5) * k; g.fillStyle = 'rgba(150,140,120,.55)'; g.beginPath(); g.ellipse(0, -r * .4, r, r * .7, 0, 0, 6.29); g.fill();
        g.fillStyle = 'rgba(30,28,24,.35)'; g.beginPath(); g.ellipse(r * .2, r * .2, r * 1.1, r * .3, 0, 0, 6.29); g.fill();
      } else if (it.t === 'pig') { // Scotoplanes, the deep-sea "sea pig"
        const L = R(26, 38) * k, dir = Math.random() < .5 ? 1 : -1; g.scale(dir, 1);
        g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(0, L * .12, L * .55, L * .1, 0, 0, 6.29); g.fill();
        const bg = g.createLinearGradient(0, -L * .35, 0, L * .1); bg.addColorStop(0, 'rgba(240,196,200,.9)'); bg.addColorStop(1, 'rgba(170,110,120,.85)');
        g.fillStyle = bg; g.beginPath(); g.ellipse(0, -L * .1, L * .5, L * .2, 0, 0, 6.29); g.fill();
        g.strokeStyle = 'rgba(235,190,195,.85)'; g.lineWidth = Math.max(.6, L * .035); g.lineCap = 'round';
        for (let j = -3; j <= 3; j++) { g.beginPath(); g.moveTo(j * L * .12, L * .05); g.lineTo(j * L * .13, L * .14); g.stroke(); }
        g.beginPath(); g.moveTo(L * .25, -L * .27); g.lineTo(L * .32, -L * .45); g.moveTo(L * .14, -L * .29); g.lineTo(L * .17, -L * .47); g.stroke();
        g.fillStyle = 'rgba(255,235,236,.35)'; g.beginPath(); g.ellipse(-L * .05, -L * .2, L * .3, L * .06, 0, 0, 6.29); g.fill();
      } else if (it.t === 'star') { // brittle star
        const r = R(10, 18) * k; g.strokeStyle = 'rgba(205,190,170,.8)'; g.lineWidth = Math.max(.6, r * .1); g.lineCap = 'round';
        const a0 = R(0, 6.28); for (let j = 0; j < 5; j++) { const a = a0 + j * 1.2566, c1 = R(-.6, .6); g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(Math.cos(a + c1) * r * .6, Math.sin(a + c1) * r * .6 * .35, Math.cos(a) * r, Math.sin(a) * r * .35); g.stroke(); }
        g.fillStyle = 'rgba(215,200,180,.9)'; g.beginPath(); g.ellipse(0, 0, r * .16, r * .08, 0, 0, 6.29); g.fill();
      } else { // glass sponge on a stalk
        const h = R(40, 70) * k; g.strokeStyle = 'rgba(200,205,200,.55)'; g.lineWidth = Math.max(.6, 1.4 * k);
        g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(h * .1, -h * .5, 0, -h); g.stroke();
        const vg = g.createLinearGradient(0, -h * 1.5, 0, -h); vg.addColorStop(0, 'rgba(220,225,220,.55)'); vg.addColorStop(1, 'rgba(200,205,200,.25)');
        g.fillStyle = vg; g.beginPath(); g.moveTo(-h * .08, -h); g.quadraticCurveTo(-h * .2, -h * 1.3, -h * .14, -h * 1.5); g.lineTo(h * .14, -h * 1.5); g.quadraticCurveTo(h * .2, -h * 1.3, h * .08, -h); g.closePath(); g.fill();
      }
      g.restore();
    }
    g.restore();
    // fine grain
    try {
      const id = g.getImageData(0, 0, c.width, c.height), d = id.data;
      for (let i = 0; i < d.length; i += 4) { if (!d[i + 3]) continue; const n = (Math.random() - .5) * 22; d[i] += n; d[i + 1] += n; d[i + 2] += n * .9; }
      g.putImageData(id, 0, 0);
    } catch (e) {}
    // light falloff: one pool of light, black beyond it, and the far floor lost in the dark water
    g.save(); g.setTransform(DPR, 0, 0, DPR, 0, 0); g.globalCompositeOperation = 'source-atop';
    const fall = g.createRadialGradient(lx, ly, 0, lx, ly, lr);
    fall.addColorStop(0, 'rgba(2,6,10,0)'); fall.addColorStop(.35, 'rgba(2,6,10,.25)'); fall.addColorStop(.75, 'rgba(2,6,10,.8)'); fall.addColorStop(1, 'rgba(2,6,10,.97)');
    g.fillStyle = fall; g.fillRect(0, 0, W, fh);
    g.globalCompositeOperation = 'destination-out';
    const far = g.createLinearGradient(0, hz0 - 10, 0, hz0 + 150); far.addColorStop(0, 'rgba(0,0,0,1)'); far.addColorStop(.5, 'rgba(0,0,0,.45)'); far.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = far; g.fillRect(0, 0, W, hz0 + 150);
    g.restore();
    floorImg = { c, fh, hz0, lx };
  }
  function fitSurface() {
    // place the waterline so the whole hero (sky text + monogram, then date, countdown, cue) sits centred on screen
    const sky = document.querySelector('.sky-part'), sea = document.querySelector('.sea-part'); if (!sky || !sea) return;
    const sum = el => { const k = [...el.children], g = parseFloat(getComputedStyle(el).rowGap) || 0; return k.reduce((h, c) => h + c.offsetHeight, 0) + g * (k.length - 1); };
    const skyH = sum(sky), seaH = sum(sea), total = skyH + 24 + 28 + seaH;
    const top = clamp((innerHeight - total) * .38, 76, 130);   // content sits a little above centre, never more than 130px of empty sky above it
    SURF = clamp((top + skyH + 24) / innerHeight, .3, .6);
    document.documentElement.style.setProperty('--surf', SURF);
    sizeSky();   // the waterline moved (fonts loaded): resize the sky canvas to match
  }
  function sizeSky() {
    if (!H) return;
    const h = Math.ceil(H * SURF + 130);   // waterline + wave crests + the soft light under the surface
    if (h === SKY_H && skyCv.width === Math.round(W * DPR)) return;
    SKY_H = h; skyCv.width = Math.round(W * DPR); skyCv.height = Math.round(SKY_H * DPR); skyCv.style.height = SKY_H + 'px';
    skyCtx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  function resize() {
    if (!alive) return;
    fitSurface();
    DPR = Math.min(devicePixelRatio || 1, 1.5); W = innerWidth; H = innerHeight;
    const MD = matchMedia('(pointer:coarse)').matches ? 1 : DPR;   // the underwater backdrop is soft: 1x on touch screens
    cv.width = Math.round(W * MD); cv.height = Math.round(H * MD); mainCtx.setTransform(MD, 0, 0, MD, 0, 0);
    sizeSky();
    build(); layout();
  }
  function layout() {
    if (!alive) return;
    docH = document.documentElement.scrollHeight; lastMax = -1;
    maxScroll = Math.max(1, docH - innerHeight);
    anchors = sections.map((sec, i) => {
      const s = i === 0 ? 0 : i === sections.length - 1 ? maxScroll : sec.offsetTop + Math.min(sec.offsetHeight, H) / 2 - H / 2 + (sec.offsetHeight > H ? H * .15 : 0);
      return { s: clamp(s, 0, maxScroll), d: +sec.dataset.depth, el: sec, label: sec.dataset.label };
    });
    for (let i = 1; i < anchors.length; i++) anchors[i].s = Math.max(anchors[i].s, anchors[i - 1].s + 1);
    RX = line.getBoundingClientRect().left;
    diverH = diver.offsetHeight || 52; lastTh = -1;
    buildMarks(); shownM = -1;
    buildWorld();
  }

  /* ---------- sky, waves, light ---------- */
  const WV = [[.0058, 1, .85, 0], [.0109, .55, 1.25, 1.7], [.0187, .32, 1.75, 4.1], [.0331, .16, 2.45, 2.3], [.061, .07, 3.4, 5.2]];
  function wave(x, t) {
    const A = 6.5 * (.45 + .55 * Math.min(1, W / 1000)); let y = 0;
    for (const [k, a, w, p] of WV) { const th = k * x - w * t + p; y -= a * (Math.cos(th) + .3 * Math.cos(2 * th)); }
    return y * A * .62;
  }
  const yOf = (s, sy) => s - sy + H * SURF;
  function drawWater(sy) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    for (let i = 0; i <= 10; i++) { const y = H * i / 10; g.addColorStop(i / 10, rgb(waterRGB(depthAt(sy + y - H * SURF)))); }
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  /* god rays: many thin shafts fanning down from the sun's direction, painted at quarter size so their edges blur */
  const rayCv = document.createElement('canvas'), rayCtx = rayCv.getContext('2d');
  const RAYS = Array.from({ length: 18 }, (_, i) => ({ u: (i + Math.random() * .8) / 30, w: .004 + Math.random() * .016, ph: Math.random() * 100, len: .55 + Math.random() * .45 }));
  function drawRays(sy, t, wl) {
    const dTop = Math.max(0, depthAt(sy - H * SURF));
    const a = Math.pow(clamp(1 - dTop / 120, 0, 1), 1.6); if (a <= .01) return;
    const q = .5, rw = Math.max(2, Math.round(W * q)), rh = Math.max(2, Math.round(H * q));
    if (rayCv.width !== rw || rayCv.height !== rh) { rayCv.width = rw; rayCv.height = rh; }
    const g = rayCtx; g.setTransform(q, 0, 0, q, 0, 0); g.clearRect(0, 0, W, H);
    // every shaft points back up toward the sun (upper right), so they all lean the same way and spread with depth
    const y0 = Math.max(wl + 4, -10), ox = W * .78 + H * .35, oy = y0 - H * 1.3;
    for (const r of RAYS) {
      const flick = vnoise(r.ph + t * .3, r.u * 9) * vnoise(r.ph * 2 + t * .18, 3.1);
      const al = .6 * flick * flick; if (al < .02) continue;
      const x0 = (-.25 + r.u * 1.4) * W + Math.sin(t * .05 + r.ph) * 8, w0 = r.w * W * .9;
      const len = H * r.len, yb = y0 + len, k = (yb - oy) / (y0 - oy), dx = (x0 - ox) * (k - 1);
      const gr = g.createLinearGradient(0, y0, 0, yb);
      gr.addColorStop(0, 'rgba(225,248,245,0)'); gr.addColorStop(.06, `rgba(225,248,245,${al})`);
      gr.addColorStop(.4, `rgba(210,240,240,${al * .45})`); gr.addColorStop(1, 'rgba(210,240,240,0)');
      g.fillStyle = gr; g.beginPath();
      g.moveTo(x0 - w0 / 2, y0); g.lineTo(x0 + w0 / 2, y0);
      g.lineTo(x0 + dx + w0 * k / 2, yb); g.lineTo(x0 + dx - w0 * k / 2, yb); g.closePath(); g.fill();
    }
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a * .16; ctx.imageSmoothingEnabled = true;
    ctx.drawImage(rayCv, 0, 0, W, H); ctx.restore();
  }
  const mtnH = () => mtn ? mtn.mh * .55 : 0;
  function drawSky(wl, t) {
    if (wl <= -30) return;
    const hz = wl - Math.max(14, H * .045);
    ctx.save(); ctx.beginPath(); ctx.moveTo(0, -5);
    for (let x = 0; x <= W + 10; x += 10) ctx.lineTo(x, wl + wave(x, t)); ctx.lineTo(W, -5); ctx.closePath(); ctx.clip();
    const sk = ctx.createLinearGradient(0, hz - H * .55, 0, hz);
    sk.addColorStop(0, '#2f7fd0'); sk.addColorStop(.35, '#5aa3e0'); sk.addColorStop(.7, '#a6cfee'); sk.addColorStop(.9, '#d9ecf5'); sk.addColorStop(1, '#eef5f2');
    ctx.fillStyle = sk; ctx.fillRect(0, -5, W, hz + 5);
    const sx = W * .78, syy = hz - H * .3;
    // sun: wide sky brightening, a soft corona, then a small blown-out disc
    const glow = ctx.createRadialGradient(sx, syy, 0, sx, syy, Math.max(W, H) * .7);
    glow.addColorStop(0, 'rgba(255,250,232,.42)'); glow.addColorStop(.25, 'rgba(255,248,230,.16)'); glow.addColorStop(1, 'rgba(255,248,230,0)');
    ctx.fillStyle = glow; ctx.fillRect(0, -5, W, hz + 5);
    const sr = Math.max(9, Math.min(20, H * .022));
    const cor = ctx.createRadialGradient(sx, syy, sr * .6, sx, syy, sr * 9);
    cor.addColorStop(0, 'rgba(255,255,248,.95)'); cor.addColorStop(.12, 'rgba(255,253,236,.6)'); cor.addColorStop(.4, 'rgba(255,248,225,.16)'); cor.addColorStop(1, 'rgba(255,248,225,0)');
    ctx.fillStyle = cor; ctx.beginPath(); ctx.arc(sx, syy, sr * 9, 0, 6.29); ctx.fill();
    const disc = ctx.createRadialGradient(sx, syy, 0, sx, syy, sr);
    disc.addColorStop(0, '#ffffff'); disc.addColorStop(.85, '#fffef6'); disc.addColorStop(1, 'rgba(255,253,240,0)');
    ctx.fillStyle = disc; ctx.beginPath(); ctx.arc(sx, syy, sr, 0, 6.29); ctx.fill();
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    for (const c of cirrus) {
      const cx = ((c.x + t * c.v) % (W + c.w * 2)) - c.w, cy = hz - (hz + 5) * c.y;
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(c.r); ctx.scale(1, .08);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, c.w / 2); g.addColorStop(0, 'rgba(255,255,255,.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, c.w / 2, 0, 6.29); ctx.fill(); ctx.restore();
    }
    for (const c of clouds) {
      const cx = ((c.x + t * c.v) % (W + c.img.w * 2)) - c.img.w, cy = hz - mtnH() - (hz - mtnH()) * c.y - c.img.h;
      ctx.globalAlpha = c.a; ctx.drawImage(c.img.c, cx, cy, c.img.w, c.img.h); ctx.globalAlpha = 1;
    }
    if (mtn) { ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; ctx.drawImage(mtn.c, 0, hz - mtn.mh + 2, W, mtn.mh); }
    drawSeaSurface(hz, wl, t, sx);
    ctx.restore();
    // waterline meniscus + crest foam
    ctx.save();
    const pts = []; for (let x = -8; x <= W + 8; x += 4) pts.push([x, wl + wave(x, t)]);
    ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
    for (let i = pts.length - 1; i >= 0; i--) ctx.lineTo(pts[i][0], pts[i][1] + 7);
    ctx.closePath();
    const mg = ctx.createLinearGradient(0, wl - 10, 0, wl + 16); mg.addColorStop(0, 'rgba(210,244,248,.6)'); mg.addColorStop(.35, 'rgba(40,120,150,.35)'); mg.addColorStop(1, 'rgba(40,120,150,0)');
    ctx.fillStyle = mg; ctx.fill();
    // the face of each wave just above the line is a touch darker where it turns away from the sky
    ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
    for (let i = pts.length - 1; i >= 0; i--) ctx.lineTo(pts[i][0], pts[i][1] - 9);
    ctx.closePath(); const face = ctx.createLinearGradient(0, wl - 14, 0, wl + 4); face.addColorStop(0, 'rgba(20,90,120,0)'); face.addColorStop(1, 'rgba(20,90,120,.28)');
    ctx.fillStyle = face; ctx.fill();
    ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
    ctx.strokeStyle = 'rgba(250,252,250,.4)'; ctx.lineWidth = 1; ctx.stroke();
    const crest = -6.5 * (.45 + .55 * Math.min(1, W / 1000)) * .62 * 1.1;
    for (let i = 1; i < pts.length - 1; i++) {
      const [x, y] = pts[i]; if (y - wl < crest && y <= pts[i - 1][1] && y <= pts[i + 1][1]) {
        for (let k = 0; k < 6; k++) { const fx = x + Math.sin(k * 2.3 + x) * 7, fy = y + Math.abs(Math.cos(k * 1.7 + x)) * 3; ctx.fillStyle = `rgba(255,255,255,${.35 + .3 * Math.sin(t * 3 + k + x)})`; ctx.beginPath(); ctx.arc(fx, fy, .8 + (k % 3) * .5, 0, 6.29); ctx.fill(); }
      }
    }
    ctx.restore();
  }
  function drawUnderside(wl, t) {
    if (wl < -120 || wl > H) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createLinearGradient(0, wl, 0, wl + 90); g.addColorStop(0, 'rgba(180,235,245,.16)'); g.addColorStop(1, 'rgba(180,235,245,0)');
    ctx.fillStyle = g; ctx.fillRect(0, wl, W, 90);
    ctx.restore();
  }
  function drawBuoy(wl, t) {
    if (wl < -40 || wl > H + 40) return;
    const x = ropeX(), y = wl + wave(x, t) - 3, tilt = (wave(x + 6, t) - wave(x - 6, t)) * .04;
    ctx.save(); ctx.translate(x, y); ctx.rotate(tilt);
    const g = ctx.createRadialGradient(-5, -6, 1, 0, 0, 14); g.addColorStop(0, '#ffd2a0'); g.addColorStop(.5, '#f08a3c'); g.addColorStop(1, '#a8501d');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, 13, 10, 0, 0, 6.29); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fillRect(-13, -1.5, 26, 3);
    ctx.strokeStyle = 'rgba(30,30,30,.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(0, -15); ctx.stroke();
    ctx.restore();
    // its reflection-ish shadow just below the surface
    ctx.fillStyle = 'rgba(8,40,55,.25)'; ctx.beginPath(); ctx.ellipse(x, wl + 9, 12, 3, 0, 0, 6.29); ctx.fill();
  }

  /* ---------- life ---------- */
  function drawFish(x, y, len, dir, col, hl, t, ph) {
    ctx.save(); ctx.translate(x, y); ctx.scale(dir, 1);
    const L = len, wag = Math.sin(t * 6 + ph), bend = wag * L * .05;
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(L * .5, 0);
    ctx.bezierCurveTo(L * .42, -L * .17, L * .05, -L * .2, -L * .3, -L * .07 + bend * .4);
    ctx.quadraticCurveTo(-L * .4, -L * .03 + bend, -L * .44, bend);
    ctx.lineTo(-L * .62, -L * .17 + bend * 1.6); ctx.quadraticCurveTo(-L * .54, bend, -L * .62, L * .15 + bend * 1.6);
    ctx.lineTo(-L * .44, bend);
    ctx.quadraticCurveTo(-L * .4, L * .03 + bend, -L * .3, L * .06 + bend * .4);
    ctx.bezierCurveTo(L * .05, L * .16, L * .4, L * .14, L * .5, 0);
    ctx.fill();
    ctx.beginPath(); ctx.moveTo(L * .08, -L * .17); ctx.lineTo(-L * .1, -L * .27); ctx.lineTo(-L * .16, -L * .13); ctx.fill();
    if (hl > 0) {
      const g = ctx.createLinearGradient(0, -L * .18, 0, L * .16);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(.55, `rgba(225,245,255,${hl * (.7 + .3 * Math.sin(t * 2 + ph))})`); g.addColorStop(1, `rgba(225,245,255,${hl * .4})`);
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(L * .08, L * .02, L * .4, L * .11, 0, 0, 6.29); ctx.fill();
    }
    ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.beginPath(); ctx.arc(L * .36, -L * .03, L * .03, 0, 6.29); ctx.fill();
    ctx.restore();
  }
  function drawLantern(sc, y, t) {
    for (const f of sc.fish) {
      const x = sc.x + f.ox + Math.sin(t * .7 + f.ph) * 6, yy = y + f.oy + Math.cos(t + f.ph) * 4;
      drawFish(x, yy, 9, sc.dir, 'rgba(6,14,24,.9)', 0, t, f.ph);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 3; k++) { const px = x + sc.dir * (2 - k * 2.4), a = .45 + .4 * Math.sin(t * 2 + f.ph + k); ctx.fillStyle = `rgba(140,220,255,${a})`; ctx.fillRect(px, yy + 1.3, 1.2, 1.2); }
      ctx.restore();
    }
  }
  function drawAngler(a, y, t) {
    const x = a.x + Math.sin(t * .4) * 6, yy = y + Math.sin(t * .7) * 6, lx = x + a.dir * 34, ly = yy - 26;
    ctx.save();
    ctx.fillStyle = 'rgba(10,12,16,.95)'; ctx.beginPath(); ctx.ellipse(x, yy, 30, 20, 0, 0, 6.29); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x - a.dir * 26, yy); ctx.lineTo(x - a.dir * 44, yy - 12); ctx.lineTo(x - a.dir * 44, yy + 12); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(50,52,60,.9)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x + a.dir * 10, yy - 18); ctx.quadraticCurveTo(x + a.dir * 20, ly - 14, lx, ly); ctx.stroke();
    ctx.globalCompositeOperation = 'lighter';
    const p = .75 + .25 * Math.sin(t * 2.3), g = ctx.createRadialGradient(lx, ly, 0, lx, ly, 60);
    g.addColorStop(0, `rgba(200,240,255,${.9 * p})`); g.addColorStop(.08, `rgba(140,210,255,${.45 * p})`); g.addColorStop(1, 'rgba(140,210,255,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(lx, ly, 60, 0, 6.29); ctx.fill();
    ctx.restore();
  }
  function drawJelly(j, y, t) {
    const p = 1 + .09 * Math.sin(t * 1.6 + j.ph), x = j.x + Math.sin(t * .3 + j.ph) * 14, r = j.r, yy = y + Math.sin(t * .45 + j.ph) * 10;
    ctx.save(); ctx.translate(x, yy); ctx.globalCompositeOperation = 'lighter';
    const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 3); glow.addColorStop(0, rgb(j.hue, .14)); glow.addColorStop(1, rgb(j.hue, 0));
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(0, 0, r * 3, 0, 6.29); ctx.fill();
    const g = ctx.createRadialGradient(0, -r * .3, 0, 0, 0, r * 1.2); g.addColorStop(0, rgb(j.hue, .42)); g.addColorStop(1, rgb(j.hue, .07));
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, r * p, r * .8 / p, 0, Math.PI, 2 * Math.PI); ctx.quadraticCurveTo(0, r * .25, -r * p, 0); ctx.fill();
    ctx.strokeStyle = rgb(j.hue, .3); ctx.lineWidth = 1;
    for (let k = 0; k < 6; k++) { const tx = (-.7 + k * .28) * r * p; ctx.beginPath(); ctx.moveTo(tx, r * .05); for (let s = 1; s <= 6; s++) ctx.lineTo(tx + Math.sin(t * 1.3 + k + s * .7 + j.ph) * 4 * s * .4, s * r * .42); ctx.stroke(); }
    ctx.restore();
  }
  function drawFloor(fy, t) {
    if (!floorImg || fy > H + 40) return;
    const top = fy - floorImg.hz0;
    // a soft cone of light from above, the only light this deep
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const bx = floorImg.lx, gy = top + floorImg.hz0;
    ctx.translate(bx, gy); ctx.scale(1.6, 1);
    const cone = ctx.createRadialGradient(0, 0, 0, 0, 0, H * .55);
    cone.addColorStop(0, 'rgba(150,180,190,.10)'); cone.addColorStop(.5, 'rgba(150,180,190,.035)'); cone.addColorStop(1, 'rgba(150,180,190,0)');
    ctx.fillStyle = cone; ctx.beginPath(); ctx.arc(0, 0, H * .55, 0, 2 * Math.PI); ctx.fill();
    ctx.restore();
    ctx.drawImage(floorImg.c, 0, top, W, floorImg.fh);
    // sediment stirred up, drifting through the light
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 40; i++) {
      const x = bx + Math.sin(i * 12.99) * W * .35 + Math.sin(t * .2 + i) * 12, y = top + floorImg.hz0 - 20 + ((i * 37.7 + t * 4) % 160) - 80;
      ctx.fillStyle = `rgba(220,225,215,${.12 + .1 * Math.sin(t + i)})`; ctx.fillRect(x, y, 1.2, 1.2);
    }
    ctx.restore();
  }

  /* marine snow, rising bubbles and sparks: screen-space and time-driven, so scrolling never repaints them */
  function drawSnow(t, dt, sy, wl) {
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    const dMid = Math.max(0, depthAt(sy)), snowA = clamp(.16 + dMid / 1500, .16, .5);
    for (const p of snow) {
      const y = ((p.y - t * 7 * p.z) % (H + 40) + (H + 40)) % (H + 40) - 20; if (y < wl + 10) continue;
      ctx.fillStyle = `rgba(230,242,240,${snowA * p.z})`; ctx.beginPath(); ctx.arc(p.x + Math.sin(t * .4 + p.ph) * 6, y, p.r * p.z + .3, 0, 6.29); ctx.fill();
    }
    if (!RM && dMid < 120 && Math.random() < dt * 2) bubbles.push({ x: R(0, W), y: H + 10, r: R(1.5, 4), v: R(40, 90), ph: R(0, 6.28) });
    for (let i = bubbles.length - 1; i >= 0; i--) {
      const b = bubbles[i]; b.y -= b.v * dt; const x = b.x + Math.sin(t * 3 + b.ph) * 3;
      if (b.y < Math.max(wl, -10)) { bubbles.splice(i, 1); continue; }
      const bg = ctx.createRadialGradient(x - b.r * .3, b.y - b.r * .3, 0, x, b.y, b.r);
      bg.addColorStop(0, 'rgba(255,255,255,.08)'); bg.addColorStop(.75, 'rgba(220,245,250,.12)'); bg.addColorStop(1, 'rgba(235,252,255,.6)');
      ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(x, b.y, b.r, 0, 6.29); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.arc(x - b.r * .35, b.y - b.r * .35, b.r * .22, 0, 6.29); ctx.fill();
    }
    ctx.globalCompositeOperation = 'lighter';
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i]; s.life -= dt; if (s.life <= 0) { sparks.splice(i, 1); continue; }
      s.x += s.vx * dt; s.y += s.vy * dt; const a = s.life / s.max;
      const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, 8); g.addColorStop(0, `rgba(170,255,240,${.85 * a})`); g.addColorStop(1, 'rgba(170,255,240,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(s.x, s.y, 8, 0, 6.29); ctx.fill();
    }
    ctx.restore();
  }

  /* ---------- frame ---------- */
  let last = performance.now(), T = 0, lastSY = scrollY, idleT = 0, dir = 'idle';
  function frame(now) {
    if (!alive) return;
    const dt = Math.min(.05, (now - last) / 1000); last = now; if (!RM) T += dt;
    const t = T, sy = scrollY, wl = H * SURF - sy;
    drawAcc += dt;
    if (drawAcc >= 1 / 30) {          // all animation runs on this timer, never in response to scrolling
      const step = drawAcc; drawAcc = 0;
      if (skyCv._vis) {               // sky, sea surface, waves, buoy: the waterline is fixed in page coordinates
        const swl = H * SURF;
        ctx = skyCtx; ctx.clearRect(0, 0, W, SKY_H);
        drawSky(swl, t); drawUnderside(swl, t); drawBuoy(swl, t);
      }
      for (const a of actors) if (a.cv._vis) { ctx = a.cx; ctx.clearRect(0, 0, W, a.bandH); a.render(a.bandH / 2, t, step); }
      ctx = mainCtx; drawSnow(t, step, sy, wl);
    }
    updateLine(sy, dt, wl);
    requestAnimationFrame(frame);
  }

  /* ---------- the freediving line + diver ---------- */
  const TITLES = { surface: 'Welcome', entourage: 'Entourage', details: 'Details', gallery: 'Gallery', rsvp: 'RSVP', faqs: 'FAQs', footer: 'See you at depth' };
  const zoneOf = () => { let cur = anchors[0]; for (const a of anchors) if (scrollY >= a.s - H * .35) cur = a; return cur ? TITLES[cur.el.id] || '' : ''; };   // section the diver is in
  const line = $('line'), fill = $('fill'), diver = $('diver'), tag = $('depth-tag'), trail = $('trail');
  let trailV = 0, upV = 0, lastTrail = -1, bubT = 0;   // glow trail while descending, bubbles while ascending
  const legL = $('legL'), legR = $('legR'), finL = $('finL'), finR = $('finR');
  let marks = [], shownM = -1, kPh = 0, kAmp = .3, kPer = 4;
  let RX = 30; const ropeX = () => RX;
  let diverH = 52, lastTop = -1, lastTh = -1, lastFill = -1, heightChk = 0, docH = 0, lastMax = -1;   // cached so the per-frame update never reads layout
  function buildMarks() {
    marks.forEach(m => m.remove()); marks = [];
    for (const a of anchors) {
      if (!a.d) continue;
      const b = document.createElement('button'); b.className = 'mark'; b.type = 'button';
      b.setAttribute('aria-label', `Go to ${a.d.toLocaleString('en-US')} metres`);
      b.innerHTML = `<i></i><span>${a.d.toLocaleString('en-US')} m · ${a.el.querySelector('h2,.big') ? a.el.querySelector('h2,.big').textContent.replace('See you at depth.','See you at depth') : a.label}</span>`;
      b.onclick = () => scrollTo({ top: a.s, behavior: RM ? 'auto' : 'smooth' });
      b._a = a; line.appendChild(b); marks.push(b);
    }
  }
  function updateLine(sy, dt, wl) {
    // reads first, and only twice a second: reading layout after writing styles forces a reflow every frame
    if ((heightChk += dt) > .5 || !docH) {
      heightChk = 0;
      const live = document.documentElement.scrollHeight;
      if (docH && Math.abs(live - docH) > 2) layout();                      // page height changed (images loaded): re-pin the depths
      docH = live;
    }
    /* The real bottom of the page depends on the CURRENT screen height. On phones the address bar hides while you
       scroll down, so the screen grows taller than when the scene was measured (H). Using the live height keeps the
       end of the line, the diver and the last dot pinned together at the seabed without having to scroll again. */
    const vh = innerHeight, maxS = Math.max(1, docH - vh);
    if (Math.abs(maxS - lastMax) > 1) {                                    // re-pin the seabed anchor to the true bottom
      lastMax = maxS; maxScroll = maxS;
      const lastA = anchors[anchors.length - 1]; if (lastA) lastA.s = maxS;
      for (let i = anchors.length - 2; i >= 1; i--) anchors[i].s = Math.min(anchors[i].s, anchors[i + 1].s - 1);
      lastTh = -1;
    }
    const top = Math.round(clamp(wl, 0, vh * .62)), th = vh - top - 36;
    if (top !== lastTop) { lastTop = top; line.style.top = top + 'px'; }
    const atEnd = sy >= maxS - 2;
    const f = atEnd ? 1 : clamp(sy / maxS, 0, 1), m = atEnd ? anchors[anchors.length - 1].d : Math.max(0, depthAt(sy));
    const atSurf = clamp(1 - m / 3, 0, 1), dh = diverH;
    const y = f * th;
    const fy = Math.round(y * 2) / 2; if (fy !== lastFill) { lastFill = fy; fill.style.height = y + 'px'; }
    if (th !== lastTh) { lastTh = th; for (const b of marks) b.style.top = (Math.min(b._a.s, maxS) / maxS * th) + 'px'; }   // marks only move when the line's length changes
    const bob = atSurf * wave(ropeX(), T) * .8 + (1 - atSurf) * (dir === 'idle' && !RM ? Math.sin(T * .9) * 2 : 0);
    diver.style.transform = `translateY(${y - dh * lerp(.5, .2, atSurf) + bob}px)`;
    // direction: head-down while descending, head-up while ascending or resting at the surface
    const dy = sy - lastSY; lastSY = sy;
    if (Math.abs(dy) > .5) { dir = dy > 0 ? 'down' : 'up'; idleT = 0; } else if ((idleT += dt) > .5) dir = 'idle';
    if (dir === 'down') diver.classList.add('down'); else if (dir === 'up' || atSurf > .5) diver.classList.remove('down');
    // a soft glow streams behind the diver while descending: longer and brighter the faster you scroll
    const vel = dt > 0 ? dy / dt : 0;
    trailV = lerp(trailV, Math.max(0, vel), Math.min(1, dt * (vel > trailV ? 8 : 2.5)));
    const tl = RM || atSurf > .5 ? 0 : Math.round(clamp(trailV * .16, 0, vh * .2));
    if (trail && (tl > 1 || lastTrail > 1)) {
      lastTrail = tl;
      trail.style.transform = `translateY(${y - tl}px)`; trail.style.height = tl + 'px';
      trail.style.opacity = String(clamp(tl / 50, 0, 1));
    }
    // gentle bubbles rise from the diver while ascending (they pop at the waterline)
    upV = lerp(upV, Math.max(0, -vel), Math.min(1, dt * (-vel > upV ? 8 : 2)));   // smoothed: scroll events arrive in bursts
    if (!RM && upV > 40 && atSurf < .5) {
      bubT += dt * clamp(upV / 70, 2, 12);
      while (bubT > 1) {
        bubT -= 1;
        bubbles.push({ x: ropeX() + R(-3, 7), y: top + y - dh * .45 + R(-4, 4), r: R(1.4, 3.6), v: R(55, 115), ph: R(0, 6.28) });
      }
      if (bubbles.length > 160) bubbles.splice(0, bubbles.length - 160);
    } else bubT = Math.min(bubT, .6);
    // slow, long freediving kick from the hips; fins flex behind the stroke
    const moving = dir !== 'idle';
    kAmp = lerp(kAmp, RM ? 0 : moving ? 1 : atSurf > .5 ? .25 : .4, Math.min(1, dt * 2.5));
    kPer = lerp(kPer, moving ? 2.2 : 4.4, Math.min(1, dt * 2));
    kPh += dt * 6.2832 / kPer;
    const s = Math.sin(kPh), sf = Math.sin(kPh - .9);
    legL.setAttribute('transform', `rotate(${(-1 + 11 * kAmp * s).toFixed(2)} 46 118)`);
    legR.setAttribute('transform', `rotate(${(-1 - 11 * kAmp * s).toFixed(2)} 46 118)`);
    finL.setAttribute('transform', `rotate(${(-2 + 18 * kAmp * sf).toFixed(2)} 45 178)`);
    finR.setAttribute('transform', `rotate(${(-2 - 18 * kAmp * sf).toFixed(2)} 45 178)`);
    const mr = Math.round(m);
    const zt = zoneOf(); if (mr !== shownM || zt !== tag._z) { shownM = mr; tag._z = zt; tag.firstChild.textContent = mr.toLocaleString('en-US') + ' m'; tag.lastChild.textContent = ' · ' + zt; for (const b of marks) b.classList.toggle('on', m >= b._a.d - .5); }
  }

  addEventListener('pointermove', e => {
    if (RM || depthAt(scrollY + e.clientY - H * SURF) < 600) return;
    for (let k = 0; k < 2; k++) sparks.push({ x: e.clientX + R(-6, 6), y: e.clientY + R(-6, 6), vx: R(-12, 12), vy: R(-14, 6), life: R(.8, 1.6), max: 1.6 });
    if (sparks.length > 220) sparks.splice(0, sparks.length - 220);
  }, { passive: true });
  let rz; const touch = matchMedia('(pointer:coarse)');
  addEventListener('resize', () => {
    clearTimeout(rz);
    rz = setTimeout(() => { if (touch.matches && innerWidth === W && Math.abs(innerHeight - H) < 180) return; resize(); }, 120);   // address bar show/hide: keep the scene as is
  });
  let lz; new ResizeObserver(() => { clearTimeout(lz); lz = setTimeout(layout, 100); }).observe(document.querySelector('main'));
  document.fonts && document.fonts.ready.then(() => { fitSurface(); layout(); });
  addEventListener('load', layout);
  resize(); requestAnimationFrame(frame);

  /* ---------- countdown ---------- */
  const WEDDING = new Date(opts.weddingDate);
  const pad = n => String(n).padStart(2, '0');
  function tick() {
    let d = Math.max(0, WEDDING - new Date());
    const D = Math.floor(d / 864e5); d -= D * 864e5; const h = Math.floor(d / 36e5); d -= h * 36e5; const mi = Math.floor(d / 6e4); d -= mi * 6e4;
    $('cd-d').textContent = pad(D); $('cd-h').textContent = pad(h); $('cd-m').textContent = pad(mi); $('cd-s').textContent = pad(Math.floor(d / 1000));
  }
  tick(); setInterval(tick, 1000);

  /* ---------- hero monogram: video ink drawn in deep-sea navy ---------- */
  const mv = $('mono-video'), mc = $('mono-canvas'), mctx = mc.getContext('2d', { willReadFrequently: true }), still = $('mono-still');
  let monoOk = true;
  function useStill() { if (!monoOk) return; monoOk = false; mc.hidden = true; still.hidden = false; }
  on(mv, 'error', useStill);
  let lastMono = 0;
  function drawMono() {
    if (!monoOk) return;
    const nowM = performance.now();
    if (document.hidden || scrollY > H * 1.1 || nowM - lastMono < 33) { requestAnimationFrame(drawMono); return; }   // ~30fps, and only while the hero is in view
    lastMono = nowM;
    if (mv.readyState >= 2) {
      try {
        mctx.drawImage(mv, 0, 0, 752, 304);
        const fr = mctx.getImageData(0, 0, 752, 304), d = fr.data;
        for (let i = 0; i < d.length; i += 4) { const l = (d[i] + d[i + 1] + d[i + 2]) / 3; d[i] = 12; d[i + 1] = 48; d[i + 2] = 64; d[i + 3] = l; }
        mctx.putImageData(fr, 0, 0);
        if (mc.hidden) { mc.hidden = false; still.hidden = true; }
      } catch (e) { useStill(); return; }
    }
    requestAnimationFrame(drawMono);
  }
  function startMono() {
    if (RM) { useStill(); return; }
    const p = mv.play(); if (p && p.catch) p.catch(useStill);
    setTimeout(() => { if (mv.readyState < 2) useStill(); }, 3000);
    requestAnimationFrame(drawMono);
  }

  /* ---------- opening cover: tap the monogram, the water tears open ---------- */
  const cover = $('cover'), flash = $('flash');
  let opened = false;
  document.documentElement.classList.add('locked');
  const music = $('bg-music'), musicBtn = $('music-toggle');
  function startMusic() { // must run inside the tap itself, or browsers block sound
    music.volume = 0; const p = music.play();
    if (p && p.then) p.then(() => { musicBtn.hidden = false; let v = 0; const f = setInterval(() => { v = Math.min(.5, v + .025); music.volume = v; if (v >= .5) clearInterval(f); }, 80); }).catch(() => { musicBtn.hidden = false; musicBtn.classList.add('muted'); });
  }
  on(musicBtn, 'click', () => {
    if (music.paused) { music.muted = false; music.volume = .5; music.play().catch(() => {}); musicBtn.classList.remove('muted'); musicBtn.setAttribute('aria-pressed', 'false'); musicBtn.setAttribute('aria-label', 'Mute music'); return; }
    music.muted = !music.muted; musicBtn.classList.toggle('muted', music.muted);
    musicBtn.setAttribute('aria-pressed', String(music.muted)); musicBtn.setAttribute('aria-label', music.muted ? 'Unmute music' : 'Mute music');
  });
  let pausedForHidden = false;
  docOn('visibilitychange', () => {
    if (document.hidden) { if (!music.paused) { music.pause(); pausedForHidden = true; } }
    else if (pausedForHidden) { pausedForHidden = false; music.play().catch(() => {}); }
  });
  addEventListener('pagehide', () => music.pause());
  function openCover() {
    if (opened) return; opened = true;
    startMusic();
    const w = $('mono-wrap').getBoundingClientRect(), cx = w.left + w.width / 2, cy = w.top + w.height / 2, maxR = Math.hypot(innerWidth, innerHeight);
    cover.style.setProperty('--cx', cx + 'px'); cover.style.setProperty('--cy', cy + 'px');
    if (RM) { finish(); return; }
    cover.classList.add('charging');
    setTimeout(() => {
      cover.classList.remove('charging'); cover.classList.add('bursting'); flash.classList.add('on');
      for (let i = 0; i < 22; i++) {
        const a = (i / 22) * 6.283 + Math.random() * .3, d = 60 + Math.random() * 140, b = document.createElement('div'), sz = 5 + Math.random() * 12;
        b.className = 'burst-b'; b.style.cssText = `width:${sz}px;height:${sz}px;left:${cx}px;top:${cy}px;--bx:${Math.cos(a) * d}px;--by:${Math.sin(a) * d}px`;
        document.body.appendChild(b); setTimeout(() => b.remove(), 950);
      }
      const start = performance.now();
      const ease = t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
      (function grow(now) {
        const t = Math.min(1, (now - start) / 950);
        cover.style.setProperty('--r', Math.max(0, ease(t)) * maxR * .7 + 'px');
        t < 1 ? requestAnimationFrame(grow) : finish();
      })(start);
    }, 260);
  }
  function finish() {
    document.documentElement.classList.remove('locked');
    cover.style.transition = 'opacity .35s ease'; cover.style.opacity = '0';
    setTimeout(() => { cover.hidden = true; }, 380);
    layout(); startMono();
  }
  on(cover, 'click', openCover);
  on(cover, 'keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openCover(); } });
  try { cover.focus({ preventScroll: true }); } catch (e) {}


  /* ---------- infinite gallery: auto-drifts, drag or swipe, tap to open ----------
     To use your own photos, replace the entries below (src = image or video file, cap = caption). */
  const GALLERY = opts.gallery;
  (() => {
    const strip = $('strip'), track = $('strip-track'); if (!strip) return;
    const lb = $('lightbox'), img = $('lb-img'), vid = $('lb-video'), cap = $('lb-cap');
    // a gallery film plays with its own sound: hush the background music meanwhile, bring it back after
    const bgm = document.getElementById('bg-music') as HTMLAudioElement | null; let bgmForVid = false;
    on(vid, 'play', () => { if (bgm && !bgm.paused && !bgm.muted) { bgm.pause(); bgmForVid = true; } });
    on(vid, 'pause', () => { if (bgmForVid && bgm) { bgmForVid = false; bgm.play().catch(() => {}); } });

    const pad2 = n => String(n).padStart(2, '0');
    const card = (g, i) => `<figure class="card" tabindex="0" role="button" data-i="${i}" aria-label="Open ${g.video ? 'video' : 'photo'}: ${g.cap}">` +
      (g.video ? `<video src="${g.src}" poster="${g.poster || ''}" muted loop autoplay playsinline preload="metadata"></video><span class="vid" aria-hidden="true"><svg width="11" height="11" viewBox="0 0 24 24" fill="#EAF4F1"><path d="M8 5v14l11-7z"/></svg></span>` : `<img src="${g.src}" alt="" draggable="false" loading="lazy">`) +
      `<span class="num">${pad2(i + 1)}</span><figcaption>${g.cap}</figcaption></figure>`;
    const set = GALLERY.map(card).join('');
    track.innerHTML = set + set + set;  // three copies so the loop never shows an edge
    let setW = 0, x = 0, vel = 0, drag = null, hover = false, moved = 0, target = null;
    const measure = () => { setW = track.scrollWidth / 3; if (!x) x = -setW; };
    const wrap = () => { if (x > -setW * .5) x -= setW; if (x < -setW * 1.5) x += setW; };
    measure(); addEventListener('resize', measure); addEventListener('load', measure);
    let lastT = performance.now();
    (function loop(now) {
      const dt = Math.min(.05, (now - lastT) / 1000); lastT = now;
      if (!drag && target !== null) { x += (target - x) * Math.min(1, dt * 8); if (Math.abs(target - x) < .5) { x = target; target = null; } }
      else if (!drag) { if (Math.abs(vel) > 2) { x += vel * dt; vel *= Math.pow(.05, dt); } else if (!hover && !RM && lb.hidden) x -= 28 * dt; }
      if (target === null) wrap(); track.style.transform = `translate3d(${x}px,0,0)`;
      requestAnimationFrame(loop);
    })(lastT);
    on(strip, 'pointerenter', e => { if (e.pointerType === 'mouse') hover = true; });
    on(strip, 'pointerleave', () => { hover = false; });
    on(strip, 'pointerdown', e => { target = null; drag = { x0: e.clientX, x: x, t: performance.now(), lx: e.clientX }; moved = 0; vel = 0; strip.setPointerCapture(e.pointerId); strip.classList.add('dragging'); });
    on(strip, 'pointermove', e => {
      if (!drag) return; const now = performance.now(), dx = e.clientX - drag.lx;
      vel = dx / Math.max(.016, (now - drag.t) / 1000); drag.t = now; drag.lx = e.clientX;
      moved = Math.max(moved, Math.abs(e.clientX - drag.x0)); x = drag.x + (e.clientX - drag.x0);
    });
    const end = e => {
      if (!drag) return; strip.classList.remove('dragging'); drag = null;
      if (moved < 6) { const c = document.elementFromPoint(e.clientX, e.clientY)?.closest('.card'); if (c) openLb(+c.dataset.i); vel = 0; }
    };
    on(strip, 'pointerup', end);
    // trackpad swipes and shift + mouse wheel scroll the strip sideways
    on(strip, 'wheel', e => {
      const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.shiftKey ? e.deltaY : 0;
      if (!d) return; e.preventDefault(); target = null; vel = 0; x -= d;
    }, { passive: false });
    const step = dir => { const cw = (track.querySelector('.card')?.offsetWidth || 225) + 16; target = Math.round((target ?? x) - dir * cw * 2); vel = 0; };
    on($('strip-prev'), 'click', () => step(-1));
    on($('strip-next'), 'click', () => step(1)); on(strip, 'pointercancel', () => { drag = null; strip.classList.remove('dragging'); });
    on(track, 'keydown', e => { const c = e.target.closest('.card'); if (c && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openLb(+c.dataset.i); } });

    let cur = 0, opener = null, openedAt = 0;
    function show(i) {
      cur = (i + GALLERY.length) % GALLERY.length; const g = GALLERY[cur];
      if (g.video) { img.hidden = true; vid.hidden = false; vid.poster = g.poster || ''; vid.src = g.full || g.src; vid.play().catch(() => {}); }
      else { vid.pause(); vid.hidden = true; img.hidden = false; img.src = g.full || g.src; img.alt = g.cap; }
      cap.textContent = `${pad2(cur + 1)} / ${pad2(GALLERY.length)} · ${g.cap}`;
    }
    function openLb(i) { opener = document.activeElement; openedAt = performance.now(); lb.hidden = false; show(i); $('lb-close').focus(); }
    function closeLb() { if (lb.hidden || lb.classList.contains('closing') || performance.now() - openedAt < 500) return;   // 500ms: the tap that opened the viewer must not also close it
      vid.pause(); if (!RM) popBubble(lb.querySelector('.pop-body')); lb.classList.add('closing'); setTimeout(() => { lb.hidden = true; lb.classList.remove('closing'); if (opener && opener.focus) opener.focus(); }, RM ? 0 : 700); }
    $('lb-close').onclick = closeLb; $('lb-prev').onclick = () => show(cur - 1); $('lb-next').onclick = () => show(cur + 1);
    on(lb, 'click', e => { if (e.target === lb) closeLb(); });
    addEventListener('keydown', e => { if (lb.hidden) return; if (e.key === 'Escape') closeLb(); if (e.key === 'ArrowLeft') show(cur - 1); if (e.key === 'ArrowRight') show(cur + 1); });
    let sx = null; on(lb, 'touchstart', e => { sx = e.touches[0].clientX; }, { passive: true });
    on(lb, 'touchend', e => { if (sx == null) return; const d = e.changedTouches[0].clientX - sx; if (Math.abs(d) > 50) show(cur + (d < 0 ? 1 : -1)); sx = null; });
  })();

  /* ---------- menu ---------- */
  const navT = $('nav-toggle'), navM = $('nav-menu');
  const setNav = o => {
    navM.classList.toggle('open', o); navT.classList.toggle('open', o); navT.setAttribute('aria-expanded', String(o)); navT.setAttribute('aria-label', o ? 'Close menu' : 'Open menu');
    if (o) { // mark the zone you're currently in
      let cur = anchors[0]; for (const a of anchors) if (scrollY >= a.s - H * .3) cur = a;
      navM.querySelectorAll('a').forEach(l => l.setAttribute('aria-current', String(!l.closest('.menu-rsvp') && cur && l.dataset.go === cur.el.id)));
    }
  };
  on(navT, 'click', () => setNav(!navM.classList.contains('open')));
  navM.querySelectorAll('a').forEach(a => on(a, 'click', () => setNav(false)));
  addEventListener('keydown', e => { if (e.key === 'Escape') setNav(false); });

  /* ---------- RSVP: find your party, answer for each guest (same flow as the original site) ----------
     Guest list lives in the page's database: guests/<id> = { party, note, guests: [names] }.
     Replies: responses/<id> = { party, guests: [{ guestName, attending, nickname }], submittedAt }. */
  const searchInput = $('guest-search'), searchClear = $('search-clear'), sugBox = $('suggestions'), notFound = $('not-found');
  const partyCard = $('party-card'), partyNameEl = $('party-name'), partyNoteEl = $('party-note'), guestListEl = $('guest-list');
  const statusEl = $('rsvp-status'), submitBtn = $('submit-btn'), searchWrap = $('search-wrap');
  let GUEST_LIST = [], EXISTING = {}, current = null, att = {}, nick = {}, hi = -1;
  let db = null, user = null;
  const esc = v => { const d = document.createElement('div'); d.textContent = v == null ? '' : String(v); return d.innerHTML; };
  const slug = p => p.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 120) || 'party';
  const joinNames = n => n.length === 1 ? n[0] : n.length === 2 ? n[0] + ' and ' + n[1] : n.slice(0, -1).join(', ') + ', and ' + n[n.length - 1];
  const origPh = searchInput.placeholder;
  searchInput.disabled = true; searchInput.placeholder = 'Loading guest list…';

  (async () => {
    try { if (window.claude?.use) [db, user] = await Promise.all([claude.use('db'), claude.use('user')]); } catch (e) {}
    if (!db) { setTimeout(loadFromSheet); return; }   // hosted on your own site: use the Google Sheet
    db.collection('guests').onSnapshot(snap => {
      GUEST_LIST = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(p => p.party && Array.isArray(p.guests)).sort((a, b) => a.party.localeCompare(b.party));
      searchInput.disabled = false;
      searchInput.placeholder = GUEST_LIST.length ? origPh : 'The guest list is being prepared. Please check back soon.';
      if (!GUEST_LIST.length) searchInput.disabled = true;
    }, () => { searchInput.placeholder = "Couldn't load the guest list. Refresh to try again."; });
    db.collection('responses').onSnapshot(snap => {
      EXISTING = {}; snap.docs.forEach(d => { const v = d.data(); if (v) EXISTING[d.id] = v; });
    }, () => {});
  })();

  /* Google Sheet (Apps Script) mode, used when the site runs outside Claude.
     GET returns { ok, guestList: [{ party, note, guests: [names] }], rsvps: { party: [{ guestName, attending, nickname }] } };
     POST (text/plain JSON) takes { party, attendance: { name: 'yes'|'no' }, nicknames: { name: text }, submittedAt }. */
  const RSVP_ENDPOINT = opts.rsvpEndpoint;
  function loadFromSheet() {
    if (!RSVP_ENDPOINT) { searchInput.placeholder = 'Guest list not connected yet'; return; }
    fetch(RSVP_ENDPOINT).then(r => r.json()).then(res => {
      if (!res.ok || !Array.isArray(res.guestList)) throw new Error(res.error || 'bad response');
      GUEST_LIST = res.guestList.filter(p => p.party && Array.isArray(p.guests)).map(p => ({ id: slug(p.party), party: p.party, note: p.note || '', guests: p.guests }));
      EXISTING = {}; Object.entries(res.rsvps || {}).forEach(([party, list]) => { if (list && list.length) EXISTING[slug(party)] = { party, guests: list }; });
      searchInput.disabled = !GUEST_LIST.length;
      searchInput.placeholder = GUEST_LIST.length ? origPh : 'The guest list is being prepared. Please check back soon.';
    }).catch(() => { searchInput.placeholder = "Couldn't load the guest list. Refresh to try again."; });
  }
  async function sendToSheet(p) {
    const attendance = {}, nicknames = {};
    p.guests.forEach(g => { attendance[g.guestName] = g.attending === 'Attending' ? 'yes' : 'no'; nicknames[g.guestName] = g.nickname; });
    const res = await fetch(RSVP_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ party: p.party, attendance, nicknames, submittedAt: p.submittedAt }) }).then(r => r.json());
    if (!res.ok) throw new Error(res.error || 'unknown');
  }
  /* search */
  function showSug(list) {
    hi = -1;
    if (!list.length) { sugBox.hidden = true; searchInput.setAttribute('aria-expanded', 'false'); return; }
    sugBox.innerHTML = list.map((p, i) => `<div class="suggestion-item" role="option" data-id="${esc(p.id)}" id="sug-${i}">${esc(p.party)}${p.note ? ` <small>· ${esc(p.note)}</small>` : ''}</div>`).join('');
    sugBox.hidden = false; searchInput.setAttribute('aria-expanded', 'true');
  }
  const matchesFor = q => GUEST_LIST.filter(p => p.party.toLowerCase().includes(q) || p.guests.some(g => g.toLowerCase().includes(q)));
  on(searchInput, 'input', () => {
    const q = searchInput.value.trim().toLowerCase();
    searchClear.hidden = !searchInput.value; notFound.hidden = true;
    if (!q) { sugBox.hidden = true; partyCard.hidden = true; return; }
    showSug(matchesFor(q).slice(0, 8));
  });
  on(sugBox, 'click', e => { const it = e.target.closest('.suggestion-item'); if (it) selectParty(it.dataset.id); });
  on(searchInput, 'keydown', e => {
    const items = [...sugBox.querySelectorAll('.suggestion-item')];
    if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && items.length && !sugBox.hidden) {
      e.preventDefault(); hi = (hi + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
      items.forEach((x, i) => x.classList.toggle('hi', i === hi)); searchInput.setAttribute('aria-activedescendant', 'sug-' + hi); return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (hi >= 0 && items[hi]) return selectParty(items[hi].dataset.id);
      const q = searchInput.value.trim().toLowerCase(); if (!q) return;
      const exact = GUEST_LIST.find(p => p.party.toLowerCase() === q), partial = matchesFor(q);
      if (exact) selectParty(exact.id); else if (partial.length === 1) selectParty(partial[0].id);
      else if (!partial.length) { partyCard.hidden = true; notFound.hidden = false; }
    }
    if (e.key === 'Escape') sugBox.hidden = true;
  });
  docOn('click', e => { if (!e.target.closest('.search-field')) sugBox.hidden = true; });
  function resetSearch() {
    searchInput.value = ''; searchClear.hidden = true; sugBox.hidden = true; notFound.hidden = true; partyCard.hidden = true;
    statusEl.textContent = ''; searchWrap.hidden = false; searchInput.focus();
  }
  on(searchClear, 'click', resetSearch); on($('search-again'), 'click', resetSearch);

  /* party card */
  function selectParty(id) {
    const p = GUEST_LIST.find(x => x.id === id); if (!p) return;
    current = p; sugBox.hidden = true; notFound.hidden = true; searchWrap.hidden = true;
    partyNameEl.textContent = 'Hello, ' + joinNames(p.guests) + '.';
    partyNoteEl.textContent = p.note || ''; statusEl.textContent = ''; statusEl.classList.remove('error');
    const ex = EXISTING[p.id];
    ex && ex.guests && ex.guests.length ? renderSubmitted(ex.guests) : renderForm(p);
    partyCard.hidden = false;
  }
  function renderSubmitted(list) {
    submitBtn.hidden = true;
    guestListEl.innerHTML = `<div class="already"><strong>You've already sent your RSVP.</strong>Here's what we have on file. If something needs to change, please message Czar or JC directly.</div>` +
      list.map(r => `<div class="guest-row"><div class="guest-row-top"><div class="g-name">${esc(r.guestName)}</div><div class="g-status ${r.attending === 'Attending' ? 'is-yes' : 'is-no'}">${esc(r.attending)}</div></div>${r.nickname ? `<div class="g-nickname">Called "${esc(r.nickname)}"</div>` : ''}</div>`).join('');
  }
  function renderForm(p) {
    submitBtn.hidden = false; submitBtn.disabled = false; att = {}; nick = {};
    p.guests.forEach(g => { att[g] = null; nick[g] = ''; });
    guestListEl.innerHTML = p.guests.map((g, i) => `
      <div class="guest-row">
        <div class="guest-row-top"><div class="g-name">${esc(g)}</div>
          <div class="toggle-pair" data-i="${i}" role="group" aria-label="Is ${esc(g)} attending?"><button class="in" data-val="yes" type="button" aria-pressed="false">Attending</button><button class="out" data-val="no" type="button" aria-pressed="false">Can't make it</button></div></div>
        <div class="nickname-field" data-i="${i}">
          <label class="nickname-label" for="nick-${i}">What should we call you? <span class="req">*</span></label>
          <input type="text" id="nick-${i}" class="nickname-input" data-i="${i}" placeholder="e.g. Bogs">
          <div class="nickname-error">Nickname is required.</div>
        </div>
      </div>`).join('');
    guestListEl.querySelectorAll('.toggle-pair').forEach(pair => {
      const g = p.guests[+pair.dataset.i];
      pair.querySelectorAll('button').forEach(btn => on(btn, 'click', () => {
        att[g] = btn.dataset.val;
        pair.querySelectorAll('button').forEach(b => { b.classList.toggle('active', b === btn); b.setAttribute('aria-pressed', String(b === btn)); });
        pair.classList.remove('field-error');
        guestListEl.querySelector(`.nickname-field[data-i="${pair.dataset.i}"]`).hidden = btn.dataset.val === 'no';
      }));
    });
    guestListEl.querySelectorAll('.nickname-input').forEach(inp => on(inp, 'input', () => {
      nick[p.guests[+inp.dataset.i]] = inp.value;
      if (inp.value.trim()) { inp.classList.remove('required-error'); inp.nextElementSibling.classList.remove('show'); }
    }));
  }
  /* RSVP thank-you: a burst of bubbles from the button and a personal note (with "add to calendar" for those coming) */
  function bubbleBurst(from) {
    if (RM || !from) return;
    const r = from.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    for (let i = 0; i < 26; i++) {
      const b = document.createElement('span'), sz = R(6, 18);
      b.className = 'rsvp-bubble';
      b.style.cssText = `left:${cx + R(-r.width / 2, r.width / 2)}px;top:${cy}px;width:${sz}px;height:${sz}px;--dx:${R(-60, 60)}px;--rise:${R(160, 360)}px;--dur:${R(1.6, 2.8)}s;--del:${R(0, .5)}s`;
      document.body.appendChild(b);
      setTimeout(() => b.remove(), 3600);
    }
  }
  function thankYou(payload) {
    const going = payload.guests.filter(x => x.attending === 'Attending');
    const first = n => (n || '').trim().split(/\s+/)[0];
    const names = going.map(x => x.nickname || first(x.guestName));
    const title = going.length ? `See you at depth, ${joinNames(names)}!` : `Thank you, ${joinNames(payload.guests.map(x => first(x.guestName)))}.`;
    const body = going.length
      ? (going.length < payload.guests.length
          ? "Your reply is in. We're so glad you're diving in with us, and we'll miss those who can't make it."
          : "Your reply is in. We can't wait to celebrate with you on September 18, 2027 in Puerto Princesa.")
      : "We'll miss you, and we're grateful you let us know. You'll be in our hearts on the day.";
    const cal = going.length
      ? `<div class="rt-cal"><span>Save the date:</span> <a href="${googleCalendarUrl()}" target="_blank" rel="noopener">Google Calendar</a> <i>·</i> <a href="${ICS_PATH}" download="czar-jc-wedding.ics">Apple / Outlook</a></div>`
      : '';
    guestListEl.insertAdjacentHTML('beforeend', `<div class="rsvp-thanks" tabindex="-1"><svg class="rt-icon" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="22" r="9"/><circle cx="30" cy="11" r="4.5"/><circle cx="11" cy="9" r="3"/></svg><p class="rt-title">${esc(title)}</p><p class="rt-body">${esc(body)}</p>${cal}</div>`);
    statusEl.textContent = '';
    bubbleBurst(submitBtn);
    const card = guestListEl.querySelector('.rsvp-thanks');
    setTimeout(() => { card.scrollIntoView({ behavior: RM ? 'auto' : 'smooth', block: 'center' }); card.focus({ preventScroll: true }); }, 250);
  }
  on(submitBtn, 'click', async () => {
    if (!current) return;
    statusEl.classList.remove('error');
    const g = current.guests;
    const missing = g.filter(x => att[x] === null);
    if (missing.length) {
      g.forEach((x, i) => { if (att[x] === null) guestListEl.querySelector(`.toggle-pair[data-i="${i}"]`).classList.add('field-error'); });
      statusEl.classList.add('error'); statusEl.textContent = 'Please let us know whether each guest is attending.'; return;
    }
    let nickMissing = false;
    g.forEach((x, i) => {
      const inp = $('nick-' + i), bad = att[x] === 'yes' && !(nick[x] || '').trim();
      inp.classList.toggle('required-error', bad); inp.nextElementSibling.classList.toggle('show', bad); if (bad) nickMissing = true;
    });
    if (nickMissing) { statusEl.textContent = ''; return; }
    const payload = { party: current.party, guests: g.map(x => ({ guestName: x, attending: att[x] === 'yes' ? 'Attending' : "Can't make it", nickname: att[x] === 'yes' ? nick[x].trim() : '' })), submittedAt: new Date().toISOString() };
    submitBtn.disabled = true; statusEl.textContent = 'Sending…';
    try {
      if (!db) {
        try { await sendToSheet(payload); }
        catch (err) { if (err.message === 'already_submitted') { statusEl.classList.add('error'); statusEl.textContent = 'Looks like this party already sent a response. Refresh the page to see it.'; submitBtn.disabled = false; return; } throw err; }
        EXISTING[current.id] = payload;
        guestListEl.querySelectorAll('button,input').forEach(el => el.disabled = true); thankYou(payload); submitBtn.hidden = true; return;
      }
      const ref = db.doc('responses/' + current.id), snap = await ref.get();
      if (snap.exists) { EXISTING[current.id] = snap.data(); statusEl.classList.add('error'); statusEl.textContent = 'Looks like this party already sent a response. Here it is.'; renderSubmitted(snap.data().guests || []); return; }
      await ref.set(payload);
      EXISTING[current.id] = payload;
      guestListEl.querySelectorAll('button,input').forEach(el => el.disabled = true);
      thankYou(payload); submitBtn.hidden = true;
    } catch (e) {
      submitBtn.disabled = false; statusEl.classList.add('error');
      statusEl.textContent = "That didn't go through. Please try again, or message Czar or JC directly at jcandczar@gmail.com or 0905 567 8681.";
    }
  });


  return () => {
    alive = false;
    offs.forEach(off => off());
    intervals.forEach(id => window.clearInterval(id));
    observers.forEach(o => o.disconnect());
    const m = document.getElementById('bg-music') as HTMLAudioElement | null;
    if (m) m.pause();
    document.documentElement.classList.remove('locked');
    document.querySelectorAll('#line .mark, .burst-b, .bub').forEach(el => el.remove());   // drop DOM this run created
  };
}