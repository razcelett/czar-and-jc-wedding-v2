// Gold line-art medallions for entourage roles (keyed by role, or by group title for single-card groups)
const ICONS: Record<string, string> = {
  "Candle": "<path d=\"M9 11h6v9H9z\"/><path d=\"M12 3.2c2.1 2.3 2.1 4.3 0 5.6-2.1-1.3-2.1-3.3 0-5.6z\"/><path d=\"M12 8.8V11\"/><path d=\"M7 20h10\"/>",
  "Veil": "<path d=\"M5 20.5C5 11.5 8 4 12 4s7 7.5 7 16.5\"/><path d=\"M9.2 20.5c0-6.5 1-11 2.8-13.4\"/><path d=\"M14.8 20.5c0-6.5-1-11-2.8-13.4\"/><circle cx=\"12\" cy=\"3.4\" r=\".9\"/>",
  "Cord": "<path d=\"M3.5 12c0-3.2 4.2-3.2 8.5 0s8.5 3.2 8.5 0-4.2-3.2-8.5 0-8.5 3.2-8.5 0z\"/>",
  "Ring Bearer": "<circle cx=\"12\" cy=\"14.5\" r=\"5.8\"/><path d=\"M9.8 6.6 12 3.6l2.2 3-2.2 2z\"/>",
  "Bible Bearer": "<path d=\"M5.5 4h10.5a2.5 2.5 0 0 1 2.5 2.5V20H8a2.5 2.5 0 0 1-2.5-2.5z\"/><path d=\"M5.5 17.5A2.5 2.5 0 0 1 8 15h10.5\"/><path d=\"M12 6.5v6M9.8 8.6h4.4\"/>",
  "Coin Bearer": "<circle cx=\"12\" cy=\"12\" r=\"8\"/><circle cx=\"12\" cy=\"12\" r=\"5.6\"/><path d=\"M8.9 12.4c1-1.1 2.1-1.1 3.1 0s2.1 1.1 3.1 0\"/>",
  "The Officiant": "<path d=\"M12 3.5v17\"/><path d=\"M7.5 8.5h9\"/>",
  "Flower Girls": "<circle cx=\"12\" cy=\"6.4\" r=\"3\"/><circle cx=\"17.3\" cy=\"10.3\" r=\"3\"/><circle cx=\"15.3\" cy=\"16.5\" r=\"3\"/><circle cx=\"8.7\" cy=\"16.5\" r=\"3\"/><circle cx=\"6.7\" cy=\"10.3\" r=\"3\"/><circle cx=\"12\" cy=\"12\" r=\"1.6\"/>",
  "Maid of Honor": "<path d=\"M12 3.6l2.2 5.1 5.5.5-4.2 3.7 1.3 5.4L12 15.4l-4.8 2.9 1.3-5.4-4.2-3.7 5.5-.5z\"/>",
  "Best Men": "<circle cx=\"12\" cy=\"5\" r=\"1.9\"/><path d=\"M12 6.9V20.5\"/><path d=\"M8.3 10h7.4\"/><path d=\"M5 14.2c.4 3.6 3.3 6.3 7 6.3s6.6-2.7 7-6.3\"/><path d=\"M3.8 15.6 5 14.2l1.5 1.1M20.2 15.6 19 14.2l-1.5 1.1\"/>",
  "Parents of the Bride": "<path d=\"M12 20.5s-7.5-4.6-7.5-10A4.2 4.2 0 0 1 12 8a4.2 4.2 0 0 1 7.5 2.5c0 5.4-7.5 10-7.5 10z\"/>",
  "Parents of the Groom": "<path d=\"M12 20.5s-7.5-4.6-7.5-10A4.2 4.2 0 0 1 12 8a4.2 4.2 0 0 1 7.5 2.5c0 5.4-7.5 10-7.5 10z\"/>",
  "Ninong": "<circle cx=\"9\" cy=\"13\" r=\"5.2\"/><circle cx=\"15\" cy=\"13\" r=\"5.2\"/>",
  "Ninang": "<circle cx=\"9\" cy=\"13\" r=\"5.2\"/><circle cx=\"15\" cy=\"13\" r=\"5.2\"/>"
};

export default function EntIcon({ name }: { name?: string }) {
  const d = name ? ICONS[name] : undefined;
  if (!d) return null;
  return <span className="ent-ico" aria-hidden="true"><svg viewBox="0 0 24 24" dangerouslySetInnerHTML={{ __html: d }} /></span>;
}
