import Wave from '../Wave';
export default function Rsvp() {
  return (
    <>
      <section id="rsvp" data-depth="5000" data-label="Abyssal">
        <div className="wrap">
          <div className="head"><div className="kicker">5,000 metres</div><h2 className="display">RSVP</h2><p className="sec-sub">Will you take the plunge with us?</p></div>
          <div className="split rsvp-split">
            <div className="rsvp-text">
              <div><p className="lede">We would love to have you beside us as we say "I do." Your love and support mean so much to us. Find your name below to reply, so we can save you a seat. Kindly note that no reply will be taken as not attending.</p></div>
              <p className="contact">Prefer to signal us directly? Email <a className="clink" href="mailto:jcandczar@gmail.com?subject=Czar%20%26%20JC%20Wedding"><b>jcandczar@gmail.com</b></a> or call/text <a className="clink" href="tel:+639055678681"><b>0905 567 8681</b></a>.</p>
            </div>
            <div className="rsvp-box" id="rsvp-box">
              <div className="deadline"><div className="when">Kindly reply by</div><b>July 15, 2027</b><Wave /></div>
              <div className="search-wrap" id="search-wrap">
                <label htmlFor="guest-search" className="legend">Find your name</label>
                <div className="search-field">
                  <input type="text" id="guest-search" placeholder="Start typing your name…" autoComplete="off" role="combobox" aria-expanded="false" aria-controls="suggestions" />
                  <button type="button" id="search-clear" className="search-clear" aria-label="Clear search" hidden>✕</button>
                  <div className="suggestions" id="suggestions" role="listbox" hidden></div>
                </div>
                <p className="search-hint">Type your first or last name, then pick your party from the list.</p>
              </div>
              <div className="not-found" id="not-found" hidden><strong>Hmm, we couldn't spot that name.</strong> It's probably just how it's listed. Try just your first name, or the name the invitation was addressed to. If it's still not showing up, reach out to Czar or JC directly and we'll sort it out together.</div>
              <div className="party-card" id="party-card" hidden>
                <div className="party-name" id="party-name"></div>
                <div className="party-note" id="party-note"></div>
                <div id="guest-list"></div>
                <button className="btn submit-btn" id="submit-btn" type="button">Send RSVP</button>
                <div className="rsvp-status" id="rsvp-status" role="status"></div>
                <button type="button" className="search-again" id="search-again">Not you? Search again</button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
