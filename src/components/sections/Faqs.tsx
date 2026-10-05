import { FAQS } from '@/data/faqs';

export default function Faqs() {
  const half = Math.ceil(FAQS.length / 2);
  const col = (items: typeof FAQS) => (
    <div>{items.map(f => <details className="faq-item" key={f.q}><summary>{f.q}</summary><p>{f.a}</p></details>)}</div>
  );
  return (
    <section id="faqs" data-depth="8000" data-label="Hadal">
      <div className="wrap">
        <div className="head"><div className="kicker">8,000 metres</div><h2 className="display">FAQs</h2><p className="sec-sub">A few things to know before the dive</p></div>
        <div className="faq-list">{col(FAQS.slice(0, half))}{col(FAQS.slice(half))}</div>
      </div>
    </section>
  );
}
