/**
 * RSVP relay. The browser only ever talks to /api/rsvp; this server route talks to your
 * Google Apps Script, whose address lives in the RSVP_ENDPOINT environment variable.
 * Guests never see the Google address, and replies for parties that are not on the
 * guest list are turned away before they reach your sheet.
 */
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;   // Google Apps Script can be slow to wake up; give it time before Vercel gives up

type Party = { party: string; note?: string; guests: string[] };
type SheetData = { ok: boolean; guestList?: Party[]; rsvps?: Record<string, unknown>; error?: string };

const endpoint = () => process.env.RSVP_ENDPOINT || '';
const fail = (error: string, status = 500) => NextResponse.json({ ok: false, error }, { status });

async function readSheet(): Promise<SheetData> {
  const r = await fetch(endpoint(), { cache: 'no-store', redirect: 'follow', signal: AbortSignal.timeout(20000) });
  return r.json();
}

/* The guest list barely changes, so the check "is this party on the list?" reuses it for a few minutes
   instead of asking Google for the whole sheet before every reply (that doubled the wait). */
let guestCache: { at: number; list: Party[] } | null = null;
async function guestList(fresh = false): Promise<Party[]> {
  if (!fresh && guestCache && Date.now() - guestCache.at < 5 * 60 * 1000) return guestCache.list;
  const sheet = await readSheet();
  guestCache = { at: Date.now(), list: sheet.guestList || [] };
  return guestCache.list;
}

/** Guest list + replies already received. */
export async function GET() {
  if (!endpoint()) return fail('not_configured');
  try {
    const data = await readSheet();
    if (data.guestList) guestCache = { at: Date.now(), list: data.guestList };
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return fail('sheet_unreachable', 502);
  }
}

/** One party's reply: { party, attendance: { name: 'yes'|'no' }, nicknames: { name: text }, submittedAt }. */
export async function POST(req: Request) {
  if (!endpoint()) return fail('not_configured');
  let body: { party?: unknown; attendance?: Record<string, unknown>; nicknames?: Record<string, unknown>; submittedAt?: unknown };
  try { body = JSON.parse(await req.text()); } catch { return fail('bad_request', 400); }

  const partyName = typeof body.party === 'string' ? body.party.trim() : '';
  if (!partyName || partyName.length > 300 || !body.attendance || typeof body.attendance !== 'object') return fail('bad_request', 400);

  let party: Party | undefined;
  try {
    party = (await guestList()).find(p => p.party === partyName) || (await guestList(true)).find(p => p.party === partyName);
  } catch {
    return fail('sheet_unreachable', 502);
  }
  if (!party) return fail('unknown_party', 400);

  // only the people in that party can reply
  const allowed = new Set(party.guests);
  const attendance: Record<string, 'yes' | 'no'> = {};
  const nicknames: Record<string, string> = {};
  for (const [name, v] of Object.entries(body.attendance)) {
    if (!allowed.has(name)) return fail('unknown_guest', 400);
    attendance[name] = v === 'yes' ? 'yes' : 'no';
    const n = body.nicknames?.[name];
    nicknames[name] = typeof n === 'string' ? n.slice(0, 60) : '';
  }

  try {
    const r = await fetch(endpoint(), {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ party: party.party, attendance, nicknames, submittedAt: typeof body.submittedAt === 'string' ? body.submittedAt : new Date().toISOString() }),
      redirect: 'follow',
      signal: AbortSignal.timeout(25000),
    });
    // Apps Script sometimes answers with a page instead of JSON even though the row was saved:
    // treat any successful answer as saved, and pass real errors (like already_submitted) through
    const text = await r.text();
    try { return NextResponse.json(JSON.parse(text)); }
    catch { return r.ok ? NextResponse.json({ ok: true }) : fail('sheet_error', 502); }
  } catch {
    return fail('sheet_unreachable', 502);
  }
}