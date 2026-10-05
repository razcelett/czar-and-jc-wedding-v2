import { SECTIONS } from '@/data/sections';

export default function Menu() {
  return (
    <>
      <button id="nav-toggle" aria-label="Open menu" aria-expanded="false"><span></span><span></span><span></span></button>
      <nav id="nav-menu" aria-label="Sections">
        <ol>
          {SECTIONS.map(s => (
            <li key={s.id}><a href={`#${s.id}`} data-go={s.id}>{s.name} <small>{s.depth}</small></a></li>
          ))}
          <li className="menu-rsvp"><a href="#rsvp" data-go="rsvp">Reply now</a></li>
        </ol>
      </nav>
    </>
  );
}
