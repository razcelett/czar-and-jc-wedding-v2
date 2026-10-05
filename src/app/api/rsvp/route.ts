/**
 * RSVP relay. The browser only ever talks to /api/rsvp; this server route talks to your
 * Google Apps Script, whose address lives in the RSVP_ENDPOINT environment variable.
 * Guests never see the Google address, and replies for parties that are not on the
 * guest list are turned away before they reach your sheet.
 */
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type Party = { party: string; note?: string; guests: string[] };
type SheetData = { ok: boolean; guestList?: Party[]; rsvps?: Record<string, unknown>; error?: string };

const endpoint = () => process.env.RSVP_ENDPOINT || '';
const fail = (error: string, status = 500) => NextResponse.json({ ok: false, error }, { status });

async function readSheet(): Promise<SheetData> {
  const r = await fetch(endpoint(), { cache: 'no-store', redirect: 'follow' });
  return r.json();
}

export async function GET() {
  if (!endpoint()) return fail('not_configured');
  try {
    const data = await readSheet();
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return fail('sheet_unreachable', 502);
  }
}

export async function POST(req: Request) {
  if (!endpoint()) return fail('not_configured');
  let body: { party?: unknown; attendance?: Record<string, unknown>; nicknames?: Record<string, unknown>; submittedAt?: unknown };
  try { body = JSON.parse(await req.text()); } catch { return fail('bad_request', 400); }

  const partyName = typeof body.party === 'string' ? body.party.trim() : '';
  if (!partyName || partyName.length > 300 || !body.attendance || typeof body.attendance !== 'object') return fail('bad_request', 400);

  try {
    const sheet = await readSheet();
    const party = (sheet.guestList || []).find(p => p.party === partyName);
    if (!party) return fail('unknown_party', 400);
    const allowed = new Set(party.guests);
    const attendance: Record<string, 'yes' | 'no'> = {};
    const nicknames: Record<string, string> = {};
    for (const [name, v] of Object.entries(body.attendance)) {
      if (!allowed.has(name)) return fail('unknown_guest', 400);
      attendance[name] = v === 'yes' ? 'yes' : 'no';
      const n = body.nicknames?.[name];
      nicknames[name] = typeof n === 'string' ? n.slice(0, 60) : '';
    }

    const r = await fetch(endpoint(), {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ party: party.party, attendance, nicknames, submittedAt: typeof body.submittedAt === 'string' ? body.submittedAt : new Date().toISOString() }),
      redirect: 'follow',
    });
    return NextResponse.json(await r.json());
  } catch {
    return fail('sheet_unreachable', 502);
  }
}