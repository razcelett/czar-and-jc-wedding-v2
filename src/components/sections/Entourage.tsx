import { ENTOURAGE } from '@/data/entourage';
import SectionLabel from '../SectionLabel';
import EntIcon from '../EntIcon';

export default function Entourage() {
  return (
    <section id="entourage" data-depth="100" data-label="Sunlight">
      <div className="wrap">
        <div className="head"><div className="kicker">100 metres</div><h2 className="script">Entourage</h2><p className="sec-sub">The people diving in with us</p></div>
        {ENTOURAGE.map((g, gi) => (
          <div key={gi}>
            {g.title && <SectionLabel>{g.title}</SectionLabel>}
            <div className={`grid ${g.layout === 'g1' ? '' : g.layout}${g.narrow ? ' narrow' : ''}`}>
              {g.people.map((p, pi) => (
                <div className={`ent${g.layout === 'g1' ? ' solo' : ''}`} key={pi}>
                  <EntIcon name={p.role || g.title} />
                  {p.role && <div className="ent-role">{p.role}{p.symbol && <span className="ent-symbol">{p.symbol}</span>}</div>}
                  <div className={`ent-names${p.twoColumns ? ' cols' : ''}`}>
                    {p.names.map((n, ni) => <span key={ni}>{n}<br /></span>)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
