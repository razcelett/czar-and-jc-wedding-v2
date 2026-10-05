// @ts-nocheck
/* the bubble pop: the photo shrinks into a bubble, then bursts into droplets */
export function popBubble(el) {
  const r = el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, R = Math.min(r.width, r.height) * .2;
  setTimeout(() => {
    const f = document.createElement('div'); f.className = 'pop-flash';
    f.style.cssText = `left:${cx}px;top:${cy}px;width:${R * 2}px;height:${R * 2}px`; document.body.appendChild(f); setTimeout(() => f.remove(), 400);
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * 6.283 + Math.random() * .35, d = R * (1.2 + Math.random() * 1.6), sz = 4 + Math.random() * 12;
      const b = document.createElement('div'); b.className = 'pop-bubble';
      b.style.cssText = `left:${cx + Math.cos(a) * R * .8}px;top:${cy + Math.sin(a) * R * .8}px;width:${sz}px;height:${sz}px;--bx:${Math.cos(a) * d}px;--by:${Math.sin(a) * d}px;animation-delay:${Math.random() * 60}ms`;
      document.body.appendChild(b); setTimeout(() => b.remove(), 820);
    }
  }, 300);
}
